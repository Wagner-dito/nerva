import { after, NextResponse } from "next/server";

import { sendMessage } from "@/lib/ai/chat";
import type { BotResponse } from "@/lib/ai/schema";
import type { ChatMessage } from "@/lib/ai/types";
import { serverEnv } from "@/lib/env.server";
import {
  createEvent,
  listAvailableSlots,
  userMightSchedule,
  type AvailableSlot,
} from "@/lib/google/calendar";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";
import {
  sendWhatsAppText,
  type WhatsAppWebhookPayload,
} from "@/lib/whatsapp/client";

// maxDuration só vira real no plano Pro (60s). Hobby ignora mas não quebra.
export const maxDuration = 60;

const INITIAL_SCORE = 30;
const HISTORY_LIMIT = 20;

/**
 * Meta handshake (GET) — validates subscription.
 * Query: hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY
 */
export async function GET(request: Request) {
  if (!serverEnv.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse("Not configured", { status: 503 });
  }
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === serverEnv.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  let payload: WhatsAppWebhookPayload;
  try {
    payload = (await request.json()) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Meta expects 200 OK within ~20s, otherwise it retries. Use after() so the
  // async processing survives the serverless function returning a response.
  // Plain `void promise.catch(...)` is killed in Vercel when the function ends.
  after(async () => {
    try {
      await processPayload(payload);
    } catch (err) {
      console.error("[whatsapp/webhook] processing error", err);
    }
  });

  return NextResponse.json({ received: true });
}

async function processPayload(payload: WhatsAppWebhookPayload): Promise<void> {
  const supabase = createAdminClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;
      const messages = value.messages ?? [];
      if (!phoneNumberId || messages.length === 0) continue;

      const { data: bot } = await supabase
        .from("bots")
        .select(
          "id, org_id, name, persona, knowledge_base, qualification_questions, niche, handoff_email, whatsapp_access_token, google_refresh_token, google_calendar_id"
        )
        .eq("whatsapp_phone_number_id", phoneNumberId)
        .maybeSingle();
      if (!bot || !bot.whatsapp_access_token) {
        console.warn(
          "[whatsapp/webhook] no bot or token for phone_number_id",
          phoneNumberId
        );
        continue;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", bot.org_id)
        .maybeSingle();
      if (!org) continue;

      for (const msg of messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;
        await handleIncoming(supabase, {
          bot,
          orgName: org.name,
          visitorId: msg.from,
          messageText: msg.text.body,
          phoneNumberId,
          accessToken: bot.whatsapp_access_token,
        });
      }
    }
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;
type ConversationRow =
  Database["public"]["Tables"]["conversations"]["Row"];
type BotRow = {
  id: string;
  org_id: string;
  name: string;
  persona: string | null;
  knowledge_base: string | null;
  qualification_questions: Json;
  niche: Database["public"]["Enums"]["bot_niche"];
  handoff_email: string | null;
  whatsapp_access_token: string | null;
  google_refresh_token: string | null;
  google_calendar_id: string | null;
};

async function handleIncoming(
  supabase: AdminClient,
  args: {
    bot: BotRow;
    orgName: string;
    visitorId: string;
    messageText: string;
    phoneNumberId: string;
    accessToken: string;
  }
): Promise<void> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("bot_id", args.bot.id)
    .eq("visitor_id", args.visitorId)
    .eq("channel", "whatsapp")
    .in("status", ["active", "qualified"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversation: ConversationRow | null = existing ?? null;
  if (!conversation) {
    // WhatsApp visitor_id é o número do visitante (com código do país).
    // Pré-popula lead_data.phone pra Sofia não perguntar de novo.
    const { data: created } = await supabase
      .from("conversations")
      .insert({
        bot_id: args.bot.id,
        visitor_id: args.visitorId,
        status: "active",
        temperature: INITIAL_SCORE,
        lead_data: { phone: `+${args.visitorId}` },
        channel: "whatsapp",
      })
      .select("*")
      .single();
    conversation = created ?? null;
  }
  if (!conversation) return;

  const { data: historyRows } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);

  const history: ChatMessage[] = (historyRows ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const extractedSoFar = isRecord(conversation.lead_data)
    ? (conversation.lead_data as Record<string, unknown>)
    : {};

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    role: "user",
    content: args.messageText,
  });

  const slots = await fetchSlotsIfConfigured(
    args.bot,
    args.messageText,
    history.length + 1
  );

  const botResponse = await sendMessage({
    bot: {
      niche: args.bot.niche,
      name: args.bot.name,
      persona: args.bot.persona,
      knowledge_base: args.bot.knowledge_base,
      qualification_questions: toStringArray(args.bot.qualification_questions),
      organization: { name: args.orgName },
    },
    conversation: {
      id: conversation.id,
      message_count: history.length + 1,
      extracted_data: extractedSoFar,
      current_score: conversation.temperature,
      channel: "whatsapp",
      available_slots: slots,
    },
    history,
    userMessage: args.messageText,
  });

  // Prioridade #1: mandar a mensagem pro visitante. Se a função serverless
  // for morta antes das operações de DB, pelo menos o usuário recebe.
  const sendResult = await sendWhatsAppText({
    phoneNumberId: args.phoneNumberId,
    accessToken: args.accessToken,
    to: args.visitorId,
    body: botResponse.message,
  });

  const newScore = clamp(
    conversation.temperature + botResponse.lead_score_delta,
    0,
    100
  );
  const mergedData = {
    ...extractedSoFar,
    ...stripEmpty(botResponse.extracted_data),
  };

  const newStatus =
    botResponse.action === "end_conversation"
      ? "closed"
      : botResponse.action === "request_handoff" || newScore >= 85
        ? "qualified"
        : conversation.status;

  const resetFollowUp =
    conversation.follow_up_count > 0
      ? { follow_up_count: 0, last_follow_up_at: null }
      : {};

  // Persistências em paralelo — não bloqueiam o envio já feito.
  await Promise.all([
    supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: botResponse.message,
    }),
    supabase
      .from("conversations")
      .update({
        temperature: newScore,
        lead_data: toJson(mergedData),
        status: newStatus,
        ...resetFollowUp,
      })
      .eq("id", conversation.id),
    botResponse.action === "book_slot" &&
    args.bot.google_refresh_token &&
    args.bot.google_calendar_id
      ? bookSlotFromAction(
          args.bot.google_refresh_token,
          args.bot.google_calendar_id,
          botResponse
        )
      : Promise.resolve(),
  ]);

  if (!sendResult.ok) {
    console.error(
      "[whatsapp/webhook] send failed:",
      sendResult.error
    );
  }
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim().length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function toJson(v: unknown): Json {
  return JSON.parse(JSON.stringify(v)) as Json;
}

const SLOT_FETCH_TIMEOUT_MS = 3000;

async function fetchSlotsIfConfigured(
  bot: {
    google_refresh_token: string | null;
    google_calendar_id: string | null;
  },
  userMessage: string,
  messageCount: number
): Promise<AvailableSlot[] | undefined> {
  if (!bot.google_refresh_token || !bot.google_calendar_id) return undefined;
  if (!userMightSchedule(userMessage, messageCount)) return undefined;
  try {
    return await Promise.race<AvailableSlot[] | undefined>([
      listAvailableSlots({
        refreshToken: bot.google_refresh_token,
        calendarId: bot.google_calendar_id,
        max: 15,
      }),
      new Promise<undefined>((_, reject) =>
        setTimeout(
          () => reject(new Error("calendar_timeout")),
          SLOT_FETCH_TIMEOUT_MS
        )
      ),
    ]);
  } catch (err) {
    console.warn("[whatsapp/webhook] slots fetch skipped:", err);
    return undefined;
  }
}

async function bookSlotFromAction(
  refreshToken: string,
  calendarId: string,
  response: BotResponse
): Promise<void> {
  const p = response.action_payload;
  if (!p) return;
  const start = asStr(p.start);
  const end = asStr(p.end);
  const summary = asStr(p.summary) ?? "Agendamento Nerva";
  const description = asStr(p.description) ?? undefined;
  if (!start || !end) return;

  try {
    const result = await createEvent({
      refreshToken,
      calendarId,
      startISO: start,
      endISO: end,
      summary,
      description,
    });
    if (!result.ok) {
      console.error("[whatsapp/webhook] createEvent failed", result.error);
    }
  } catch (err) {
    console.error("[whatsapp/webhook] createEvent threw", err);
  }
}

function asStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

import { after, NextResponse } from "next/server";
import { z } from "zod";

import { sendMessage } from "@/lib/ai/chat";
import type { BotResponse } from "@/lib/ai/schema";
import type { ChatMessage } from "@/lib/ai/types";
import { sendEmail } from "@/lib/email/resend";
import { renderHandoffEmail } from "@/lib/email/templates/handoff";
import {
  createEvent,
  listAvailableSlots,
  type AvailableSlot,
} from "@/lib/google/calendar";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";

const INITIAL_SCORE = 30;
const HISTORY_LIMIT = 20;
const RATE_LIMIT_PER_VISITOR = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

const inputSchema = z.object({
  bot_id: z.string().uuid(),
  conversation_id: z.string().uuid().optional().nullable(),
  visitor_id: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4000),
  source_url: z.string().max(500).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  utm_source: z.string().max(200).optional().nullable(),
  utm_medium: z.string().max(200).optional().nullable(),
  utm_campaign: z.string().max(200).optional().nullable(),
});

function baseCorsHeaders(allowedOrigin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin ?? "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  // Preflight is always permissive on headers/methods.
  // Per-bot origin check happens on the actual POST.
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: baseCorsHeaders(origin ?? "*"),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const serverOrigin = new URL(request.url).origin;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Body inválido (JSON esperado)" }, 400, origin);
  }

  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) {
    return json(
      { error: "Payload inválido", issues: parsed.error.issues },
      400,
      origin
    );
  }

  const {
    bot_id,
    conversation_id,
    visitor_id,
    message,
    source_url,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
  } = parsed.data;

  const rateKey = `chat:${bot_id}:${visitor_id}`;
  const rate = rateLimit(
    rateKey,
    RATE_LIMIT_PER_VISITOR,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rate.allowed) {
    return json(
      { error: "Muitas mensagens em pouco tempo. Tente daqui a pouco." },
      429,
      origin,
      {
        "Retry-After": Math.max(
          1,
          Math.ceil((rate.resetAt - Date.now()) / 1000)
        ).toString(),
      }
    );
  }

  const supabase = createAdminClient();

  const { data: bot } = await supabase
    .from("bots")
    .select(
      "id, org_id, name, persona, knowledge_base, qualification_questions, niche, allowed_origins, handoff_email, google_refresh_token, google_calendar_id"
    )
    .eq("id", bot_id)
    .maybeSingle();
  if (!bot) {
    return json({ error: "Bot não encontrado" }, 404, origin);
  }

  if (!isOriginAllowed(origin, serverOrigin, bot.allowed_origins)) {
    return json({ error: "Origem não autorizada" }, 403, null);
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", bot.org_id)
    .maybeSingle();
  if (!org) {
    return json({ error: "Organização não encontrada" }, 404, origin);
  }

  const conversation = conversation_id
    ? await loadConversation(supabase, conversation_id, bot_id)
    : await createConversation(supabase, bot_id, visitor_id, {
        source_url: source_url ?? null,
        referrer: referrer ?? null,
        utm_source: utm_source ?? null,
        utm_medium: utm_medium ?? null,
        utm_campaign: utm_campaign ?? null,
      });
  if (!conversation) {
    return json({ error: "Conversa inválida" }, 404, origin);
  }

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

  const extractedSoFar = isPlainObject(conversation.lead_data)
    ? (conversation.lead_data as Record<string, unknown>)
    : {};

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    role: "user",
    content: message,
  });

  const slots = await fetchSlotsIfConfigured(bot);

  let botResponse: BotResponse;
  try {
    botResponse = await sendMessage({
      bot: {
        niche: bot.niche,
        name: bot.name,
        persona: bot.persona,
        knowledge_base: bot.knowledge_base,
        qualification_questions: toStringArray(bot.qualification_questions),
        organization: { name: org.name },
      },
      conversation: {
        id: conversation.id,
        message_count: history.length + 1,
        extracted_data: extractedSoFar,
        current_score: conversation.temperature,
        available_slots: slots,
      },
      history,
      userMessage: message,
    });
  } catch (err) {
    console.error("[api/chat] Gemini call failed", err);
    return json({ error: "Falha ao gerar resposta" }, 502, origin);
  }

  if (
    botResponse.action === "book_slot" &&
    bot.google_refresh_token &&
    bot.google_calendar_id
  ) {
    await bookSlotFromAction(
      bot.google_refresh_token,
      bot.google_calendar_id,
      botResponse
    );
  }

  const newScore = clamp(
    conversation.temperature + botResponse.lead_score_delta,
    0,
    100
  );
  const mergedData = {
    ...extractedSoFar,
    ...stripEmpty(botResponse.extracted_data),
  };
  const newStatus = deriveStatus(
    conversation.status,
    botResponse.action,
    newScore
  );
  const justQualified =
    conversation.status !== "qualified" && newStatus === "qualified";

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: botResponse.message,
  });

  const followUpReset =
    conversation.follow_up_count > 0
      ? { follow_up_count: 0, last_follow_up_at: null }
      : {};

  await supabase
    .from("conversations")
    .update({
      temperature: newScore,
      lead_data: toJson(mergedData),
      status: newStatus,
      ...followUpReset,
    })
    .eq("id", conversation.id);

  await upsertLead(supabase, conversation.id, botResponse, newScore);

  if (justQualified && bot.handoff_email) {
    const handoffEmail = bot.handoff_email;
    after(async () => {
      try {
        await notifyHandoff({
          to: handoffEmail,
          botName: bot.name,
          orgName: org.name,
          conversationId: conversation.id,
          baseUrl: serverOrigin,
          leadData: mergedData,
          score: newScore,
          actionPayload: botResponse.action_payload,
        });
      } catch (err) {
        console.error("[api/chat] handoff email failed", err);
      }
    });
  }

  return json(
    {
      conversation_id: conversation.id,
      message: botResponse.message,
      action: botResponse.action,
      action_payload: botResponse.action_payload,
      temperature: botResponse.temperature,
      score: newScore,
    },
    200,
    origin
  );
}

async function notifyHandoff(params: {
  to: string;
  botName: string;
  orgName: string;
  conversationId: string;
  baseUrl: string;
  leadData: Record<string, unknown>;
  score: number;
  actionPayload: BotResponse["action_payload"];
}): Promise<void> {
  const leadName =
    asString(params.leadData.name) ?? "Visitante anônimo";
  const urgencyRaw = params.actionPayload?.urgency;
  const urgency =
    urgencyRaw === "low" || urgencyRaw === "medium" || urgencyRaw === "high"
      ? urgencyRaw
      : null;

  const { subject, html, text } = renderHandoffEmail({
    botName: params.botName,
    orgName: params.orgName,
    leadName,
    phone: asString(params.leadData.phone),
    email: asString(params.leadData.email),
    intent: asString(params.leadData.intent),
    budget: asString(params.leadData.budget),
    timeline: asString(params.leadData.timeline),
    score: params.score,
    reason: asString(params.actionPayload?.reason),
    urgency,
    conversationUrl: `${params.baseUrl}/dashboard/conversations/${params.conversationId}`,
  });

  await sendEmail({ to: params.to, subject, html, text });
}

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

const SLOT_FETCH_TIMEOUT_MS = 3000;

async function fetchSlotsIfConfigured(bot: {
  google_refresh_token: string | null;
  google_calendar_id: string | null;
}): Promise<AvailableSlot[] | undefined> {
  if (!bot.google_refresh_token || !bot.google_calendar_id) return undefined;
  try {
    return await Promise.race<AvailableSlot[] | undefined>([
      listAvailableSlots({
        refreshToken: bot.google_refresh_token,
        calendarId: bot.google_calendar_id,
        max: 30,
      }),
      new Promise<undefined>((_, reject) =>
        setTimeout(
          () => reject(new Error("calendar_timeout")),
          SLOT_FETCH_TIMEOUT_MS
        )
      ),
    ]);
  } catch (err) {
    console.warn("[api/chat] slots fetch skipped:", err);
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
  const start = asString(p.start);
  const end = asString(p.end);
  const summary = asString(p.summary) ?? "Agendamento Nerva";
  const description = asString(p.description) ?? undefined;
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
      console.error("[api/chat] createEvent failed", result.error);
    }
  } catch (err) {
    console.error("[api/chat] createEvent threw", err);
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;
type ConversationRow =
  Database["public"]["Tables"]["conversations"]["Row"];

async function loadConversation(
  supabase: AdminClient,
  id: string,
  bot_id: string
): Promise<ConversationRow | null> {
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("bot_id", bot_id)
    .maybeSingle();
  return data ?? null;
}

async function createConversation(
  supabase: AdminClient,
  bot_id: string,
  visitor_id: string,
  tracking: {
    source_url: string | null;
    referrer: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
  }
): Promise<ConversationRow | null> {
  const { data } = await supabase
    .from("conversations")
    .insert({
      bot_id,
      visitor_id,
      status: "active",
      temperature: INITIAL_SCORE,
      lead_data: {},
      ...tracking,
    })
    .select("*")
    .single();
  return data ?? null;
}

async function upsertLead(
  supabase: AdminClient,
  conversation_id: string,
  response: BotResponse,
  score: number
): Promise<void> {
  const { name, email, phone } = response.extracted_data;
  if (!name && !email && !phone) return;

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("conversation_id", conversation_id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("leads")
      .update({
        name: name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        qualification_score: score,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("leads").insert({
      conversation_id,
      name: name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      qualification_score: score,
    });
  }
}

function deriveStatus(
  current: ConversationRow["status"],
  action: BotResponse["action"],
  score: number
): ConversationRow["status"] {
  if (current === "closed" || current === "qualified") return current;
  if (action === "end_conversation") return "closed";
  if (action === "request_handoff") return "qualified";
  if (score >= 85) return "qualified";
  return current;
}

function isOriginAllowed(
  origin: string | null,
  serverOrigin: string,
  allowed: string[] | null | undefined
): boolean {
  if (!origin) return true; // curl, server-to-server, same-origin without Origin header
  if (origin === serverOrigin) return true; // Nerva's own widget page
  if (!allowed || allowed.length === 0) return true; // unconfigured = permissive
  return allowed.includes(origin);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function json(
  body: unknown,
  status = 200,
  origin: string | null,
  extra: Record<string, string> = {}
) {
  return NextResponse.json(body, {
    status,
    headers: { ...baseCorsHeaders(origin), ...extra },
  });
}

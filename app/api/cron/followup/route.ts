import { NextResponse } from "next/server";

import { sendFollowUp } from "@/lib/ai/follow-up";
import type { ChatMessage } from "@/lib/ai/types";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

// Intervals per follow-up step (ms since last interaction).
const INTERVALS_MS = [
  4 * 3600 * 1000, // after 4h → 1st follow-up
  24 * 3600 * 1000, // after 24h more → 2nd
  72 * 3600 * 1000, // after 72h more → 3rd (final)
] as const;

const ABANDON_MS = 7 * 24 * 3600 * 1000; // 7 days of visitor silence
const MAX_PER_RUN = 50;

export async function GET(request: Request) {
  if (serverEnv.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${serverEnv.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const now = Date.now();

  const { data: candidates, error } = await supabase
    .from("conversations")
    .select(
      "id, bot_id, status, temperature, lead_data, follow_up_count, last_follow_up_at, last_message_at, bots(id, org_id, name, persona, knowledge_base, qualification_questions, niche, follow_up_enabled, organizations(name))"
    )
    .eq("status", "active")
    .order("last_message_at", { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let abandoned = 0;
  let skipped = 0;

  for (const c of candidates ?? []) {
    const bot = Array.isArray(c.bots) ? c.bots[0] : c.bots;
    if (!bot) {
      skipped++;
      continue;
    }
    const org = bot.organizations
      ? Array.isArray(bot.organizations)
        ? bot.organizations[0]
        : bot.organizations
      : null;
    if (!org) {
      skipped++;
      continue;
    }

    const lastMessageMs = new Date(c.last_message_at).getTime();
    const lastActivityMs = c.last_follow_up_at
      ? Math.max(lastMessageMs, new Date(c.last_follow_up_at).getTime())
      : lastMessageMs;

    // Total silence cutoff — abandon regardless of bot config.
    if (now - lastMessageMs > ABANDON_MS) {
      await supabase
        .from("conversations")
        .update({ status: "abandoned" })
        .eq("id", c.id);
      abandoned++;
      continue;
    }

    if (!bot.follow_up_enabled) {
      skipped++;
      continue;
    }

    const step = c.follow_up_count;
    const nextInterval = INTERVALS_MS[step];
    if (nextInterval === undefined) {
      skipped++;
      continue;
    }

    if (now - lastActivityMs < nextInterval) {
      skipped++;
      continue;
    }

    // Fetch history
    const { data: historyRows } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", c.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const history: ChatMessage[] = (historyRows ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

    const extractedData = isRecord(c.lead_data) ? c.lead_data : {};
    const hoursSince = (now - lastActivityMs) / 3600000;

    try {
      const response = await sendFollowUp({
        bot: {
          niche: bot.niche,
          name: bot.name,
          persona: bot.persona,
          knowledge_base: bot.knowledge_base,
          qualification_questions: toStringArray(bot.qualification_questions),
          organization: { name: org.name },
        },
        conversation: {
          id: c.id,
          message_count: history.length,
          extracted_data: extractedData as Record<string, unknown>,
          current_score: c.temperature,
        },
        history,
        followUpCount: step,
        hoursSince,
      });

      await supabase.from("messages").insert({
        conversation_id: c.id,
        role: "assistant",
        content: response.message,
      });

      const isLast = step >= INTERVALS_MS.length - 1;
      const newStatus =
        response.action === "end_conversation" || isLast ? "closed" : c.status;

      await supabase
        .from("conversations")
        .update({
          follow_up_count: step + 1,
          last_follow_up_at: new Date().toISOString(),
          status: newStatus,
        })
        .eq("id", c.id);

      sent++;
    } catch (err) {
      console.error("[cron/followup] failed for", c.id, err);
      skipped++;
    }
  }

  return NextResponse.json({
    processed: candidates?.length ?? 0,
    sent,
    abandoned,
    skipped,
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

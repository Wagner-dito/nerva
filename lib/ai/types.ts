import type { Database } from "@/lib/supabase/types";

export type BotNiche = Database["public"]["Enums"]["bot_niche"];
export type Temperature = "cold" | "warm" | "hot";

export type BotAction =
  | "continue"
  | "request_handoff"
  | "schedule"
  | "send_link"
  | "end_conversation"
  | "book_slot";

export type BotTone =
  | "formal profissional"
  | "cordial brasileiro"
  | "descontraído próximo";

export type BotContext = {
  niche: BotNiche;
  name: string;
  persona?: string | null;
  tone?: BotTone | null;
  knowledge_base?: string | null;
  qualification_questions?: string[];
  organization: {
    name: string;
    website?: string | null;
    business_hours?: string | null;
    avg_response_time_min?: number;
  };
  operational_limits?: string | null;
};

export type ConversationContext = {
  id: string;
  channel?: "web" | "whatsapp" | "instagram";
  message_count: number;
  duration_minutes?: number;
  referrer?: string | null;
  extracted_data: Record<string, unknown>;
  current_score: number;
  summary?: string;
  suggested_next_step?: string;
  available_slots?: Array<{
    startISO: string;
    endISO: string;
    humanLabel: string;
  }>;
  already_booked?: {
    startISO: string;
    endISO: string;
    humanLabel: string;
  };
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

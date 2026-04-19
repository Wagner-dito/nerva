import "server-only";

import { generateContent, type GeminiContent } from "@/lib/ai/gemini";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";
import { BotResponseSchema, type BotResponse } from "@/lib/ai/schema";
import type {
  BotContext,
  ChatMessage,
  ConversationContext,
} from "@/lib/ai/types";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.6;

const FALLBACK_MESSAGE =
  "Tive um probleminha técnico aqui. Pode repetir a última mensagem?";

type SendMessageParams = {
  bot: BotContext;
  conversation: ConversationContext;
  history: ChatMessage[];
  userMessage: string;
  model?: string;
};

export async function sendMessage(
  params: SendMessageParams
): Promise<BotResponse> {
  const systemPrompt = buildSystemPrompt({
    bot: params.bot,
    conversation: params.conversation,
  });

  const contents: GeminiContent[] = [
    ...params.history.map(toGeminiContent),
    { role: "user", parts: [{ text: params.userMessage }] },
  ];

  let raw = "";
  try {
    raw = await generateContent({
      model: params.model ?? DEFAULT_MODEL,
      systemInstruction: systemPrompt,
      contents,
      config: {
        temperature: DEFAULT_TEMPERATURE,
        maxOutputTokens: DEFAULT_MAX_TOKENS,
      },
    });
  } catch (err) {
    console.error("[ai/chat] Gemini call failed:", err);
    return fallbackResponse(FALLBACK_MESSAGE);
  }

  const parsed = parseBotResponse(raw);
  if (parsed.message === FALLBACK_MESSAGE) {
    console.warn("[ai/chat] fallback triggered. Raw response:", raw);
  }
  return parsed;
}

function toGeminiContent(message: ChatMessage): GeminiContent {
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  };
}

function fallbackResponse(message: string): BotResponse {
  return {
    message,
    extracted_data: {},
    lead_score_delta: 0,
    temperature: "warm",
    action: "continue",
    action_payload: null,
  };
}

function parseBotResponse(raw: string): BotResponse {
  const trimmed = stripCodeFence(raw.trim());
  if (trimmed.length === 0) {
    return fallbackResponse(FALLBACK_MESSAGE);
  }

  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return fallbackResponse(FALLBACK_MESSAGE);
  }

  const result = BotResponseSchema.safeParse(json);
  if (result.success) return result.data;

  const rescuedMessage = extractMessageField(json);
  return fallbackResponse(rescuedMessage ?? FALLBACK_MESSAGE);
}

function stripCodeFence(s: string): string {
  if (!s.startsWith("```")) return s;
  const withoutOpen = s.replace(/^```(?:json)?\s*/i, "");
  return withoutOpen.replace(/```\s*$/, "").trim();
}

function extractMessageField(json: unknown): string | null {
  if (
    typeof json === "object" &&
    json !== null &&
    "message" in json &&
    typeof (json as { message: unknown }).message === "string"
  ) {
    const msg = (json as { message: string }).message.trim();
    return msg.length > 0 ? msg : null;
  }
  return null;
}

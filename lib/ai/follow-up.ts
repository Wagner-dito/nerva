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
const DEFAULT_TEMPERATURE = 0.7;

const FOLLOW_UP_USER_TRIGGER =
  "[gatilho-sistema] Gere uma mensagem de follow-up conforme as regras de FOLLOW-UP MODE.";

function followUpInstruction(
  followUpCount: number,
  hoursSince: number
): string {
  const ordinal =
    ["primeiro", "segundo", "terceiro"][followUpCount] ?? "quarto+";
  const isLast = followUpCount >= 2;

  return `# FOLLOW-UP MODE

Você está em modo de follow-up automático. O visitante NÃO enviou nova mensagem — o sistema te aciona porque passaram ${Math.round(hoursSince)}h desde a última interação. Este é o ${ordinal} follow-up dessa conversa.

Regras deste turno:

1. Seja curto e humano. Referencie ALGO específico do que já foi conversado (nome, intenção, bairro, prazo, produto). Nada de "oi, tudo bem?" genérico.

2. Uma pergunta aberta curta pra reabrir a conversa. Tom leve, sem pressão. Palavras como "sem pressa", "quando der", "só pra lembrar" são bem-vindas com moderação.

${
  isLast
    ? `3. Este é o ÚLTIMO follow-up. Se não houver retorno, a conversa fecha. Sua mensagem deve ser uma despedida elegante sugerindo que o visitante volte quando quiser. Use "action": "end_conversation" e "action_payload": { "reason": "follow-up exhausted" }.`
    : `3. Continue amigável, sem insistir em dados que o visitante não deu. Use "action": "continue".`
}

4. NÃO invente dados novos em extracted_data. Mantenha só o que já foi coletado nos turnos anteriores.

5. lead_score_delta deve ser 0 ou -5 (silêncio é sinal neutro/levemente negativo; follow-ups não qualificam por si só).

6. O "user" turn que você recebe é apenas um gatilho interno do sistema — responda como se estivesse retomando a conversa naturalmente, sem referenciar esse gatilho.
`;
}

export async function sendFollowUp(params: {
  bot: BotContext;
  conversation: ConversationContext;
  history: ChatMessage[];
  followUpCount: number;
  hoursSince: number;
}): Promise<BotResponse> {
  const baseSystem = buildSystemPrompt({
    bot: params.bot,
    conversation: params.conversation,
  });
  const systemPrompt = `${baseSystem}\n\n---\n\n${followUpInstruction(
    params.followUpCount,
    params.hoursSince
  )}`;

  const contents: GeminiContent[] = [
    ...params.history.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    })),
    {
      role: "user" as const,
      parts: [{ text: FOLLOW_UP_USER_TRIGGER }],
    },
  ];

  let raw = "";
  try {
    raw = await generateContent({
      model: DEFAULT_MODEL,
      systemInstruction: systemPrompt,
      contents,
      config: {
        temperature: DEFAULT_TEMPERATURE,
        maxOutputTokens: DEFAULT_MAX_TOKENS,
      },
    });
  } catch (err) {
    console.error("[ai/follow-up] Gemini call failed:", err);
  }

  try {
    const json = JSON.parse(raw.trim());
    const result = BotResponseSchema.safeParse(json);
    if (result.success) return result.data;
  } catch {
    // fall through
  }

  return {
    message:
      "Oi! Passei pra saber se você ainda quer continuar de onde paramos. Quando puder, me dá um toque.",
    extracted_data: {},
    lead_score_delta: 0,
    temperature: "warm",
    action: params.followUpCount >= 2 ? "end_conversation" : "continue",
    action_payload: null,
  };
}

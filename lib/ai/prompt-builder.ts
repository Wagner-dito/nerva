import { BASE_PROMPT } from "@/lib/ai/prompts/base";
import { NICHE_PROMPTS } from "@/lib/ai/prompts/niches";
import type {
  BotContext,
  ConversationContext,
  Temperature,
} from "@/lib/ai/types";

export function deriveTemperature(score: number): Temperature {
  if (score >= 85) return "hot";
  if (score >= 41) return "warm";
  return "cold";
}

export function buildSystemPrompt(params: {
  bot: BotContext;
  conversation: ConversationContext;
}): string {
  const { bot, conversation } = params;
  const niche = NICHE_PROMPTS[bot.niche] ?? NICHE_PROMPTS.outro;
  const client = buildClientPrompt(bot);
  const runtime = buildRuntimePrompt(conversation);

  return [BASE_PROMPT, niche, client, runtime].join("\n\n---\n\n");
}

function buildClientPrompt(bot: BotContext): string {
  const org = bot.organization;
  const lines: string[] = ["# SOBRE A EMPRESA"];
  lines.push(`Nome da empresa: ${org.name}`);
  lines.push(`Segmento: ${bot.niche}`);
  if (org.website) lines.push(`Site: ${org.website}`);
  if (org.business_hours) {
    lines.push(`Horário de atendimento humano: ${org.business_hours}`);
  }
  if (org.avg_response_time_min !== undefined) {
    lines.push(
      `Tempo médio de resposta humana: ${org.avg_response_time_min} minutos`
    );
  }

  lines.push("", "# SUA IDENTIDADE COMO ATENDENTE");
  lines.push(`Nome: ${bot.name}`);
  lines.push("Cargo fictício: atendente virtual");
  lines.push(`Tom: ${bot.tone ?? "cordial brasileiro"}`);
  if (bot.persona) {
    lines.push(`Persona adicional: ${bot.persona}`);
  }

  lines.push("", "# BASE DE CONHECIMENTO");
  const kb = bot.knowledge_base?.trim();
  if (kb && kb.length > 0) {
    lines.push(kb);
  } else {
    lines.push(
      "(vazia) — você ainda não tem informações oficiais da empresa.",
      "Se precisarem de dados concretos (preços, endereços, políticas),",
      "seja honesto que não tem e peça contato pro time confirmar."
    );
  }

  if (bot.qualification_questions && bot.qualification_questions.length > 0) {
    lines.push("", "# PERGUNTAS DE QUALIFICAÇÃO PRIORITÁRIAS");
    lines.push(
      "Além das universais do nicho, este cliente quer SEMPRE descobrir:"
    );
    for (const q of bot.qualification_questions) {
      lines.push(`- ${q}`);
    }
  }

  if (bot.operational_limits && bot.operational_limits.trim().length > 0) {
    lines.push("", "# LIMITES OPERACIONAIS");
    lines.push(bot.operational_limits.trim());
  }

  return lines.join("\n");
}

function buildRuntimePrompt(conv: ConversationContext): string {
  const lines: string[] = ["# CONTEXTO DA CONVERSA ATUAL"];
  lines.push(`ID da conversa: ${conv.id}`);
  if (conv.channel) lines.push(`Canal: ${conv.channel}`);
  lines.push(`Mensagens trocadas: ${conv.message_count}`);
  if (conv.duration_minutes !== undefined) {
    lines.push(`Duração: ${conv.duration_minutes} minutos`);
  }
  if (conv.referrer) lines.push(`Origem do visitante: ${conv.referrer}`);

  lines.push("", "# DADOS JÁ COLETADOS");
  lines.push(JSON.stringify(conv.extracted_data ?? {}, null, 2));
  lines.push(
    "",
    "Isso já foi capturado em mensagens anteriores. NÃO pergunte novamente.",
    'Se precisar confirmar algo, use "vi aqui que você mencionou X, tá certo?"'
  );

  lines.push("", "# LEAD SCORE ATUAL");
  lines.push(`Score: ${conv.current_score} / 100`);
  lines.push(`Temperatura: ${deriveTemperature(conv.current_score)}`);

  if (conv.summary && conv.summary.trim().length > 0) {
    lines.push("", "# HISTÓRICO RESUMIDO");
    lines.push(conv.summary.trim());
  }

  if (
    conv.suggested_next_step &&
    conv.suggested_next_step.trim().length > 0
  ) {
    lines.push("", "# PRÓXIMO OBJETIVO SUGERIDO");
    lines.push(conv.suggested_next_step.trim());
  }

  return lines.join("\n");
}

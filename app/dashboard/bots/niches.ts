import type { Database } from "@/lib/supabase/types";

export type BotNiche = Database["public"]["Enums"]["bot_niche"];

export const BOT_NICHES: readonly BotNiche[] = [
  "imobiliaria",
  "contabilidade",
  "hospedagem",
  "outro",
] as const;

export const NICHE_LABELS: Record<BotNiche, string> = {
  imobiliaria: "Imobiliária",
  contabilidade: "Contabilidade",
  hospedagem: "Hospedagem",
  outro: "Outro",
};

import type { Database } from "@/lib/supabase/types";

export type PlanKey = Database["public"]["Enums"]["org_plan"];

export type PlanDef = {
  key: PlanKey;
  label: string;
  priceLabel: string;
  maxBots: number | null;
  features: string[];
};

export const PLANS: Record<PlanKey, PlanDef> = {
  free: {
    key: "free",
    label: "Free",
    priceLabel: "Grátis",
    maxBots: 1,
    features: [
      "1 bot",
      "Widget embedável",
      "CRM Kanban",
      "Follow-up automático",
    ],
  },
  starter: {
    key: "starter",
    label: "Starter",
    priceLabel: "R$ 797/mês",
    maxBots: 5,
    features: [
      "Até 5 bots",
      "Tudo do Free",
      "ROI por canal",
      "Handoff por email",
    ],
  },
  pro: {
    key: "pro",
    label: "Pro",
    priceLabel: "R$ 1.497/mês",
    maxBots: null,
    features: [
      "Bots ilimitados",
      "Tudo do Starter",
      "Suporte prioritário",
      "Revisões mensais",
    ],
  },
};

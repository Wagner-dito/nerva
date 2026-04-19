"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { BOT_NICHES } from "@/app/dashboard/bots/niches";
import { PLANS, type PlanKey } from "@/lib/stripe/plans";
import { createClient } from "@/lib/supabase/server";

const nicheEnum = z.enum(
  BOT_NICHES as unknown as [string, ...string[]]
) as unknown as z.ZodEnum<
  [(typeof BOT_NICHES)[number], ...(typeof BOT_NICHES)[number][]]
>;

const nullableTrimmed = z
  .string()
  .trim()
  .max(20000)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const botInputSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(100),
  niche: nicheEnum,
  persona: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  knowledge_base: nullableTrimmed,
  qualification_questions: z.string().max(5000).optional(),
  widget_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use o formato #RRGGBB")
    .default("#FF5A1F"),
  widget_greeting: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  widget_position: z.enum(["left", "right"]).default("right"),
  allowed_origins: z.string().max(5000).optional(),
  handoff_email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine(
      (v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      { message: "Email inválido" }
    ),
  follow_up_enabled: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  whatsapp_phone_number_id: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  whatsapp_access_token: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

type BotFields = z.infer<typeof botInputSchema>;

export type BotFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof BotFields, string>>;
};

const MAX_QUESTIONS = 20;

function parseQuestions(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, MAX_QUESTIONS);
}

function collectInput(formData: FormData) {
  return {
    name: formData.get("name"),
    niche: formData.get("niche"),
    persona: formData.get("persona"),
    knowledge_base: formData.get("knowledge_base"),
    qualification_questions: formData.get("qualification_questions"),
    widget_color: formData.get("widget_color"),
    widget_greeting: formData.get("widget_greeting"),
    widget_position: formData.get("widget_position"),
    allowed_origins: formData.get("allowed_origins"),
    handoff_email: formData.get("handoff_email"),
    follow_up_enabled: formData.get("follow_up_enabled"),
    whatsapp_phone_number_id: formData.get("whatsapp_phone_number_id"),
    whatsapp_access_token: formData.get("whatsapp_access_token"),
  };
}

const ORIGIN_RE = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/;

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && ORIGIN_RE.test(l))
    .slice(0, 20);
}

function toFieldErrors(
  error: z.ZodError
): NonNullable<BotFormState["fieldErrors"]> {
  const out: NonNullable<BotFormState["fieldErrors"]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof BotFields | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createBot(
  _prev: BotFormState,
  formData: FormData
): Promise<BotFormState> {
  const parsed = botInputSchema.safeParse(collectInput(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Perfil não encontrado." };

  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", profile.org_id)
    .single();
  const plan = (org?.plan ?? "free") as PlanKey;
  const maxBots = PLANS[plan].maxBots;
  if (maxBots !== null) {
    const { count } = await supabase
      .from("bots")
      .select("*", { count: "exact", head: true });
    if ((count ?? 0) >= maxBots) {
      return {
        error: `Plano ${PLANS[plan].label} permite no máximo ${maxBots} bot${maxBots > 1 ? "s" : ""}. Faça upgrade em Faturamento.`,
      };
    }
  }

  const { data, error } = await supabase
    .from("bots")
    .insert({
      org_id: profile.org_id,
      name: parsed.data.name,
      niche: parsed.data.niche,
      persona: parsed.data.persona,
      knowledge_base: parsed.data.knowledge_base,
      qualification_questions: parseQuestions(
        parsed.data.qualification_questions
      ),
      widget_color: parsed.data.widget_color,
      widget_greeting: parsed.data.widget_greeting,
      widget_position: parsed.data.widget_position,
      allowed_origins: parseOrigins(parsed.data.allowed_origins),
      handoff_email: parsed.data.handoff_email,
      follow_up_enabled: parsed.data.follow_up_enabled,
      whatsapp_phone_number_id: parsed.data.whatsapp_phone_number_id,
      whatsapp_access_token: parsed.data.whatsapp_access_token,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar o bot." };
  }

  revalidatePath("/dashboard/bots");
  redirect(`/dashboard/bots/${data.id}`);
}

export async function updateBot(
  _prev: BotFormState,
  formData: FormData
): Promise<BotFormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    return { error: "ID inválido." };
  }

  const parsed = botInputSchema.safeParse(collectInput(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bots")
    .update({
      name: parsed.data.name,
      niche: parsed.data.niche,
      persona: parsed.data.persona,
      knowledge_base: parsed.data.knowledge_base,
      qualification_questions: parseQuestions(
        parsed.data.qualification_questions
      ),
      widget_color: parsed.data.widget_color,
      widget_greeting: parsed.data.widget_greeting,
      widget_position: parsed.data.widget_position,
      allowed_origins: parseOrigins(parsed.data.allowed_origins),
      handoff_email: parsed.data.handoff_email,
      follow_up_enabled: parsed.data.follow_up_enabled,
      whatsapp_phone_number_id: parsed.data.whatsapp_phone_number_id,
      whatsapp_access_token: parsed.data.whatsapp_access_token,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/bots");
  revalidatePath(`/dashboard/bots/${id}`);
  return {};
}

export async function deleteBot(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  const supabase = await createClient();
  await supabase.from("bots").delete().eq("id", id);

  revalidatePath("/dashboard/bots");
  redirect("/dashboard/bots");
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBaseUrl } from "@/lib/url";

const signupSchema = z.object({
  full_name: z.string().trim().min(1, "Informe seu nome"),
  org_name: z.string().trim().optional(),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  invite_token: z.string().trim().optional(),
});

type SignupFields = z.infer<typeof signupSchema>;

export type SignupState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof SignupFields, string>>;
};

export async function signup(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    full_name: formData.get("full_name"),
    org_name: formData.get("org_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    invite_token: formData.get("invite_token"),
  });

  if (!parsed.success) {
    const fieldErrors: SignupState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof SignupFields;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const inviteToken = parsed.data.invite_token || undefined;

  if (inviteToken) {
    const admin = createAdminClient();
    const { data: invitation } = await admin
      .from("invitations")
      .select("email, expires_at, accepted_at")
      .eq("token", inviteToken)
      .maybeSingle();
    if (!invitation) {
      return { error: "Convite inválido ou expirado." };
    }
    if (invitation.accepted_at) {
      return { error: "Este convite já foi usado." };
    }
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      return { error: "Este convite expirou. Peça um novo." };
    }
    if (
      invitation.email.trim().toLowerCase() !==
      parsed.data.email.trim().toLowerCase()
    ) {
      return {
        error:
          "O email não bate com o convite. Use exatamente o email convidado.",
      };
    }
  } else if (!parsed.data.org_name || parsed.data.org_name.length === 0) {
    return {
      fieldErrors: { org_name: "Informe o nome da organização" },
    };
  }

  const supabase = await createClient();
  const baseUrl = await getBaseUrl();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
      data: {
        full_name: parsed.data.full_name,
        org_name: parsed.data.org_name ?? null,
        invitation_token: inviteToken ?? null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    redirect(
      `/signup/check-email?email=${encodeURIComponent(parsed.data.email)}`
    );
  }

  redirect("/dashboard");
}

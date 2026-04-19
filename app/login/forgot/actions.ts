"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/url";

const schema = z.object({
  email: z.string().trim().email("Email inválido"),
});

export type ForgotState = {
  error?: string;
  sent?: boolean;
  fieldErrors?: { email?: string };
};

export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      fieldErrors: {
        email: parsed.error.issues[0]?.message ?? "Email inválido",
      },
    };
  }

  const supabase = await createClient();
  const baseUrl = await getBaseUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${baseUrl}/auth/callback?next=/login/reset` }
  );

  if (error) {
    return { error: error.message };
  }

  return { sent: true };
}

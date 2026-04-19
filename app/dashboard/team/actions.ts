"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const inviteSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  role: z.enum(["admin", "member"]),
});

export type InviteState = {
  error?: string;
  success?: { token: string; email: string };
  fieldErrors?: Partial<Record<"email" | "role", string>>;
};

export async function createInvite(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    const fieldErrors: InviteState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "email" | "role" | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Perfil não encontrado." };
  if (profile.role !== "owner" && profile.role !== "admin") {
    return { error: "Apenas owner ou admin podem convidar." };
  }

  const token = randomBytes(24).toString("base64url");

  const { error } = await supabase.from("invitations").insert({
    org_id: profile.org_id,
    email: parsed.data.email,
    role: parsed.data.role,
    token,
    invited_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/team");
  return { success: { token, email: parsed.data.email } };
}

export async function revokeInvite(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", id);
  revalidatePath("/dashboard/team");
}

export async function removeMember(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  const supabase = await createClient();
  await supabase.from("profiles").delete().eq("id", id);
  revalidatePath("/dashboard/team");
}

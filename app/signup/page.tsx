import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { createAdminClient } from "@/lib/supabase/admin";

import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite: inviteToken } = await searchParams;

  let invitation: {
    token: string;
    email: string;
    orgName: string;
  } | undefined;

  if (inviteToken) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("invitations")
      .select("token, email, expires_at, accepted_at, organizations(name)")
      .eq("token", inviteToken)
      .maybeSingle();
    if (
      data &&
      !data.accepted_at &&
      new Date(data.expires_at).getTime() > Date.now()
    ) {
      const org = Array.isArray(data.organizations)
        ? data.organizations[0]
        : data.organizations;
      invitation = {
        token: data.token,
        email: data.email,
        orgName: org?.name ?? "Sua organização",
      };
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-signal-glow" />

      <div className="relative w-full max-w-sm space-y-6 rounded-xl border border-border/60 bg-card/70 p-8 backdrop-blur">
        <div className="space-y-3 text-center">
          <Wordmark className="text-2xl" />
          <h1 className="font-serif text-3xl leading-tight tracking-tight">
            {invitation ? "Entrar na equipe" : "Criar conta"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {invitation
              ? `Você foi convidado pra ${invitation.orgName}.`
              : "Comece a qualificar leads com IA em minutos."}
          </p>
        </div>

        <SignupForm invitation={invitation} />

        {!invitation && (
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-signal-glow" />

      <div className="relative w-full max-w-sm space-y-6 rounded-xl border border-border/60 bg-card/70 p-8 text-center backdrop-blur">
        <Wordmark className="text-2xl" />
        <h1 className="font-serif text-3xl leading-tight tracking-tight">
          Confere seu email
        </h1>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação
          {email ? (
            <>
              {" "}pra <span className="text-foreground">{email}</span>
            </>
          ) : null}
          . Clica nele pra ativar sua conta e entrar no Nerva.
        </p>
        <p className="text-xs text-muted-foreground">
          Não chegou em 2-3 minutos? Cheque o spam, ou{" "}
          <Link href="/signup" className="text-primary hover:underline">
            tenta de novo
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

import { ForgotForm } from "./forgot-form";

export default function ForgotPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-signal-glow" />

      <div className="relative w-full max-w-sm space-y-6 rounded-xl border border-border/60 bg-card/70 p-8 backdrop-blur">
        <div className="space-y-3 text-center">
          <Wordmark className="text-2xl" />
          <h1 className="font-serif text-3xl leading-tight tracking-tight">
            Recuperar senha
          </h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link por email pra você redefinir.
          </p>
        </div>

        <ForgotForm />

        <p className="text-center text-sm text-muted-foreground">
          Lembrou?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}

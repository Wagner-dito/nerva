import { Wordmark } from "@/components/brand/wordmark";

import { ResetForm } from "./reset-form";

export default function ResetPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-signal-glow" />

      <div className="relative w-full max-w-sm space-y-6 rounded-xl border border-border/60 bg-card/70 p-8 backdrop-blur">
        <div className="space-y-3 text-center">
          <Wordmark className="text-2xl" />
          <h1 className="font-serif text-3xl leading-tight tracking-tight">
            Nova senha
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma senha forte. Você continua logado depois.
          </p>
        </div>

        <ResetForm />
      </div>
    </main>
  );
}

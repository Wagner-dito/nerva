import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-signal-glow" />

      <div className="relative w-full max-w-sm space-y-6 rounded-xl border border-border/60 bg-card/70 p-8 backdrop-blur">
        <div className="space-y-3 text-center">
          <Wordmark className="text-2xl" />
          <h1 className="font-serif text-3xl leading-tight tracking-tight">
            Entrar
          </h1>
          <p className="text-sm text-muted-foreground">Bem-vindo de volta.</p>
        </div>

        <LoginForm />

        <div className="space-y-2 text-center text-sm text-muted-foreground">
          <p>
            <Link
              href="/login/forgot"
              className="text-primary hover:underline"
            >
              Esqueci minha senha
            </Link>
          </p>
          <p>
            Ainda não tem conta?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

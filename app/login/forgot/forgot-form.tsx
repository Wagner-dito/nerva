"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { requestPasswordReset, type ForgotState } from "./actions";

const initialState: ForgotState = {};

export function ForgotForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  if (state.sent) {
    return (
      <div className="space-y-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
        <p className="text-foreground">
          Enviamos um link pro seu email. Se ele não aparecer em alguns minutos,
          cheque o spam.
        </p>
        <Link
          href="/login"
          className="inline-block text-xs text-primary hover:underline"
        >
          ← Voltar pro login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email da conta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
        />
        {state.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link"}
      </Button>
    </form>
  );
}

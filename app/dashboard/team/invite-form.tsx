"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { createInvite, type InviteState } from "./actions";

const initialState: InviteState = {};

type InviteFormProps = {
  baseUrl: string;
};

export function InviteForm({ baseUrl }: InviteFormProps) {
  const [state, action, pending] = useActionState(createInvite, initialState);
  const [copied, setCopied] = useState(false);

  const inviteUrl = state.success
    ? `${baseUrl}/signup?invite=${state.success.token}`
    : null;

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
      <h2 className="text-sm font-medium">Convidar para a equipe</h2>

      <form action={action} className="space-y-3">
        <div className="flex flex-wrap gap-3 sm:flex-nowrap">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="pessoa@empresa.com"
              aria-invalid={state.fieldErrors?.email ? true : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Papel</Label>
            <select
              id="role"
              name="role"
              defaultValue="member"
              className={cn(
                "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
            >
              <option value="member" className="bg-background">
                Membro
              </option>
              <option value="admin" className="bg-background">
                Admin
              </option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Gerando..." : "Gerar convite"}
            </Button>
          </div>
        </div>

        {state.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        )}
        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
      </form>

      {inviteUrl && (
        <div className="space-y-2 rounded-lg border border-accent/40 bg-accent/10 p-3">
          <p className="text-xs text-foreground">
            Convite gerado pra{" "}
            <span className="font-medium">{state.success?.email}</span>. Copie
            o link e mande por email, WhatsApp, whatever:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border/60 bg-background/60 px-2 py-1.5 font-mono text-xs">
              {inviteUrl}
            </code>
            <Button type="button" size="sm" onClick={handleCopy}>
              {copied ? "Copiado ✓" : "Copiar"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Validade: 7 dias. Convites pendentes aparecem abaixo.
          </p>
        </div>
      )}
    </div>
  );
}

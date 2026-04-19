"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signup, type SignupState } from "./actions";

const initialState: SignupState = {};

type SignupFormProps = {
  invitation?: {
    token: string;
    email: string;
    orgName: string;
  };
};

export function SignupForm({ invitation }: SignupFormProps) {
  const [state, action, pending] = useActionState(signup, initialState);
  const isInvited = Boolean(invitation);

  return (
    <form action={action} className="space-y-4">
      {isInvited && invitation && (
        <>
          <input type="hidden" name="invite_token" value={invitation.token} />
          <input type="hidden" name="org_name" value={invitation.orgName} />
        </>
      )}

      <Field
        id="full_name"
        label="Nome completo"
        type="text"
        autoComplete="name"
        error={state.fieldErrors?.full_name}
      />

      {!isInvited && (
        <Field
          id="org_name"
          label="Nome da organização"
          type="text"
          autoComplete="organization"
          error={state.fieldErrors?.org_name}
        />
      )}

      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={invitation?.email}
        readOnly={isInvited}
        error={state.fieldErrors?.email}
      />

      <Field
        id="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
      />

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Criando..." : isInvited ? "Entrar na equipe" : "Criar conta"}
      </Button>
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  type: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  defaultValue?: string;
  readOnly?: boolean;
  error?: string;
};

function Field({
  id,
  label,
  type,
  autoComplete,
  defaultValue,
  readOnly,
  error,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        readOnly={readOnly}
        required
        aria-invalid={error ? true : undefined}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

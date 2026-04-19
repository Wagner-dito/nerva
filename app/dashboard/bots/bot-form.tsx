"use client";

import { useActionState } from "react";

import {
  createBot,
  updateBot,
  type BotFormState,
} from "@/app/dashboard/bots/actions";
import {
  BOT_NICHES,
  NICHE_LABELS,
  type BotNiche,
} from "@/app/dashboard/bots/niches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type BotFormValues = {
  name: string;
  niche: BotNiche;
  persona: string;
  knowledge_base: string;
  qualification_questions: string;
  widget_color: string;
  widget_greeting: string;
  widget_position: "left" | "right";
  allowed_origins: string;
  handoff_email: string;
  follow_up_enabled: boolean;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
};

const EMPTY_VALUES: BotFormValues = {
  name: "",
  niche: "imobiliaria",
  persona: "",
  knowledge_base: "",
  qualification_questions: "",
  widget_color: "#FF5A1F",
  widget_greeting: "",
  widget_position: "right",
  allowed_origins: "",
  handoff_email: "",
  follow_up_enabled: true,
  whatsapp_phone_number_id: "",
  whatsapp_access_token: "",
};

const INITIAL_STATE: BotFormState = {};

type BotFormProps = {
  mode: "create" | "edit";
  botId?: string;
  initialValues?: BotFormValues;
};

export function BotForm({
  mode,
  botId,
  initialValues = EMPTY_VALUES,
}: BotFormProps) {
  const action = mode === "create" ? createBot : updateBot;
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && botId && (
        <input type="hidden" name="id" value={botId} />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Nome do atendente</Label>
        <Input
          id="name"
          name="name"
          type="text"
          defaultValue={initialValues.name}
          placeholder="Ex: Laura, Pedro, Ana"
          required
          aria-invalid={state.fieldErrors?.name ? true : undefined}
        />
        {state.fieldErrors?.name && (
          <FieldError>{state.fieldErrors.name}</FieldError>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="niche">Nicho</Label>
        <select
          id="niche"
          name="niche"
          defaultValue={initialValues.niche}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          )}
          aria-invalid={state.fieldErrors?.niche ? true : undefined}
        >
          {BOT_NICHES.map((n) => (
            <option key={n} value={n} className="bg-background">
              {NICHE_LABELS[n]}
            </option>
          ))}
        </select>
        {state.fieldErrors?.niche && (
          <FieldError>{state.fieldErrors.niche}</FieldError>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="persona">Persona (opcional)</Label>
        <Textarea
          id="persona"
          name="persona"
          rows={2}
          defaultValue={initialValues.persona}
          placeholder="Tom de voz e estilo. Ex: Cordial brasileira, direta sem ser seca, usa contrações moderadas."
        />
        <p className="text-xs text-muted-foreground">
          Personaliza o jeito do bot falar. Deixe em branco pro padrão do nicho.
        </p>
        {state.fieldErrors?.persona && (
          <FieldError>{state.fieldErrors.persona}</FieldError>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="knowledge_base">Base de conhecimento</Label>
        <Textarea
          id="knowledge_base"
          name="knowledge_base"
          rows={10}
          defaultValue={initialValues.knowledge_base}
          placeholder="Tudo que o bot precisa saber sobre sua empresa: preços, regiões atendidas, políticas, horários, produtos. O bot SÓ vai fornecer informações concretas que estejam aqui."
        />
        <p className="text-xs text-muted-foreground">
          Quanto mais específica a base, menos o bot improvisa. Cole textos
          oficiais, FAQ, tabelas de preço, etc.
        </p>
        {state.fieldErrors?.knowledge_base && (
          <FieldError>{state.fieldErrors.knowledge_base}</FieldError>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qualification_questions">
          Perguntas customizadas (opcional)
        </Label>
        <Textarea
          id="qualification_questions"
          name="qualification_questions"
          rows={4}
          defaultValue={initialValues.qualification_questions}
          placeholder={"Como ficou sabendo da gente?\nJá visitou outros imóveis?"}
        />
        <p className="text-xs text-muted-foreground">
          Uma pergunta por linha. Máximo 20. O bot tenta encaixar essas ao
          longo da conversa.
        </p>
        {state.fieldErrors?.qualification_questions && (
          <FieldError>
            {state.fieldErrors.qualification_questions}
          </FieldError>
        )}
      </div>

      <fieldset className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-4">
        <legend className="px-2 text-xs uppercase tracking-wide text-muted-foreground">
          Widget
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="widget_color">Cor primária</Label>
            <div className="flex items-center gap-2">
              <Input
                id="widget_color"
                name="widget_color"
                type="color"
                defaultValue={initialValues.widget_color}
                className="h-9 w-16 cursor-pointer p-1"
                aria-invalid={state.fieldErrors?.widget_color ? true : undefined}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {initialValues.widget_color}
              </span>
            </div>
            {state.fieldErrors?.widget_color && (
              <FieldError>{state.fieldErrors.widget_color}</FieldError>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="widget_position">Posição na tela</Label>
            <select
              id="widget_position"
              name="widget_position"
              defaultValue={initialValues.widget_position}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
            >
              <option value="right" className="bg-background">
                Canto inferior direito
              </option>
              <option value="left" className="bg-background">
                Canto inferior esquerdo
              </option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="widget_greeting">Saudação inicial (opcional)</Label>
          <Textarea
            id="widget_greeting"
            name="widget_greeting"
            rows={2}
            defaultValue={initialValues.widget_greeting}
            placeholder="Ex: Oi! Tô aqui pra te ajudar a achar o imóvel ideal. Conta pra mim o que você procura?"
          />
          <p className="text-xs text-muted-foreground">
            O que o visitante vê ao abrir o chat, antes de enviar qualquer
            mensagem. Deixe em branco pro padrão.
          </p>
          {state.fieldErrors?.widget_greeting && (
            <FieldError>{state.fieldErrors.widget_greeting}</FieldError>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="flex items-start gap-3 rounded-md border border-border/40 bg-background/40 p-3 text-sm">
            <input
              type="checkbox"
              name="follow_up_enabled"
              defaultChecked={initialValues.follow_up_enabled}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block font-medium">Follow-up automático</span>
              <span className="block text-xs text-muted-foreground">
                Bot tenta reengajar silêncios em 4h, 24h e 72h. Após o 3º
                follow-up sem resposta, a conversa fecha. Desative se o bot
                não deve reabrir conversa sozinho.
              </span>
            </span>
          </label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="handoff_email">
            Email pra alertas de handoff (opcional)
          </Label>
          <Input
            id="handoff_email"
            name="handoff_email"
            type="email"
            defaultValue={initialValues.handoff_email}
            placeholder="vendedor@empresa.com"
            aria-invalid={state.fieldErrors?.handoff_email ? true : undefined}
          />
          <p className="text-xs text-muted-foreground">
            Quando o bot detectar lead quente (score ≥ 85 ou pedido explícito
            de humano), você recebe um email pra agir rápido. Deixe vazio pra
            desativar.
          </p>
          {state.fieldErrors?.handoff_email && (
            <FieldError>{state.fieldErrors.handoff_email}</FieldError>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="allowed_origins">
            Domínios autorizados (opcional)
          </Label>
          <Textarea
            id="allowed_origins"
            name="allowed_origins"
            rows={3}
            defaultValue={initialValues.allowed_origins}
            placeholder={"https://imobiliaria-exemplo.com.br\nhttps://www.imobiliaria-exemplo.com.br"}
          />
          <p className="text-xs text-muted-foreground">
            Um por linha, no formato <code>https://dominio.com</code>. Só esses
            sites poderão chamar a API do bot. Vazio = qualquer origem (útil
            em dev).
          </p>
          {state.fieldErrors?.allowed_origins && (
            <FieldError>{state.fieldErrors.allowed_origins}</FieldError>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-4">
        <legend className="px-2 text-xs uppercase tracking-wide text-muted-foreground">
          WhatsApp (opcional)
        </legend>
        <p className="text-xs text-muted-foreground">
          Conecta o bot a um número do WhatsApp Business. Configure o webhook
          Meta em{" "}
          <code className="font-mono">https://seu-dominio/api/whatsapp/webhook</code>{" "}
          com o <code>WHATSAPP_VERIFY_TOKEN</code> do seu{" "}
          <code>.env</code>. Depois cole abaixo o <em>Phone number ID</em> e o{" "}
          <em>Access token</em> do System User.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp_phone_number_id">Phone number ID</Label>
          <Input
            id="whatsapp_phone_number_id"
            name="whatsapp_phone_number_id"
            type="text"
            defaultValue={initialValues.whatsapp_phone_number_id}
            placeholder="123456789012345"
          />
          {state.fieldErrors?.whatsapp_phone_number_id && (
            <FieldError>
              {state.fieldErrors.whatsapp_phone_number_id}
            </FieldError>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp_access_token">Access token</Label>
          <Input
            id="whatsapp_access_token"
            name="whatsapp_access_token"
            type="password"
            defaultValue={initialValues.whatsapp_access_token}
            placeholder="EAAG..."
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Token permanente do System User com permissão{" "}
            <code>whatsapp_business_messaging</code>.
          </p>
          {state.fieldErrors?.whatsapp_access_token && (
            <FieldError>
              {state.fieldErrors.whatsapp_access_token}
            </FieldError>
          )}
        </div>
      </fieldset>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Salvando..."
            : mode === "create"
              ? "Criar bot"
              : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-destructive">{children}</p>;
}

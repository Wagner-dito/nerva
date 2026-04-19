import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BotForm, type BotFormValues } from "@/app/dashboard/bots/bot-form";
import { DeleteBotButton } from "@/app/dashboard/bots/[id]/delete-button";
import { NICHE_LABELS } from "@/app/dashboard/bots/niches";
import { createClient } from "@/lib/supabase/server";

export default async function EditBotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: bot } = await supabase
    .from("bots")
    .select(
      "id, name, niche, persona, knowledge_base, qualification_questions, widget_color, widget_greeting, widget_position, allowed_origins, handoff_email, follow_up_enabled, whatsapp_phone_number_id, whatsapp_access_token"
    )
    .eq("id", id)
    .maybeSingle();

  if (!bot) {
    notFound();
  }

  const initialValues: BotFormValues = {
    name: bot.name,
    niche: bot.niche,
    persona: bot.persona ?? "",
    knowledge_base: bot.knowledge_base ?? "",
    qualification_questions: questionsToText(bot.qualification_questions),
    widget_color: bot.widget_color,
    widget_greeting: bot.widget_greeting ?? "",
    widget_position: bot.widget_position,
    allowed_origins: (bot.allowed_origins ?? []).join("\n"),
    handoff_email: bot.handoff_email ?? "",
    follow_up_enabled: bot.follow_up_enabled,
    whatsapp_phone_number_id: bot.whatsapp_phone_number_id ?? "",
    whatsapp_access_token: bot.whatsapp_access_token ?? "",
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link
          href="/dashboard/bots"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl leading-tight tracking-tight">
              {bot.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Nicho: {NICHE_LABELS[bot.niche]}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          ID do bot
        </p>
        <p className="mt-1 font-mono text-sm text-foreground">{bot.id}</p>
      </section>

      <EmbedSnippet botId={bot.id} />

      <BotForm mode="edit" botId={bot.id} initialValues={initialValues} />

      <section className="border-t border-border/60 pt-6">
        <h2 className="text-sm font-medium">Zona de perigo</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Excluir o bot remove também todas as conversas e leads associados.
        </p>
        <div className="mt-3">
          <DeleteBotButton botId={bot.id} />
        </div>
      </section>
    </div>
  );
}

function questionsToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.filter((v): v is string => typeof v === "string").join("\n");
}

function EmbedSnippet({ botId }: { botId: string }) {
  const snippet = `<script\n  src="SEU_DOMINIO/widget.js"\n  data-bot-id="${botId}"\n  defer\n></script>`;
  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Código de incorporação
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cole este snippet antes de <code>&lt;/body&gt;</code> no site do
          cliente. Troque <code>SEU_DOMINIO</code> pela URL onde o Nerva está
          hospedado (em dev: <code>http://localhost:3000</code>).
        </p>
      </div>
      <pre className="overflow-x-auto rounded-md border border-border/60 bg-background/60 p-3 font-mono text-xs text-foreground">
        {snippet}
      </pre>
      <p className="text-xs text-muted-foreground">
        Pra testar sem publicar:{" "}
        <a
          href={`/widget/${botId}`}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          abrir o widget direto
        </a>
        .
      </p>
    </section>
  );
}

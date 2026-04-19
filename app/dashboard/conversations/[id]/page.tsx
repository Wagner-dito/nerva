import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  STATUS_LABELS,
  TEMPERATURE_LABELS,
  formatDateTime,
  statusClasses,
  temperatureClasses,
  temperatureFromScore,
} from "@/app/dashboard/conversations/helpers";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "id, visitor_id, status, temperature, lead_data, created_at, bots(id, name, niche), leads(name, phone, email, qualification_score)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const bot = Array.isArray(conversation.bots)
    ? conversation.bots[0]
    : conversation.bots;
  const lead = Array.isArray(conversation.leads)
    ? conversation.leads[0]
    : conversation.leads;
  const temp = temperatureFromScore(conversation.temperature);
  const leadData = isRecord(conversation.lead_data) ? conversation.lead_data : {};
  const custom = isRecord(leadData.custom) ? leadData.custom : null;

  return (
    <div className="space-y-8">
      <RealtimeRefresh
        table="messages"
        filter={`conversation_id=eq.${id}`}
      />
      <RealtimeRefresh table="conversations" filter={`id=eq.${id}`} />

      <div>
        <Link
          href="/dashboard/conversations"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl leading-tight tracking-tight">
              {lead?.name?.trim() ||
                `Visitante ${conversation.visitor_id.slice(0, 12)}`}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Bot: {bot?.name ?? "—"} · Iniciada em{" "}
              {formatDateTime(conversation.created_at)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusClasses(conversation.status)}>
              {STATUS_LABELS[conversation.status]}
            </Badge>
            <Badge className={temperatureClasses(temp)}>
              {TEMPERATURE_LABELS[temp]} · {conversation.temperature}/100
            </Badge>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Contato">
          <InfoRow label="Nome" value={lead?.name} />
          <InfoRow label="Telefone" value={lead?.phone} />
          <InfoRow label="Email" value={lead?.email} />
        </InfoCard>

        <InfoCard title="Qualificação">
          <InfoRow label="Intenção" value={asString(leadData.intent)} />
          <InfoRow label="Orçamento" value={asString(leadData.budget)} />
          <InfoRow label="Prazo" value={asString(leadData.timeline)} />
        </InfoCard>

        <InfoCard title="Meta">
          <InfoRow
            label="ID da conversa"
            value={conversation.id}
            mono
          />
          <InfoRow label="Visitor ID" value={conversation.visitor_id} mono />
        </InfoCard>
      </section>

      {custom && Object.keys(custom).length > 0 && (
        <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
          <h2 className="text-sm font-medium">Dados específicos do nicho</h2>
          <pre className="overflow-x-auto rounded-md border border-border/60 bg-background/60 p-3 font-mono text-xs text-foreground">
            {JSON.stringify(custom, null, 2)}
          </pre>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Histórico</h2>
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
          {!messages || messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem mensagens nesta conversa.
            </p>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                createdAt={m.created_at}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  createdAt,
}: {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] space-y-1 rounded-2xl px-3 py-2 text-sm",
          isUser
            ? "rounded-br-sm bg-primary/90 text-primary-foreground"
            : "rounded-bl-sm bg-secondary text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        <p
          className={cn(
            "text-[10px]",
            isUser
              ? "text-primary-foreground/70"
              : "text-muted-foreground"
          )}
        >
          {formatDateTime(createdAt)}
        </p>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <h2 className="text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm",
          mono && "font-mono text-xs",
          !value && "text-muted-foreground"
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
        className
      )}
    >
      {children}
    </span>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

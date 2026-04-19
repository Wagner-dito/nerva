import Link from "next/link";

import { Download } from "lucide-react";

import { ConversationFilters } from "@/app/dashboard/conversations/conversation-filters";
import { Button } from "@/components/ui/button";
import {
  STATUS_LABELS,
  TEMPERATURE_LABELS,
  formatRelative,
  statusClasses,
  temperatureClasses,
  temperatureFromScore,
  type ConversationStatus,
} from "@/app/dashboard/conversations/helpers";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type SearchParams = {
  bot?: string;
  status?: string;
  temp?: string;
};

const VALID_STATUSES: ConversationStatus[] = [
  "active",
  "qualified",
  "closed",
  "abandoned",
];
const VALID_TEMPS = ["cold", "warm", "hot"] as const;

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { bot, status, temp } = await searchParams;
  const supabase = await createClient();

  const statusFilter =
    status && (VALID_STATUSES as string[]).includes(status)
      ? (status as ConversationStatus)
      : null;
  const tempFilter =
    temp && (VALID_TEMPS as readonly string[]).includes(temp)
      ? (temp as (typeof VALID_TEMPS)[number])
      : null;
  const botFilter = bot && isUuid(bot) ? bot : null;

  let query = supabase
    .from("conversations")
    .select(
      "id, visitor_id, status, temperature, created_at, bots(name), leads(name, phone, email)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (botFilter) query = query.eq("bot_id", botFilter);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (tempFilter === "cold") query = query.lt("temperature", 41);
  if (tempFilter === "warm")
    query = query.gte("temperature", 41).lt("temperature", 85);
  if (tempFilter === "hot") query = query.gte("temperature", 85);

  const [{ data: conversations }, { data: bots }] = await Promise.all([
    query,
    supabase.from("bots").select("id, name").order("name", { ascending: true }),
  ]);

  const hasFilters = Boolean(botFilter || statusFilter || tempFilter);

  return (
    <div className="space-y-6">
      <RealtimeRefresh table="conversations" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-4xl leading-tight tracking-tight">
            Conversas
          </h1>
          <p className="text-sm text-muted-foreground">
            Tudo que os visitantes estão conversando com seus bots. Clique pra
            ver o histórico completo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs text-accent">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
            Ao vivo
          </span>
          <Button asChild variant="outline" size="sm">
            <a href="/api/leads/export" download>
              <Download />
              Exportar CSV
            </a>
          </Button>
        </div>
      </div>

      <ConversationFilters bots={bots ?? []} />

      {!conversations || conversations.length === 0 ? (
        <EmptyState filtered={hasFilters} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <Th>Visitante</Th>
                <Th>Bot</Th>
                <Th>Status</Th>
                <Th>Score</Th>
                <Th>Iniciada</Th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c) => {
                const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads;
                const bot = Array.isArray(c.bots) ? c.bots[0] : c.bots;
                const t = temperatureFromScore(c.temperature);
                const displayName =
                  lead?.name?.trim() || `Visitante ${c.visitor_id.slice(0, 8)}`;
                const contact = lead?.phone || lead?.email || null;

                return (
                  <tr
                    key={c.id}
                    className="border-t border-border/60 transition-colors hover:bg-card/60"
                  >
                    <Td>
                      <Link
                        href={`/dashboard/conversations/${c.id}`}
                        className="block"
                      >
                        <div className="font-medium text-foreground">
                          {displayName}
                        </div>
                        {contact && (
                          <div className="text-xs text-muted-foreground">
                            {contact}
                          </div>
                        )}
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/conversations/${c.id}`}
                        className="block text-foreground"
                      >
                        {bot?.name ?? "—"}
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/conversations/${c.id}`}
                        className="block"
                      >
                        <Badge className={statusClasses(c.status)}>
                          {STATUS_LABELS[c.status]}
                        </Badge>
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/conversations/${c.id}`}
                        className="flex items-center gap-2"
                      >
                        <span className="font-mono text-foreground">
                          {c.temperature}
                        </span>
                        <Badge className={temperatureClasses(t)}>
                          {TEMPERATURE_LABELS[t]}
                        </Badge>
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/conversations/${c.id}`}
                        className="block text-muted-foreground"
                      >
                        {formatRelative(c.created_at)}
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
      <h2 className="font-serif text-2xl tracking-tight">
        {filtered ? "Nada encontrado" : "Ainda sem conversas"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {filtered
          ? "Nenhuma conversa bate com os filtros. Tente limpar ou ajustar."
          : "Assim que algum visitante conversar com seus bots, as conversas aparecem aqui."}
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
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

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

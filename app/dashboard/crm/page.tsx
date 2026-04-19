import Link from "next/link";
import { Download } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const COLUMN_ORDER: ConversationStatus[] = [
  "active",
  "qualified",
  "closed",
  "abandoned",
];

const COLUMN_DESCRIPTIONS: Record<ConversationStatus, string> = {
  active: "Conversas abertas sendo qualificadas pelo bot.",
  qualified: "Prontas pra vendedor. Score alto ou handoff pedido.",
  closed: "Encerradas — venda ou despedida.",
  abandoned: "Visitante sumiu sem fechar.",
};

type Row = {
  id: string;
  visitor_id: string;
  status: ConversationStatus;
  temperature: number;
  created_at: string;
  bots: { name: string } | { name: string }[] | null;
  leads:
    | { name: string | null; phone: string | null; email: string | null }
    | { name: string | null; phone: string | null; email: string | null }[]
    | null;
};

export default async function CrmPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("conversations")
    .select(
      "id, visitor_id, status, temperature, created_at, bots(name), leads(name, phone, email)"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const byStatus: Record<ConversationStatus, Row[]> = {
    active: [],
    qualified: [],
    closed: [],
    abandoned: [],
  };
  for (const r of (rows ?? []) as Row[]) {
    byStatus[r.status].push(r);
  }

  return (
    <div className="space-y-6">
      <RealtimeRefresh table="conversations" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-4xl leading-tight tracking-tight">
            CRM
          </h1>
          <p className="text-sm text-muted-foreground">
            Pipeline visual. Conversas movem automaticamente conforme o bot
            qualifica. Score ≥ 85 ou pedido explícito de humano → Qualificada.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/leads/export" download>
            <Download />
            Exportar CSV
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMN_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            items={byStatus[status]}
          />
        ))}
      </div>
    </div>
  );
}

function Column({
  status,
  items,
}: {
  status: ConversationStatus;
  items: Row[];
}) {
  return (
    <div className="flex min-h-[320px] flex-col rounded-xl border border-border/60 bg-card/30">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
              statusClasses(status)
            )}
          >
            {STATUS_LABELS[status]}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {items.length}
          </span>
        </div>
      </div>
      <p className="px-3 pb-2 pt-2 text-[11px] text-muted-foreground">
        {COLUMN_DESCRIPTIONS[status]}
      </p>
      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Nenhuma aqui.
          </p>
        ) : (
          items.map((r) => <Card key={r.id} row={r} />)
        )}
      </div>
    </div>
  );
}

function Card({ row }: { row: Row }) {
  const bot = Array.isArray(row.bots) ? row.bots[0] : row.bots;
  const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
  const name =
    lead?.name?.trim() || `Visitante ${row.visitor_id.slice(0, 8)}`;
  const contact = lead?.phone || lead?.email;
  const temp = temperatureFromScore(row.temperature);

  return (
    <Link
      href={`/dashboard/conversations/${row.id}`}
      className="block rounded-lg border border-border/60 bg-card/60 p-3 transition-colors hover:border-primary/60 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">
          {name}
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px]",
            temperatureClasses(temp)
          )}
        >
          {row.temperature}
        </span>
      </div>
      {contact && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {contact}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{bot?.name ?? "—"}</span>
        <span className="shrink-0">{formatRelative(row.created_at)}</span>
      </div>
      <p className="sr-only">
        Temperatura: {TEMPERATURE_LABELS[temp]}
      </p>
    </Link>
  );
}

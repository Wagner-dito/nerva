import Link from "next/link";
import { Bot, Flame, MessagesSquare, Target } from "lucide-react";

import {
  STATUS_LABELS,
  TEMPERATURE_LABELS,
  formatRelative,
  statusClasses,
  temperatureClasses,
  temperatureFromScore,
} from "@/app/dashboard/conversations/helpers";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const SAMPLE_LIMIT = 500;
const RECENT_LIMIT = 5;

export default async function DashboardPage() {
  const supabase = await createClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    conversations24h,
    qualifiedTotal,
    botsCount,
    recent,
    scoreSamples,
  ] = await Promise.all([
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since24h),
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("status", "qualified"),
    supabase.from("bots").select("*", { count: "exact", head: true }),
    supabase
      .from("conversations")
      .select(
        "id, visitor_id, status, temperature, created_at, bots(name), leads(name)"
      )
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabase.from("conversations").select("temperature").limit(SAMPLE_LIMIT),
  ]);

  const samples = scoreSamples.data ?? [];
  const avgScore =
    samples.length > 0
      ? Math.round(
          samples.reduce((acc, s) => acc + (s.temperature ?? 0), 0) /
            samples.length
        )
      : 0;

  const dist = {
    hot: samples.filter((s) => s.temperature >= 85).length,
    warm: samples.filter((s) => s.temperature >= 41 && s.temperature < 85)
      .length,
    cold: samples.filter((s) => s.temperature < 41).length,
  };

  return (
    <div className="space-y-8">
      <RealtimeRefresh table="conversations" />
      <RealtimeRefresh table="messages" />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-4xl leading-tight tracking-tight">
            Visão geral
          </h1>
          <p className="text-sm text-muted-foreground">
            O pulso do seu atendimento com IA.
          </p>
        </div>
        <LiveBadge />
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<MessagesSquare className="h-4 w-4" />}
          label="Conversas (24h)"
          value={conversations24h.count ?? 0}
        />
        <KpiCard
          icon={<Target className="h-4 w-4" />}
          label="Qualificadas (total)"
          value={qualifiedTotal.count ?? 0}
          accent
        />
        <KpiCard
          icon={<Flame className="h-4 w-4" />}
          label="Score médio"
          value={avgScore}
          suffix="/100"
        />
        <KpiCard
          icon={<Bot className="h-4 w-4" />}
          label="Bots"
          value={botsCount.count ?? 0}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TemperatureBreakdown dist={dist} total={samples.length} />
        <RecentConversations data={recent.data ?? []} />
      </section>
    </div>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs text-accent">
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
      Ao vivo
    </span>
  );
}

function KpiCard({
  icon,
  label,
  value,
  suffix,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "font-serif text-4xl leading-none tracking-tight",
          accent && "text-accent"
        )}
      >
        {value}
        {suffix && (
          <span className="text-lg text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function TemperatureBreakdown({
  dist,
  total,
}: {
  dist: { cold: number; warm: number; hot: number };
  total: number;
}) {
  const rows: { key: "hot" | "warm" | "cold"; count: number }[] = [
    { key: "hot", count: dist.hot },
    { key: "warm", count: dist.warm },
    { key: "cold", count: dist.cold },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-5 lg:col-span-1">
      <h2 className="text-sm font-medium">Temperatura das conversas</h2>
      <p className="text-xs text-muted-foreground">
        Amostra das últimas {Math.min(total, SAMPLE_LIMIT)} conversas.
      </p>
      <div className="space-y-3">
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <div key={row.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                    temperatureClasses(row.key)
                  )}
                >
                  {TEMPERATURE_LABELS[row.key]}
                </span>
                <span className="font-mono text-muted-foreground">
                  {row.count} · {pct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full",
                    row.key === "hot" && "bg-primary",
                    row.key === "warm" && "bg-primary/60",
                    row.key === "cold" && "bg-muted-foreground/40"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type RecentRow = {
  id: string;
  visitor_id: string;
  status: "active" | "qualified" | "closed" | "abandoned";
  temperature: number;
  created_at: string;
  bots: { name: string } | { name: string }[] | null;
  leads:
    | { name: string | null }
    | { name: string | null }[]
    | null;
};

function RecentConversations({ data }: { data: RecentRow[] }) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-5 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Conversas recentes</h2>
        <Link
          href="/dashboard/conversations"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Ver todas →
        </Link>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma conversa ainda. Embeda um bot num site e volte aqui.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {data.map((c) => {
            const bot = Array.isArray(c.bots) ? c.bots[0] : c.bots;
            const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads;
            const name =
              lead?.name?.trim() ||
              `Visitante ${c.visitor_id.slice(0, 8)}`;
            const temp = temperatureFromScore(c.temperature);
            return (
              <li key={c.id}>
                <Link
                  href={`/dashboard/conversations/${c.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-foreground"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {bot?.name ?? "—"} · {formatRelative(c.created_at)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                        statusClasses(c.status)
                      )}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                        temperatureClasses(temp)
                      )}
                    >
                      {c.temperature}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

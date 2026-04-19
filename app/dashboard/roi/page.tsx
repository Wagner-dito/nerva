import { TrendingUp } from "lucide-react";

import {
  temperatureFromScore,
} from "@/app/dashboard/conversations/helpers";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Row = {
  status: "active" | "qualified" | "closed" | "abandoned";
  temperature: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
};

type Stat = {
  key: string;
  count: number;
  qualified: number;
  avgScore: number;
  hotCount: number;
};

const LOOKBACK_LIMIT = 1000;

export default async function RoiPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(
      "status, temperature, utm_source, utm_medium, utm_campaign, referrer"
    )
    .order("created_at", { ascending: false })
    .limit(LOOKBACK_LIMIT);

  const rows = (data ?? []) as Row[];

  const bySource = groupBy(rows, (r) => r.utm_source ?? "(sem utm_source)");
  const byMedium = groupBy(rows, (r) => r.utm_medium ?? "(sem utm_medium)");
  const byCampaign = groupBy(
    rows,
    (r) => r.utm_campaign ?? "(sem utm_campaign)"
  );
  const byReferrer = groupBy(
    rows.filter((r) => r.referrer),
    (r) => refDomain(r.referrer)
  );

  return (
    <div className="space-y-8">
      <RealtimeRefresh table="conversations" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-4xl leading-tight tracking-tight">
            ROI por canal
          </h1>
          <p className="text-sm text-muted-foreground">
            De onde vêm as conversas que fecham. Base: últimas{" "}
            {Math.min(rows.length, LOOKBACK_LIMIT)} conversas.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
          <TrendingUp className="h-3 w-3" />
          Atribuição via UTM
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatTable title="Por utm_source" stats={bySource} />
        <StatTable title="Por utm_medium" stats={byMedium} />
        <StatTable title="Por utm_campaign" stats={byCampaign} />
        <StatTable title="Por origem (referrer)" stats={byReferrer} />
      </div>
    </div>
  );
}

function groupBy(rows: Row[], key: (r: Row) => string): Stat[] {
  const buckets = new Map<string, Row[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = buckets.get(k);
    if (arr) arr.push(r);
    else buckets.set(k, [r]);
  }
  const stats: Stat[] = [];
  for (const [k, items] of buckets) {
    const count = items.length;
    const qualified = items.filter((r) => r.status === "qualified").length;
    const hot = items.filter(
      (r) => temperatureFromScore(r.temperature) === "hot"
    ).length;
    const avg =
      items.reduce((acc, r) => acc + r.temperature, 0) / Math.max(1, count);
    stats.push({
      key: k,
      count,
      qualified,
      hotCount: hot,
      avgScore: Math.round(avg),
    });
  }
  stats.sort((a, b) => b.count - a.count);
  return stats;
}

function refDomain(ref: string | null): string {
  if (!ref) return "(direto)";
  try {
    return new URL(ref).hostname;
  } catch {
    return ref.slice(0, 40);
  }
}

function StatTable({ title, stats }: { title: string; stats: Stat[] }) {
  const total = stats.reduce((a, s) => a + s.count, 0);

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {stats.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border/60">
          <table className="w-full text-xs">
            <thead className="bg-card/60 text-left uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Fonte</th>
                <th className="px-3 py-2 text-right font-medium">Conv.</th>
                <th className="px-3 py-2 text-right font-medium">%</th>
                <th className="px-3 py-2 text-right font-medium">Qualif.</th>
                <th className="px-3 py-2 text-right font-medium">Quentes</th>
                <th className="px-3 py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {stats.slice(0, 12).map((s) => {
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return (
                  <tr
                    key={s.key}
                    className="border-t border-border/60"
                  >
                    <td className="max-w-[180px] truncate px-3 py-2 text-foreground">
                      {s.key}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {s.count}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {pct}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-accent">
                      {s.qualified}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-primary">
                      {s.hotCount}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        s.avgScore >= 85
                          ? "text-primary"
                          : s.avgScore >= 41
                            ? "text-foreground"
                            : "text-muted-foreground"
                      )}
                    >
                      {s.avgScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

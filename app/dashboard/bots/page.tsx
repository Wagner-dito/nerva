import Link from "next/link";
import { Plus } from "lucide-react";

import { NICHE_LABELS } from "@/app/dashboard/bots/niches";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function BotsPage() {
  const supabase = await createClient();
  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, niche, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-4xl leading-tight tracking-tight">
            Bots
          </h1>
          <p className="text-sm text-muted-foreground">
            Atendentes virtuais configurados pra qualificar seus leads.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/bots/new">
            <Plus />
            Novo bot
          </Link>
        </Button>
      </div>

      {!bots || bots.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <li key={bot.id}>
              <Link
                href={`/dashboard/bots/${bot.id}`}
                className="block rounded-xl border border-border/60 bg-card/60 p-5 transition-colors hover:border-primary/60 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif text-2xl leading-none tracking-tight">
                    {bot.name}
                  </h2>
                  <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
                    {NICHE_LABELS[bot.niche]}
                  </span>
                </div>
                <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                  {bot.id}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
      <h2 className="font-serif text-2xl tracking-tight">
        Você ainda não tem bots
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Crie o primeiro pra começar a qualificar leads no seu site.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard/bots/new">
          <Plus />
          Criar primeiro bot
        </Link>
      </Button>
    </div>
  );
}

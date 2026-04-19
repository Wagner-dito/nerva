import Link from "next/link";
import { Calendar, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CalendarCard({
  botId,
  connected,
  flashSuccess,
  flashError,
}: {
  botId: string;
  connected: boolean;
  flashSuccess?: boolean;
  flashError?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border bg-card/40 p-4",
        connected ? "border-accent/40" : "border-border/60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Google Calendar
          </p>
        </div>
        {connected && (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
            <Check className="h-3 w-3" />
            Conectado
          </span>
        )}
      </div>

      {flashSuccess && (
        <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
          Conexão estabelecida. Sofia já pode consultar horários livres.
        </p>
      )}
      {flashError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Erro: {flashError}
        </p>
      )}

      {connected ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            O bot consulta slots livres de 30 min (seg-sex, 9h-12h e 14h-18h)
            pros próximos 14 dias e oferece ao visitante. Confirma de um slot
            = evento criado automaticamente.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/api/google/connect?bot_id=${botId}`}>
              Reconectar
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Conecte a agenda Google do profissional. O bot vai buscar slots
            livres em tempo real e marcar os agendamentos direto na agenda.
          </p>
          <Button asChild>
            <Link href={`/api/google/connect?bot_id=${botId}`}>
              Conectar Google Calendar
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

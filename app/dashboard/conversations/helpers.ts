import type { Database } from "@/lib/supabase/types";

export type ConversationStatus =
  Database["public"]["Enums"]["conversation_status"];
export type Temperature = "cold" | "warm" | "hot";

export const STATUS_LABELS: Record<ConversationStatus, string> = {
  active: "Ativa",
  qualified: "Qualificada",
  closed: "Encerrada",
  abandoned: "Abandonada",
};

export function temperatureFromScore(score: number): Temperature {
  if (score >= 85) return "hot";
  if (score >= 41) return "warm";
  return "cold";
}

export const TEMPERATURE_LABELS: Record<Temperature, string> = {
  cold: "Fria",
  warm: "Morna",
  hot: "Quente",
};

export function statusClasses(status: ConversationStatus): string {
  switch (status) {
    case "qualified":
      return "border-accent/40 bg-accent/10 text-accent";
    case "active":
      return "border-primary/40 bg-primary/10 text-primary";
    case "closed":
      return "border-border/60 bg-secondary text-muted-foreground";
    case "abandoned":
      return "border-destructive/40 bg-destructive/10 text-destructive";
  }
}

export function temperatureClasses(t: Temperature): string {
  switch (t) {
    case "hot":
      return "border-primary/60 bg-primary/15 text-primary";
    case "warm":
      return "border-primary/30 bg-primary/5 text-primary";
    case "cold":
      return "border-border/60 bg-secondary text-muted-foreground";
  }
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return "agora";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min atrás`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} h atrás`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `${diffDay} d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

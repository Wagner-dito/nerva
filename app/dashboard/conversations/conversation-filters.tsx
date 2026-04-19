"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type FiltersProps = {
  bots: { id: string; name: string }[];
};

export function ConversationFilters({ bots }: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const bot = searchParams.get("bot") ?? "";
  const status = searchParams.get("status") ?? "";
  const temp = searchParams.get("temp") ?? "";
  const hasFilters = Boolean(bot || status || temp);

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    router.push(next as Route);
  }

  function clear() {
    router.push(pathname as Route);
  }

  const botOptions: Option[] = [
    { value: "", label: "Todos os bots" },
    ...bots.map((b) => ({ value: b.id, label: b.name })),
  ];

  const statusOptions: Option[] = [
    { value: "", label: "Qualquer status" },
    { value: "active", label: "Ativa" },
    { value: "qualified", label: "Qualificada" },
    { value: "closed", label: "Encerrada" },
    { value: "abandoned", label: "Abandonada" },
  ];

  const tempOptions: Option[] = [
    { value: "", label: "Qualquer temperatura" },
    { value: "hot", label: "Quente" },
    { value: "warm", label: "Morna" },
    { value: "cold", label: "Fria" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-3">
      <FilterSelect
        value={bot}
        onChange={(v) => update("bot", v)}
        options={botOptions}
      />
      <FilterSelect
        value={status}
        onChange={(v) => update("status", v)}
        options={statusOptions}
      />
      <FilterSelect
        value={temp}
        onChange={(v) => update("temp", v)}
        options={tempOptions}
      />
      {hasFilters && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Limpar
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-background">
          {o.label}
        </option>
      ))}
    </select>
  );
}

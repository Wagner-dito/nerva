import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase
    .from("leads")
    .select(
      "name, phone, email, qualification_score, created_at, conversations!inner(id, status, lead_data, visitor_id, bots(name))"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return new NextResponse(`Erro: ${error.message}`, { status: 500 });
  }

  const rows = (data ?? []).map((l) => {
    const conv = Array.isArray(l.conversations)
      ? l.conversations[0]
      : l.conversations;
    const bot = conv?.bots
      ? Array.isArray(conv.bots)
        ? conv.bots[0]
        : conv.bots
      : null;
    const leadData = isRecord(conv?.lead_data) ? conv.lead_data : {};

    return {
      nome: l.name ?? "",
      telefone: l.phone ?? "",
      email: l.email ?? "",
      score: l.qualification_score,
      status: conv?.status ?? "",
      bot: bot?.name ?? "",
      intencao: asStr(leadData.intent),
      orcamento: asStr(leadData.budget),
      prazo: asStr(leadData.timeline),
      visitor_id: conv?.visitor_id ?? "",
      conversa_id: conv?.id ?? "",
      criado_em: new Date(l.created_at).toISOString(),
    };
  });

  const csv = toCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-nerva-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

const CSV_HEADERS = [
  "nome",
  "telefone",
  "email",
  "score",
  "status",
  "bot",
  "intencao",
  "orcamento",
  "prazo",
  "visitor_id",
  "conversa_id",
  "criado_em",
] as const;

function toCsv(rows: Record<string, string | number>[]): string {
  const lines = [
    CSV_HEADERS.join(","),
    ...rows.map((r) =>
      CSV_HEADERS.map((h) => csvEscape(r[h])).join(",")
    ),
  ];
  return lines.join("\n");
}

function csvEscape(v: string | number | undefined): string {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asStr(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

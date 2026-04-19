export type HandoffEmailData = {
  botName: string;
  orgName: string;
  leadName: string;
  phone: string | null;
  email: string | null;
  intent: string | null;
  budget: string | null;
  timeline: string | null;
  score: number;
  reason: string | null;
  urgency: "low" | "medium" | "high" | null;
  conversationUrl: string;
};

const URGENCY_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export function renderHandoffEmail(data: HandoffEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const urgencyTag =
    data.urgency === "high" ? "urgente" : data.score >= 85 ? "quente" : "morno";
  const subject = `[Nerva] Lead ${urgencyTag} — ${data.leadName}`;

  const fields: [string, string | null][] = [
    ["Nome", data.leadName],
    ["Telefone", data.phone],
    ["Email", data.email],
    ["Score", `${data.score} / 100`],
    ["Intenção", data.intent],
    ["Orçamento", data.budget],
    ["Prazo", data.timeline],
    ["Urgência", data.urgency ? URGENCY_LABEL[data.urgency] : null],
    ["Motivo", data.reason],
  ];

  const text = [
    `${data.botName} (${data.orgName}) detectou um lead ${urgencyTag} agora.`,
    "",
    ...fields
      .filter(([, v]) => v !== null && v !== "")
      .map(([k, v]) => `${k}: ${v}`),
    "",
    `Ver conversa: ${data.conversationUrl}`,
  ].join("\n");

  const rows = fields
    .filter(([, v]) => v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr>
           <td style="padding:8px 12px;border-bottom:1px solid #2a2a33;color:#9a9aa3;font-size:13px;width:120px">${k}</td>
           <td style="padding:8px 12px;border-bottom:1px solid #2a2a33;color:#f5f5f5;font-size:14px">${escapeHtml(v as string)}</td>
         </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background:#0A0A0F;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#1E1E26;border:1px solid #2a2a33;border-radius:12px;overflow:hidden">
    <div style="padding:24px 28px;border-bottom:1px solid #2a2a33">
      <div style="font-size:11px;letter-spacing:0.1em;color:#FF5A1F;text-transform:uppercase;margin-bottom:8px">Lead ${urgencyTag}</div>
      <h1 style="margin:0;font-size:22px;font-weight:500;color:#f5f5f5;font-family:Georgia,serif">${escapeHtml(data.leadName)}</h1>
      <p style="margin:6px 0 0;font-size:14px;color:#9a9aa3">
        ${escapeHtml(data.botName)} · ${escapeHtml(data.orgName)}
      </p>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <tbody>${rows}</tbody>
    </table>
    <div style="padding:24px 28px;border-top:1px solid #2a2a33">
      <a href="${escapeAttr(data.conversationUrl)}"
         style="display:inline-block;padding:10px 20px;background:#FF5A1F;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
         Ver conversa completa
      </a>
    </div>
    <div style="padding:16px 28px;background:#17171d;font-size:11px;color:#6b6b74;text-align:center">
      Você recebe este email porque está configurado como contato de handoff do bot.
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

import "server-only";

const GRAPH_VERSION = "v21.0";

export async function sendWhatsAppText(params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(params.phoneNumberId)}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizeBrazilianMobile(params.to),
        type: "text",
        text: { body: params.body },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

// Meta reports Brazilian mobiles in webhook without the extra "9" (legacy
// 8-digit format), but the Graph API requires the "9" when sending back.
// Re-insert it for 12-digit numbers starting with 55.
function normalizeBrazilianMobile(to: string): string {
  if (to.length === 12 && to.startsWith("55")) {
    return `${to.slice(0, 4)}9${to.slice(4)}`;
  }
  return to;
}

// Meta webhook payload types (minimal, what we actually use)
export type WhatsAppInboundMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
};

export type WhatsAppWebhookPayload = {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        messages?: WhatsAppInboundMessage[];
        statuses?: unknown[];
      };
      field: string;
    }>;
  }>;
};

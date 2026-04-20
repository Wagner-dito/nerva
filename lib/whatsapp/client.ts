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
  audio?: { id: string; mime_type?: string; voice?: boolean };
};

/**
 * Baixa um arquivo de mídia (áudio/imagem/doc) do WhatsApp em 2 calls:
 *  1. GET /{media_id} → pega URL temporária + mimeType
 *  2. GET {url} → binário (autenticado com o mesmo access token)
 */
export async function downloadWhatsAppMedia(params: {
  mediaId: string;
  accessToken: string;
}): Promise<{ data: Uint8Array; mimeType: string } | null> {
  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(params.mediaId)}`,
      { headers: { Authorization: `Bearer ${params.accessToken}` } }
    );
    if (!metaRes.ok) {
      console.error(
        "[whatsapp] media metadata fetch failed:",
        metaRes.status
      );
      return null;
    }
    const meta = (await metaRes.json()) as {
      url?: string;
      mime_type?: string;
    };
    if (!meta.url) return null;

    const binRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    });
    if (!binRes.ok) {
      console.error("[whatsapp] media binary fetch failed:", binRes.status);
      return null;
    }
    const buf = await binRes.arrayBuffer();
    return {
      data: new Uint8Array(buf),
      mimeType: meta.mime_type ?? "application/octet-stream",
    };
  } catch (err) {
    console.error("[whatsapp] downloadMedia threw:", err);
    return null;
  }
}

/** Converte Uint8Array em base64. Compatível com Edge runtime. */
export function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

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

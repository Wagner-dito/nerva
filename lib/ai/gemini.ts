import "server-only";

import { serverEnv } from "@/lib/env.server";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export type GeminiContent = {
  role: "user" | "model";
  parts: { text: string }[];
};

export type GeminiConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
};

/**
 * Calls Gemini's generateContent endpoint via plain fetch. Works in both
 * Node and Edge runtimes (avoids the @google/genai SDK which pulls Node
 * streams/Buffer and silently fails on Edge).
 */
export async function generateContent(params: {
  model: string;
  systemInstruction: string;
  contents: GeminiContent[];
  config?: GeminiConfig;
}): Promise<string> {
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(
    params.model
  )}:generateContent?key=${encodeURIComponent(serverEnv.GEMINI_API_KEY)}`;

  const body = {
    contents: params.contents,
    systemInstruction: { parts: [{ text: params.systemInstruction }] },
    generationConfig: {
      temperature: params.config?.temperature ?? 0.6,
      maxOutputTokens: params.config?.maxOutputTokens ?? 2048,
      responseMimeType: params.config?.responseMimeType ?? "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("");
}

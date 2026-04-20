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

/**
 * Uses Gemini multimodal to transcribe an audio clip. Returns the plain text.
 * WhatsApp áudio chega como OGG/opus (`audio/ogg`). Gemini aceita direto.
 */
export async function transcribeAudio(params: {
  audioBase64: string;
  mimeType: string;
  model?: string;
}): Promise<string> {
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(
    params.model ?? "gemini-2.5-flash"
  )}:generateContent?key=${encodeURIComponent(serverEnv.GEMINI_API_KEY)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Transcreva este áudio em português brasileiro. Retorne APENAS o texto falado, sem comentários, sem formatação, sem timestamps. Se não houver fala audível, retorne uma string vazia.",
          },
          {
            inlineData: {
              mimeType: params.mimeType,
              data: params.audioBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini transcribe ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

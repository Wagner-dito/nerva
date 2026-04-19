import "server-only";

import { Resend } from "resend";

import { serverEnv } from "@/lib/env.server";

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (!serverEnv.RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(serverEnv.RESEND_API_KEY);
  return cachedClient;
}

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const client = getClient();
  if (!client) {
    console.warn("[email] Resend not configured; skipping send.");
    return false;
  }

  const from =
    serverEnv.RESEND_FROM_EMAIL ?? "Nerva <onboarding@resend.dev>";

  const { error } = await client.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) {
    console.error("[email] send failed", error);
    return false;
  }
  return true;
}

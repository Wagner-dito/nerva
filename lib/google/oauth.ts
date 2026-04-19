import "server-only";

import { google } from "googleapis";

import { serverEnv } from "@/lib/env.server";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export function getOAuthClient(redirectUri: string) {
  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  return new google.auth.OAuth2(
    serverEnv.GOOGLE_CLIENT_ID,
    serverEnv.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function buildConsentUrl(
  redirectUri: string,
  state: string
): string | null {
  const client = getOAuthClient(redirectUri);
  if (!client) return null;
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // ensures we get a refresh_token even after re-auth
    scope: GOOGLE_SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(
  redirectUri: string,
  code: string
): Promise<{ refreshToken: string | null; accessToken: string | null } | null> {
  const client = getOAuthClient(redirectUri);
  if (!client) return null;
  const { tokens } = await client.getToken(code);
  return {
    refreshToken: tokens.refresh_token ?? null,
    accessToken: tokens.access_token ?? null,
  };
}

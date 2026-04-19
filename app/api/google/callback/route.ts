import { NextResponse } from "next/server";

import { exchangeCodeForTokens } from "@/lib/google/oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const botId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/dashboard/bots/${botId}?google_error=${encodeURIComponent(error)}`
    );
  }
  if (!code || !botId) {
    return NextResponse.redirect(`${origin}/dashboard/bots`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const redirectUri = `${origin}/api/google/callback`;
  const tokens = await exchangeCodeForTokens(redirectUri, code);
  if (!tokens || !tokens.refreshToken) {
    return NextResponse.redirect(
      `${origin}/dashboard/bots/${botId}?google_error=no_refresh_token`
    );
  }

  // Use admin client to persist the refresh token regardless of RLS role.
  const admin = createAdminClient();
  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", botId)
    .maybeSingle();
  if (!bot) {
    return NextResponse.redirect(`${origin}/dashboard/bots`);
  }

  await admin
    .from("bots")
    .update({
      google_refresh_token: tokens.refreshToken,
      google_calendar_id: "primary",
    })
    .eq("id", botId);

  return NextResponse.redirect(
    `${origin}/dashboard/bots/${botId}?google_connected=1`
  );
}

import { NextResponse } from "next/server";

import { buildConsentUrl } from "@/lib/google/oauth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const botId = searchParams.get("bot_id");
  if (!botId) {
    return NextResponse.json({ error: "bot_id obrigatório" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  // Confirm user owns the bot (RLS via current_org_id)
  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", botId)
    .maybeSingle();
  if (!bot) {
    return NextResponse.json({ error: "Bot não encontrado" }, { status: 404 });
  }

  const redirectUri = `${origin}/api/google/callback`;
  const consentUrl = buildConsentUrl(redirectUri, botId);
  if (!consentUrl) {
    return NextResponse.json(
      { error: "Google OAuth não configurado no servidor." },
      { status: 503 }
    );
  }

  return NextResponse.redirect(consentUrl);
}

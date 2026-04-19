import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";

import { WidgetClient } from "./widget-client";

export const dynamic = "force-dynamic";

type SearchParams = {
  v?: string;
  u?: string;
  r?: string;
  us?: string;
  um?: string;
  uc?: string;
};

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ botId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { botId } = await params;
  const sp = await searchParams;

  const supabase = createAdminClient();
  const { data: bot } = await supabase
    .from("bots")
    .select("id, name, widget_color, widget_greeting, widget_position")
    .eq("id", botId)
    .maybeSingle();

  if (!bot) notFound();

  return (
    <>
      <style>{`html, body { background: transparent !important; margin: 0; }`}</style>
      <WidgetClient
        botId={bot.id}
        botName={bot.name}
        visitorId={sp.v ?? ""}
        color={bot.widget_color}
        greeting={bot.widget_greeting}
        position={bot.widget_position}
        tracking={{
          source_url: sp.u ?? null,
          referrer: sp.r ?? null,
          utm_source: sp.us ?? null,
          utm_medium: sp.um ?? null,
          utm_campaign: sp.uc ?? null,
        }}
      />
    </>
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { serverEnv } from "@/lib/env.server";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  plan: z.enum(["starter", "pro"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe não configurado no servidor." },
      { status: 503 }
    );
  }

  const priceId =
    parsed.data.plan === "starter"
      ? serverEnv.STRIPE_PRICE_STARTER
      : serverEnv.STRIPE_PRICE_PRO;
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID não configurado pra ${parsed.data.plan}.` },
      { status: 503 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  }
  if (profile.role !== "owner") {
    return NextResponse.json(
      { error: "Apenas o owner pode gerenciar billing." },
      { status: 403 }
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name, stripe_customer_id")
    .eq("id", profile.org_id)
    .single();
  if (!org) {
    return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
  }

  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: org.name,
      metadata: { org_id: profile.org_id },
    });
    customerId = customer.id;
    await supabase
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", profile.org_id);
  }

  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/billing?success=1`,
    cancel_url: `${origin}/dashboard/billing?canceled=1`,
    client_reference_id: profile.org_id,
    metadata: { org_id: profile.org_id, plan: parsed.data.plan },
  });

  if (!session.url) {
    return NextResponse.json({ error: "URL não gerada" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

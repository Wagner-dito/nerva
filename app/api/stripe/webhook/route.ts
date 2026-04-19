import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { serverEnv } from "@/lib/env.server";
import { getStripe, resolvePlanFromPriceId } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !serverEnv.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook não configurado" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: `Invalid signature: ${msg}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId =
          session.metadata?.org_id ?? session.client_reference_id ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;
        if (!orgId || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const firstItem = sub.items.data[0];
        const priceId = firstItem?.price.id;
        const plan = resolvePlanFromPriceId(priceId);

        await supabase
          .from("organizations")
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            current_period_end: toIso(firstItem?.current_period_end ?? null),
            plan,
          })
          .eq("id", orgId);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (!org) break;

        const firstItem = sub.items.data[0];
        const priceId = firstItem?.price.id;
        const plan =
          event.type === "customer.subscription.deleted"
            ? "free"
            : resolvePlanFromPriceId(priceId);

        await supabase
          .from("organizations")
          .update({
            stripe_subscription_id:
              event.type === "customer.subscription.deleted" ? null : sub.id,
            subscription_status: sub.status,
            current_period_end: toIso(firstItem?.current_period_end ?? null),
            plan,
          })
          .eq("id", org.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return NextResponse.json(
      { error: "Handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

function toIso(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

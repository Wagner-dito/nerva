import "server-only";

import Stripe from "stripe";

import { serverEnv } from "@/lib/env.server";

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!serverEnv.STRIPE_SECRET_KEY) return null;
  if (!cached) {
    cached = new Stripe(serverEnv.STRIPE_SECRET_KEY);
  }
  return cached;
}

export function resolvePlanFromPriceId(
  priceId: string | null | undefined
): "starter" | "pro" | "free" {
  if (!priceId) return "free";
  if (priceId === serverEnv.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === serverEnv.STRIPE_PRICE_PRO) return "pro";
  return "free";
}

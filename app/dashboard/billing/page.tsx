import { redirect } from "next/navigation";
import { Check } from "lucide-react";

import { PLANS, type PlanKey } from "@/lib/stripe/plans";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { PortalButton, UpgradeButton } from "./billing-actions";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { success, canceled } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/dashboard");

  const canManage = profile.role === "owner";

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "name, plan, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end"
    )
    .eq("id", profile.org_id)
    .single();

  const currentPlan = (org?.plan ?? "free") as PlanKey;
  const hasActiveSubscription = Boolean(org?.stripe_subscription_id);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-serif text-4xl leading-tight tracking-tight">
          Faturamento
        </h1>
        <p className="text-sm text-muted-foreground">
          Seu plano atual e opções de upgrade.
        </p>
      </div>

      {success === "1" && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
          Assinatura ativada. Em alguns segundos o plano atualiza via webhook.
        </div>
      )}
      {canceled === "1" && (
        <div className="rounded-lg border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          Checkout cancelado. Nada foi cobrado.
        </div>
      )}

      <section className="rounded-xl border border-primary/40 bg-primary/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Plano atual
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-serif text-3xl">
                {PLANS[currentPlan].label}
              </span>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {PLANS[currentPlan].priceLabel}
              </span>
            </div>
            {org?.subscription_status && (
              <p className="mt-1 text-xs text-muted-foreground">
                Status: {org.subscription_status}
                {org.current_period_end
                  ? ` · renova em ${new Date(org.current_period_end).toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
            )}
          </div>
          {canManage && hasActiveSubscription && (
            <PortalButton />
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium">Planos disponíveis</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => (
            <PlanCard
              key={key}
              planKey={key}
              current={currentPlan}
              canManage={canManage}
            />
          ))}
        </div>
      </section>

      {!canManage && (
        <p className="text-xs text-muted-foreground">
          Apenas o owner da organização pode alterar o plano.
        </p>
      )}
    </div>
  );
}

function PlanCard({
  planKey,
  current,
  canManage,
}: {
  planKey: PlanKey;
  current: PlanKey;
  canManage: boolean;
}) {
  const plan = PLANS[planKey];
  const isCurrent = planKey === current;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card/40 p-6",
        isCurrent
          ? "border-primary/60"
          : "border-border/60 hover:border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-serif text-xl">{plan.label}</span>
        {isCurrent && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-mono text-primary">
            ATUAL
          </span>
        )}
      </div>
      <p className="mt-2 font-serif text-2xl text-primary">
        {plan.priceLabel}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-xs">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {isCurrent ? (
          <p className="text-center text-xs text-muted-foreground">
            Plano ativo
          </p>
        ) : planKey === "free" ? (
          <p className="text-center text-xs text-muted-foreground">
            Downgrade pelo portal
          </p>
        ) : canManage ? (
          <UpgradeButton
            plan={planKey as "starter" | "pro"}
            variant={planKey === "pro" ? "default" : "outline"}
          >
            {current === "free" ? "Fazer upgrade" : `Mudar pra ${plan.label}`}
          </UpgradeButton>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Só owner pode alterar
          </p>
        )}
      </div>
    </div>
  );
}

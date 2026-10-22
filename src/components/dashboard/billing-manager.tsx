"use client";

import { BadgeEuro, Check, CreditCard, ExternalLink } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ANNUAL_MONTHS_CHARGED,
  PLANS,
  PLAN_ORDER,
  PRICES_ARE_PROVISIONAL,
  annualMonthlyEquivalentCents,
  annualSavingsCents,
  type PlanId,
} from "@/lib/plans";
import { formatCents, formatDate } from "@/lib/utils";
import {
  openBillingPortalAction,
  startPlanCheckoutAction,
} from "@/server/billing/actions";
import { initialBillingActionState } from "@/server/billing/types";
import type { BillingOverview } from "@/server/billing/queries";

type Props = {
  overview: BillingOverview;
  canManage: boolean;
  checkoutResult: string | null;
  billingNotice: string | null;
};

const planStatusLabels: Record<string, string> = {
  not_activated: "Non attivata",
  requested: "Richiesta inviata",
  active: "Attiva",
  canceled: "Annullata",
};

export function BillingManager({
  overview,
  canManage,
  checkoutResult,
  billingNotice,
}: Props) {
  const [state, action, pending] = useActionState(
    startPlanCheckoutAction,
    initialBillingActionState,
  );
  const [interval, setInterval] = useState<"month" | "year">(
    overview.billingInterval ?? "month",
  );

  useEffect(() => {
    if (checkoutResult === "success") {
      toast.success(
        "Checkout completato. L'attivazione arriva dal webhook Stripe in pochi secondi.",
      );
    } else if (checkoutResult === "cancel") {
      toast.info("Checkout annullato: nessun addebito effettuato.");
    }
    if (billingNotice === "missing_customer") {
      toast.error(
        "Nessun cliente Stripe collegato: attiva prima un piano per gestire la fatturazione.",
      );
    } else if (billingNotice === "portal_error") {
      toast.error("Portale di fatturazione non disponibile in questo momento.");
    }
  }, [checkoutResult, billingNotice]);

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  const currentPlan = overview.plan as PlanId | null;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BadgeEuro className="size-4 text-brand-700 dark:text-brand-400" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Abbonamento di {overview.organizationName}
              </h2>
              <Badge
                variant={
                  overview.planStatus === "active"
                    ? "success"
                    : overview.planStatus === "canceled"
                      ? "danger"
                      : "warning"
                }
              >
                {planStatusLabels[overview.planStatus] ?? overview.planStatus}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Piano richiesto:{" "}
              {currentPlan ? PLANS[currentPlan].name : "nessuno"}
              {overview.billingInterval
                ? ` · fatturazione ${overview.billingInterval === "year" ? "annuale" : "mensile"}`
                : ""}
              {overview.planActivatedAt
                ? ` · attivato il ${formatDate(overview.planActivatedAt)}`
                : ""}
              {overview.trialEndsAt
                ? ` · prova fino al ${formatDate(overview.trialEndsAt)}`
                : ""}
            </p>
          </div>
          {canManage && overview.hasStripeCustomer ? (
            <form action={openBillingPortalAction}>
              <Button type="submit" variant="outline" size="sm">
                <CreditCard />
                Gestisci fatturazione
                <ExternalLink />
              </Button>
            </form>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Gli stati di attivazione arrivano esclusivamente dal webhook Stripe
          firmato: il browser non può attivare un piano da solo.{" "}
          {PRICES_ARE_PROVISIONAL
            ? "I prezzi mostrati sono provvisori e non ancora commerciali."
            : ""}
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Piani disponibili
        </h2>
        <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={
              interval === "month"
                ? "rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400"
            }
          >
            Mensile
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={
              interval === "year"
                ? "rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400"
            }
          >
            Annuale · {ANNUAL_MONTHS_CHARGED} mesi
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = currentPlan === planId;
          const monthlyEquivalent = annualMonthlyEquivalentCents(plan);
          const savings = annualSavingsCents(plan);
          const priceLabel =
            plan.monthlyCents === null
              ? "Su preventivo"
              : interval === "month"
                ? `${formatCents(plan.monthlyCents)}/mese`
                : monthlyEquivalent !== null
                  ? `${formatCents(monthlyEquivalent)}/mese`
                  : "";

          return (
            <section
              key={planId}
              className={`rounded-xl border p-5 ${
                plan.highlighted
                  ? "border-brand-300 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-950/20"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {plan.name}
                  </h3>
                  {plan.highlighted ? (
                    <Badge variant="default">Consigliato</Badge>
                  ) : null}
                  {isCurrent ? <Badge variant="info">Piano attuale</Badge> : null}
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {priceLabel}
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {plan.tagline}
              </p>
              {interval === "year" && savings !== null ? (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                  Risparmi {formatCents(savings)} rispetto al mensile.
                </p>
              ) : null}
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              {canManage && plan.monthlyCents !== null ? (
                <form action={action} className="mt-4">
                  <input type="hidden" name="plan" value={planId} />
                  <input type="hidden" name="interval" value={interval} />
                  <Button
                    type="submit"
                    variant={plan.highlighted ? "default" : "outline"}
                    size="sm"
                    disabled={pending}
                  >
                    <CreditCard />
                    {isCurrent && overview.planStatus === "active"
                      ? "Rinnova con Stripe"
                      : "Attiva con Stripe"}
                  </Button>
                </form>
              ) : canManage ? (
                <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                  Contatta il supporto per un preventivo dedicato.
                </p>
              ) : (
                <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                  Solo proprietario o amministratore può cambiare piano.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

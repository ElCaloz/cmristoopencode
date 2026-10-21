"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  annualMonthlyEquivalentCents,
  annualSavingsCents,
  annualTotalCents,
  PLANS,
  PLAN_ORDER,
  PRICES_ARE_PROVISIONAL,
  TRIAL_DAYS,
} from "@/lib/plans";
import { cn, formatCents } from "@/lib/utils";

export function BillingToggle({
  billing,
  onChange,
}: {
  billing: "monthly" | "annual";
  onChange: (value: "monthly" | "annual") => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={cn(
          "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
          billing === "monthly"
            ? "bg-zinc-900 text-white"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
        )}
      >
        Mensile
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
          billing === "annual"
            ? "bg-zinc-900 text-white"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
        )}
      >
        Annuale
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            billing === "annual"
              ? "bg-white/15 text-white"
              : "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400",
          )}
        >
          2 mesi gratis
        </span>
      </button>
    </div>
  );
}

export function PricingCards({
  withToggle = true,
}: {
  withToggle?: boolean;
}) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="space-y-6">
      {withToggle ? (
        <div className="flex flex-col items-center gap-2">
          <BillingToggle billing={billing} onChange={setBilling} />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-300">
            {billing === "annual"
              ? "Fatturazione annuale: 10 mesi al prezzo di 12."
              : "Puoi cambiare o annullare il piano in qualsiasi momento."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const monthly =
            billing === "annual"
              ? annualMonthlyEquivalentCents(plan)
              : plan.monthlyCents;
          const total = annualTotalCents(plan);
          const savings = annualSavingsCents(plan);
          const isCustom = plan.monthlyCents === null;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-xl border bg-white p-5 shadow-xs dark:bg-zinc-900",
                plan.highlighted
                  ? "border-brand-600 ring-1 ring-brand-600/20"
                  : "border-zinc-200 dark:border-zinc-800",
              )}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  <Sparkles className="size-3" />
                  Il più scelto
                </span>
              ) : null}

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {plan.name}
                </h3>
                <p className="min-h-8 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {plan.tagline}
                </p>
              </div>

              <div className="mt-4">
                {isCustom ? (
                  <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Su misura
                  </p>
                ) : (
                  <>
                    <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {monthly !== null ? formatCents(monthly) : "—"}
                      <span className="ml-1 text-xs font-normal text-zinc-500 dark:text-zinc-300">
                        /mese
                      </span>
                    </p>
                    {billing === "annual" && total !== null ? (
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-300">
                        {formatCents(total)} fatturati annualmente
                        {savings ? ` · risparmi ${formatCents(savings)}` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-300">
                        IVA esclusa
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="my-4 h-px bg-zinc-100 dark:bg-zinc-800" />

              <ul className="flex-1 space-y-2">
                <li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                  {plan.users === null
                    ? "Utenti personalizzati"
                    : `Fino a ${plan.users} utenti`}
                </li>
                <li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                  {plan.locations === null
                    ? "Sedi personalizzate"
                    : plan.locations === 1
                      ? "1 sede"
                      : `Fino a ${plan.locations} sedi`}
                </li>
                <li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                  Palmari: fino a {plan.handhelds} per locale
                </li>
                {plan.features.slice(0, 4).map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-5 w-full"
                variant={plan.highlighted ? "default" : "outline"}
                asChild
              >
                <Link href={isCustom ? "/contatti" : "/registrati"}>
                  {isCustom ? "Contatta il commerciale" : `Inizia la prova`}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Prova gratuita di {TRIAL_DAYS} giorni sul piano scelto. Nessun
          pagamento viene elaborato in questa build dimostrativa.
        </p>
        {PRICES_ARE_PROVISIONAL ? (
          <Badge variant="warning">
            Prezzi indicativi e provvisori — non definitivi
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

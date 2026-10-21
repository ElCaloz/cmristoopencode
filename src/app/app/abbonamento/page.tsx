"use client";

import {
  ArrowUpRight,
  Check,
  Info,
  Receipt,
  Smartphone,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { RestaurantStatusBadge } from "@/components/ui/status-badge";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import type { PlanId } from "@/lib/plans";
import {
  annualSavingsCents,
  annualTotalCents,
  PLANS,
  PLAN_ORDER,
  PRICES_ARE_PROVISIONAL,
} from "@/lib/plans";
import { formatCents, formatDate } from "@/lib/utils";

const MAX_HANDHELDS = 4;

export default function AbbonamentoPage() {
  const restaurant = useActiveRestaurant();
  const staff = useDemoStore((state) => state.staff);
  const devices = useDemoStore((state) => state.devices);
  const updateRestaurant = useDemoStore((state) => state.updateRestaurant);

  if (!restaurant) return null;

  const plan = PLANS[restaurant.planId];
  const activeStaff = staff.filter(
    (member) => member.restaurantId === restaurant.id && member.active,
  ).length;
  const handhelds = devices.filter(
    (device) =>
      device.restaurantId === restaurant.id && device.type === "palmare",
  ).length;

  const usage =
    plan.users === null
      ? []
      : [
          {
            label: "Utenti attivi",
            used: activeStaff,
            limit: plan.users,
            icon: Users,
          },
          {
            label: "Palmari associati",
            used: handhelds,
            limit: MAX_HANDHELDS,
            icon: Smartphone,
          },
        ];

  const changePlan = (planId: PlanId) => {
    if (planId === restaurant.planId) return;
    updateRestaurant(restaurant.id, { planId });
    toast.success(`Piano ${PLANS[planId].name} impostato (demo)`, {
      description: "Nessun pagamento reale è stato effettuato.",
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Piano e fatturazione"
        title="Abbonamento"
        description="Piano, utilizzo e prezzi dimostrativi. Nessun pagamento o rinnovo reale è attivo in questa demo."
        badge={<RestaurantStatusBadge status={restaurant.status} />}
        actions={
          restaurant.status === "trial" ? (
            <Badge variant="warning">Prova in corso</Badge>
          ) : (
            <Badge variant="success">Piano attivo</Badge>
          )
        }
      />

      {restaurant.status === "trial" ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950 px-4 py-3">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Prova dimostrativa attiva</span>
            {restaurant.trialEndsAt
              ? ` fino al ${formatDate(`${restaurant.trialEndsAt}T12:00:00`)}`
              : ""}
            . Alla scadenza nessun addebito verrà effettuato in demo.
          </p>
          <Link
            href="/prezzi"
            className="text-[11px] font-medium text-amber-800 dark:text-amber-300 underline-offset-2 hover:underline"
          >
            Vedi i piani pubblici
          </Link>
        </div>
      ) : null}

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Piano corrente
                </p>
                <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {plan.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {plan.monthlyCents === null
                    ? "Su misura"
                    : `${formatCents(plan.monthlyCents)}/mese`}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {PRICES_ARE_PROVISIONAL
                    ? "prezzo dimostrativo provvisorio"
                    : "IVA esclusa"}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {plan.tagline}. Il piano modifica solo le informazioni mostrate
              nella demo: nessun limite viene applicato lato server.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {usage.map((item) => {
                const percent = Math.min(
                  100,
                  Math.round((item.used / item.limit) * 100),
                );
                const over = item.used > item.limit;
                return (
                  <div
                    key={item.label}
                    className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <item.icon className="size-3 text-zinc-500 dark:text-zinc-400" />
                        {item.label}
                      </span>
                      <span className="text-[11px] font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                        {item.used} / {item.limit}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-700/70">
                      <div
                        className={
                          over
                            ? "h-full rounded-full bg-amber-500"
                            : "h-full rounded-full bg-brand-600"
                        }
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {PLAN_ORDER.map((planId) => {
              const item = PLANS[planId];
              const isCurrent = planId === restaurant.planId;
              const annualTotal = annualTotalCents(item);
              const savings = annualSavingsCents(item);
              return (
                <div
                  key={planId}
                  className={
                    isCurrent
                      ? "flex flex-col rounded-xl border border-brand-300 dark:border-brand-700 bg-white dark:bg-zinc-900 p-4 shadow-xs ring-1 ring-brand-200 dark:ring-brand-800"
                      : "flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs"
                  }
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </p>
                    {isCurrent ? (
                      <Badge variant="default">Attuale</Badge>
                    ) : item.highlighted ? (
                      <Badge variant="muted">Consigliato</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                    {item.tagline}
                  </p>
                  <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {item.monthlyCents === null
                      ? "Su misura"
                      : `${formatCents(item.monthlyCents)}`}
                    {item.monthlyCents !== null ? (
                      <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                        /mese
                      </span>
                    ) : null}
                  </p>
                  <p className="min-h-8 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {annualTotal !== null
                      ? `Annuale: ${formatCents(annualTotal)} · risparmi ${formatCents(savings ?? 0)}`
                      : "Preventivo dedicato al gruppo"}
                  </p>
                  <ul className="mt-2 flex-1 space-y-1.5">
                    {item.features.slice(0, 4).map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-1.5 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400"
                      >
                        <Check className="mt-0.5 size-3 shrink-0 text-brand-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    {planId === "enterprise" ? (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link href="/contatti">
                          Contattaci
                          <ArrowUpRight />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant={isCurrent ? "outline" : "default"}
                        size="sm"
                        className="w-full"
                        disabled={isCurrent || restaurant.status === "suspended"}
                        onClick={() => changePlan(planId)}
                      >
                        {isCurrent ? "Piano attuale" : `Passa a ${item.name}`}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-zinc-500 dark:text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Fatturazione</p>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              La fatturazione non è attiva: non esistono fatture, metodi di
              pagamento salvati o addebiti. La scelta del piano in questa pagina
              serve solo a esplorare l&apos;interfaccia.
            </p>
            <div className="mt-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Per attivare un piano reale serviranno integrazione di pagamento,
              webhook idempotenti e verifica lato server: nessuna di queste è
              simulata come funzionante.
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Info className="size-4 text-zinc-500 dark:text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Cosa include il piano
              </p>
            </div>
            <ul className="mt-2 space-y-1.5">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400"
                >
                  <Check className="mt-0.5 size-3 shrink-0 text-brand-600" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
            <Info className="mt-0.5 size-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
            <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              I prezzi mostrati sono provvisori e centralizzati in{" "}
              <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1">src/lib/plans.ts</code>.
              Nessun importo viene calcolato o verificato lato server in questa
              fase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

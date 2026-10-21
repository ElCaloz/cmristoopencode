"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  LayoutDashboard,
  Store,
} from "lucide-react";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { PLANS, PLAN_ORDER, TRIAL_DAYS, type PlanId } from "@/lib/plans";
import { cn, formatCents } from "@/lib/utils";
import { completeOnboardingAction } from "@/server/auth/actions";
import { initialAuthState } from "@/server/auth/types";

const venueTypes = [
  { value: "restaurant", label: "Ristorante" },
  { value: "trattoria", label: "Trattoria" },
  { value: "pizzeria", label: "Pizzeria" },
  { value: "bar", label: "Bar" },
  { value: "bistro", label: "Bistrot" },
  { value: "other", label: "Altro" },
];

export function OnboardingForm({
  email,
}: {
  email: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialAuthState,
  );
  const [step, setStep] = useState(1);
  const [restaurantName, setRestaurantName] = useState("");
  const [city, setCity] = useState("");
  const [venueType, setVenueType] = useState("restaurant");
  const [planId, setPlanId] = useState<PlanId>("pro");

  const stepOneValid = restaurantName.trim().length > 1 && city.trim().length > 1;
  const hasStepOneErrors = Boolean(
    state.fieldErrors?.restaurantName ||
      state.fieldErrors?.city ||
      state.fieldErrors?.venueType,
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-700 text-white">
              <Store className="size-4" />
            </span>
            CM Risto
          </div>
          <Badge variant="success">Onboarding reale</Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Configura il tuo locale
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Due passaggi per creare l&apos;organizzazione e la sede principale.
            {email ? (
              <>
                {" "}Account: <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>.
              </>
            ) : null}
          </p>
        </div>

        <ol className="mb-8 flex items-center gap-2">
          {[
            { id: 1, label: "Il locale", icon: Store },
            { id: 2, label: "Il piano", icon: LayoutDashboard },
          ].map((entry, index) => {
            const active = step === entry.id;
            const done = step > entry.id;
            return (
              <li key={entry.id} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    done
                      ? "border-brand-600 bg-brand-600 text-white"
                      : active
                        ? "border-brand-600 bg-white text-brand-700 dark:bg-zinc-900 dark:text-brand-400"
                        : "border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500",
                  )}
                >
                  {done ? <Check className="size-4" /> : entry.id}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  {entry.label}
                </span>
                {index < 1 ? (
                  <span
                    className={cn("h-px flex-1", done ? "bg-brand-600" : "bg-zinc-200 dark:bg-zinc-700")}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>

        <form action={formAction} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          {state.message ? (
            <div
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-800 dark:border-red-900/50 dark:bg-red-950 dark:text-red-300"
              role="alert"
            >
              {state.message}
            </div>
          ) : null}

          {step === 2 && hasStepOneErrors ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-800 dark:border-red-900/50 dark:bg-red-950 dark:text-red-300" role="alert">
              Alcuni dati del locale non sono validi.{" "}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="font-medium underline underline-offset-2"
              >
                Torna ai dati del locale
              </button>
              .
            </div>
          ) : null}

          <div className={cn("space-y-4", step !== 1 && "hidden")}>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Dati principali del locale
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Verranno salvati nel database come organizzazione e sede principale.
                  Potrai modificarli in seguito.
                </p>
              </div>

              <Field
                label="Nome del locale"
                htmlFor="restaurantName"
                error={state.fieldErrors?.restaurantName}
              >
                <Input
                  id="restaurantName"
                  name="restaurantName"
                  value={restaurantName}
                  onChange={(event) => setRestaurantName(event.target.value)}
                  placeholder="Osteria del Borgo"
                  autoComplete="organization"
                  aria-invalid={Boolean(state.fieldErrors?.restaurantName)}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Città" htmlFor="city" error={state.fieldErrors?.city}>
                  <Input
                    id="city"
                    name="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Firenze"
                    autoComplete="address-level2"
                    aria-invalid={Boolean(state.fieldErrors?.city)}
                  />
                </Field>
                <Field
                  label="Tipo di locale"
                  htmlFor="venueType"
                  error={state.fieldErrors?.venueType}
                >
                  <Select
                    id="venueType"
                    name="venueType"
                    value={venueType}
                    onChange={(event) => setVenueType(event.target.value)}
                  >
                    {venueTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">
                <Info className="mt-0.5 size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                Il tuo account diventa automaticamente Proprietario dell&apos;organizzazione.
                Il ruolo viene assegnato dal database, non dal browser.
              </div>
          </div>

          <div className={cn("space-y-4", step !== 2 && "hidden")}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Scegli il piano</h2>
                  <Badge variant="warning">Prezzi provvisori</Badge>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  La prova dura {TRIAL_DAYS} giorni. La scelta registra solo una
                  preferenza: non attiva pagamenti né abbonamenti reali.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {PLAN_ORDER.map((id) => {
                  const plan = PLANS[id];
                  const selected = planId === id;
                  return (
                    <label
                      key={id}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 text-left transition-colors",
                        selected
                          ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600/20 dark:bg-brand-950/50"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
                      )}
                    >
                      <input
                        type="radio"
                        name="planId"
                        value={id}
                        checked={selected}
                        onChange={() => setPlanId(id)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {plan.name}
                        </span>
                        {selected ? <Check className="size-4 text-brand-700 dark:text-brand-400" /> : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{plan.tagline}</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {plan.monthlyCents === null
                          ? "Su misura"
                          : `${formatCents(plan.monthlyCents)}/mese`}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                        {plan.users === null
                          ? "Utenti personalizzati"
                          : `${plan.users} utenti`}{" "}
                        ·{" "}
                        {plan.locations === null
                          ? "sedi su misura"
                          : `${plan.locations} sedi`}
                      </p>
                    </label>
                  );
                })}
              </div>

              {state.fieldErrors?.planId ? (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {state.fieldErrors.planId}
                </p>
              ) : null}

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Riepilogo</p>
                <dl className="mt-2 grid gap-1.5 text-xs text-zinc-500 sm:grid-cols-2 dark:text-zinc-400">
                  <div className="flex justify-between gap-2">
                    <dt>Locale</dt>
                    <dd className="font-medium text-zinc-700 dark:text-zinc-300">{restaurantName || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Città</dt>
                    <dd className="font-medium text-zinc-700 dark:text-zinc-300">{city || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Tipo</dt>
                    <dd className="font-medium text-zinc-700 dark:text-zinc-300">
                      {venueTypes.find((type) => type.value === venueType)?.label ??
                        "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Piano richiesto</dt>
                    <dd className="font-medium text-zinc-700 dark:text-zinc-300">{PLANS[planId].name}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Stato attivazione: <strong>non attivata</strong>. Non verrà richiesto
                  alcun metodo di pagamento.
                </p>
              </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-between dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={step === 1 || pending}
            >
              <ArrowLeft />
              Indietro
            </Button>
            {step === 1 ? (
              <Button
                key="step-next"
                type="button"
                onClick={() => setStep(2)}
                disabled={!stepOneValid}
              >
                Avanti
                <ArrowRight />
              </Button>
            ) : (
              <Button key="step-submit" type="submit" disabled={pending}>
                {pending ? "Creazione in corso..." : "Crea il locale"}
                {pending ? null : <ArrowRight />}
              </Button>
            )}
          </div>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Onboarding reale su Supabase. Nessun addebito, nessuna attivazione
          commerciale automatica. La demo interattiva resta separata e accessibile
          senza account.
        </p>
      </main>
    </div>
  );
}

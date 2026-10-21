"use client";

import { CheckCircle2, Info } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signUpAction } from "@/server/auth/actions";
import { initialAuthState } from "@/server/auth/types";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialAuthState);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-5 dark:border-brand-800 dark:bg-brand-950/60">
          <CheckCircle2 className="size-6 text-brand-700 dark:text-brand-400" />
          <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Controlla la tua email
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{state.message}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/login">Vai all&apos;accesso</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/app/panoramica">Esplora la demo</Link>
            </Button>
          </div>
        </div>
        <div className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <Info className="mt-0.5 size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
          Dopo la conferma ti chiederemo nome del locale, città, tipo di attività e piano
          desiderato. La scelta del piano non attiva alcun pagamento.
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.message ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-800 dark:border-red-900/50 dark:bg-red-950 dark:text-red-300"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome" htmlFor="firstName" error={state.fieldErrors?.firstName}>
          <Input
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Marco"
            autoComplete="given-name"
            aria-invalid={Boolean(state.fieldErrors?.firstName)}
          />
        </Field>
        <Field label="Cognome" htmlFor="lastName" error={state.fieldErrors?.lastName}>
          <Input
            id="lastName"
            name="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Bellini"
            autoComplete="family-name"
            aria-invalid={Boolean(state.fieldErrors?.lastName)}
          />
        </Field>
      </div>

      <Field label="Email di lavoro" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="marco@ristorante.it"
          autoComplete="email"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state.fieldErrors?.password}
        hint="Almeno 8 caratteri."
      >
        <Input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Scegli una password"
          autoComplete="new-password"
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <div className="space-y-1">
        <label className="flex items-start gap-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            name="terms"
            className="mt-0.5 size-3.5 rounded border-zinc-300 accent-brand-700 dark:border-zinc-700"
          />
          <span>
            Accetto i{" "}
            <Link href="/termini" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
              termini di servizio
            </Link>{" "}
            e l&apos;
            <Link href="/privacy" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
              informativa privacy
            </Link>
            .
          </span>
        </label>
        {state.fieldErrors?.terms ? (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {state.fieldErrors.terms}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creazione account..." : "Crea account"}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Nessuna carta di credito richiesta. La scelta del piano avviene dopo la
        conferma dell&apos;email e non comporta addebiti.
      </p>
    </form>
  );
}

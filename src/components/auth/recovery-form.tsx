"use client";

import { CheckCircle2, Info, Mail } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/server/auth/actions";
import { initialAuthState } from "@/server/auth/types";

const reasonMessages: Record<string, string> = {
  session:
    "Il link di recupero richiede una sessione valida oppure è scaduto. Inserisci la tua email per riceverne uno nuovo.",
  "link-invalid":
    "Il link di recupero è scaduto o non è più valido. Inserisci la tua email per riceverne uno nuovo.",
};

export function RecoveryForm({ reason }: { reason?: string }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialAuthState,
  );
  const [email, setEmail] = useState("");

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-5 dark:border-brand-800 dark:bg-brand-950/60">
          <CheckCircle2 className="size-6 text-brand-700 dark:text-brand-400" />
          <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Controlla la tua email</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{state.message}</p>
        </div>
        <div className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <Info className="mt-0.5 size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
          Per motivi di sicurezza non confermiamo se un indirizzo è registrato. Il link
          scade dopo un periodo limitato.
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {reason && reasonMessages[reason] ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-300">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{reasonMessages[reason]}</span>
        </div>
      ) : null}

      {state.message ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-800 dark:border-red-900/50 dark:bg-red-950 dark:text-red-300"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <Field
        label="Email dell'account"
        htmlFor="email"
        error={state.fieldErrors?.email}
        hint="Riceverai un link per impostare una nuova password."
      >
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nome@ristorante.it"
            className="pl-9"
            autoComplete="email"
            aria-invalid={Boolean(state.fieldErrors?.email)}
          />
        </div>
      </Field>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Invio in corso..." : "Invia link di recupero"}
      </Button>
    </form>
  );
}

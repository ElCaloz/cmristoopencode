"use client";

import { KeyRound, Loader2, UserRound } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { palmareLoginAction } from "@/server/palmare/actions";
import {
  initialPalmareLoginState,
  type PalmareDevice,
  type PalmareOperatorOption,
} from "@/server/palmare/types";

type Props = {
  device: PalmareDevice;
  operators: PalmareOperatorOption[];
};

export function PalmareLoginForm({ device, operators }: Props) {
  const [state, formAction, pending] = useActionState(
    palmareLoginAction,
    initialPalmareLoginState,
  );
  const [selected, setSelected] = useState<string | null>(
    operators.length === 1 ? operators[0]?.membershipId ?? null : null,
  );

  if (operators.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
          <KeyRound className="size-6" />
        </span>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Nessun operatore con PIN attivo
        </p>
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Chiedi al responsabile di impostare il PIN dalla sezione Dispositivi
          del gestionale, poi ricarica questa pagina.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="membershipId" value={selected ?? ""} />

      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Chi sei?
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Seleziona il tuo nome, poi inserisci il PIN personale.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {operators.map((operator) => {
            const isSelected = selected === operator.membershipId;

            return (
              <button
                key={operator.membershipId}
                type="button"
                onClick={() => setSelected(operator.membershipId)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-colors",
                  isSelected
                    ? "border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/50"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    isSelected
                      ? "bg-brand-600 text-white"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                  )}
                >
                  <UserRound className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {operator.fullName || "Operatore"}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    {operator.roleName}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Field
        label="PIN personale"
        htmlFor="palmare-pin"
        error={state.status === "error" ? state.message : undefined}
      >
        <Input
          id="palmare-pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="••••"
          maxLength={6}
          required
          className="text-center font-mono text-2xl tracking-[0.4em]"
        />
      </Field>

      <Button
        type="submit"
        disabled={pending || !selected}
        className="h-12 w-full text-base"
      >
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <KeyRound />
        )}
        Accedi
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Accesso su {device.name || "questo palmare"} ·{" "}
        {device.restaurantName || "ristorante"}. Dopo 5 PIN errati l&apos;accesso
        si blocca per 5 minuti; la sessione si chiude dopo 15 minuti di
        inattività.
      </p>
    </form>
  );
}

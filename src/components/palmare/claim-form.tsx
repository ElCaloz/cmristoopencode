"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { claimDeviceAction } from "@/server/devices/claim";
import { initialDeviceClaimState } from "@/server/devices/types";

export function ClaimForm() {
  const [state, formAction, pending] = useActionState(
    claimDeviceAction,
    initialDeviceClaimState,
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </span>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {state.deviceName
            ? `"${state.deviceName}" è attivato`
            : "Dispositivo attivato"}
        </p>
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Il dispositivo è registrato e collegato a questo browser con una
          sessione protetta (cookie httpOnly). Lo stato è visibile nel
          gestionale, sezione Dispositivi.
        </p>
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          Ora puoi accedere con il PIN personale: ogni operatore autorizzato dal
          gestionale ha il proprio codice.
        </p>
        <Button asChild className="w-full">
          <Link href="/palmare">Accedi con il PIN operatore</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Codice di attivazione"
        htmlFor="claim-code"
        error={state.status === "error" ? state.message : undefined}
        hint="Otto caratteri mostrati dal gestionale alla creazione del dispositivo."
      >
        <Input
          id="claim-code"
          name="code"
          placeholder="7KCM2XAB"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          required
          className="text-center font-mono text-lg uppercase tracking-[0.3em]"
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        Attiva dispositivo
      </Button>
    </form>
  );
}

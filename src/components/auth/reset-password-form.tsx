"use client";

import { Info, Lock } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { updatePasswordAction } from "@/server/auth/actions";
import { initialAuthState } from "@/server/auth/types";

export function ResetPasswordForm({ email }: { email: string | null }) {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <Info className="mt-0.5 size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        <span>
          Stai impostando una nuova password
          {email ? (
            <>
              {" "}per <strong className="font-medium text-zinc-800 dark:text-zinc-100">{email}</strong>
            </>
          ) : null}
          .
        </span>
      </div>

      {state.message ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-800 dark:border-red-900/50 dark:bg-red-950 dark:text-red-300"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <Field
        label="Nuova password"
        htmlFor="password"
        error={state.fieldErrors?.password}
        hint="Almeno 8 caratteri."
      >
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
          <Input
            id="password"
            name="password"
            type="password"
            className="pl-9"
            autoComplete="new-password"
            placeholder="Nuova password"
            aria-invalid={Boolean(state.fieldErrors?.password)}
          />
        </div>
      </Field>

      <Field
        label="Conferma password"
        htmlFor="confirmPassword"
        error={state.fieldErrors?.confirmPassword}
      >
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className="pl-9"
            autoComplete="new-password"
            placeholder="Ripeti la nuova password"
            aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
          />
        </div>
      </Field>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Aggiornamento..." : "Imposta nuova password"}
      </Button>
    </form>
  );
}

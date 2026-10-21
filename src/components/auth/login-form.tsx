"use client";

import { Eye, EyeOff, Info, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { loginAction } from "@/server/auth/actions";
import { initialAuthState } from "@/server/auth/types";

const reasonMessages: Record<string, string> = {
  session: "La sessione è scaduta o non è valida. Accedi per continuare.",
  config:
    "L'autenticazione non è configurata in questo ambiente. La demo resta disponibile senza account.",
  "link-invalid":
    "Il link è scaduto o non è più valido. Richiedi un nuovo link di accesso o recupero password.",
};

const statusMessages: Record<string, string> = {
  logout: "Sei uscito dal tuo account.",
};

export function LoginForm({
  next,
  reason,
  status,
}: {
  next: string;
  reason?: string;
  status?: string;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialAuthState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const notice = reason ? reasonMessages[reason] : status ? statusMessages[status] : undefined;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {notice ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <Info className="mt-0.5 size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
          <span>{notice}</span>
        </div>
      ) : null}

      {state.message ? (
        <div
          className={
            state.status === "success"
              ? "rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-3 text-xs leading-relaxed text-brand-900 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200"
              : "rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-800 dark:border-red-900/50 dark:bg-red-950 dark:text-red-300"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      ) : null}

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nome@ristorante.it"
            className="pl-9"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.email)}
          />
        </div>
      </Field>

      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="La tua password"
            className="pl-9 pr-10"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
            aria-label={showPassword ? "Nascondi password" : "Mostra password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">Sessione protetta da Supabase Auth</span>
        <Link
          href="/recupera-password"
          className="font-medium text-brand-700 hover:underline dark:text-brand-400"
        >
          Password dimenticata?
        </Link>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Accesso in corso..." : "Accedi"}
      </Button>
    </form>
  );
}

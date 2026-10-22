"use client";

import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { formatDate, relativeTime } from "@/lib/utils";
import {
  disableMfaAction,
  startMfaEnrollAction,
  verifyMfaAction,
} from "@/server/auth/mfa-actions";
import {
  initialMfaActionState,
  type MfaActionState,
  type MfaOverview,
} from "@/server/auth/mfa-types";

type Props = {
  overview: MfaOverview;
};

export function MfaManager({ overview }: Props) {
  const [showQr, setShowQr] = useState(false);

  const [enrollState, enrollAction, enrollPending] = useActionState(
    async (prevState: MfaActionState, formData: FormData) => {
      const result = await startMfaEnrollAction(prevState, formData);
      setShowQr(result.status === "success");
      return result;
    },
    initialMfaActionState,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    async (prevState: MfaActionState, formData: FormData) => {
      const result = await verifyMfaAction(prevState, formData);
      if (result.status === "success") {
        setShowQr(false);
      }
      return result;
    },
    initialMfaActionState,
  );

  useEffect(() => {
    if (enrollState.status === "success") {
      toast.success(enrollState.message ?? "QR code generato.");
    } else if (enrollState.status === "error" && enrollState.message) {
      toast.error(enrollState.message);
    }
  }, [enrollState]);

  useEffect(() => {
    if (verifyState.status === "success") {
      toast.success(verifyState.message ?? "Verifica attiva.");
    } else if (verifyState.status === "error" && verifyState.message) {
      toast.error(verifyState.message);
    }
  }, [verifyState]);

  const verifiedFactors = overview.factors.filter(
    (factor) => factor.status === "verified",
  );
  const hasVerified = verifiedFactors.length > 0;
  const qrCode = enrollState.qrCode;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Verifica in due passaggi (TOTP)
            </h2>
            <Badge variant={hasVerified ? "success" : "warning"}>
              {hasVerified ? "Attiva" : "Non attiva"}
            </Badge>
          </div>
          <Badge variant="outline">
            Livello sessione:{" "}
            {overview.currentLevel === "aal2"
              ? "verificata (aal2)"
              : "standard (aal1)"}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Con la verifica attiva, chi possiede la password deve comunque
          confermare un codice a 6 cifre generato dall&apos;app di
          autenticazione. Consigliata per proprietari e amministratori.
        </p>

        {hasVerified && overview.nextLevel === "aal2" && overview.currentLevel === "aal1" ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/40">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Questa sessione non è ancora verificata con il secondo fattore:
              inserisci un codice per continuare a usare la dashboard.
            </p>
            <form action={verifyAction} className="mt-2 flex flex-wrap items-end gap-3">
              <Field
                label="Codice a 6 cifre"
                htmlFor="mfa-code-session"
                error={verifyState.fieldErrors?.code}
              >
                <Input
                  id="mfa-code-session"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                  required
                />
              </Field>
              <Button type="submit" disabled={verifyPending}>
                Verifica sessione
              </Button>
            </form>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Fattori configurati
          </h2>
        </div>
        {overview.factors.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun fattore configurato su questo account.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {overview.factors.map((factor) => (
              <li
                key={factor.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {factor.friendlyName ?? "App di autenticazione"}
                    </p>
                    <Badge
                      variant={factor.status === "verified" ? "success" : "warning"}
                    >
                      {factor.status === "verified" ? "Verificato" : "Da verificare"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Creato {formatDate(factor.createdAt)}
                    {factor.lastChallengedAt
                      ? ` · ultimo utilizzo ${relativeTime(factor.lastChallengedAt)}`
                      : ""}
                  </p>
                </div>
                <form action={disableMfaAction}>
                  <input type="hidden" name="factorId" value={factor.id} />
                  <Button type="submit" size="sm" variant="destructive">
                    <ShieldOff />
                    Disattiva
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <form action={enrollAction} className="flex flex-wrap items-end gap-3">
            <Field label="Nome dispositivo (opzionale)" htmlFor="mfa-friendly-name">
              <Input
                id="mfa-friendly-name"
                name="friendlyName"
                placeholder="es. iPhone di Mario"
                maxLength={60}
              />
            </Field>
            <Button type="submit" disabled={enrollPending}>
              {hasVerified ? "Aggiungi un nuovo dispositivo" : "Attiva verifica in due passaggi"}
            </Button>
          </form>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Serve un&apos;app TOTP (Google Authenticator, Authy, 1Password…).
          </p>
        </div>

        {showQr && qrCode ? (
          <div className="mt-4 grid gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-[auto_1fr]">
            <div className="rounded-lg bg-white p-2">
              {/* SVG generato da Supabase Auth: reso come data URL, mai come HTML. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="QR code per l'app di autenticazione"
                width={180}
                height={180}
                src={`data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`}
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Conferma il codice
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Scansiona il QR code, poi inserisci qui il codice a 6 cifre
                mostrato dall&apos;app.
              </p>
              {enrollState.secret ? (
                <p className="mt-2 break-all rounded-lg bg-zinc-50 px-3 py-2 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  Codice manuale: {enrollState.secret}
                </p>
              ) : null}
              <form action={verifyAction} className="mt-3 flex flex-wrap items-end gap-3">
                <Field
                  label="Codice a 6 cifre"
                  htmlFor="mfa-code"
                  error={verifyState.fieldErrors?.code}
                >
                  <Input
                    id="mfa-code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="123456"
                    required
                  />
                </Field>
                <Button type="submit" disabled={verifyPending}>
                  Conferma codice
                </Button>
              </form>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

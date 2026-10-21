"use client";

import {
  Ban,
  Check,
  Copy,
  CreditCard,
  KeyRound,
  LockKeyhole,
  Monitor,
  Plus,
  Printer,
  RotateCw,
  ShieldCheck,
  Smartphone,
  TabletSmartphone,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { formatTime, relativeTime } from "@/lib/utils";
import { deviceAction, operatorPinAction } from "@/server/devices/actions";
import {
  initialDevicesActionState,
  initialOperatorPinsActionState,
  type DeviceRow,
  type DeviceStatus,
  type DeviceType,
  type DevicesOverview,
  type OperatorPinRow,
} from "@/server/devices/types";

type Props = {
  overview: DevicesOverview;
  operators: OperatorPinRow[];
};

const statusStyles: Record<
  DeviceStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "muted" | "secondary" }
> = {
  pending: { label: "In attesa di attivazione", variant: "warning" },
  authorized: { label: "Autorizzato", variant: "info" },
  active: { label: "Attivo", variant: "success" },
  offline: { label: "Offline", variant: "muted" },
  blocked: { label: "Bloccato", variant: "danger" },
  revoked: { label: "Revocato", variant: "secondary" },
};

const typeLabels: Record<DeviceType, string> = {
  palmare: "Palmare",
  pos: "Cassa POS",
  kds: "Monitor cucina",
  printer: "Stampante",
  other: "Altro",
};

function TypeIcon({ type }: { type: DeviceType }) {
  switch (type) {
    case "palmare":
      return <TabletSmartphone className="size-4" />;
    case "pos":
      return <CreditCard className="size-4" />;
    case "kds":
      return <Monitor className="size-4" />;
    case "printer":
      return <Printer className="size-4" />;
    default:
      return <Smartphone className="size-4" />;
  }
}

export function DevicesManager({ overview, operators }: Props) {
  const [state, formAction, pending] = useActionState(
    deviceAction,
    initialDevicesActionState,
  );
  const [pinState, pinFormAction, pinPending] = useActionState(
    operatorPinAction,
    initialOperatorPinsActionState,
  );
  const [, startTransition] = useTransition();
  const [pickedCode, setPickedCode] = useState<string | null>(null);
  const [dismissedCode, setDismissedCode] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<DeviceRow | null>(null);
  const [pinTarget, setPinTarget] = useState<OperatorPinRow | null>(null);
  const [clearTarget, setClearTarget] = useState<OperatorPinRow | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Operazione completata.");
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  useEffect(() => {
    if (pinState.status === "success") {
      toast.success(pinState.message ?? "PIN aggiornato.");
    } else if (pinState.status === "error" && pinState.message) {
      toast.error(pinState.message);
    }
  }, [pinState]);

  const pairing = state.pairing;
  const pairingVisible = Boolean(
    pairing &&
      pairing.code &&
      state.status === "success" &&
      pairing.code !== dismissedCode,
  );

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setPickedCode(code);
      toast.success("Codice copiato.");
    } catch {
      toast.error("Copia non riuscita: annota il codice manualmente.");
    }
  };

  const limitReached = overview.palmariInUse >= overview.palmariLimit;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Nuovo dispositivo
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Ogni dispositivo riceve un codice di attivazione monouso, valido
              15 minuti. Il codice viene mostrato una sola volta e salvato solo
              come impronta.
            </p>
          </div>
          <Badge variant={limitReached ? "danger" : "secondary"}>
            Palmari in uso: {overview.palmariInUse} di {overview.palmariLimit}
          </Badge>
        </div>

        {limitReached ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Limite di {overview.palmariLimit} palmari raggiunto: revoca un
            dispositivo per attivare il sostituto. Il limite è verificato dal
            database anche con dispositivi offline.
          </p>
        ) : null}

        <form
          action={formAction}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="intent" value="create" />
          <Field
            label="Nome dispositivo"
            htmlFor="device-name"
            error={state.fieldErrors?.name}
            className="w-full sm:w-64"
          >
            <Input
              id="device-name"
              name="name"
              placeholder="Es. Palmare sala 1"
              maxLength={80}
              required
            />
          </Field>
          <Field label="Tipo" htmlFor="device-type" className="w-full sm:w-44">
            <Select id="device-type" name="type" defaultValue="palmare">
              <option value="palmare">Palmare cameriere</option>
              <option value="pos">Cassa POS</option>
              <option value="kds">Monitor cucina</option>
              <option value="printer">Stampante</option>
              <option value="other">Altro</option>
            </Select>
          </Field>
          <Button type="submit" disabled={pending}>
            <Plus />
            Crea e genera codice
          </Button>
        </form>
      </section>

      {overview.devices.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-14 text-center dark:border-zinc-700">
          <TabletSmartphone className="size-8 text-zinc-400 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nessun dispositivo registrato
          </p>
          <p className="max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Crea il primo palmare: riceverai un codice da inserire nella pagina
            di attivazione del dispositivo. Il limite di quattro palmari per
            locale è applicato lato server.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {overview.devices.map((device) => {
            const status = statusStyles[device.status];
            const canReissue =
              device.status === "pending" ||
              device.status === "authorized" ||
              device.status === "active" ||
              device.status === "offline";

            return (
              <li
                key={device.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        <TypeIcon type={device.type} />
                      </span>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {device.name}
                      </p>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {typeLabels[device.type]}
                      {device.platform ? ` · ${device.platform}` : ""}
                      {device.lastSeenAt
                        ? ` · ultimo contatto ${relativeTime(device.lastSeenAt)}`
                        : ""}
                    </p>
                    {device.pairingExpiresAt &&
                    device.status !== "revoked" &&
                    device.status !== "blocked" ? (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                        <KeyRound className="size-3.5" />
                        Codice di attivazione attivo fino alle{" "}
                        {formatTime(device.pairingExpiresAt)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canReissue ? (
                      <form action={formAction}>
                        <input type="hidden" name="intent" value="reissue" />
                        <input
                          type="hidden"
                          name="deviceId"
                          value={device.id}
                        />
                        <input
                          type="hidden"
                          name="deviceName"
                          value={device.name}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                        >
                          <RotateCw />
                          Nuovo codice
                        </Button>
                      </form>
                    ) : null}

                    {device.status === "blocked" ? (
                      <form action={formAction}>
                        <input type="hidden" name="intent" value="unblock" />
                        <input
                          type="hidden"
                          name="deviceId"
                          value={device.id}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                        >
                          <ShieldCheck />
                          Sblocca
                        </Button>
                      </form>
                    ) : device.status !== "revoked" ? (
                      <form action={formAction}>
                        <input type="hidden" name="intent" value="block" />
                        <input
                          type="hidden"
                          name="deviceId"
                          value={device.id}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                        >
                          <Ban />
                          Blocca
                        </Button>
                      </form>
                    ) : null}

                    {device.status !== "revoked" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => setRevokeTarget(device)}
                      >
                        Revoca
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              PIN operatori
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Il PIN di 4-6 cifre identifica l&apos;operatore sulla pagina{" "}
              <Link href="/palmare" className="text-brand-700 underline dark:text-brand-400">
                /palmare
              </Link>
              . Viene salvato solo come hash, blocca l&apos;accesso dopo 5
              tentativi errati e non conferisce privilegi amministrativi.
            </p>
          </div>
        </div>

        {operators.length === 0 ? (
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun membro attivo nel locale.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {operators.map((operator) => {
              const locked = operator.lockedUntil !== null;

              return (
                <li
                  key={operator.membershipId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {operator.fullName || operator.email || "Membro"}
                      </p>
                      <Badge variant="muted">{operator.roleName}</Badge>
                      {locked ? (
                        <Badge variant="danger" dot>
                          Bloccato per tentativi
                        </Badge>
                      ) : operator.hasPin ? (
                        <Badge variant="success" dot>
                          PIN attivo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Senza PIN</Badge>
                      )}
                    </div>
                    {operator.email ? (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {operator.email}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pinPending}
                      onClick={() => setPinTarget(operator)}
                    >
                      <KeyRound />
                      {operator.hasPin ? "Reimposta PIN" : "Imposta PIN"}
                    </Button>
                    {operator.hasPin ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pinPending}
                        onClick={() => setClearTarget(operator)}
                      >
                        <LockKeyhole />
                        Rimuovi
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog
        open={pinTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPinTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>PIN operatore</DialogTitle>
            <DialogDescription>
              Imposta il PIN per{" "}
              <span className="font-medium">
                {pinTarget?.fullName || pinTarget?.email || "il membro"}
              </span>
              . Il PIN serve per accedere dal palmare e viene salvato solo come
              hash.
            </DialogDescription>
          </DialogHeader>
          {pinTarget && pinState.membershipId === pinTarget.membershipId &&
          pinState.status === "success" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              PIN salvato: l&apos;operatore può accedere dal palmare con il
              nuovo PIN.
            </div>
          ) : (
            <form action={pinFormAction} className="space-y-3">
              <input type="hidden" name="intent" value="set" />
              <input
                type="hidden"
                name="membershipId"
                value={pinTarget?.membershipId ?? ""}
              />
              <Field
                label="Nuovo PIN"
                htmlFor="operator-pin"
                error={
                  pinTarget && pinState.membershipId === pinTarget.membershipId
                    ? pinState.fieldErrors?.pin
                    : undefined
                }
              >
                <Input
                  id="operator-pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="4-6 cifre"
                  maxLength={6}
                  required
                />
              </Field>
              <Field
                label="Conferma PIN"
                htmlFor="operator-pin-confirm"
                error={
                  pinTarget && pinState.membershipId === pinTarget.membershipId
                    ? pinState.fieldErrors?.pinConfirm
                    : undefined
                }
              >
                <Input
                  id="operator-pin-confirm"
                  name="pinConfirm"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ripeti il PIN"
                  maxLength={6}
                  required
                />
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPinTarget(null)}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={pinPending}>
                  Salva PIN
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={clearTarget !== null}
        onOpenChange={(open) => {
          if (!open) setClearTarget(null);
        }}
        title="Rimuovere il PIN?"
        description={
          clearTarget
            ? `"${clearTarget.fullName || clearTarget.email || "Il membro"}" non potrà più accedere dal palmare finché non imposti un nuovo PIN. Le sessioni aperte vengono chiuse.`
            : ""
        }
        confirmLabel="Rimuovi"
        onConfirm={() => {
          if (!clearTarget) return;
          const formData = new FormData();
          formData.set("intent", "clear");
          formData.set("membershipId", clearTarget.membershipId);
          startTransition(() => {
            pinFormAction(formData);
          });
        }}
      />

      <Dialog
        open={pairingVisible}
        onOpenChange={(open) => {
          if (!open && pairing) setDismissedCode(pairing.code);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Codice di attivazione</DialogTitle>
            <DialogDescription>
              Consegna questo codice per{" "}
              <span className="font-medium">{pairing?.deviceName}</span>.
              È monouso e scade tra 15 minuti.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 dark:border-zinc-700 dark:bg-zinc-950">
            <p className="font-mono text-3xl font-semibold tracking-[0.35em] text-zinc-900 dark:text-zinc-50">
              {pairing?.code}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Sul dispositivo apri la pagina{" "}
            <Link href="/palmare" className="text-brand-700 underline dark:text-brand-400">
              /palmare
            </Link>{" "}
            e inserisci il codice. Dopo l&apos;attivazione il dispositivo risulta
            attivo in questo elenco. Il codice non viene più mostrato: se serve,
            generane uno nuovo.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (pairing) void copyCode(pairing.code);
              }}
            >
              {pickedCode && pairing && pickedCode === pairing.code ? (
                <>
                  <Check />
                  Copiato
                </>
              ) : (
                <>
                  <Copy />
                  Copia codice
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (pairing) setDismissedCode(pairing.code);
              }}
            >
              Ho consegnato il codice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="Revocare il dispositivo?"
        description={
          revokeTarget
            ? `"${revokeTarget.name}" verrà revocato: token e codici attivi vengono invalidati e lo slot torna disponibile per un sostituto. L'operazione è tracciata nel registro attività.`
            : ""
        }
        confirmLabel="Revoca"
        onConfirm={() => {
          if (!revokeTarget) return;
          const formData = new FormData();
          formData.set("intent", "revoke");
          formData.set("deviceId", revokeTarget.id);
          startTransition(() => {
            formAction(formData);
          });
        }}
      />
    </div>
  );
}

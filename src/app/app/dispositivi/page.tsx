"use client";

import {
  CreditCard,
  MonitorSmartphone,
  Plus,
  Printer,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
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
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  DeviceStatusBadge,
  DeviceTypeBadge,
} from "@/components/ui/status-badge";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import { DEVICE_TYPE_LABELS } from "@/lib/demo/calc";
import type { Device, DeviceType } from "@/lib/demo/types";
import {
  formatDate,
  relativeTime,
} from "@/lib/utils";

const MAX_HANDHELDS = 4;

const TYPE_ICONS: Record<DeviceType, LucideIcon> = {
  palmare: Smartphone,
  pos: CreditCard,
  kds: MonitorSmartphone,
  stampante: Printer,
};

const DEVICE_TYPES = Object.keys(DEVICE_TYPE_LABELS) as DeviceType[];

export default function DispositiviPage() {
  const restaurant = useActiveRestaurant();
  const devices = useDemoStore((state) => state.devices);
  const pairDevice = useDemoStore((state) => state.pairDevice);
  const revokeDevice = useDemoStore((state) => state.revokeDevice);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Device | null>(null);
  const [form, setForm] = useState<{ name: string; type: DeviceType }>({
    name: "",
    type: "palmare",
  });

  if (!restaurant) return null;

  const restaurantDevices = devices.filter(
    (device) => device.restaurantId === restaurant.id,
  );
  const handhelds = restaurantDevices.filter(
    (device) => device.type === "palmare",
  );
  const online = restaurantDevices.filter(
    (device) => device.status === "online",
  );
  const offline = restaurantDevices.filter(
    (device) => device.status === "offline",
  );
  const limitReached = handhelds.length >= MAX_HANDHELDS;

  const openPair = () => {
    setForm({
      name: `Palmare Sala ${handhelds.length + 1}`,
      type: "palmare",
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Dai un nome al dispositivo.");
      return;
    }
    const result = pairDevice({
      restaurantId: restaurant.id,
      name: form.name.trim(),
      type: form.type,
    });
    if (!result.ok) {
      toast.error("Limite palmari raggiunto", {
        description: result.error,
      });
      return;
    }
    setDialogOpen(false);
    toast.success("Dispositivo associato", {
      description: `${form.name.trim()} · ${DEVICE_TYPE_LABELS[form.type]} (demo).`,
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Hardware e accessi"
        title="Dispositivi"
        description="Palmari, casse, Kitchen Display e stampanti del locale. In questa demo l'associazione è simulata nel browser."
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button onClick={openPair} disabled={limitReached}>
            <Plus />
            Associa dispositivo
          </Button>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Palmari associati"
          value={`${handhelds.length}/${MAX_HANDHELDS}`}
          icon={Smartphone}
          hint="limite per locale"
        />
        <StatCard
          label="Dispositivi online"
          value={String(online.length)}
          icon={Wifi}
          hint={`${restaurantDevices.length} in totale`}
        />
        <StatCard
          label="Dispositivi offline"
          value={String(offline.length)}
          icon={WifiOff}
          hint="da verificare"
        />
        <StatCard
          label="Cassa POS"
          value={String(
            restaurantDevices.filter((device) => device.type === "pos").length,
          )}
          icon={CreditCard}
          hint="terminali registrati"
        />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Limite palmari per locale
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Fino a {MAX_HANDHELDS} palmari inclusi in tutti i piani. Il
              limite viene applicato dallo store demo.
            </p>
          </div>
          <span className="text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
            {handhelds.length} / {MAX_HANDHELDS}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={
              limitReached
                ? "h-full rounded-full bg-amber-500"
                : "h-full rounded-full bg-brand-600"
            }
            style={{
              width: `${Math.min(100, (handhelds.length / MAX_HANDHELDS) * 100)}%`,
            }}
          />
        </div>
        {limitReached ? (
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            Limite raggiunto: revoca un palmare prima di associarne un altro.
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {restaurantDevices.map((device) => {
          const Icon = TYPE_ICONS[device.type];
          return (
            <div
              key={device.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {device.name}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <DeviceTypeBadge type={device.type} />
                    </div>
                  </div>
                </div>
                <DeviceStatusBadge status={device.status} />
              </div>
              <div className="mt-3 space-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                <p>
                  Ultimo contatto:{" "}
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {relativeTime(device.lastSeen)}
                  </span>
                </p>
                <p>
                  Associato il{" "}
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {formatDate(device.pairedAt)}
                  </span>
                </p>
              </div>
              <div className="mt-3 flex justify-end border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setRevokeTarget(device)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="size-3" />
                  Revoca associazione
                </button>
              </div>
            </div>
          );
        })}
        {restaurantDevices.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 px-6 py-12 text-center">
            <MonitorSmartphone className="mx-auto size-6 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Nessun dispositivo associato
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Associa un palmare o una cassa per iniziare.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
        <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
        <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Nella versione reale l&apos;associazione dei dispositivi richiederà un
          codice monouso generato dal server, revoca centralizzata e
          autenticazione del dispositivo. Qui i dati sono solo dimostrativi e
          non viene contattato alcun hardware.
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Associa dispositivo</DialogTitle>
            <DialogDescription>
              Simulazione demo: nessun dispositivo fisico verrà collegato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Nome dispositivo" htmlFor="device-name">
              <Input
                id="device-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Palmare Sala 3"
              />
            </Field>
            <Field label="Tipo" htmlFor="device-type">
              <Select
                id="device-type"
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as DeviceType,
                  }))
                }
              >
                {DEVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DEVICE_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="rounded-lg bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              I palmari sono limitati a {MAX_HANDHELDS} per locale. Il limite
              viene verificato dallo store demo e blocca l&apos;associazione
              oltre la soglia.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={submit}>Associa</Button>
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
            ? `«${revokeTarget.name}» non sarà più associato al locale nella demo. Potrai associarlo di nuovo in seguito.`
            : ""
        }
        confirmLabel="Revoca"
        onConfirm={() => {
          if (revokeTarget) {
            revokeDevice(revokeTarget.id);
            toast.success("Dispositivo revocato dalla demo");
          }
        }}
      />
    </div>
  );
}

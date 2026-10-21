"use client";

import {
  ArrowRight,
  Database,
  Lock,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RestaurantStatusBadge } from "@/components/ui/status-badge";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import type { Restaurant } from "@/lib/demo/types";
import { PLANS } from "@/lib/plans";

type SettingsForm = {
  name: string;
  kind: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  vatNumber: string;
  seats: string;
  ownerName: string;
  ownerEmail: string;
};

function settingsFormFromRestaurant(restaurant: Restaurant): SettingsForm {
  return {
    name: restaurant.name,
    kind: restaurant.kind,
    address: restaurant.address,
    city: restaurant.city,
    phone: restaurant.phone,
    email: restaurant.email,
    vatNumber: restaurant.vatNumber,
    seats: String(restaurant.seats),
    ownerName: restaurant.ownerName,
    ownerEmail: restaurant.ownerEmail,
  };
}

export default function ImpostazioniPage() {
  const restaurant = useActiveRestaurant();
  if (!restaurant) return null;
  return <SettingsContent key={restaurant.id} restaurant={restaurant} />;
}

function SettingsContent({ restaurant }: { restaurant: Restaurant }) {
  const updateRestaurant = useDemoStore((state) => state.updateRestaurant);
  const resetDemo = useDemoStore((state) => state.resetDemo);

  const [resetOpen, setResetOpen] = useState(false);
  const [form, setForm] = useState<SettingsForm>(() =>
    settingsFormFromRestaurant(restaurant),
  );

  const plan = PLANS[restaurant.planId];

  const save = () => {
    if (!form.name.trim() || !form.city.trim() || !form.email.trim()) {
      toast.error("Nome, città ed email del locale sono obbligatori.");
      return;
    }
    updateRestaurant(restaurant.id, {
      name: form.name.trim(),
      kind: form.kind.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      vatNumber: form.vatNumber.trim(),
      seats: Math.max(0, Number(form.seats) || 0),
      ownerName: form.ownerName.trim(),
      ownerEmail: form.ownerEmail.trim(),
    });
    toast.success("Impostazioni salvate", {
      description: "I dati del locale sono aggiornati nella demo.",
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Configurazione locale"
        title="Impostazioni"
        description="Dati del locale e gestione dell'ambiente dimostrativo. Le impostazioni reali saranno verificate lato server."
        badge={<RestaurantStatusBadge status={restaurant.status} />}
        actions={
          <Button onClick={save}>
            <Save />
            Salva modifiche
          </Button>
        }
      />

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs sm:p-5">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-zinc-500 dark:text-zinc-400" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Dati del locale
            </p>
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            Queste informazioni compaiono nella demo e nelle intestazioni.
          </p>
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome del locale" htmlFor="settings-name">
                <Input
                  id="settings-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Tipo di locale" htmlFor="settings-kind">
                <Input
                  id="settings-kind"
                  value={form.kind}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      kind: event.target.value,
                    }))
                  }
                  placeholder="Trattoria toscana"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
              <Field label="Indirizzo" htmlFor="settings-address">
                <Input
                  id="settings-address"
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Città" htmlFor="settings-city">
                <Input
                  id="settings-city"
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Telefono" htmlFor="settings-phone">
                <Input
                  id="settings-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Email locale" htmlFor="settings-email">
                <Input
                  id="settings-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Partita IVA" htmlFor="settings-vat">
                <Input
                  id="settings-vat"
                  value={form.vatNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vatNumber: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field
                label="Coperti totali"
                htmlFor="settings-seats"
                hint="Somma dei posti a sedere del locale."
              >
                <Input
                  id="settings-seats"
                  type="number"
                  min={0}
                  value={form.seats}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      seats: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Titolare" htmlFor="settings-owner">
                <Input
                  id="settings-owner"
                  value={form.ownerName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ownerName: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Email titolare" htmlFor="settings-owner-email">
                <Input
                  id="settings-owner-email"
                  type="email"
                  value={form.ownerEmail}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ownerEmail: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <Button onClick={save}>
              <Save />
              Salva modifiche
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-zinc-500 dark:text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Piano attuale
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {plan.name}
              </p>
              <Badge variant={restaurant.status === "trial" ? "warning" : "success"}>
                {restaurant.status === "trial" ? "Prova" : "Attivo"}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              {plan.tagline}. Palmari inclusi: fino a 4 per locale.
            </p>
            <Link
              href="/app/abbonamento"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 dark:text-brand-400 hover:underline"
            >
              Gestisci abbonamento <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-zinc-500 dark:text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Dati demo</p>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              L&apos;ambiente è interamente fittizio. Tutto ciò che modifichi
              viene salvato nel <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1">localStorage</code>{" "}
              del browser e non viene inviato a nessun server.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw />
              Ripristina dati demo
            </Button>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-zinc-500 dark:text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Sicurezza prevista
              </p>
            </div>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              <li className="flex items-start gap-1.5">
                <Lock className="mt-0.5 size-3 shrink-0 text-zinc-500 dark:text-zinc-400" />
                Ruoli e permessi verificati lato server, mai solo nel browser.
              </li>
              <li className="flex items-start gap-1.5">
                <Lock className="mt-0.5 size-3 shrink-0 text-zinc-500 dark:text-zinc-400" />
                Isolamento multi-tenant con RLS e test dedicati.
              </li>
              <li className="flex items-start gap-1.5">
                <Lock className="mt-0.5 size-3 shrink-0 text-zinc-500 dark:text-zinc-400" />
                Modifiche ai dati tracciate nel registro attività.
              </li>
            </ul>
            <p className="mt-2 text-[10px] text-zinc-500 dark:text-zinc-400">
              Queste protezioni non sono attive nella demo attuale.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Ripristinare tutti i dati demo?"
        description="Ordini, menu, clienti, personale, dispositivi e impostazioni torneranno allo stato iniziale. L'operazione riguarda solo i dati dimostrativi nel browser."
        confirmLabel="Ripristina demo"
        onConfirm={() => {
          resetDemo();
          const restored = useDemoStore
            .getState()
            .restaurants.find((entry) => entry.id === restaurant.id);
          if (restored) setForm(settingsFormFromRestaurant(restored));
          toast.success("Dati demo ripristinati");
        }}
      />
    </div>
  );
}

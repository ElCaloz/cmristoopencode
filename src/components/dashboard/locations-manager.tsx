"use client";

import { Building2, CheckCircle2, MapPin, Pencil, Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  createRestaurantAction,
  setActiveRestaurantAction,
  updateRestaurantProfileAction,
} from "@/server/restaurant/actions";
import {
  initialLocationActionState,
  type LocationActionState,
  type LocationRow,
  type OrganizationRestaurantsData,
} from "@/server/restaurant/types";

type Props = {
  data: OrganizationRestaurantsData;
  activeRestaurantId: string | null;
  canManageRestaurants: boolean;
  canManageSettings: boolean;
};

const statusLabels: Record<string, string> = {
  active: "Attiva",
  paused: "In pausa",
  closed: "Chiusa",
};

export function LocationsManager({
  data,
  activeRestaurantId,
  canManageRestaurants,
  canManageSettings,
}: Props) {
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  const [createState, createAction, createPending] = useActionState(
    async (prevState: LocationActionState, formData: FormData) => {
      const result = await createRestaurantAction(prevState, formData);
      if (result.status === "success") {
        setFormVersion((value) => value + 1);
      }
      return result;
    },
    initialLocationActionState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    async (prevState: LocationActionState, formData: FormData) => {
      const result = await updateRestaurantProfileAction(prevState, formData);
      if (result.status === "success") {
        setEditing(null);
      }
      return result;
    },
    initialLocationActionState,
  );

  const active = data.locations.find((location) => location.id === activeRestaurantId) ?? null;

  useEffect(() => {
    if (createState.status === "success") {
      toast.success(createState.message ?? "Sede creata.");
    } else if (createState.status === "error" && createState.message) {
      toast.error(createState.message);
    }
  }, [createState]);

  useEffect(() => {
    if (updateState.status === "success") {
      toast.success(updateState.message ?? "Sede aggiornata.");
    } else if (updateState.status === "error" && updateState.message) {
      toast.error(updateState.message);
    }
  }, [updateState]);

  const editingLocation = editing ?? active;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Sedi di {data.organizationName}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {data.locations.length} sedi
              {data.locationsLimit !== null
                ? ` · limite piano ${data.planName ?? ""}: ${data.locationsLimit}`
                : ""}
              . I dati operativi sono separati per sede.
            </p>
          </div>
          {active ? (
            <Badge variant="success" dot>
              Sede attiva: {active.name}
            </Badge>
          ) : null}
        </div>

        {data.locations.length === 0 ? (
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Nessuna sede. Crea la prima sede per iniziare a usare menu, sala e
            cassa.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.locations.map((location) => (
              <li
                key={location.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="size-4 text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {location.name}
                    </p>
                    <Badge variant="muted">{location.slug}</Badge>
                    <Badge
                      variant={location.status === "active" ? "success" : "warning"}
                    >
                      {statusLabels[location.status] ?? location.status}
                    </Badge>
                    {location.id === activeRestaurantId ? (
                      <Badge variant="info" dot>
                        In uso
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {location.address ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {location.address}
                      </span>
                    ) : null}
                    {location.phone ? <span>{location.phone}</span> : null}
                    {location.cuisine ? <span>{location.cuisine}</span> : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {location.id !== activeRestaurantId ? (
                    <form action={setActiveRestaurantAction}>
                      <input type="hidden" name="restaurantId" value={location.id} />
                      <input type="hidden" name="next" value="/dashboard/sedi" />
                      <Button type="submit" size="sm" variant="outline">
                        <CheckCircle2 />
                        Attiva
                      </Button>
                    </form>
                  ) : null}
                  {canManageSettings && location.id === activeRestaurantId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(location)}
                    >
                      <Pencil />
                      Modifica
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManageRestaurants ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Plus className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Nuova sede
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Il numero di sedi è verificato lato server rispetto al piano
            richiesto. La nuova sede diventa subito quella attiva.
          </p>
          <form
            key={formVersion}
            action={createAction}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <Field
              label="Nome sede"
              htmlFor="location-name"
              error={createState.fieldErrors?.name}
            >
              <Input id="location-name" name="name" maxLength={120} required />
            </Field>
            <Field
              label="Slug pubblico (opzionale)"
              htmlFor="location-slug"
              error={createState.fieldErrors?.slug}
              hint="Es. sede-centro. Usato nei link pubblici."
            >
              <Input id="location-slug" name="slug" maxLength={60} />
            </Field>
            <Field label="Indirizzo" htmlFor="location-address">
              <Input id="location-address" name="address" maxLength={300} />
            </Field>
            <Field label="Telefono" htmlFor="location-phone">
              <Input id="location-phone" name="phone" maxLength={300} />
            </Field>
            <Field label="Cucina" htmlFor="location-cuisine">
              <Input
                id="location-cuisine"
                name="cuisine"
                placeholder="es. Toscana"
                maxLength={300}
              />
            </Field>
            <Field label="Descrizione" htmlFor="location-description">
              <Input id="location-description" name="description" maxLength={300} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createPending}>
                Crea sede
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {canManageSettings && editingLocation ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Dati di {editingLocation.name}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Questi dati compaiono anche nel menu pubblico e sullo scontrino
            quando presenti.
          </p>
          <form
            key={`${editingLocation.id}-${updateState.status}`}
            action={updateAction}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <Field
              label="Nome"
              htmlFor="profile-name"
              error={updateState.fieldErrors?.name}
            >
              <Input
                id="profile-name"
                name="name"
                defaultValue={editingLocation.name}
                maxLength={120}
                required
              />
            </Field>
            <Field label="Telefono" htmlFor="profile-phone">
              <Input
                id="profile-phone"
                name="phone"
                defaultValue={editingLocation.phone ?? ""}
                maxLength={300}
              />
            </Field>
            <Field label="Indirizzo" htmlFor="profile-address">
              <Input
                id="profile-address"
                name="address"
                defaultValue={editingLocation.address ?? ""}
                maxLength={300}
              />
            </Field>
            <Field label="Cucina" htmlFor="profile-cuisine">
              <Input
                id="profile-cuisine"
                name="cuisine"
                defaultValue={editingLocation.cuisine}
                maxLength={300}
              />
            </Field>
            <Field label="Descrizione" htmlFor="profile-description">
              <Input
                id="profile-description"
                name="description"
                defaultValue={editingLocation.description}
                maxLength={300}
              />
            </Field>
            <Field
              label="Nota per il menu pubblico"
              htmlFor="profile-menu-note"
              className="sm:col-span-2"
            >
              <Textarea
                id="profile-menu-note"
                name="publicMenuNote"
                rows={2}
                maxLength={300}
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={updatePending}>
                Salva dati sede
              </Button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

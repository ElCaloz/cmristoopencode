"use client";

import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  UserCheck,
  Users,
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
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RowMenu } from "@/components/ui/row-menu";
import { StatCard } from "@/components/ui/stat-card";
import { ReservationStatusBadge } from "@/components/ui/status-badge";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import type { Reservation, ReservationStatus } from "@/lib/demo/types";
import {
  addDays,
  cn,
  formatLongDate,
  makeId,
  toISODate,
  todayISODate,
} from "@/lib/utils";

type Filter = "today" | "upcoming" | "all";

type ReservationForm = {
  customerName: string;
  phone: string;
  date: string;
  time: string;
  covers: string;
  tableName: string;
  status: ReservationStatus;
  notes: string;
};

const STATUS_OPTIONS: ReservationStatus[] = [
  "pending",
  "confirmed",
  "seated",
  "cancelled",
  "no_show",
];

export default function PrenotazioniPage() {
  const restaurant = useActiveRestaurant();
  const reservations = useDemoStore((state) => state.reservations);
  const tables = useDemoStore((state) => state.tables);
  const saveReservation = useDemoStore((state) => state.saveReservation);
  const setReservationStatus = useDemoStore(
    (state) => state.setReservationStatus,
  );
  const setTableStatus = useDemoStore((state) => state.setTableStatus);

  const [filter, setFilter] = useState<Filter>("upcoming");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [form, setForm] = useState<ReservationForm>({
    customerName: "",
    phone: "",
    date: todayISODate(),
    time: "20:00",
    covers: "2",
    tableName: "",
    status: "confirmed",
    notes: "",
  });

  if (!restaurant) return null;

  const today = todayISODate();
  const tomorrow = toISODate(addDays(new Date(), 1));
  const restaurantReservations = reservations.filter(
    (entry) => entry.restaurantId === restaurant.id,
  );
  const restaurantTables = tables.filter(
    (table) => table.restaurantId === restaurant.id,
  );

  const todayReservations = restaurantReservations.filter(
    (entry) => entry.date === today,
  );
  const pending = restaurantReservations.filter(
    (entry) => entry.status === "pending",
  );
  const nextWeek = restaurantReservations.filter(
    (entry) =>
      entry.date >= today &&
      entry.date <= toISODate(addDays(new Date(), 7)) &&
      entry.status !== "cancelled",
  );
  const todayCovers = todayReservations
    .filter((entry) => entry.status !== "cancelled" && entry.status !== "no_show")
    .reduce((sum, entry) => sum + entry.covers, 0);

  const visible = restaurantReservations
    .filter((entry) => {
      if (filter === "today") return entry.date === today;
      if (filter === "upcoming") return entry.date >= today;
      return true;
    })
    .sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    );

  const grouped = new Map<string, Reservation[]>();
  for (const entry of visible) {
    const list = grouped.get(entry.date) ?? [];
    list.push(entry);
    grouped.set(entry.date, list);
  }

  const dayLabel = (date: string) =>
    date === today
      ? "Oggi"
      : date === tomorrow
        ? "Domani"
        : formatLongDate(new Date(`${date}T12:00:00`));

  const openNew = () => {
    setEditing(null);
    setForm({
      customerName: "",
      phone: "",
      date: today,
      time: "20:00",
      covers: "2",
      tableName: "",
      status: "confirmed",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (reservation: Reservation) => {
    setEditing(reservation);
    setForm({
      customerName: reservation.customerName,
      phone: reservation.phone,
      date: reservation.date,
      time: reservation.time,
      covers: String(reservation.covers),
      tableName: reservation.tableName ?? "",
      status: reservation.status,
      notes: reservation.notes ?? "",
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.customerName.trim()) {
      toast.error("Inserisci il nome del cliente.");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Inserisci un telefono di contatto.");
      return;
    }
    if (!form.date || !form.time) {
      toast.error("Inserisci data e orario.");
      return;
    }
    const covers = Number(form.covers);
    if (!Number.isFinite(covers) || covers < 1) {
      toast.error("Inserisci un numero di coperti valido.");
      return;
    }
    const reservation: Reservation = {
      id: editing?.id ?? makeId("res"),
      restaurantId: restaurant.id,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      date: form.date,
      time: form.time,
      covers,
      tableName: form.tableName || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };
    saveReservation(reservation);
    setDialogOpen(false);
    toast.success(editing ? "Prenotazione aggiornata" : "Prenotazione creata", {
      description: `${reservation.customerName} · ${reservation.covers} coperti · ${reservation.date.split("-").reverse().join("/")} alle ${reservation.time}.`,
    });
  };

  const seatGuest = (reservation: Reservation) => {
    setReservationStatus(reservation.id, "seated");
    if (reservation.tableName) {
      const table = restaurantTables.find(
        (entry) => entry.name === reservation.tableName,
      );
      if (table && table.status !== "occupied") {
        setTableStatus(table.id, "occupied");
      }
    }
    toast.success(`${reservation.customerName} accolto/a`, {
      description: reservation.tableName
        ? `Tavolo ${reservation.tableName} segnato come occupato.`
        : "Aggiungi il tavolo dalla sala quando assegnato.",
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sala e accoglienza"
        title="Prenotazioni"
        description="Agenda dei coperti, conferme e accoglienza. Le prenotazioni demo sono collegate alla mappa tavoli."
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button onClick={openNew}>
            <Plus />
            Nuova prenotazione
          </Button>
        }
      />

      <div className="mt-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Prenotazioni oggi"
          value={String(todayReservations.length)}
          icon={CalendarCheck}
          hint={`${todayCovers} coperti previsti`}
        />
        <StatCard
          label="In attesa di conferma"
          value={String(pending.length)}
          icon={Clock}
          hint="da ricontattare"
        />
        <StatCard
          label="Prossimi 7 giorni"
          value={String(nextWeek.length)}
          icon={CalendarDays}
          hint={`${nextWeek.reduce((sum, entry) => sum + entry.covers, 0)} coperti`}
        />
        <StatCard
          label="Tavoli disponibili stasera"
          value={String(
            restaurantTables.filter((table) => table.status === "free").length,
          )}
          icon={Users}
          hint="stato attuale della sala"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {(
          [
            { id: "today", label: "Oggi" },
            { id: "upcoming", label: "Da oggi in poi" },
            { id: "all", label: "Tutte" },
          ] as Array<{ id: Filter; label: string }>
        ).map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilter(entry.id)}
            aria-pressed={filter === entry.id}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
              filter === entry.id
                ? "border-brand-700 bg-brand-700 text-white shadow-sm"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-3 rounded-card border border-zinc-200/90 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState
            icon={CalendarCheck}
            title="Nessuna prenotazione"
            description="Crea una nuova prenotazione per riempire l'agenda del servizio."
            action={
              <Button size="sm" onClick={openNew}>
                <Plus />
                Nuova prenotazione
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-3 space-y-5">
          {Array.from(grouped.entries()).map(([date, entries]) => (
            <div key={date}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {dayLabel(date)}
                </p>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {entries.length} prenotazioni ·{" "}
                  {entries
                    .filter(
                      (entry) =>
                        entry.status !== "cancelled" &&
                        entry.status !== "no_show",
                    )
                    .reduce((sum, entry) => sum + entry.covers, 0)}{" "}
                  coperti
                </span>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {entries.map((reservation) => (
                  <div
                    key={reservation.id}
                    className={cn(
                      "flex items-start gap-3 rounded-card border bg-white p-3.5 shadow-card transition-colors dark:bg-zinc-900",
                      reservation.status === "cancelled" ||
                        reservation.status === "no_show"
                        ? "border-zinc-100 dark:border-zinc-800 opacity-60"
                        : "border-zinc-200 dark:border-zinc-800",
                    )}
                  >
                    <span className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-zinc-50 dark:bg-zinc-800 py-1.5">
                      <span className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                        {reservation.time}
                      </span>
                      <span className="text-[9px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {reservation.covers} pax
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                          {reservation.customerName}
                        </p>
                        <ReservationStatusBadge status={reservation.status} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {reservation.phone}
                        {reservation.tableName
                          ? ` · tavolo ${reservation.tableName}`
                          : " · tavolo da assegnare"}
                      </p>
                      {reservation.notes ? (
                        <p className="mt-1 rounded bg-amber-50 dark:bg-amber-950 px-2 py-1 text-[10px] text-amber-700 dark:text-amber-400">
                          {reservation.notes}
                        </p>
                      ) : null}
                    </div>
                    <RowMenu
                      items={[
                        {
                          label: "Modifica",
                          onSelect: () => openEdit(reservation),
                        },
                        {
                          label: "Conferma",
                          icon: CheckCircle2,
                          disabled: reservation.status === "confirmed",
                          onSelect: () => {
                            setReservationStatus(reservation.id, "confirmed");
                            toast.success("Prenotazione confermata");
                          },
                        },
                        {
                          label: "Accogli cliente",
                          icon: UserCheck,
                          disabled:
                            reservation.status === "cancelled" ||
                            reservation.status === "no_show",
                          onSelect: () => seatGuest(reservation),
                        },
                        {
                          label: "No-show",
                          separatorBefore: true,
                          disabled:
                            reservation.status === "cancelled" ||
                            reservation.status === "no_show",
                          onSelect: () => {
                            setReservationStatus(reservation.id, "no_show");
                            toast.info("Prenotazione segnata come no-show");
                          },
                        },
                        {
                          label: "Annulla prenotazione",
                          destructive: true,
                          disabled: reservation.status === "cancelled",
                          onSelect: () => setCancelTarget(reservation),
                        },
                      ]}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica prenotazione" : "Nuova prenotazione"}
            </DialogTitle>
            <DialogDescription>
              La prenotazione è dimostrativa e non invia SMS o email reali.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome cliente" htmlFor="res-name">
                <Input
                  id="res-name"
                  value={form.customerName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customerName: event.target.value,
                    }))
                  }
                  placeholder="Mario Rossi"
                />
              </Field>
              <Field label="Telefono" htmlFor="res-phone">
                <Input
                  id="res-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="333 123 4567"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Data" htmlFor="res-date">
                <Input
                  id="res-date"
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Ora" htmlFor="res-time">
                <Input
                  id="res-time"
                  type="time"
                  value={form.time}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      time: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Coperti" htmlFor="res-covers">
                <Input
                  id="res-covers"
                  type="number"
                  min={1}
                  value={form.covers}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      covers: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tavolo" htmlFor="res-table">
                <Select
                  id="res-table"
                  value={form.tableName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tableName: event.target.value,
                    }))
                  }
                >
                  <option value="">Da assegnare</option>
                  {restaurantTables.map((table) => (
                    <option key={table.id} value={table.name}>
                      {table.name} · {table.room} · {table.seats} posti
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Stato" htmlFor="res-status">
                <Select
                  id="res-status"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ReservationStatus,
                    }))
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === "pending"
                        ? "In attesa"
                        : status === "confirmed"
                          ? "Confermata"
                          : status === "seated"
                            ? "Accolto"
                            : status === "cancelled"
                              ? "Annullata"
                              : "No-show"}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Note" htmlFor="res-notes">
              <Textarea
                id="res-notes"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Allergie, compleanni, seggioloni…"
                className="min-h-16"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={submit}>
              {editing ? "Salva modifiche" : "Crea prenotazione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Annullare la prenotazione?"
        description={
          cancelTarget
            ? `La prenotazione di ${cancelTarget.customerName} (${cancelTarget.covers} coperti) verrà segnata come annullata. Il tavolo non viene liberato automaticamente.`
            : ""
        }
        confirmLabel="Annulla prenotazione"
        onConfirm={() => {
          if (cancelTarget) {
            setReservationStatus(cancelTarget.id, "cancelled");
            toast.success("Prenotazione annullata");
          }
        }}
      />
    </div>
  );
}

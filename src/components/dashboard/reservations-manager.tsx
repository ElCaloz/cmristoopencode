"use client";

import {
  CalendarCheck,
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  Mail,
  Phone,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
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
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { formatLongDate, todayISODate } from "@/lib/utils";
import {
  createReservationAction,
  setReservationStatusAction,
  updateReservationNotesAction,
} from "@/server/reservations/actions";
import {
  initialReservationActionState,
  type ReservationRow,
  type ReservationStatus,
} from "@/server/reservations/types";

type Props = {
  reservations: ReservationRow[];
};

const statusStyles: Record<
  ReservationStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "muted" | "secondary" }
> = {
  pending: { label: "Da confermare", variant: "warning" },
  confirmed: { label: "Confermata", variant: "success" },
  seated: { label: "In sala", variant: "info" },
  completed: { label: "Completata", variant: "muted" },
  cancelled: { label: "Annullata", variant: "danger" },
  no_show: { label: "No-show", variant: "secondary" },
};

const sourceLabels: Record<string, string> = {
  dashboard: "Dashboard",
  phone_ai: "Receptionist AI",
  phone_manual: "Telefono",
  web: "Web",
};

function StatusButton({
  formAction,
  disabled,
  reservationId,
  status,
  label,
  icon,
}: {
  formAction: (formData: FormData) => void;
  disabled: boolean;
  reservationId: string;
  status: ReservationStatus;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <form action={formAction}>
      <input type="hidden" name="reservationId" value={reservationId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant="outline" disabled={disabled}>
        {icon}
        {label}
      </Button>
    </form>
  );
}

export function ReservationsManager({ reservations }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [formKey, setFormKey] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [defaultDate, setDefaultDate] = useState("");
  const [notesTarget, setNotesTarget] = useState<ReservationRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReservationRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [createState, createFormAction, createPending] = useActionState(
    async (prevState: typeof initialReservationActionState, formData: FormData) => {
      const result = await createReservationAction(prevState, formData);
      if (result.status === "success") {
        setCreateOpen(false);
        setStatusFilter("all");
        setQuery("");
      }
      return result;
    },
    initialReservationActionState,
  );
  const [statusState, statusFormAction, statusPending] = useActionState(
    setReservationStatusAction,
    initialReservationActionState,
  );
  const [notesState, notesFormAction, notesPending] = useActionState(
    async (prevState: typeof initialReservationActionState, formData: FormData) => {
      const result = await updateReservationNotesAction(prevState, formData);
      if (result.status === "success") {
        setNotesTarget(null);
      }
      return result;
    },
    initialReservationActionState,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (createState.status === "success") {
      toast.success(createState.message ?? "Prenotazione registrata.");
    } else if (createState.status === "error" && createState.message) {
      toast.error(createState.message);
    }
  }, [createState]);

  useEffect(() => {
    if (statusState.status === "success") {
      toast.success(statusState.message ?? "Prenotazione aggiornata.");
    } else if (statusState.status === "error" && statusState.message) {
      toast.error(statusState.message);
    }
  }, [statusState]);

  useEffect(() => {
    if (notesState.status === "success") {
      toast.success(notesState.message ?? "Note aggiornate.");
    } else if (notesState.status === "error" && notesState.message) {
      toast.error(notesState.message);
    }
  }, [notesState]);

  const openCreate = () => {
    const key = crypto.randomUUID();
    setFormKey(key);
    setIdempotencyKey(key);
    setDefaultDate(todayISODate());
    setCreateOpen(true);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = reservations.filter((reservation) => {
    if (statusFilter !== "all" && reservation.status !== statusFilter) return false;
    if (!normalizedQuery) return true;
    return (
      reservation.customerName.toLowerCase().includes(normalizedQuery) ||
      reservation.customerPhone.toLowerCase().includes(normalizedQuery) ||
      (reservation.customerEmail ?? "").toLowerCase().includes(normalizedQuery)
    );
  });

  const pendingCount = reservations.filter((entry) => entry.status === "pending").length;
  const seatedCount = reservations.filter((entry) => entry.status === "seated").length;
  const guests = reservations
    .filter((entry) => ["pending", "confirmed", "seated"].includes(entry.status))
    .reduce((sum, entry) => sum + entry.partySize, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Da confermare"
          value={String(pendingCount)}
          icon={Clock}
          hint="richiedono una verifica"
        />
        <StatCard
          label="Coperti attivi"
          value={String(guests)}
          icon={Users}
          hint="prenotazioni in corso"
        />
        <StatCard
          label="In sala"
          value={String(seatedCount)}
          icon={CalendarCheck}
          hint="clienti già accolti"
        />
      </div>

      <section className="rounded-card border border-zinc-200/90 bg-white p-5 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Registro prenotazioni
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              La conferma e il cambio stato sono validati dal database. Le
              prenotazioni del receptionist AI nascono da confermare.
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus />
            Nuova prenotazione
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Cerca" htmlFor="reservation-search" className="min-w-56 flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                id="reservation-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, telefono o email"
                className="pl-9"
              />
            </div>
          </Field>
          <Field label="Stato" htmlFor="reservation-status-filter" className="w-full sm:w-48">
            <Select
              id="reservation-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tutti gli stati</option>
              <option value="pending">Da confermare</option>
              <option value="confirmed">Confermate</option>
              <option value="seated">In sala</option>
              <option value="completed">Completate</option>
              <option value="cancelled">Annullate</option>
              <option value="no_show">No-show</option>
            </Select>
          </Field>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
            <CalendarDays className="size-8 text-zinc-400 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {reservations.length === 0
                ? "Nessuna prenotazione registrata"
                : "Nessun risultato con questi filtri"}
            </p>
            <p className="max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {reservations.length === 0
                ? "Crea la prima prenotazione: il database verifica capienza, orari di apertura, chiusure e preavviso minimo."
                : "Modifica la ricerca o lo stato selezionato."}
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {filtered.map((reservation) => {
              const status = statusStyles[reservation.status];

              return (
                <li
                  key={reservation.id}
                  className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {reservation.customerName}
                        </p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <Badge variant="secondary">
                          {sourceLabels[reservation.source] ?? reservation.source}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" />
                          {formatLongDate(reservation.date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {reservation.time.slice(0, 5)} · {reservation.durationMinutes} min
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="size-3.5" />
                          {reservation.partySize} {reservation.partySize === 1 ? "persona" : "persone"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <a
                          href={`tel:${reservation.customerPhone}`}
                          className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-200"
                        >
                          <Phone className="size-3.5" />
                          {reservation.customerPhone}
                        </a>
                        {reservation.customerEmail ? (
                          <a
                            href={`mailto:${reservation.customerEmail}`}
                            className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-200"
                          >
                            <Mail className="size-3.5" />
                            {reservation.customerEmail}
                          </a>
                        ) : null}
                      </div>
                      {reservation.notes ? (
                        <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
                          {reservation.notes}
                        </p>
                      ) : null}
                      {reservation.cancellationReason ? (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                          Motivo annullamento: {reservation.cancellationReason}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {reservation.status === "pending" ? (
                        <StatusButton
                          formAction={statusFormAction}
                          disabled={statusPending}
                          reservationId={reservation.id}
                          status="confirmed"
                          label="Conferma"
                          icon={<Check />}
                        />
                      ) : null}
                      {reservation.status === "confirmed" ? (
                        <StatusButton
                          formAction={statusFormAction}
                          disabled={statusPending}
                          reservationId={reservation.id}
                          status="seated"
                          label="Cliente arrivato"
                          icon={<Users />}
                        />
                      ) : null}
                      {reservation.status === "seated" ? (
                        <StatusButton
                          formAction={statusFormAction}
                          disabled={statusPending}
                          reservationId={reservation.id}
                          status="completed"
                          label="Completa"
                          icon={<Check />}
                        />
                      ) : null}
                      {reservation.status === "confirmed" ? (
                        <StatusButton
                          formAction={statusFormAction}
                          disabled={statusPending}
                          reservationId={reservation.id}
                          status="no_show"
                          label="No-show"
                          icon={<X />}
                        />
                      ) : null}
                      {["pending", "confirmed", "seated"].includes(reservation.status) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={statusPending}
                          onClick={() => setCancelTarget(reservation)}
                        >
                          Annulla
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={notesPending}
                        onClick={() => setNotesTarget(reservation)}
                      >
                        <ClipboardList />
                        Note
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuova prenotazione</DialogTitle>
            <DialogDescription>
              La disponibilità viene verificata dal database in base a capienza
              dei tavoli attivi, orari e chiusure del locale.
            </DialogDescription>
          </DialogHeader>
          <form key={formKey} action={createFormAction} className="space-y-3">
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome cliente" htmlFor="reservation-name" error={createState.fieldErrors?.customerName}>
                <Input
                  id="reservation-name"
                  name="customerName"
                  placeholder="Mario Rossi"
                  maxLength={120}
                  required
                />
              </Field>
              <Field label="Telefono" htmlFor="reservation-phone" error={createState.fieldErrors?.customerPhone}>
                <Input
                  id="reservation-phone"
                  name="customerPhone"
                  type="tel"
                  placeholder="+39 333 1234567"
                  maxLength={30}
                  required
                />
              </Field>
            </div>
            <Field label="Email (opzionale)" htmlFor="reservation-email" error={createState.fieldErrors?.customerEmail}>
              <Input
                id="reservation-email"
                name="customerEmail"
                type="email"
                placeholder="mario@example.com"
                maxLength={200}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Persone" htmlFor="reservation-party" error={createState.fieldErrors?.partySize}>
                <Input
                  id="reservation-party"
                  name="partySize"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={2}
                  required
                />
              </Field>
              <Field label="Data" htmlFor="reservation-date" error={createState.fieldErrors?.reservationDate}>
                <Input
                  id="reservation-date"
                  name="reservationDate"
                  type="date"
                  defaultValue={defaultDate}
                  required
                />
              </Field>
              <Field label="Ora" htmlFor="reservation-time" error={createState.fieldErrors?.reservationTime}>
                <Input
                  id="reservation-time"
                  name="reservationTime"
                  type="time"
                  defaultValue="20:00"
                  required
                />
              </Field>
            </div>
            <Field
              label="Durata in minuti (opzionale)"
              htmlFor="reservation-duration"
              error={createState.fieldErrors?.durationMinutes}
              hint="Se vuota viene usata la durata predefinita del receptionist."
            >
              <Input
                id="reservation-duration"
                name="durationMinutes"
                type="number"
                min={30}
                max={240}
                step={15}
                placeholder="90"
              />
            </Field>
            <Field label="Note (opzionale)" htmlFor="reservation-notes" error={createState.fieldErrors?.notes}>
              <Textarea
                id="reservation-notes"
                name="notes"
                rows={2}
                maxLength={1000}
                placeholder="Allergie, seggiolone, richieste particolari..."
              />
            </Field>
            <label className="flex items-start gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              <input
                type="checkbox"
                name="confirm"
                defaultChecked
                className="mt-0.5 size-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-600/30 dark:border-zinc-700"
              />
              Conferma subito la prenotazione (se non selezionato resta da
              confermare).
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={createPending || !idempotencyKey}>
                {createPending ? "Verifica disponibilità..." : "Registra prenotazione"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={notesTarget !== null}
        onOpenChange={(open) => {
          if (!open) setNotesTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Note prenotazione</DialogTitle>
            <DialogDescription>
              Aggiorna le note per {notesTarget?.customerName ?? "la prenotazione"}.
              Le note sono visibili a sala e receptionist.
            </DialogDescription>
          </DialogHeader>
          <form action={notesFormAction} className="space-y-3">
            <input type="hidden" name="reservationId" value={notesTarget?.id ?? ""} />
            <Field
              label="Note"
              htmlFor="reservation-note-edit"
              error={notesState.fieldErrors?.notes}
            >
              <Textarea
                id="reservation-note-edit"
                name="notes"
                rows={4}
                maxLength={1000}
                defaultValue={notesTarget?.notes ?? ""}
                placeholder="Nessuna nota"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNotesTarget(null)}>
                Annulla
              </Button>
              <Button type="submit" disabled={notesPending}>
                Salva note
              </Button>
            </DialogFooter>
          </form>
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
            ? `La prenotazione di ${cancelTarget.customerName} per ${cancelTarget.partySize} persone verrà annullata. L'operazione è tracciata nel registro attività.`
            : ""
        }
        confirmLabel="Annulla prenotazione"
        onConfirm={() => {
          if (!cancelTarget) return;
          const formData = new FormData();
          formData.set("reservationId", cancelTarget.id);
          formData.set("status", "cancelled");
          formData.set("reason", "Annullata dalla dashboard");
          setCancelTarget(null);
          startTransition(() => {
            statusFormAction(formData);
          });
        }}
      />
    </div>
  );
}

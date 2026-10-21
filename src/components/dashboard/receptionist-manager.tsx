"use client";

import {
  AlertTriangle,
  Bot,
  CalendarOff,
  Clock3,
  PhoneCall,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCents, formatShortDate, formatTime } from "@/lib/utils";
import {
  addClosedDateAction,
  createDefaultOpeningHoursAction,
  deleteClosedDateAction,
  deleteOpeningHourAction,
  saveOpeningHourAction,
  updateReceptionistSettingsAction,
} from "@/server/receptionist/actions";
import {
  initialReceptionistActionState,
  type ClosedDateRow,
  type OpeningHourRow,
  type ReceptionistOverview,
} from "@/server/receptionist/types";

type Props = {
  overview: ReceptionistOverview;
  apiConfigured: boolean;
};

const weekdayLabels: Record<number, string> = {
  1: "Lunedì",
  2: "Martedì",
  3: "Mercoledì",
  4: "Giovedì",
  5: "Venerdì",
  6: "Sabato",
  7: "Domenica",
};

const callStatusStyles: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "muted" | "secondary" }
> = {
  in_progress: { label: "In corso", variant: "info" },
  completed: { label: "Completata", variant: "success" },
  failed: { label: "Fallita", variant: "danger" },
  transferred: { label: "Trasferita", variant: "warning" },
  abandoned: { label: "Abbandonata", variant: "muted" },
};

export function ReceptionistManager({ overview, apiConfigured }: Props) {
  const { settings } = overview;

  const [settingsState, settingsFormAction, settingsPending] = useActionState(
    updateReceptionistSettingsAction,
    initialReceptionistActionState,
  );
  const [hourState, hourFormAction, hourPending] = useActionState(
    saveOpeningHourAction,
    initialReceptionistActionState,
  );
  const [deleteHourState, deleteHourFormAction, deleteHourPending] = useActionState(
    deleteOpeningHourAction,
    initialReceptionistActionState,
  );
  const [seedState, seedFormAction, seedPending] = useActionState(
    createDefaultOpeningHoursAction,
    initialReceptionistActionState,
  );
  const [closedState, closedFormAction, closedPending] = useActionState(
    addClosedDateAction,
    initialReceptionistActionState,
  );
  const [deleteClosedState, deleteClosedFormAction, deleteClosedPending] =
    useActionState(deleteClosedDateAction, initialReceptionistActionState);
  const [, startTransition] = useTransition();

  const [hourTarget, setHourTarget] = useState<OpeningHourRow | null>(null);
  const [closedTarget, setClosedTarget] = useState<ClosedDateRow | null>(null);

  useEffect(() => {
    if (settingsState.status === "success") {
      toast.success(settingsState.message ?? "Configurazione aggiornata.");
    } else if (settingsState.status === "error" && settingsState.message) {
      toast.error(settingsState.message);
    }
  }, [settingsState]);

  useEffect(() => {
    if (hourState.status === "success") {
      toast.success(hourState.message ?? "Fascia oraria salvata.");
    } else if (hourState.status === "error" && hourState.message) {
      toast.error(hourState.message);
    }
  }, [hourState]);

  useEffect(() => {
    if (deleteHourState.status === "success") {
      toast.success(deleteHourState.message ?? "Fascia oraria eliminata.");
    } else if (deleteHourState.status === "error" && deleteHourState.message) {
      toast.error(deleteHourState.message);
    }
  }, [deleteHourState]);

  useEffect(() => {
    if (seedState.status === "success") {
      toast.success(seedState.message ?? "Orari standard aggiunti.");
    } else if (seedState.status === "error" && seedState.message) {
      toast.error(seedState.message);
    }
  }, [seedState]);

  useEffect(() => {
    if (closedState.status === "success") {
      toast.success(closedState.message ?? "Data di chiusura aggiunta.");
    } else if (closedState.status === "error" && closedState.message) {
      toast.error(closedState.message);
    }
  }, [closedState]);

  useEffect(() => {
    if (deleteClosedState.status === "success") {
      toast.success(deleteClosedState.message ?? "Data di chiusura eliminata.");
    } else if (deleteClosedState.status === "error" && deleteClosedState.message) {
      toast.error(deleteClosedState.message);
    }
  }, [deleteClosedState]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {settings.isEnabled ? (
          <Badge variant="success" dot>
            Receptionist attivo
          </Badge>
        ) : (
          <Badge variant="muted">Receptionist non attivo</Badge>
        )}
        <Badge variant="secondary">
          Budget mensile: {settings.monthlyBudgetCents > 0 ? formatCents(settings.monthlyBudgetCents) : "non impostato"}
        </Badge>
        <Badge variant="secondary">Lingua: {settings.language.toUpperCase()}</Badge>
      </div>

      {!apiConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-700 dark:text-amber-300" />
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              API vocali non configurate
            </p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            Imposta RECEPTIONIST_INTERNAL_TOKEN e RECEPTIONIST_INTERNAL_SECRET
            lato server per rendere operative le API interne. La configurazione
            salvata resta valida e verificata dal database.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <PhoneCall className="size-4 text-zinc-500 dark:text-zinc-400" />
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Telefonia non collegata
          </p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Questa è la predisposizione reale di prodotto: configurazione,
          disponibilità, prenotazioni, messaggi e registro chiamate funzionano
          nel database. Per ricevere chiamate servono provider vocale, numero
          telefonico e credenziali, non inclusi in questa fase.
        </p>
      </div>

      <Tabs defaultValue="config">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="config">
            <Bot />
            Configurazione
          </TabsTrigger>
          <TabsTrigger value="hours">
            <Clock3 />
            Orari
          </TabsTrigger>
          <TabsTrigger value="closures">
            <CalendarOff />
            Chiusure
          </TabsTrigger>
          <TabsTrigger value="calls">
            <PhoneCall />
            Chiamate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <form
            action={settingsFormAction}
            className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Attivazione e numeri
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Il numero chiamato identifica il ristorante. Il numero di
                trasferimento viene restituito alle API vocali, ma il
                trasferimento effettivo dipende dal provider.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-zinc-200 px-3 py-3 dark:border-zinc-800">
              <input
                type="checkbox"
                name="isEnabled"
                defaultChecked={settings.isEnabled}
                className="mt-0.5 size-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-600/30 dark:border-zinc-700"
              />
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Abilita receptionist AI
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  Se disattivato, le API rifiutano nuove chiamate. Richiede il
                  numero chiamato configurato.
                </span>
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Numero chiamato"
                htmlFor="receptionist-inbound"
                error={settingsState.fieldErrors?.inboundPhone}
                hint="Formato internazionale, es. +390212345678."
              >
                <Input
                  id="receptionist-inbound"
                  name="inboundPhone"
                  type="tel"
                  defaultValue={settings.inboundPhoneNumber ?? ""}
                  placeholder="+390212345678"
                  maxLength={30}
                />
              </Field>
              <Field
                label="Numero trasferimento"
                htmlFor="receptionist-transfer"
                error={settingsState.fieldErrors?.transferPhone}
                hint="Opzionale. Usato dalle API vocali per il trasferimento."
              >
                <Input
                  id="receptionist-transfer"
                  name="transferPhone"
                  type="tel"
                  defaultValue={settings.transferPhone ?? ""}
                  placeholder="+393331234567"
                  maxLength={30}
                />
              </Field>
              <Field
                label="Nome receptionist"
                htmlFor="receptionist-name"
                error={settingsState.fieldErrors?.displayName}
              >
                <Input
                  id="receptionist-name"
                  name="displayName"
                  defaultValue={settings.displayName ?? ""}
                  placeholder="Sofia"
                  maxLength={120}
                />
              </Field>
              <Field
                label="Messaggio di benvenuto"
                htmlFor="receptionist-greeting"
                error={settingsState.fieldErrors?.greeting}
              >
                <Input
                  id="receptionist-greeting"
                  name="greeting"
                  defaultValue={settings.greeting ?? ""}
                  placeholder="Buonasera, come posso aiutarla?"
                  maxLength={500}
                />
              </Field>
            </div>

            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Voce e modello
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Questi parametri vengono restituiti all&apos;agente vocale. Il
                modello deve essere disponibile nel provider configurato.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Lingua" htmlFor="receptionist-language">
                  <Select
                    id="receptionist-language"
                    name="language"
                    defaultValue={settings.language}
                  >
                    <option value="it">Italiano</option>
                    <option value="en">Inglese</option>
                  </Select>
                </Field>
                <Field
                  label="Voce"
                  htmlFor="receptionist-voice"
                  error={settingsState.fieldErrors?.voice}
                >
                  <Input
                    id="receptionist-voice"
                    name="voice"
                    defaultValue={settings.voice}
                    maxLength={40}
                    required
                  />
                </Field>
                <Field
                  label="Modello"
                  htmlFor="receptionist-model"
                  error={settingsState.fieldErrors?.model}
                >
                  <Input
                    id="receptionist-model"
                    name="model"
                    defaultValue={settings.model}
                    maxLength={80}
                    required
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Limiti e prenotazioni
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Durata massima e limite giornaliero sono applicati dal database
                all&apos;avvio delle chiamate. Il budget mensile viene salvato
                come configurazione: sarà applicato quando sarà collegato il
                provider che espone i costi reali.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="Durata max chiamata (s)"
                  htmlFor="receptionist-max-call"
                  error={settingsState.fieldErrors?.maxCallSeconds}
                >
                  <Input
                    id="receptionist-max-call"
                    name="maxCallSeconds"
                    type="number"
                    min={60}
                    max={1800}
                    defaultValue={settings.maxCallSeconds}
                    required
                  />
                </Field>
                <Field
                  label="Chiamate al giorno"
                  htmlFor="receptionist-max-daily"
                  error={settingsState.fieldErrors?.maxDailyCalls}
                >
                  <Input
                    id="receptionist-max-daily"
                    name="maxDailyCalls"
                    type="number"
                    min={1}
                    max={2000}
                    defaultValue={settings.maxDailyCalls}
                    required
                  />
                </Field>
                <Field
                  label="Budget mensile (€)"
                  htmlFor="receptionist-budget"
                  error={settingsState.fieldErrors?.monthlyBudget}
                  hint="0 = nessun limite."
                >
                  <Input
                    id="receptionist-budget"
                    name="monthlyBudget"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={(settings.monthlyBudgetCents / 100).toFixed(2)}
                    required
                  />
                </Field>
                <Field
                  label="Durata prenotazione (min)"
                  htmlFor="receptionist-duration"
                  error={settingsState.fieldErrors?.reservationDurationMinutes}
                >
                  <Input
                    id="receptionist-duration"
                    name="reservationDurationMinutes"
                    type="number"
                    min={30}
                    max={240}
                    step={15}
                    defaultValue={settings.reservationDurationMinutes}
                    required
                  />
                </Field>
                <Field
                  label="Persone max"
                  htmlFor="receptionist-party"
                  error={settingsState.fieldErrors?.maxPartySize}
                >
                  <Input
                    id="receptionist-party"
                    name="maxPartySize"
                    type="number"
                    min={1}
                    max={50}
                    defaultValue={settings.maxPartySize}
                    required
                  />
                </Field>
                <Field
                  label="Preavviso minimo (min)"
                  htmlFor="receptionist-notice"
                  error={settingsState.fieldErrors?.minNoticeMinutes}
                >
                  <Input
                    id="receptionist-notice"
                    name="minNoticeMinutes"
                    type="number"
                    min={0}
                    max={10080}
                    defaultValue={settings.minNoticeMinutes}
                    required
                  />
                </Field>
                <Field
                  label="Giorni massimi avanti"
                  htmlFor="receptionist-days"
                  error={settingsState.fieldErrors?.maxDaysAhead}
                >
                  <Input
                    id="receptionist-days"
                    name="maxDaysAhead"
                    type="number"
                    min={1}
                    max={365}
                    defaultValue={settings.maxDaysAhead}
                    required
                  />
                </Field>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={settingsPending}>
                <Save />
                Salva configurazione
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="hours">
          <div className="space-y-4">
            <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Orari di apertura
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    La disponibilità richiede che l&apos;intera prenotazione sia
                    compresa in una fascia attiva. Se non ci sono fasce, la
                    verifica oraria viene saltata.
                  </p>
                </div>
                <form action={seedFormAction}>
                  <Button type="submit" size="sm" variant="outline" disabled={seedPending}>
                    <Sparkles />
                    Aggiungi orari standard
                  </Button>
                </form>
              </div>

              <form
                action={hourFormAction}
                className="mt-4 grid gap-3 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700 sm:grid-cols-5 sm:items-end"
              >
                <Field label="Giorno" htmlFor="new-hour-weekday">
                  <Select id="new-hour-weekday" name="weekday" defaultValue="1">
                    {Object.entries(weekdayLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Apertura" htmlFor="new-hour-opens">
                  <Input id="new-hour-opens" name="opensAt" type="time" defaultValue="19:00" required />
                </Field>
                <Field label="Chiusura" htmlFor="new-hour-closes">
                  <Input id="new-hour-closes" name="closesAt" type="time" defaultValue="22:30" required />
                </Field>
                <label className="flex items-center gap-2 pb-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked
                    className="size-4 rounded border-zinc-300 text-brand-600 dark:border-zinc-700"
                  />
                  Attiva
                </label>
                <Button type="submit" size="sm" disabled={hourPending}>
                  <Plus />
                  Aggiungi
                </Button>
              </form>
              {hourState.fieldErrors?.closesAt ? (
                <p className="mt-2 text-xs text-red-600">{hourState.fieldErrors.closesAt}</p>
              ) : null}

              {overview.openingHours.length === 0 ? (
                <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                  Nessuna fascia oraria configurata.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {overview.openingHours.map((hour) => (
                    <li
                      key={hour.id}
                      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <form
                        action={hourFormAction}
                        className="grid gap-3 sm:grid-cols-5 sm:items-end"
                      >
                        <input type="hidden" name="hourId" value={hour.id} />
                        <Field label="Giorno" htmlFor={`hour-weekday-${hour.id}`}>
                          <Select
                            id={`hour-weekday-${hour.id}`}
                            name="weekday"
                            defaultValue={String(hour.weekday)}
                          >
                            {Object.entries(weekdayLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Apertura" htmlFor={`hour-opens-${hour.id}`}>
                          <Input
                            id={`hour-opens-${hour.id}`}
                            name="opensAt"
                            type="time"
                            defaultValue={hour.opensAt}
                            required
                          />
                        </Field>
                        <Field label="Chiusura" htmlFor={`hour-closes-${hour.id}`}>
                          <Input
                            id={`hour-closes-${hour.id}`}
                            name="closesAt"
                            type="time"
                            defaultValue={hour.closesAt}
                            required
                          />
                        </Field>
                        <label className="flex items-center gap-2 pb-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={hour.isActive}
                            className="size-4 rounded border-zinc-300 text-brand-600 dark:border-zinc-700"
                          />
                          Attiva
                        </label>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" variant="outline" disabled={hourPending}>
                            <Save />
                            Salva
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={deleteHourPending}
                            onClick={() => setHourTarget(hour)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="closures">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Date di chiusura
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Nelle date di chiusura la disponibilità viene negata anche se la
              fascia oraria è attiva.
            </p>

            <form
              action={closedFormAction}
              className="mt-4 grid gap-3 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700 sm:grid-cols-4 sm:items-end"
            >
              <Field
                label="Data"
                htmlFor="closed-date"
                error={closedState.fieldErrors?.closedOn}
              >
                <Input id="closed-date" name="closedOn" type="date" required />
              </Field>
              <Field
                label="Motivo (opzionale)"
                htmlFor="closed-reason"
                error={closedState.fieldErrors?.reason}
                className="sm:col-span-2"
              >
                <Input
                  id="closed-reason"
                  name="reason"
                  placeholder="Chiusura straordinaria"
                  maxLength={200}
                />
              </Field>
              <Button type="submit" size="sm" disabled={closedPending}>
                <Plus />
                Aggiungi
              </Button>
            </form>

            {overview.closedDates.length === 0 ? (
              <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                Nessuna chiusura straordinaria configurata.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                {overview.closedDates.map((date) => (
                  <li
                    key={date.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {formatShortDate(date.closedOn)}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {date.reason ?? "Nessun motivo indicato"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={deleteClosedPending}
                      onClick={() => setClosedTarget(date)}
                    >
                      <Trash2 />
                      Elimina
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        <TabsContent value="calls">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Registro chiamate
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Le chiamate arrivano dalle API interne quando un provider vocale
              è collegato. Ogni chiamata ha stato, durata, messaggi e
              riepilogo.
            </p>

            {overview.calls.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 py-8 text-center dark:border-zinc-700">
                <PhoneCall className="size-6 text-zinc-400 dark:text-zinc-600" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Nessuna chiamata registrata.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {overview.calls.map((call) => {
                  const status = callStatusStyles[call.status] ?? {
                    label: call.status,
                    variant: "secondary" as const,
                  };

                  return (
                    <li
                      key={call.id}
                      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {call.fromPhone ?? "Numero sconosciuto"}
                          </p>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatShortDate(call.startedAt)} · {formatTime(call.startedAt)}
                          {call.durationSeconds !== null
                            ? ` · ${Math.round(call.durationSeconds / 60)} min`
                            : ""}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Verso {call.toPhone ?? "numero non registrato"} ·{" "}
                        {call.messageCount} messaggi
                      </p>
                      {call.summary ? (
                        <p className="mt-2 rounded bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
                          {call.summary}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={hourTarget !== null}
        onOpenChange={(open) => {
          if (!open) setHourTarget(null);
        }}
        title="Eliminare la fascia oraria?"
        description={
          hourTarget
            ? `La fascia di ${weekdayLabels[hourTarget.weekday]} ${hourTarget.opensAt}-${hourTarget.closesAt} non sarà più usata per la disponibilità.`
            : ""
        }
        confirmLabel="Elimina"
        onConfirm={() => {
          if (!hourTarget) return;
          const formData = new FormData();
          formData.set("id", hourTarget.id);
          setHourTarget(null);
          startTransition(() => {
            deleteHourFormAction(formData);
          });
        }}
      />

      <ConfirmDialog
        open={closedTarget !== null}
        onOpenChange={(open) => {
          if (!open) setClosedTarget(null);
        }}
        title="Eliminare la chiusura?"
        description={
          closedTarget
            ? `La data ${formatShortDate(closedTarget.closedOn)} tornerà disponibile secondo gli orari configurati.`
            : ""
        }
        confirmLabel="Elimina"
        onConfirm={() => {
          if (!closedTarget) return;
          const formData = new FormData();
          formData.set("id", closedTarget.id);
          setClosedTarget(null);
          startTransition(() => {
            deleteClosedFormAction(formData);
          });
        }}
      />
    </div>
  );
}

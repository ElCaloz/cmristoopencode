"use client";

import {
  BadgeEuro,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { formatCents, formatDate } from "@/lib/utils";
import {
  recordLoyaltyAction,
  saveCustomerAction,
  saveLoyaltySettingsAction,
  sendCustomerMessageAction,
} from "@/server/crm/actions";
import {
  initialCrmActionState,
  type CrmActionState,
  type CrmData,
  type CustomerRow,
} from "@/server/crm/types";

type Props = {
  data: CrmData;
  canManage: boolean;
  canManageSettings: boolean;
};

export function CrmManager({ data, canManage, canManageSettings }: Props) {
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [query, setQuery] = useState("");
  const [formVersion, setFormVersion] = useState(0);

  const [customerState, customerAction, customerPending] = useActionState(
    async (prevState: CrmActionState, formData: FormData) => {
      const result = await saveCustomerAction(prevState, formData);
      if (result.status === "success") {
        setSelected(null);
        setFormVersion((value) => value + 1);
      }
      return result;
    },
    initialCrmActionState,
  );
  const [loyaltyState, loyaltyAction, loyaltyPending] = useActionState(
    saveLoyaltySettingsAction,
    initialCrmActionState,
  );
  const [pointsState, pointsAction, pointsPending] = useActionState(
    recordLoyaltyAction,
    initialCrmActionState,
  );
  const [messageState, messageAction, messagePending] = useActionState(
    sendCustomerMessageAction,
    initialCrmActionState,
  );

  useEffect(() => {
    if (customerState.status === "success") {
      toast.success(customerState.message ?? "Cliente salvato.");
    } else if (customerState.status === "error" && customerState.message) {
      toast.error(customerState.message);
    }
  }, [customerState]);

  useEffect(() => {
    if (loyaltyState.status === "success") {
      toast.success(loyaltyState.message ?? "Impostazioni aggiornate.");
    } else if (loyaltyState.status === "error" && loyaltyState.message) {
      toast.error(loyaltyState.message);
    }
  }, [loyaltyState]);

  useEffect(() => {
    if (pointsState.status === "success") {
      toast.success(pointsState.message ?? "Punti aggiornati.");
    } else if (pointsState.status === "error" && pointsState.message) {
      toast.error(pointsState.message);
    }
  }, [pointsState]);

  useEffect(() => {
    if (messageState.status === "success") {
      toast.success(messageState.message ?? "Messaggio inviato.");
    } else if (messageState.status === "error" && messageState.message) {
      toast.error(messageState.message);
    }
  }, [messageState]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.customers;
    return data.customers.filter((customer) =>
      [customer.fullName, customer.email, customer.phone, customer.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [data.customers, query]);

  const editing = selected;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Clienti", value: String(data.summary.customers) },
          {
            label: "Consensi marketing",
            value: String(data.summary.marketingConsents),
          },
          { label: "Punti fedeltà", value: String(data.summary.loyaltyPoints) },
          {
            label: "Messaggi da leggere",
            value: String(data.summary.unreadMessages),
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{card.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {canManage ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            {editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {editing ? `Modifica ${editing.fullName}` : "Nuovo cliente"}
            </h2>
          </div>
          <form
            key={`${editing?.id ?? "new"}-${formVersion}`}
            action={customerAction}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            {editing ? (
              <input type="hidden" name="customerId" value={editing.id} />
            ) : null}
            <Field
              label="Nome"
              htmlFor="customer-first-name"
              error={customerState.fieldErrors?.firstName}
            >
              <Input
                id="customer-first-name"
                name="firstName"
                defaultValue={editing?.firstName ?? ""}
                maxLength={80}
              />
            </Field>
            <Field
              label="Cognome"
              htmlFor="customer-last-name"
              error={customerState.fieldErrors?.lastName}
            >
              <Input
                id="customer-last-name"
                name="lastName"
                defaultValue={editing?.lastName ?? ""}
                maxLength={80}
              />
            </Field>
            <Field
              label="Email"
              htmlFor="customer-email"
              error={customerState.fieldErrors?.email}
            >
              <Input
                id="customer-email"
                name="email"
                type="email"
                defaultValue={editing?.email ?? ""}
                maxLength={254}
              />
            </Field>
            <Field
              label="Telefono"
              htmlFor="customer-phone"
              error={customerState.fieldErrors?.phone}
            >
              <Input
                id="customer-phone"
                name="phone"
                defaultValue={editing?.phone ?? ""}
                maxLength={40}
              />
            </Field>
            <Field label="Tag (separati da virgola)" htmlFor="customer-tags">
              <Input
                id="customer-tags"
                name="tags"
                defaultValue={editing?.tags.join(", ") ?? ""}
                maxLength={500}
              />
            </Field>
            <Field label="Allergie e intolleranze" htmlFor="customer-allergies">
              <Input
                id="customer-allergies"
                name="allergies"
                defaultValue={editing?.allergies ?? ""}
                maxLength={500}
              />
            </Field>
            <Field label="Note interne" htmlFor="customer-notes" className="sm:col-span-2">
              <Textarea
                id="customer-notes"
                name="notes"
                defaultValue={editing?.notes ?? ""}
                rows={2}
                maxLength={1000}
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                name="marketingEmail"
                defaultChecked={editing?.marketingEmail ?? false}
                className="size-4"
              />
              Consenso marketing via email
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                name="marketingSms"
                defaultChecked={editing?.marketingSms ?? false}
                className="size-4"
              />
              Consenso marketing via SMS
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={customerPending}>
                {editing ? "Salva modifiche" : "Crea cliente"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelected(null)}
                >
                  Annulla
                </Button>
              ) : null}
            </div>
          </form>
        </section>
      ) : (
        <p className="rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Il tuo ruolo consente la consultazione dei clienti ma non la modifica.
        </p>
      )}

      {canManage && editing ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Punti fedeltà
              </h2>
              <Badge variant="secondary">Saldo: {editing.loyaltyPoints}</Badge>
            </div>
            <form action={pointsAction} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="customerId" value={editing.id} />
              <Field
                label="Punti (usa - per scalare)"
                htmlFor="loyalty-points"
                error={pointsState.fieldErrors?.points}
              >
                <Input
                  id="loyalty-points"
                  name="points"
                  inputMode="numeric"
                  placeholder="es. 50 oppure -100"
                  required
                />
              </Field>
              <Field
                label="Motivo"
                htmlFor="loyalty-reason"
                error={pointsState.fieldErrors?.reason}
              >
                <Input
                  id="loyalty-reason"
                  name="reason"
                  placeholder="es. Premio compleanno"
                  maxLength={200}
                  required
                />
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={pointsPending}>
                  Registra movimento
                </Button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Messaggio diretto
              </h2>
            </div>
            <form action={messageAction} className="mt-3 space-y-3">
              <input type="hidden" name="customerId" value={editing.id} />
              <Field label="Canale" htmlFor="message-channel">
                <Select id="message-channel" name="channel" defaultValue="email">
                  <option value="email">Email · {editing.email || "non disponibile"}</option>
                  <option value="sms">SMS · {editing.phone || "non disponibile"}</option>
                </Select>
              </Field>
              <Field
                label="Oggetto (solo email)"
                htmlFor="message-subject"
                error={messageState.fieldErrors?.subject}
              >
                <Input id="message-subject" name="subject" maxLength={200} />
              </Field>
              <Field
                label="Messaggio"
                htmlFor="message-body"
                error={messageState.fieldErrors?.body}
              >
                <Textarea id="message-body" name="body" rows={3} maxLength={4000} required />
              </Field>
              <Button type="submit" disabled={messagePending}>
                <Mail />
                Invia e traccia
              </Button>
            </form>
          </section>
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRound className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Anagrafica clienti
            </h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca per nome, email, telefono o tag"
              className="pl-9"
              aria-label="Cerca clienti"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun cliente trovato.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.slice(0, 200).map((customer) => (
              <li
                key={customer.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {customer.fullName}
                    </p>
                    {customer.tags.map((tag) => (
                      <Badge key={tag} variant="muted">
                        {tag}
                      </Badge>
                    ))}
                    {customer.marketingEmail || customer.marketingSms ? (
                      <Badge variant="success">Consenso</Badge>
                    ) : (
                      <Badge variant="outline">Senza consenso</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {[customer.email, customer.phone].filter(Boolean).join(" · ") ||
                      "Nessun contatto"}
                    {customer.lastVisitAt
                      ? ` · ultima visita ${formatDate(customer.lastVisitAt)}`
                      : ""}
                  </p>
                  {customer.allergies ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      Allergie: {customer.allergies}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCents(customer.totalSpentCents)}
                    </p>
                    <p>
                      {customer.visits} visite · {customer.loyaltyPoints} punti
                    </p>
                  </div>
                  {canManage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(customer);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <Pencil />
                      Gestisci
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <BadgeEuro className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Programma fedeltà
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Punti guadagnati per euro, valore di riscatto e soglia minima sono
            applicati dal database.
          </p>
          {canManageSettings ? (
            <form action={loyaltyAction} className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field
                label="Punti per euro"
                htmlFor="loyalty-per-euro"
                error={loyaltyState.fieldErrors?.pointsPerEuro}
              >
                <Input
                  id="loyalty-per-euro"
                  name="pointsPerEuro"
                  type="number"
                  min={1}
                  max={1000}
                  defaultValue={data.loyalty.pointsPerEuro}
                />
              </Field>
              <Field
                label="Valore punto (centesimi)"
                htmlFor="loyalty-point-value"
                error={loyaltyState.fieldErrors?.pointValueCents}
              >
                <Input
                  id="loyalty-point-value"
                  name="pointValueCents"
                  type="number"
                  min={1}
                  max={10000}
                  defaultValue={data.loyalty.pointValueCents}
                />
              </Field>
              <Field
                label="Soglia riscatto"
                htmlFor="loyalty-min-redeem"
                error={loyaltyState.fieldErrors?.minRedeemPoints}
              >
                <Input
                  id="loyalty-min-redeem"
                  name="minRedeemPoints"
                  type="number"
                  min={1}
                  max={1000000}
                  defaultValue={data.loyalty.minRedeemPoints}
                />
              </Field>
              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 sm:col-span-3">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={data.loyalty.isActive}
                  className="size-4"
                />
                Programma fedeltà attivo
              </label>
              <div className="sm:col-span-3">
                <Button type="submit" variant="outline" disabled={loyaltyPending}>
                  Salva impostazioni
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Punti per euro: {data.loyalty.pointsPerEuro} · valore punto:{" "}
              {data.loyalty.pointValueCents} cent · soglia:{" "}
              {data.loyalty.minRedeemPoints} punti
            </p>
          )}

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Ultimi movimenti
          </h3>
          {data.transactions.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Nessun movimento registrato.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.transactions.slice(0, 8).map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-2 py-2 text-xs"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {transaction.customerName} · {transaction.reason}
                  </span>
                  <span
                    className={
                      transaction.points >= 0
                        ? "font-medium text-emerald-700 dark:text-emerald-400"
                        : "font-medium text-red-700 dark:text-red-400"
                    }
                  >
                    {transaction.points >= 0 ? "+" : ""}
                    {transaction.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Messaggi recenti
            </h2>
          </div>
          {data.messages.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Nessun messaggio registrato. I messaggi inviati dai clienti via
              email o SMS compaiono qui.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.messages.slice(0, 10).map((message) => (
                <li key={message.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={message.direction === "inbound" ? "info" : "secondary"}
                    >
                      {message.direction === "inbound" ? "Ricevuto" : "Inviato"}
                    </Badge>
                    <Badge variant="muted">{message.channel}</Badge>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {message.customerName ?? message.recipient}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {message.subject ? `${message.subject} · ` : ""}
                    {message.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

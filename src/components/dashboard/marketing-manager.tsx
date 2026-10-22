"use client";

import { Inbox, Megaphone, Plus, Send } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { formatDate, relativeTime } from "@/lib/utils";
import {
  markMessagesReadAction,
} from "@/server/crm/actions";
import {
  createCampaignAction,
  sendCampaignAction,
} from "@/server/marketing/actions";
import {
  initialMarketingActionState,
  type MarketingData,
} from "@/server/marketing/types";

type Props = {
  data: MarketingData;
  canManage: boolean;
};

const statusLabels: Record<string, string> = {
  draft: "Bozza",
  scheduled: "Programmata",
  sending: "In invio",
  sent: "Inviata",
  cancelled: "Annullata",
};

export function MarketingManager({ data, canManage }: Props) {
  const [createState, createAction, createPending] = useActionState(
    createCampaignAction,
    initialMarketingActionState,
  );
  const [sendState, sendAction, sendPending] = useActionState(
    sendCampaignAction,
    initialMarketingActionState,
  );

  useEffect(() => {
    if (createState.status === "success") {
      toast.success(createState.message ?? "Campagna creata.");
    } else if (createState.status === "error" && createState.message) {
      toast.error(createState.message);
    }
  }, [createState]);

  useEffect(() => {
    if (sendState.status === "success") {
      toast.success(sendState.message ?? "Campagna inviata.");
    } else if (sendState.status === "error" && sendState.message) {
      toast.error(sendState.message);
    }
  }, [sendState]);

  const inbound = data.inbox.filter((message) => message.direction === "inbound");
  const unread = inbound.filter((message) => !message.readAt);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Segmenti disponibili
          </h2>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          I conteggi considerano solo i clienti con consenso per il canale
          scelto. L&apos;invio è tracciato per destinatario.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {data.segments.map((segment) => (
            <div
              key={segment.id}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {segment.label}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {segment.count}
              </p>
            </div>
          ))}
        </div>
      </section>

      {canManage ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Plus className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Nuova campagna
            </h2>
          </div>
          <form action={createAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              label="Nome campagna"
              htmlFor="campaign-name"
              error={createState.fieldErrors?.name}
            >
              <Input
                id="campaign-name"
                name="name"
                placeholder="es. Menù di ottobre"
                maxLength={120}
                required
              />
            </Field>
            <Field label="Canale" htmlFor="campaign-channel">
              <Select id="campaign-channel" name="channel" defaultValue="email">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </Select>
            </Field>
            <Field label="Segmento" htmlFor="campaign-segment">
              <Select id="campaign-segment" name="segment" defaultValue="all">
                {data.segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.label} ({segment.count})
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Oggetto (solo email)"
              htmlFor="campaign-subject"
              error={createState.fieldErrors?.subject}
            >
              <Input id="campaign-subject" name="subject" maxLength={200} />
            </Field>
            <Field
              label="Messaggio"
              htmlFor="campaign-body"
              error={createState.fieldErrors?.body}
              className="sm:col-span-2"
            >
              <Textarea
                id="campaign-body"
                name="body"
                rows={3}
                maxLength={4000}
                required
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createPending}>
                Crea bozza
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Campagne
        </h2>
        {data.campaigns.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessuna campagna creata. Crea una bozza, controlla il messaggio e
            inviala a un massimo di 25 destinatari per volta.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {campaign.name}
                    </p>
                    <Badge
                      variant={
                        campaign.status === "sent"
                          ? "success"
                          : campaign.status === "sending"
                            ? "info"
                            : campaign.status === "cancelled"
                              ? "danger"
                              : "secondary"
                      }
                    >
                      {statusLabels[campaign.status] ?? campaign.status}
                    </Badge>
                    <Badge variant="muted">{campaign.channel}</Badge>
                    <Badge variant="outline">{campaign.segment}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {campaign.subject ? `${campaign.subject} · ` : ""}
                    {campaign.body}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Creato {formatDate(campaign.createdAt)} · inviati{" "}
                    {campaign.sentCount} · falliti {campaign.failedCount}
                  </p>
                </div>
                {canManage &&
                campaign.status !== "sent" &&
                campaign.status !== "cancelled" ? (
                  <form action={sendAction}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <Button type="submit" size="sm" disabled={sendPending}>
                      <Send />
                      {campaign.status === "sending" ? "Continua invio" : "Invia"}
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Inbox className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Inbox messaggi
            </h2>
            {unread.length > 0 ? (
              <Badge variant="warning">{unread.length} da leggere</Badge>
            ) : null}
          </div>
          {canManage && unread.length > 0 ? (
            <form action={markMessagesReadAction}>
              <Button type="submit" size="sm" variant="outline">
                Segna come letti
              </Button>
            </form>
          ) : null}
        </div>
        {data.inbox.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun messaggio. Le risposte email e gli SMS ricevuti vengono
            registrati automaticamente tramite i webhook configurati.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.inbox.slice(0, 30).map((message) => (
              <li key={message.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={message.direction === "inbound" ? "info" : "secondary"}>
                    {message.direction === "inbound" ? "Ricevuto" : "Inviato"}
                  </Badge>
                  <Badge variant="muted">{message.channel}</Badge>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {message.customerName ?? message.recipient}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {relativeTime(message.createdAt)}
                  </span>
                  {message.status === "failed" ? (
                    <Badge variant="danger">Fallito</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {message.subject ? `${message.subject} · ` : ""}
                  {message.body}
                </p>
                {message.error ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {message.error}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

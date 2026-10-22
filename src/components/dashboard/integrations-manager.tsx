"use client";

import {
  CheckCircle2,
  Inbox,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  Printer,
  Send,
  XCircle,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { IntegrationStatus } from "@/lib/integrations/config";
import {
  saveInboundSettingsAction,
  sendTestEmailAction,
  sendTestSmsAction,
} from "@/server/billing/integrations-actions";
import {
  initialIntegrationActionState,
} from "@/server/billing/types";
import type { InboundSettings } from "@/server/billing/queries";
import {
  savePrinterAction,
  testPrintAction,
  togglePrinterAction,
} from "@/server/printers/actions";
import {
  initialPrinterActionState,
  type PrinterActionState,
  type PrinterData,
  type PrinterRow,
} from "@/server/printers/types";

type Props = {
  printers: PrinterData;
  inbound: InboundSettings;
  integrations: IntegrationStatus[];
  canManage: boolean;
};

const stationLabels: Record<string, string> = {
  receipt: "Scontrini",
  kitchen: "Cucina",
  bar: "Bar",
};

const jobStatusLabels: Record<string, string> = {
  queued: "In coda",
  printing: "In stampa",
  printed: "Stampato",
  failed: "Fallito",
};

export function IntegrationsManager({
  printers,
  inbound,
  integrations,
  canManage,
}: Props) {
  const [editing, setEditing] = useState<PrinterRow | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  const [printerState, printerAction, printerPending] = useActionState(
    async (prevState: PrinterActionState, formData: FormData) => {
      const result = await savePrinterAction(prevState, formData);
      if (result.status === "success") {
        setEditing(null);
        setFormVersion((value) => value + 1);
      }
      return result;
    },
    initialPrinterActionState,
  );
  const [testPrintState, submitTestPrint, testPrintPending] = useActionState(
    testPrintAction,
    initialPrinterActionState,
  );
  const [emailState, emailAction, emailPending] = useActionState(
    sendTestEmailAction,
    initialIntegrationActionState,
  );
  const [smsState, smsAction, smsPending] = useActionState(
    sendTestSmsAction,
    initialIntegrationActionState,
  );
  const [inboundState, inboundAction, inboundPending] = useActionState(
    saveInboundSettingsAction,
    initialIntegrationActionState,
  );

  useEffect(() => {
    if (printerState.status === "success") {
      toast.success(printerState.message ?? "Stampante salvata.");
    } else if (printerState.status === "error" && printerState.message) {
      toast.error(printerState.message);
    }
  }, [printerState]);

  useEffect(() => {
    if (testPrintState.status === "success") {
      toast.success(testPrintState.message ?? "Stampa accodata.");
    } else if (testPrintState.status === "error" && testPrintState.message) {
      toast.error(testPrintState.message);
    }
  }, [testPrintState]);

  useEffect(() => {
    if (emailState.status === "success") {
      toast.success(emailState.message ?? "Email inviata.");
    } else if (emailState.status === "error" && emailState.message) {
      toast.error(emailState.message);
    }
  }, [emailState]);

  useEffect(() => {
    if (smsState.status === "success") {
      toast.success(smsState.message ?? "SMS inviato.");
    } else if (smsState.status === "error" && smsState.message) {
      toast.error(smsState.message);
    }
  }, [smsState]);

  useEffect(() => {
    if (inboundState.status === "success") {
      toast.success(inboundState.message ?? "Impostazioni salvate.");
    } else if (inboundState.status === "error" && inboundState.message) {
      toast.error(inboundState.message);
    }
  }, [inboundState]);

  const printer = editing;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Stato delle integrazioni
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Lo stato riflette solo le variabili d&apos;ambiente presenti sul
          server. Nessuna credenziale viene mai mostrata o salvata su questa
          pagina.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <li
              key={integration.kind}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex items-center gap-2">
                {integration.configured ? (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="size-4 text-zinc-400" />
                )}
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {integration.name}
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {integration.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Printer className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Stampanti
            </h2>
          </div>
          <Badge variant="secondary">
            Formato scontrino 58/80 mm · mai A4
          </Badge>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Le stampanti sono collegate al servizio locale, che preleva i lavori
          dalla coda cloud e stampa con ESC/POS. La stampa di prova verifica
          l&apos;intera catena.
        </p>

        {printers.printers.length === 0 ? (
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Nessuna stampante configurata.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {printers.printers.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </p>
                    <Badge variant="muted">{stationLabels[item.station]}</Badge>
                    <Badge variant="outline">{item.paperWidth} mm</Badge>
                    <Badge
                      variant={
                        item.connection === "network" ? "info" : "secondary"
                      }
                    >
                      {item.connection === "network"
                        ? `${item.host ?? ""}${item.port ? `:${item.port}` : ""}`
                        : "File spool"}
                    </Badge>
                    <Badge variant={item.isActive ? "success" : "danger"}>
                      {item.isActive ? "Attiva" : "Disattivata"}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canManage ? (
                    <>
                      <form action={submitTestPrint}>
                        <input type="hidden" name="printerId" value={item.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={testPrintPending}
                        >
                          <Send />
                          Stampa di prova
                        </Button>
                      </form>
                      <form action={togglePrinterAction}>
                        <input type="hidden" name="printerId" value={item.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={item.isActive ? "false" : "true"}
                        />
                        <Button type="submit" size="sm" variant="outline">
                          {item.isActive ? "Disattiva" : "Attiva"}
                        </Button>
                      </form>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(item)}
                      >
                        <Pencil />
                        Modifica
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <form
            key={`${printer?.id ?? "new"}-${formVersion}`}
            action={printerAction}
            className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:grid-cols-3"
          >
            <input type="hidden" name="printerId" value={printer?.id ?? ""} />
            <div className="flex items-center gap-2 sm:col-span-3">
              {printer ? <Pencil className="size-4" /> : <Plus className="size-4" />}
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {printer ? `Modifica ${printer.name}` : "Nuova stampante"}
              </h3>
            </div>
            <Field
              label="Nome"
              htmlFor="printer-name"
              error={printerState.fieldErrors?.name}
            >
              <Input
                id="printer-name"
                name="name"
                defaultValue={printer?.name ?? ""}
                placeholder="es. Cassa principale"
                maxLength={80}
                required
              />
            </Field>
            <Field label="Stazione" htmlFor="printer-station">
              <Select
                id="printer-station"
                name="station"
                defaultValue={printer?.station ?? "receipt"}
              >
                <option value="receipt">Scontrini (cassa)</option>
                <option value="kitchen">Cucina</option>
                <option value="bar">Bar</option>
              </Select>
            </Field>
            <Field label="Larghezza carta" htmlFor="printer-width">
              <Select
                id="printer-width"
                name="paperWidth"
                defaultValue={String(printer?.paperWidth ?? 80)}
              >
                <option value="80">80 mm</option>
                <option value="58">58 mm</option>
              </Select>
            </Field>
            <Field label="Connessione" htmlFor="printer-connection">
              <Select
                id="printer-connection"
                name="connection"
                defaultValue={printer?.connection ?? "network"}
              >
                <option value="network">Rete locale (TCP 9100)</option>
                <option value="file">File spool (test)</option>
              </Select>
            </Field>
            <Field
              label="Indirizzo IP"
              htmlFor="printer-host"
              error={printerState.fieldErrors?.host}
            >
              <Input
                id="printer-host"
                name="host"
                defaultValue={printer?.host ?? ""}
                placeholder="es. 192.168.1.50"
                maxLength={120}
              />
            </Field>
            <Field
              label="Porta"
              htmlFor="printer-port"
              error={printerState.fieldErrors?.port}
            >
              <Input
                id="printer-port"
                name="port"
                inputMode="numeric"
                defaultValue={printer?.port ? String(printer.port) : "9100"}
                maxLength={5}
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 sm:col-span-3">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={printer?.isActive ?? true}
                className="size-4"
              />
              Stampante attiva
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <Button type="submit" disabled={printerPending}>
                {printer ? "Salva stampante" : "Aggiungi stampante"}
              </Button>
              {printer ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Annulla
                </Button>
              ) : null}
            </div>
          </form>
        ) : null}

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Ultimi lavori di stampa
        </h3>
        {printers.jobs.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun lavoro in coda: gli scontrini e le comande delle nuove
            ordinazioni compariranno qui.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            {printers.jobs.slice(0, 12).map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
              >
                <span className="text-zinc-700 dark:text-zinc-300">
                  {job.jobType === "receipt" ? "Scontrino" : "Comanda"}
                  {job.printerName ? ` · ${job.printerName}` : ""}
                </span>
                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Badge
                    variant={
                      job.status === "printed"
                        ? "success"
                        : job.status === "failed"
                          ? "danger"
                          : job.status === "printing"
                            ? "info"
                            : "warning"
                    }
                  >
                    {jobStatusLabels[job.status] ?? job.status}
                  </Badge>
                  {job.attempts > 0 ? <span>{job.attempts} tentativi</span> : null}
                  <span>{formatDate(job.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Mail className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Test email
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Invia un&apos;email di prova con il provider configurato. Senza un
            dominio verificato, Resend accetta solo l&apos;indirizzo del
            proprietario dell&apos;account.
          </p>
          {canManage ? (
            <form action={emailAction} className="mt-3 flex flex-wrap items-end gap-3">
              <Field
                label="Destinatario"
                htmlFor="test-email"
                error={emailState.fieldErrors?.email}
                className="min-w-56 flex-1"
              >
                <Input
                  id="test-email"
                  name="email"
                  type="email"
                  placeholder="nome@esempio.it"
                  required
                />
              </Field>
              <Button type="submit" variant="outline" disabled={emailPending}>
                <Send />
                Invia test
              </Button>
            </form>
          ) : (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Permesso settings.manage richiesto.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Test SMS
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Invia un SMS di prova a un numero di cui hai il consenso. Il
            mittente deve essere configurato in Twilio.
          </p>
          {canManage ? (
            <form action={smsAction} className="mt-3 space-y-3">
              <Field
                label="Numero (formato internazionale)"
                htmlFor="test-sms"
                error={smsState.fieldErrors?.phone}
              >
                <Input
                  id="test-sms"
                  name="phone"
                  placeholder="+393331234567"
                  required
                />
              </Field>
              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" name="consent" className="size-4" required />
                Confermo di avere il consenso del destinatario
              </label>
              <Button type="submit" variant="outline" disabled={smsPending}>
                <Send />
                Invia test
              </Button>
            </form>
          ) : (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Permesso settings.manage richiesto.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <Inbox className="size-4" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Ricezione messaggi e scontrino
          </h2>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          I webhook di Resend e Twilio registrano le risposte in ingresso
          nell&apos;inbox messaggi. La nota in fondo compare sullo scontrino
          stampato.
        </p>
        <form
          action={inboundAction}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <Field
            label="Numero per risposte SMS"
            htmlFor="inbound-phone"
            error={inboundState.fieldErrors?.inboundPhone}
          >
            <Input
              id="inbound-phone"
              name="inboundPhone"
              defaultValue={inbound.inboundPhone}
              placeholder="+39333..."
              maxLength={40}
            />
          </Field>
          <Field
            label="Email per risposte"
            htmlFor="inbound-email"
            error={inboundState.fieldErrors?.inboundEmail}
          >
            <Input
              id="inbound-email"
              name="inboundEmail"
              type="email"
              defaultValue={inbound.inboundEmail}
              placeholder="risposte@esempio.it"
              maxLength={254}
            />
          </Field>
          <Field
            label="Messaggio in fondo allo scontrino"
            htmlFor="receipt-footer"
            error={inboundState.fieldErrors?.receiptFooter}
            className="sm:col-span-2"
          >
            <Textarea
              id="receipt-footer"
              name="receiptFooter"
              defaultValue={inbound.receiptFooter}
              placeholder="es. Grazie e arrivederci!"
              rows={2}
              maxLength={200}
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={inboundPending}>
              Salva impostazioni
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

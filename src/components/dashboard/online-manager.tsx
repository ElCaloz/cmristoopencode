"use client";

import {
  CheckCircle2,
  ClipboardCopy,
  Link2,
  Plus,
  QrCode,
  ShoppingBag,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { formatCents, formatDate, relativeTime } from "@/lib/utils";
import {
  confirmOnlineOrderAction,
  createPublicLinkAction,
  setOnlineOrderPaymentAction,
  togglePublicLinkAction,
  updateOnlineOrderStatusAction,
} from "@/server/online/actions";
import {
  initialOnlineActionState,
  type OnlineActionState,
  type OnlineData,
  type OnlineOrderRow,
  type OnlineOrderStatus,
} from "@/server/online/types";

type Props = {
  data: OnlineData;
  siteUrl: string;
  canManage: boolean;
  canConfirm: boolean;
};

const statusLabels: Record<OnlineOrderStatus, string> = {
  pending: "Da confermare",
  confirmed: "Confermato",
  preparing: "In preparazione",
  ready: "Pronto",
  completed: "Completato",
  cancelled: "Annullato",
};

const nextStatus: Partial<Record<OnlineOrderStatus, OnlineOrderStatus>> = {
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed",
};

const fulfillmentLabels: Record<string, string> = {
  pickup: "Ritiro",
  delivery: "Consegna",
  dine_in: "Al tavolo",
};

export function OnlineManager({ data, siteUrl, canManage, canConfirm }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrderRow | null>(null);

  const [linkState, linkAction, linkPending] = useActionState(
    async (prevState: OnlineActionState, formData: FormData) => {
      const result = await createPublicLinkAction(prevState, formData);
      if (result.status === "success") {
        setFormVersion((value) => value + 1);
      }
      return result;
    },
    initialOnlineActionState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmOnlineOrderAction,
    initialOnlineActionState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    updateOnlineOrderStatusAction,
    initialOnlineActionState,
  );
  const [paymentState, paymentAction, paymentPending] = useActionState(
    setOnlineOrderPaymentAction,
    initialOnlineActionState,
  );

  useEffect(() => {
    if (linkState.status === "success") {
      toast.success(linkState.message ?? "Link creato.");
    } else if (linkState.status === "error" && linkState.message) {
      toast.error(linkState.message);
    }
  }, [linkState]);

  useEffect(() => {
    if (confirmState.status === "success") {
      toast.success(confirmState.message ?? "Ordine confermato.");
    } else if (confirmState.status === "error" && confirmState.message) {
      toast.error(confirmState.message);
    }
  }, [confirmState]);

  useEffect(() => {
    if (statusState.status === "success") {
      toast.success(statusState.message ?? "Stato aggiornato.");
    } else if (statusState.status === "error" && statusState.message) {
      toast.error(statusState.message);
    }
  }, [statusState]);

  useEffect(() => {
    if (paymentState.status === "success") {
      toast.success(paymentState.message ?? "Pagamento aggiornato.");
    } else if (paymentState.status === "error" && paymentState.message) {
      toast.error(paymentState.message);
    }
  }, [paymentState]);

  const pendingOrders = data.orders.filter((order) => order.status === "pending");

  const copyLink = async (token: string) => {
    const url = `${siteUrl}/m/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      toast.success("Link copiato negli appunti.");
    } catch {
      toast.error("Copia non riuscita: seleziona il link manualmente.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Link attivi</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {data.links.filter((link) => link.isActive).length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Ordini da confermare</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {pendingOrders.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Ordini recenti</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {data.orders.length}
          </p>
        </div>
      </div>

      {canManage ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Plus className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Nuovo link pubblico
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Il link contiene un token non prevedibile e non è elencato da
            nessuna parte pubblica. Puoi disattivarlo in ogni momento.
          </p>
          <form
            key={formVersion}
            action={linkAction}
            className="mt-4 grid gap-3 sm:grid-cols-4"
          >
            <Field label="Tipo" htmlFor="link-kind">
              <Select id="link-kind" name="kind" defaultValue="menu">
                <option value="menu">Menu pubblico</option>
                <option value="table">Menu del tavolo</option>
              </Select>
            </Field>
            <Field
              label="Tavolo (solo tipo tavolo)"
              htmlFor="link-table"
              error={linkState.fieldErrors?.tableId}
            >
              <Select id="link-table" name="tableId" defaultValue="">
                <option value="">Nessun tavolo</option>
                {data.tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                    {table.areaName ? ` · ${table.areaName}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Etichetta" htmlFor="link-label">
              <Input
                id="link-label"
                name="label"
                placeholder="es. Menu sala"
                maxLength={120}
              />
            </Field>
            <Field label="Scadenza (opzionale)" htmlFor="link-expires">
              <Input id="link-expires" name="expiresAt" type="date" />
            </Field>
            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 sm:col-span-4">
              <input
                type="checkbox"
                name="allowOrdering"
                defaultChecked
                className="size-4"
              />
              Consenti ordini online da questo link
            </label>
            <div className="sm:col-span-4">
              <Button type="submit" disabled={linkPending}>
                <QrCode />
                Crea link
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <Link2 className="size-4" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Link pubblici
          </h2>
        </div>
        {data.links.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun link creato. Crea un link menu o un link per tavolo per
            pubblicare il menu e ricevere ordini.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.links.map((link) => {
              const url = `${siteUrl}/m/${link.token}`;
              return (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {link.label}
                      </p>
                      <Badge variant="muted">
                        {link.kind === "table" ? "Tavolo" : "Menu"}
                      </Badge>
                      {link.allowOrdering ? (
                        <Badge variant="success">Ordini attivi</Badge>
                      ) : (
                        <Badge variant="outline">Solo lettura</Badge>
                      )}
                      {link.tableName ? (
                        <Badge variant="secondary">{link.tableName}</Badge>
                      ) : null}
                      {!link.isActive ? <Badge variant="danger">Disattivato</Badge> : null}
                    </div>
                    <p className="mt-1 break-all font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {url}
                    </p>
                    {link.expiresAt ? (
                      <p className="mt-1 text-[11px] text-zinc-400">
                        Scade il {formatDate(link.expiresAt)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copyLink(link.token)}
                    >
                      <ClipboardCopy />
                      {copied === link.token ? "Copiato" : "Copia link"}
                    </Button>
                    {canManage ? (
                      <form action={togglePublicLinkAction}>
                        <input type="hidden" name="linkId" value={link.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={link.isActive ? "false" : "true"}
                        />
                        <Button type="submit" size="sm" variant="outline">
                          {link.isActive ? "Disattiva" : "Attiva"}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-4" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Ordini online
          </h2>
        </div>
        {data.orders.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun ordine ricevuto. Gli ordini confermati diventano conti reali
            visibili a cassa e cucina.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.orders.map((order) => (
              <li key={order.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {order.customerName}
                      </p>
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "success"
                            : order.status === "cancelled"
                              ? "danger"
                              : order.status === "pending"
                                ? "warning"
                                : "info"
                        }
                      >
                        {statusLabels[order.status]}
                      </Badge>
                      <Badge variant="muted">{fulfillmentLabels[order.fulfillment]}</Badge>
                      <Badge
                        variant={order.paymentStatus === "paid" ? "success" : "outline"}
                      >
                        {order.paymentStatus === "paid" ? "Pagato" : "Da pagare"}
                      </Badge>
                      {order.tableName ? (
                        <Badge variant="secondary">{order.tableName}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {[order.email, order.phone].filter(Boolean).join(" · ")}
                      {" · "}
                      {formatCents(order.totalCents)}
                      {" · "}
                      {relativeTime(order.createdAt)}
                    </p>
                    {order.items.length > 0 ? (
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {order.items
                          .map((item) => `${item.quantity}× ${item.name}`)
                          .join(", ")}
                      </p>
                    ) : null}
                    {order.notes ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        Note: {order.notes}
                      </p>
                    ) : null}
                  </div>

                  {canConfirm ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {order.status === "pending" ? (
                        <form action={confirmAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <Button type="submit" size="sm" disabled={confirmPending}>
                            <CheckCircle2 />
                            Conferma e invia
                          </Button>
                        </form>
                      ) : null}
                      {nextStatus[order.status] ? (
                        <form action={statusAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={nextStatus[order.status]}
                          />
                          <Button type="submit" size="sm" variant="outline" disabled={statusPending}>
                            {statusLabels[nextStatus[order.status] as OnlineOrderStatus]}
                          </Button>
                        </form>
                      ) : null}
                      {order.paymentStatus !== "paid" && order.status !== "cancelled" ? (
                        <form action={paymentAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="paymentStatus" value="paid" />
                          <Button type="submit" size="sm" variant="outline" disabled={paymentPending}>
                            Incassa
                          </Button>
                        </form>
                      ) : null}
                      {order.status !== "completed" && order.status !== "cancelled" ? (
                        <form action={statusAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <Button type="submit" size="sm" variant="destructive" disabled={statusPending}>
                            Annulla
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(order)}
                    >
                      Dettagli
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedOrder ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Dettagli ordine · {selectedOrder.customerName}
          </h2>
          <ul className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            {selectedOrder.items.map((item) => (
              <li key={item.id}>
                {item.quantity}× {item.name} · {formatCents(item.unitPriceCents)}
                {item.note ? ` · ${item.note}` : ""}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setSelectedOrder(null)}
          >
            Chiudi
          </Button>
        </section>
      ) : null}
    </div>
  );
}

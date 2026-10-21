"use client";

import {
  Banknote,
  Check,
  CreditCard,
  Plus,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
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
import { formatCents } from "@/lib/utils";
import type { MenuCategoryRow, MenuItemRow } from "@/server/menu/types";
import {
  addItemAction,
  cancelItemAction,
  openOrderAction,
  payOrderAction,
  voidOrderAction,
} from "@/server/pos/actions";
import {
  initialPosActionState,
  type PosActionState,
  type PosOrderRow,
} from "@/server/pos/types";
import type { FloorAreaRow, FloorTableRow } from "@/server/tables/types";

type Props = {
  areas: FloorAreaRow[];
  tables: FloorTableRow[];
  categories: MenuCategoryRow[];
  items: MenuItemRow[];
  openOrders: PosOrderRow[];
  canOperate: boolean;
};

const paymentLabels: Record<PosOrderRow["payments"][number]["method"], string> = {
  cash: "Contanti",
  card: "Carta",
  other: "Altro",
};

function toEuroInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function orderTotals(order: PosOrderRow) {
  const active = order.items.filter((item) => item.status !== "cancelled");
  const total = active.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const paid = order.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  return { total, paid, remaining: total - paid };
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PosManager({
  areas,
  tables,
  categories,
  items,
  openOrders,
  canOperate,
}: Props) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [openOrderTarget, setOpenOrderTarget] = useState<FloorTableRow | null>(
    null,
  );
  const [payOpenFor, setPayOpenFor] = useState<string | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [itemPending, startItemTransition] = useTransition();
  const [, startTransition] = useTransition();
  const [payState, payFormAction, payPending] = useActionState(
    payOrderAction,
    initialPosActionState,
  );

  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
  const selectedOrder =
    openOrders.find((order) => order.tableId === selectedTableId) ?? null;

  useEffect(() => {
    if (payState.status === "success") {
      toast.success(payState.message ?? "Pagamento registrato.");
    }
  }, [payState]);

  const orderByTable = (tableId: string) =>
    openOrders.find((order) => order.tableId === tableId) ?? null;

  const areaName = (areaId: string | null) =>
    areas.find((area) => area.id === areaId)?.name ?? "Senza area";

  const visibleItems = items.filter((item) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "none") return item.categoryId === null;
    return item.categoryId === categoryFilter;
  });

  const groupedTables = [
    ...areas.map((area) => ({
      id: area.id,
      name: area.name,
      tables: tables.filter((table) => table.areaId === area.id),
    })),
    {
      id: "none",
      name: "Senza area",
      tables: tables.filter((table) => table.areaId === null),
    },
  ].filter((group) => group.tables.length > 0);

  const runAction = (
    action: (state: PosActionState, formData: FormData) => Promise<PosActionState>,
    entries: Record<string, string>,
    onSuccess?: () => void,
  ) => {
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(entries)) {
        formData.set(key, value);
      }
      const result = await action(initialPosActionState, formData);
      if (result.status === "success") {
        toast.success(result.message ?? "Operazione completata.");
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Operazione non riuscita.");
      }
    });
  };

  const addItem = (orderId: string, menuItem: MenuItemRow) => {
    startItemTransition(async () => {
      const formData = new FormData();
      formData.set("orderId", orderId);
      formData.set("menuItemId", menuItem.id);
      formData.set("quantity", "1");
      const result = await addItemAction(initialPosActionState, formData);
      if (result.status === "success") {
        toast.success(`${menuItem.name} aggiunto.`);
      } else {
        toast.error(result.message ?? "Operazione non riuscita.");
      }
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Tavoli
          </h2>
          <Badge variant={openOrders.length > 0 ? "warning" : "secondary"}>
            {openOrders.length} {openOrders.length === 1 ? "conto aperto" : "conti aperti"}
          </Badge>
        </div>

        {tables.length === 0 ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Nessun tavolo configurato: crea prima aree e tavoli nella
              sezione Sala e tavoli.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/sala">Vai a Sala e tavoli</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {groupedTables.map((group) => (
              <div key={group.id}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {group.name}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {group.tables.map((table) => {
                    const order = orderByTable(table.id);
                    const selected = table.id === selectedTableId;
                    const totals = order ? orderTotals(order) : null;

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => setSelectedTableId(table.id)}
                        className={`rounded-lg border p-2.5 text-left transition-colors ${
                          selected
                            ? "border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        }`}
                        aria-pressed={selected}
                      >
                        <span className="flex items-center justify-between gap-1">
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {table.name}
                          </span>
                          {order ? (
                            <span className="size-2 rounded-full bg-amber-500" />
                          ) : (
                            <span className="size-2 rounded-full bg-emerald-500" />
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
                          {table.seats} posti
                        </span>
                        {totals ? (
                          <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-amber-600 dark:text-amber-400">
                            {formatCents(totals.total)}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-[11px] text-emerald-600 dark:text-emerald-400">
                            Libero
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {!selectedTable ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center">
            <ReceiptText className="size-6 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Seleziona un tavolo
            </p>
            <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Apri un conto su un tavolo libero oppure gestisci un conto già
              aperto: prodotti, saldo e incasso.
            </p>
          </div>
        ) : selectedOrder ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedTable.name}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {areaName(selectedTable.areaId)} ·{" "}
                  {selectedOrder.guests
                    ? `${selectedOrder.guests} coperti · `
                    : ""}
                  aperto alle {timeLabel(selectedOrder.openedAt)}
                </p>
                {selectedOrder.note ? (
                  <p className="mt-1 text-xs italic text-zinc-500 dark:text-zinc-400">
                    “{selectedOrder.note}”
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                  onClick={() => setVoidOpen(true)}
                  disabled={!canOperate}
                >
                  <Trash2 />
                  Annulla conto
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPayOpenFor(selectedOrder.id)}
                  disabled={!canOperate}
                >
                  <Banknote />
                  Incassa
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {selectedOrder.items
                  .filter((item) => item.status !== "cancelled")
                  .map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-800 dark:text-zinc-100">
                          {item.quantity}× {item.name}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {formatCents(item.unitPriceCents)} ·{" "}
                          {item.status === "pending"
                            ? "in attesa"
                            : item.status === "preparing"
                              ? "in preparazione"
                              : item.status === "ready"
                                ? "pronta"
                                : "servita"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                          {formatCents(item.unitPriceCents * item.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Annulla ${item.name}`}
                          disabled={!canOperate || itemPending}
                          onClick={() =>
                            runAction(cancelItemAction, { itemId: item.id })
                          }
                        >
                          <X />
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>

              <div className="space-y-1 border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Totale</span>
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatCents(orderTotals(selectedOrder).total)}
                  </span>
                </div>
                {orderTotals(selectedOrder).paid > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Pagato
                      </span>
                      <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
                        {formatCents(orderTotals(selectedOrder).paid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Da incassare
                      </span>
                      <span className="font-medium tabular-nums text-amber-600 dark:text-amber-400">
                        {formatCents(orderTotals(selectedOrder).remaining)}
                      </span>
                    </div>
                  </>
                ) : null}
                {selectedOrder.payments.length > 0 ? (
                  <ul className="pt-1">
                    {selectedOrder.payments.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400"
                      >
                        <span>
                          {paymentLabels[payment.method]}
                          {payment.tipCents > 0
                            ? ` · mancia ${formatCents(payment.tipCents)}`
                            : ""}
                        </span>
                        <span className="tabular-nums">
                          {formatCents(payment.amountCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Aggiungi prodotti
                </h3>
                <Select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-8 w-44 text-xs"
                  aria-label="Filtra per categoria"
                >
                  <option value="all">Tutte le categorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                  <option value="none">Senza categoria</option>
                </Select>
              </div>
              {visibleItems.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Nessun prodotto disponibile: aggiungili dal modulo Menu e
                  prodotti.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {visibleItems.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant="outline"
                      className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left"
                      disabled={
                        !canOperate ||
                        itemPending ||
                        selectedOrder.status !== "open"
                      }
                      onClick={() => addItem(selectedOrder.id, item)}
                    >
                      <span className="w-full truncate text-xs font-medium">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {formatCents(item.priceCents)}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedTable.name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {areaName(selectedTable.areaId)} · {selectedTable.seats} posti ·
                tavolo libero
              </p>
            </div>
            <Button
              onClick={() => setOpenOrderTarget(selectedTable)}
              disabled={!canOperate}
            >
              <Plus />
              Apri conto
            </Button>
            {!canOperate ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Il tuo ruolo non consente di operare sulla cassa.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {openOrderTarget ? (
        <OpenOrderDialog
          key={`open-${openOrderTarget.id}`}
          table={openOrderTarget}
          onClose={() => setOpenOrderTarget(null)}
        />
      ) : null}

      {selectedOrder && payOpenFor === selectedOrder.id ? (
        <PayOrderDialog
          key={`pay-${selectedOrder.id}-${orderTotals(selectedOrder).paid}`}
          order={selectedOrder}
          tableName={selectedTable?.name ?? ""}
          state={payState}
          formAction={payFormAction}
          pending={payPending}
          onClose={() => setPayOpenFor(null)}
        />
      ) : null}

      <ConfirmDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Annullare il conto?"
        description={
          selectedTable
            ? `Il conto di ${selectedTable.name} verrà annullato senza incasso. L'azione è tracciata nel registro attività.`
            : ""
        }
        confirmLabel="Annulla conto"
        onConfirm={() => {
          if (selectedOrder) {
            runAction(voidOrderAction, { orderId: selectedOrder.id });
          }
        }}
      />
    </div>
  );
}

function OpenOrderDialog({
  table,
  onClose,
}: {
  table: FloorTableRow;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    openOrderAction,
    initialPosActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Conto aperto.");
      onClose();
    }
  }, [state, onClose]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apri conto su {table.name}</DialogTitle>
          <DialogDescription>
            Coperti e nota sono facoltativi ma utili in sala e in cucina.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="tableId" value={table.id} />
          <Field
            label="Coperti"
            htmlFor="pos-guests"
            error={state.fieldErrors?.guests}
          >
            <Input
              id="pos-guests"
              name="guests"
              defaultValue="2"
              inputMode="numeric"
              placeholder="2"
            />
          </Field>
          <Field label="Nota" htmlFor="pos-note" error={state.fieldErrors?.note}>
            <Textarea
              id="pos-note"
              name="note"
              maxLength={300}
              className="min-h-16"
              placeholder="Es. tavolo vicino alla finestra"
            />
          </Field>
          {state.status === "error" && state.message ? (
            <p role="alert" className="text-xs text-red-600">
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              Apri conto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PayOrderDialog({
  order,
  tableName,
  state,
  formAction,
  pending,
  onClose,
}: {
  order: PosOrderRow;
  tableName: string;
  state: PosActionState;
  formAction: (formData: FormData) => void;
  pending: boolean;
  onClose: () => void;
}) {
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  const [submitted, setSubmitted] = useState(false);
  const { total, remaining } = orderTotals(order);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Incassa {tableName}</DialogTitle>
          <DialogDescription>
            Totale {formatCents(total)}. Puoi registrare un pagamento parziale:
            il conto resta aperto fino al saldo.
          </DialogDescription>
        </DialogHeader>
        <form
          action={formAction}
          onSubmit={() => setSubmitted(true)}
          className="space-y-3"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <Field
            label="Importo (€)"
            htmlFor="pos-amount"
            error={state.fieldErrors?.amount}
          >
            <Input
              id="pos-amount"
              name="amount"
              defaultValue={toEuroInput(remaining)}
              inputMode="decimal"
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Metodo"
              htmlFor="pos-method"
              error={state.fieldErrors?.method}
            >
              <Select id="pos-method" name="method" defaultValue="card">
                <option value="card">Carta</option>
                <option value="cash">Contanti</option>
                <option value="other">Altro</option>
              </Select>
            </Field>
            <Field
              label="Mancia (€)"
              htmlFor="pos-tip"
              error={state.fieldErrors?.tip}
            >
              <Input
                id="pos-tip"
                name="tip"
                placeholder="0,00"
                inputMode="decimal"
              />
            </Field>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
            <CreditCard className="size-3.5" />
            Il pagamento è idempotente: un doppio click non incassa due volte.
          </div>
          {submitted && state.status === "error" && state.message ? (
            <p role="alert" className="text-xs text-red-600">
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              <Check />
              Registra pagamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

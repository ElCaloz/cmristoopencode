"use client";

import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Eye,
  Lock,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { RowMenu } from "@/components/ui/row-menu";
import { StatCard } from "@/components/ui/stat-card";
import { formatQuantityMilli, parseQuantityToMilli } from "@/lib/inventory";
import {
  purchaseOrderDiscrepancyMilli,
  purchaseOrderLineTotalCents,
} from "@/lib/purchasing";
import {
  formatCents,
  formatShortDate,
  parseEuroToCents,
  relativeTime,
} from "@/lib/utils";
import {
  cancelPurchaseOrderAction,
  markPurchaseOrderOrderedAction,
  receivePurchaseOrderAction,
  savePurchaseOrderAction,
} from "@/server/purchasing/actions";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  initialPurchaseOrderActionState,
  type PurchaseOrderRow,
  type PurchaseOrderStatus,
} from "@/server/purchasing/types";
import type {
  InventoryItemRow,
  InventorySupplierRow,
} from "@/server/inventory/types";

type Props = {
  suppliers: InventorySupplierRow[];
  items: InventoryItemRow[];
  orders: PurchaseOrderRow[];
  readOnly: boolean;
};

type OrderTarget =
  | { mode: "create"; idempotencyKey: string }
  | { mode: "edit"; order: PurchaseOrderRow };

type OrderLineDraft = {
  inventoryItemId: string;
  quantity: string;
  cost: string;
};

type ReceiptLineDraft = {
  itemId: string;
  itemName: string;
  unit: string;
  orderedQuantityMilli: number;
  quantity: string;
};

function newIdempotencyKey() {
  return crypto.randomUUID();
}

function toEuroInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function statusVariant(status: PurchaseOrderStatus) {
  if (status === "received") return "success" as const;
  if (status === "ordered") return "warning" as const;
  if (status === "cancelled") return "muted" as const;
  return "secondary" as const;
}

function formatDateOnly(value: string | null) {
  if (!value) return "Non indicata";
  return formatShortDate(new Date(`${value}T00:00:00`));
}

function isLowStock(item: InventoryItemRow) {
  if (item.quantityMilli <= 0) return true;
  return (
    item.minQuantityMilli > 0 &&
    item.quantityMilli <= item.minQuantityMilli
  );
}

export function PurchasingManager({
  suppliers,
  items,
  orders,
  readOnly,
}: Props) {
  const [orderTarget, setOrderTarget] = useState<OrderTarget | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrderRow | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] = useState<PurchaseOrderRow | null>(
    null,
  );
  const [detailTarget, setDetailTarget] = useState<PurchaseOrderRow | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [, startTransition] = useTransition();

  const activeItems = items.filter((item) => item.isActive);
  const lowStockItems = activeItems.filter(isLowStock);
  const exhaustedItems = activeItems.filter((item) => item.quantityMilli <= 0);
  const openOrders = orders.filter(
    (order) => order.status === "draft" || order.status === "ordered",
  );
  const draftOrders = orders.filter((order) => order.status === "draft");
  const orderedOrders = orders.filter((order) => order.status === "ordered");
  const receivedOrders = orders.filter(
    (order) => order.status === "received",
  );
  const orderedValueCents = orderedOrders.reduce(
    (sum, order) => sum + order.totalCents,
    0,
  );

  const filteredOrders = orders.filter((order) =>
    statusFilter === "all" ? true : order.status === statusFilter,
  );

  const openCreate = () =>
    setOrderTarget({ mode: "create", idempotencyKey: newIdempotencyKey() });

  const runOrderAction = (
    order: PurchaseOrderRow,
    action: "ordered" | "cancel",
  ) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("orderId", order.id);
      const result =
        action === "ordered"
          ? await markPurchaseOrderOrderedAction(
              initialPurchaseOrderActionState,
              formData,
            )
          : await cancelPurchaseOrderAction(
              initialPurchaseOrderActionState,
              formData,
            );

      if (result.status === "success") {
        toast.success(
          result.message ??
            (action === "ordered"
              ? "Ordine segnato come ordinato."
              : "Ordine annullato."),
        );
      } else {
        toast.error(
          result.message ?? "Operazione non riuscita. Riprova tra poco.",
        );
      }
    });
  };

  const columns: DataTableColumn<PurchaseOrderRow>[] = [
    {
      id: "order",
      header: "Ordine",
      cell: (order) => (
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {order.orderNumber}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {order.supplierName}
          </p>
        </div>
      ),
      sortValue: (order) => order.orderNumber,
    },
    {
      id: "status",
      header: "Stato",
      cell: (order) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={statusVariant(order.status)}>
            {PURCHASE_ORDER_STATUS_LABELS[order.status]}
          </Badge>
          {order.status === "received" && order.discrepancyCount > 0 ? (
            <Badge variant="warning" title="Quantita ricevuta inferiore">
              <TriangleAlert className="size-3" />
              {formatQuantityMilli(order.discrepancyMilli)} in meno
            </Badge>
          ) : null}
        </div>
      ),
      sortValue: (order) => order.status,
    },
    {
      id: "expected",
      header: "Consegna",
      cell: (order) => (
        <span className="text-sm text-zinc-600 dark:text-zinc-300">
          {order.expectedOn ? formatDateOnly(order.expectedOn) : "—"}
        </span>
      ),
      sortValue: (order) => order.expectedOn ?? "",
    },
    {
      id: "amount",
      header: "Totale",
      cell: (order) => (
        <div>
          <p className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatCents(order.totalCents)}
          </p>
          {order.status === "received" ? (
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Ricevuto {formatCents(order.receivedTotalCents)}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {order.lines.length}{" "}
              {order.lines.length === 1 ? "riga" : "righe"}
            </p>
          )}
        </div>
      ),
      sortValue: (order) => order.totalCents,
    },
    {
      id: "created",
      header: "Creato",
      cell: (order) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {relativeTime(order.createdAt)}
        </span>
      ),
      sortValue: (order) => order.createdAt,
    },
  ];

  return (
    <div className="space-y-4">
      {readOnly ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-card border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
        >
          <Lock className="mt-0.5 size-4 shrink-0" />
          <p>
            Accesso in sola lettura. Per creare ordini, ricevere merce o
            annullare ordini serve il permesso di gestione magazzino.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ordini aperti"
          value={String(openOrders.length)}
          icon={ClipboardList}
          hint={`${draftOrders.length} bozze · ${orderedOrders.length} ordinati`}
        />
        <StatCard
          label="Da ricevere"
          value={String(orderedOrders.length)}
          icon={Truck}
          hint={`Valore ${formatCents(orderedValueCents)}`}
        />
        <StatCard
          label="Scorte basse"
          value={String(lowStockItems.length)}
          icon={TriangleAlert}
          hint={`${exhaustedItems.length} esauriti · ${Math.max(
            0,
            lowStockItems.length - exhaustedItems.length,
          )} sotto minimo`}
        />
        <StatCard
          label="Ricevuti"
          value={String(receivedOrders.length)}
          icon={PackageCheck}
          hint="Ordini con ricezione registrata"
        />
      </div>

      <DataTable
        data={filteredOrders}
        columns={columns}
        getRowId={(order) => order.id}
        onRowClick={(order) => setDetailTarget(order)}
        rowActions={
          readOnly
            ? undefined
            : (order) => {
                const canEdit = order.status === "draft";
                const canReceive = order.status === "ordered";
                const canCancel =
                  order.status === "draft" || order.status === "ordered";

                return (
                  <RowMenu
                    label={`Azioni ordine ${order.orderNumber}`}
                    items={[
                      {
                        label: "Dettagli",
                        icon: Eye,
                        onSelect: () => setDetailTarget(order),
                      },
                      ...(canEdit
                        ? [
                            {
                              label: "Modifica bozza",
                              icon: Pencil,
                              onSelect: () =>
                                setOrderTarget({ mode: "edit", order }),
                            },
                          ]
                        : []),
                      ...(canEdit
                        ? [
                            {
                              label: "Segna ordinato",
                              icon: CheckCircle2,
                              onSelect: () =>
                                runOrderAction(order, "ordered"),
                            },
                          ]
                        : []),
                      ...(canReceive
                        ? [
                            {
                              label: "Ricevi merce",
                              icon: PackageCheck,
                              onSelect: () => setReceiveTarget(order),
                            },
                          ]
                        : []),
                      ...(canCancel
                        ? [
                            {
                              label: "Annulla ordine",
                              icon: Ban,
                              destructive: true,
                              separatorBefore: true,
                              onSelect: () => setCancelTarget(order),
                            },
                          ]
                        : []),
                    ]}
                  />
                );
              }
        }
        searchText={(order) =>
          [
            order.orderNumber,
            order.supplierName,
            PURCHASE_ORDER_STATUS_LABELS[order.status],
            order.notes,
            order.receiptNote,
            ...order.lines.map((line) => line.itemName),
          ].join(" ")
        }
        searchPlaceholder="Cerca ordine, fornitore o articolo"
        toolbar={
          <>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filtra per stato"
              className="w-auto min-w-36"
            >
              <option value="all">Tutti gli stati</option>
              <option value="draft">Bozze</option>
              <option value="ordered">Ordinati</option>
              <option value="received">Ricevuti</option>
              <option value="cancelled">Annullati</option>
            </Select>
            {!readOnly ? (
              <Button type="button" onClick={openCreate}>
                <Plus />
                Nuovo ordine
              </Button>
            ) : null}
          </>
        }
        pageSize={10}
        emptyTitle={
          statusFilter === "all"
            ? "Nessun ordine di acquisto"
            : "Nessun ordine con questo stato"
        }
        emptyDescription={
          readOnly
            ? "Non ci sono ordini da mostrare."
            : statusFilter === "all"
              ? "Crea il primo ordine per un fornitore e ricevi la merce in magazzino."
              : "Cambia filtro o crea un nuovo ordine."
        }
      />

      {orderTarget ? (
        <OrderDialog
          target={orderTarget}
          suppliers={suppliers}
          items={items}
          onClose={() => setOrderTarget(null)}
        />
      ) : null}

      {receiveTarget ? (
        <ReceiveDialog
          order={receiveTarget}
          onClose={() => setReceiveTarget(null)}
        />
      ) : null}

      {detailTarget ? (
        <OrderDetailDialog
          order={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      ) : null}

      {cancelTarget ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null);
          }}
          title={`Annullare ${cancelTarget.orderNumber}?`}
          description="L'ordine non potra piu essere modificato, ordinato o ricevuto. L'operazione resta tracciata nel registro attivita."
          confirmLabel="Annulla ordine"
          cancelLabel="Torna indietro"
          onConfirm={() => runOrderAction(cancelTarget, "cancel")}
        />
      ) : null}
    </div>
  );
}

function OrderDialog({
  target,
  suppliers,
  items,
  onClose,
}: {
  target: OrderTarget;
  suppliers: InventorySupplierRow[];
  items: InventoryItemRow[];
  onClose: () => void;
}) {
  const order = target.mode === "edit" ? target.order : null;
  const [state, formAction, pending] = useActionState(
    savePurchaseOrderAction,
    initialPurchaseOrderActionState,
  );
  const [supplierId, setSupplierId] = useState(
    order?.supplierId ??
      suppliers.find((supplier) => supplier.isActive)?.id ??
      "",
  );
  const [expectedOn, setExpectedOn] = useState(order?.expectedOn ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [idempotencyKey] = useState(() =>
    target.mode === "create" ? target.idempotencyKey : newIdempotencyKey(),
  );
  const [lines, setLines] = useState<OrderLineDraft[]>(() => {
    if (order && order.lines.length > 0) {
      return order.lines.map((line) => ({
        inventoryItemId: line.inventoryItemId ?? "",
        quantity: formatQuantityMilli(line.quantityMilli),
        cost: toEuroInput(line.unitCostCents),
      }));
    }

    return [{ inventoryItemId: "", quantity: "1", cost: "" }];
  });

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Ordine salvato.");
      onClose();
    }
  }, [state, onClose]);

  const activeItems = items.filter((item) => item.isActive);
  const referencedItems = new Set(
    (order?.lines ?? [])
      .map((line) => line.inventoryItemId)
      .filter((value): value is string => Boolean(value)),
  );
  const availableItems = items.filter(
    (item) => item.isActive || referencedItems.has(item.id),
  );
  const activeSuppliers = suppliers.filter(
    (supplier) => supplier.isActive || supplier.id === order?.supplierId,
  );

  const updateLine = (index: number, patch: Partial<OrderLineDraft>) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  };

  const selectItem = (index: number, itemId: string) => {
    const item = items.find((entry) => entry.id === itemId);
    updateLine(index, {
      inventoryItemId: itemId,
      cost: item ? toEuroInput(item.costPerUnitCents) : "",
    });
  };

  const addLine = () => {
    setLines((current) => [
      ...current,
      { inventoryItemId: "", quantity: "1", cost: "" },
    ]);
  };

  const removeLine = (index: number) => {
    setLines((current) =>
      current.filter((_, lineIndex) => lineIndex !== index),
    );
  };

  const previewTotalCents = lines.reduce((sum, line) => {
    const quantity = parseQuantityToMilli(line.quantity);
    if (quantity === null || quantity <= 0) return sum;
    return (
      sum +
      purchaseOrderLineTotalCents(quantity, parseEuroToCents(line.cost))
    );
  }, 0);

  const missingMasterData =
    activeItems.length === 0 || activeSuppliers.length === 0;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {order ? `Modifica ${order.orderNumber}` : "Nuovo ordine di acquisto"}
          </DialogTitle>
          <DialogDescription>
            L&apos;ordine e interno: nessun messaggio viene inviato
            automaticamente al fornitore. La ricezione aggiorna giacenze e
            costo unitario.
          </DialogDescription>
        </DialogHeader>

        {missingMasterData ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            Servono almeno un fornitore attivo e un articolo attivo.{" "}
            <Link
              href="/dashboard/magazzino"
              className="font-medium underline underline-offset-2"
            >
              Apri il magazzino
            </Link>
            .
          </div>
        ) : null}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="orderId" value={order?.id ?? ""} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={idempotencyKey}
          />
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(
              lines.map((line) => ({
                inventoryItemId: line.inventoryItemId,
                quantity: line.quantity,
                cost: line.cost,
              })),
            )}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Fornitore"
              htmlFor="purchase-supplier"
              error={state.fieldErrors?.supplierId}
            >
              <Select
                id="purchase-supplier"
                name="supplierId"
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                required
              >
                <option value="">Scegli un fornitore</option>
                {activeSuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                    {supplier.isActive ? "" : " (non attivo)"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Consegna prevista"
              htmlFor="purchase-expected"
              error={state.fieldErrors?.expectedOn}
              hint="Facoltativa."
            >
              <Input
                id="purchase-expected"
                name="expectedOn"
                type="date"
                value={expectedOn}
                onChange={(event) => setExpectedOn(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Note" htmlFor="purchase-notes" error={state.fieldErrors?.notes}>
            <Textarea
              id="purchase-notes"
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Es. consegna al mattino, citofono magazzino"
              maxLength={500}
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Righe ordine
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                disabled={lines.length >= 50}
              >
                <Plus />
                Aggiungi riga
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => {
                const item = items.find(
                  (entry) => entry.id === line.inventoryItemId,
                );

                return (
                  <div
                    key={`${index}-${line.inventoryItemId}`}
                    className="grid gap-2 rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-800 md:grid-cols-[minmax(0,1fr)_110px_120px_auto] md:items-end"
                  >
                    <Field
                      label={`Articolo ${index + 1}`}
                      htmlFor={`purchase-item-${index}`}
                    >
                      <Select
                        id={`purchase-item-${index}`}
                        aria-label={`Articolo ${index + 1}`}
                        value={line.inventoryItemId}
                        onChange={(event) =>
                          selectItem(index, event.target.value)
                        }
                        required
                      >
                        <option value="">Scegli articolo</option>
                        {availableItems.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name} · {entry.unit}
                            {entry.isActive ? "" : " (non attivo)"}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      label={`Quantita ${index + 1}`}
                      htmlFor={`purchase-quantity-${index}`}
                      hint={item ? item.unit : undefined}
                    >
                      <Input
                        id={`purchase-quantity-${index}`}
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(index, { quantity: event.target.value })
                        }
                        inputMode="decimal"
                        aria-label={`Quantita ${index + 1}`}
                        required
                      />
                    </Field>
                    <Field
                      label={`Costo ${index + 1} (€)`}
                      htmlFor={`purchase-cost-${index}`}
                    >
                      <Input
                        id={`purchase-cost-${index}`}
                        value={line.cost}
                        onChange={(event) =>
                          updateLine(index, { cost: event.target.value })
                        }
                        inputMode="decimal"
                        aria-label={`Costo unitario ${index + 1}`}
                        placeholder="0,00"
                        required
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                      aria-label={`Rimuovi riga ${index + 1}`}
                      className="justify-self-end text-zinc-500"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
            {state.fieldErrors?.items ? (
              <p className="text-xs text-red-600" role="alert">
                {state.fieldErrors.items}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Totale ordine
            </span>
            <span className="text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
              {formatCents(previewTotalCents)}
            </span>
          </div>

          {state.status === "error" && state.message ? (
            <p role="alert" className="text-xs text-red-600">
              {state.message}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={pending || lines.length === 0 || missingMasterData}
            >
              {order ? "Salva modifiche" : "Crea ordine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveDialog({
  order,
  onClose,
}: {
  order: PurchaseOrderRow;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    receivePurchaseOrderAction,
    initialPurchaseOrderActionState,
  );
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<ReceiptLineDraft[]>(() =>
    order.lines.map((line) => ({
      itemId: line.id,
      itemName: line.itemName,
      unit: line.unit,
      orderedQuantityMilli: line.quantityMilli,
      quantity: formatQuantityMilli(line.quantityMilli),
    })),
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Ricezione registrata.");
      onClose();
    }
  }, [state, onClose]);

  const updateQuantity = (index: number, quantity: string) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, quantity } : line,
      ),
    );
  };

  const parsedLines = lines.map((line) => ({
    ...line,
    parsedQuantity: parseQuantityToMilli(line.quantity),
  }));
  const hasInvalidQuantity = parsedLines.some(
    (line) =>
      line.parsedQuantity === null ||
      line.parsedQuantity < 0 ||
      line.parsedQuantity > line.orderedQuantityMilli,
  );
  const totalReceivedMilli = parsedLines.reduce(
    (sum, line) => sum + (line.parsedQuantity ?? 0),
    0,
  );
  const totalDifferenceMilli = parsedLines.reduce(
    (sum, line) =>
      sum +
      Math.max(
        0,
        line.orderedQuantityMilli - (line.parsedQuantity ?? 0),
      ),
    0,
  );
  const receivedTotalCents = order.lines.reduce((sum, line, index) => {
    const quantity = parsedLines[index]?.parsedQuantity ?? 0;
    return sum + purchaseOrderLineTotalCents(quantity, line.unitCostCents);
  }, 0);

  const incompleteItems = order.lines.filter(
    (line, index) =>
      (parsedLines[index]?.parsedQuantity ?? 0) < line.quantityMilli,
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ricevi merce · {order.orderNumber}</DialogTitle>
          <DialogDescription>
            La ricezione e definitiva e aggiorna subito le giacenze. Puoi
            registrare quantita inferiori a quelle ordinate, ma non superiori.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="orderId" value={order.id} />
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(
              lines.map((line) => ({
                itemId: line.itemId,
                quantity: line.quantity,
              })),
            )}
          />

          <div className="space-y-2">
            {lines.map((line, index) => (
              <div
                key={line.itemId}
                className="grid gap-2 rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-800 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-end"
              >
                <div>
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {line.itemName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Ordinato {formatQuantityMilli(line.orderedQuantityMilli)}{" "}
                    {line.unit} ·{" "}
                    {formatCents(order.lines[index]?.unitCostCents ?? 0)} /{" "}
                    {line.unit}
                  </p>
                </div>
                <Field
                  label={`Quantita ricevuta ${index + 1}`}
                  htmlFor={`receive-quantity-${index}`}
                  error={
                    (parsedLines[index]?.parsedQuantity ?? 0) >
                    line.orderedQuantityMilli
                      ? "Supera la quantita ordinata."
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <Input
                      id={`receive-quantity-${index}`}
                      value={line.quantity}
                      onChange={(event) =>
                        updateQuantity(index, event.target.value)
                      }
                      inputMode="decimal"
                      aria-label={`Quantita ricevuta ${index + 1}`}
                      required
                    />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {line.unit}
                    </span>
                  </div>
                </Field>
              </div>
            ))}
          </div>

          {totalDifferenceMilli > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                Differenza di {formatQuantityMilli(totalDifferenceMilli)} su{" "}
                {incompleteItems.length}{" "}
                {incompleteItems.length === 1 ? "riga" : "righe"}. La
                ricezione verra registrata come parziale.
              </p>
            </div>
          ) : null}

          <Field label="Note ricezione" htmlFor="receive-note" error={state.fieldErrors?.note}>
            <Textarea
              id="receive-note"
              name="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Es. 1 kg mancante, sostituito in prossima consegna"
              maxLength={500}
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Valore ricevuto
            </span>
            <span className="text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
              {formatCents(receivedTotalCents)}
            </span>
          </div>

          {state.fieldErrors?.items ? (
            <p role="alert" className="text-xs text-red-600">
              {state.fieldErrors.items}
            </p>
          ) : null}
          {state.status === "error" && state.message ? (
            <p role="alert" className="text-xs text-red-600">
              {state.message}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={
                pending || hasInvalidQuantity || totalReceivedMilli <= 0
              }
            >
              Registra ricezione
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailDialog({
  order,
  onClose,
}: {
  order: PurchaseOrderRow;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{order.orderNumber}</DialogTitle>
            <Badge variant={statusVariant(order.status)}>
              {PURCHASE_ORDER_STATUS_LABELS[order.status]}
            </Badge>
            {order.status === "received" && order.discrepancyCount > 0 ? (
              <Badge variant="warning">
                <TriangleAlert className="size-3" />
                {purchaseOrderDiscrepancyMilli(order.lines) > 0
                  ? `${formatQuantityMilli(
                      purchaseOrderDiscrepancyMilli(order.lines),
                    )} in meno`
                  : "Differenza"}
              </Badge>
            ) : null}
          </div>
          <DialogDescription>
            {order.supplierName} · creato {relativeTime(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Consegna prevista
              </p>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {formatDateOnly(order.expectedOn)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Totale ordine
              </p>
              <p className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCents(order.totalCents)}
              </p>
            </div>
            {order.orderedAt ? (
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ordinato il
                </p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {formatShortDate(order.orderedAt)}
                </p>
              </div>
            ) : null}
            {order.receivedAt ? (
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ricevuto il
                </p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {formatShortDate(order.receivedAt)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-2 bg-zinc-50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
              <span>Articolo</span>
              <span className="text-right">Ordinato</span>
              <span className="text-right">Ricevuto</span>
            </div>
            {order.lines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-2 border-t border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {line.itemName}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {formatCents(line.unitCostCents)} / {line.unit} ·{" "}
                    {formatCents(line.totalCents)}
                  </p>
                </div>
                <span className="self-center text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                  {formatQuantityMilli(line.quantityMilli)} {line.unit}
                </span>
                <span className="self-center text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                  {order.status === "received"
                    ? `${formatQuantityMilli(line.receivedQuantityMilli)} ${line.unit}`
                    : "—"}
                </span>
              </div>
            ))}
          </div>

          {order.notes ? (
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Note</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {order.notes}
              </p>
            </div>
          ) : null}

          {order.receiptNote ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              <p className="text-xs font-medium">Note ricezione</p>
              <p className="mt-0.5 whitespace-pre-wrap">{order.receiptNote}</p>
            </div>
          ) : null}

          {order.status === "received" ? (
            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50">
              <span className="text-zinc-500 dark:text-zinc-400">
                Valore ricevuto
              </span>
              <span className="font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                {formatCents(order.receivedTotalCents)}
              </span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

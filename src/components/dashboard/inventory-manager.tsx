"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarClock,
  Euro,
  History,
  Package,
  Pencil,
  Plus,
  Scale,
  TriangleAlert,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  formatQuantityMilli,
  inventoryValueCents,
} from "@/lib/inventory";
import { formatCents, formatShortDate, relativeTime } from "@/lib/utils";
import {
  createInventoryItemAction,
  createSupplierAction,
  recordInventoryMovementAction,
  updateInventoryItemAction,
  updateSupplierAction,
} from "@/server/inventory/actions";
import {
  INVENTORY_MOVEMENT_LABELS,
  WASTE_REASON_LABELS,
  initialInventoryActionState,
  type InventoryItemRow,
  type InventoryMovementKind,
  type InventoryMovementRow,
  type InventorySupplierRow,
  type WasteReason,
} from "@/server/inventory/types";

function toEuroInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function newIdempotencyKey() {
  return crypto.randomUUID();
}

function supplierName(
  suppliers: InventorySupplierRow[],
  supplierId: string | null,
) {
  return suppliers.find((supplier) => supplier.id === supplierId)?.name ?? null;
}

function expiryState(expiresOn: string | null): "expired" | "soon" | null {
  if (!expiresOn) return null;
  const expiry = new Date(`${expiresOn}T23:59:59`);
  const diff = expiry.getTime() - Date.now();
  if (diff < 0) return "expired";
  if (diff <= 7 * 24 * 60 * 60 * 1000) return "soon";
  return null;
}

function isLowStock(item: InventoryItemRow) {
  return (
    item.quantityMilli > 0 &&
    item.minQuantityMilli > 0 &&
    item.quantityMilli <= item.minQuantityMilli
  );
}

type ItemTarget =
  | { mode: "create"; idempotencyKey: string }
  | { mode: "edit"; item: InventoryItemRow };

type MovementTarget = {
  itemId: string;
  kind: InventoryMovementKind;
  idempotencyKey: string;
};

type Props = {
  items: InventoryItemRow[];
  suppliers: InventorySupplierRow[];
  movements: InventoryMovementRow[];
};

export function InventoryManager({ items, suppliers, movements }: Props) {
  const [itemTarget, setItemTarget] = useState<ItemTarget | null>(null);
  const [movementTarget, setMovementTarget] = useState<MovementTarget | null>(
    null,
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const activeItems = items.filter((item) => item.isActive);
  const outOfStock = activeItems.filter((item) => item.quantityMilli <= 0);
  const lowStock = activeItems.filter(isLowStock);
  const expiringItems = activeItems.filter((item) => {
    const state = expiryState(item.expiresOn);
    return item.quantityMilli > 0 && (state === "expired" || state === "soon");
  });
  const totalValue = activeItems.reduce(
    (sum, item) =>
      sum + inventoryValueCents(item.quantityMilli, item.costPerUnitCents),
    0,
  );

  const filteredItems = activeItems.filter((item) => {
    if (statusFilter === "out") return item.quantityMilli <= 0;
    if (statusFilter === "low") return isLowStock(item);
    if (statusFilter === "expiring") {
      const state = expiryState(item.expiresOn);
      return state === "expired" || state === "soon";
    }
    return true;
  });

  const openCreateItem = () =>
    setItemTarget({ mode: "create", idempotencyKey: newIdempotencyKey() });

  const openMovement = (
    item: InventoryItemRow,
    kind: InventoryMovementKind,
  ) =>
    setMovementTarget({
      itemId: item.id,
      kind,
      idempotencyKey: newIdempotencyKey(),
    });

  const columns: DataTableColumn<InventoryItemRow>[] = [
    {
      id: "name",
      header: "Articolo",
      sortValue: (item) => item.name,
      cell: (item) => {
        const supplier = supplierName(suppliers, item.supplierId);
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {item.name}
            </p>
            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {[item.sku || "Senza codice", item.lot ? `Lotto ${item.lot}` : null, supplier]
                .filter(Boolean)
                .join(" - ")}
            </p>
          </div>
        );
      },
    },
    {
      id: "category",
      header: "Categoria",
      sortValue: (item) => item.category,
      headerClassName: "hidden sm:table-cell",
      className: "hidden sm:table-cell",
      cell: (item) => (
        <div>
          <Badge variant="secondary">{item.category || "Generale"}</Badge>
          {item.location ? (
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {item.location}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "quantity",
      header: "Giacenza",
      sortValue: (item) => item.quantityMilli,
      cell: (item) => (
        <div>
          <p className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
            {formatQuantityMilli(item.quantityMilli)} {item.unit}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            Minimo {formatQuantityMilli(item.minQuantityMilli)} {item.unit}
          </p>
          {item.quantityMilli <= 0 ? (
            <Badge variant="danger" dot className="mt-1">
              Esaurito
            </Badge>
          ) : isLowStock(item) ? (
            <Badge variant="warning" dot className="mt-1">
              Sotto minimo
            </Badge>
          ) : (
            <Badge variant="success" dot className="mt-1">
              Disponibile
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "value",
      header: "Valore",
      sortValue: (item) =>
        inventoryValueCents(item.quantityMilli, item.costPerUnitCents),
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell",
      cell: (item) => (
        <div>
          <p className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
            {formatCents(
              inventoryValueCents(item.quantityMilli, item.costPerUnitCents),
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {formatCents(item.costPerUnitCents)} / {item.unit}
          </p>
        </div>
      ),
    },
    {
      id: "expiry",
      header: "Scadenza",
      sortValue: (item) => item.expiresOn ?? "",
      headerClassName: "hidden lg:table-cell",
      className: "hidden lg:table-cell",
      cell: (item) => {
        if (!item.expiresOn) {
          return <span className="text-xs text-zinc-400">-</span>;
        }
        const state = expiryState(item.expiresOn);
        return (
          <div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              {formatShortDate(`${item.expiresOn}T12:00:00`)}
            </p>
            {state === "expired" ? (
              <Badge variant="danger" className="mt-1">
                Scaduto
              </Badge>
            ) : state === "soon" ? (
              <Badge variant="warning" className="mt-1">
                In scadenza
              </Badge>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Articoli attivi"
          value={String(activeItems.length)}
          detail={`${suppliers.length} fornitori`}
        />
        <StatCard
          icon={TriangleAlert}
          label="Da riordinare"
          value={String(lowStock.length + outOfStock.length)}
          detail={`${outOfStock.length} esauriti`}
          tone={outOfStock.length + lowStock.length > 0 ? "warning" : "neutral"}
        />
        <StatCard
          icon={Euro}
          label="Valore magazzino"
          value={formatCents(totalValue)}
          detail="Costo di acquisto"
        />
        <StatCard
          icon={CalendarClock}
          label="In scadenza"
          value={String(expiringItems.length)}
          detail="Entro 7 giorni"
          tone={expiringItems.length > 0 ? "warning" : "neutral"}
        />
      </section>

      <DataTable
        data={filteredItems}
        columns={columns}
        getRowId={(item) => item.id}
        searchText={(item) =>
          [
            item.name,
            item.sku,
            item.category,
            item.lot,
            item.location,
            supplierName(suppliers, item.supplierId) ?? "",
          ].join(" ")
        }
        searchPlaceholder="Cerca articolo, codice o lotto..."
        onRowClick={(item) => setItemTarget({ mode: "edit", item })}
        pageSize={10}
        toolbar={
          <>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-8 w-40 text-xs"
              aria-label="Filtra per stato"
            >
              <option value="all">Tutti gli stati</option>
              <option value="low">Sotto minimo</option>
              <option value="out">Esauriti</option>
              <option value="expiring">In scadenza</option>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSuppliersOpen(true)}
            >
              <Truck />
              Fornitori
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHistoryOpen(true)}
            >
              <History />
              Movimenti
            </Button>
            <Button size="sm" onClick={openCreateItem}>
              <Plus />
              Nuovo articolo
            </Button>
          </>
        }
        rowActions={(item) => (
          <RowMenu
            items={[
              {
                label: "Carico",
                icon: ArrowDownToLine,
                onSelect: () => openMovement(item, "load"),
              },
              {
                label: "Scarico",
                icon: ArrowUpFromLine,
                onSelect: () => openMovement(item, "unload"),
              },
              {
                label: "Spreco",
                icon: TriangleAlert,
                onSelect: () => openMovement(item, "waste"),
              },
              {
                label: "Rettifica",
                icon: Scale,
                onSelect: () => openMovement(item, "adjustment"),
              },
              {
                label: "Modifica",
                icon: Pencil,
                separatorBefore: true,
                onSelect: () => setItemTarget({ mode: "edit", item }),
              },
            ]}
          />
        )}
        emptyTitle="Nessun articolo"
        emptyDescription={
          activeItems.length === 0
            ? "Crea il primo articolo e registra la giacenza iniziale."
            : "Prova a modificare la ricerca o il filtro per stato."
        }
        emptyAction={
          activeItems.length === 0 ? (
            <Button size="sm" onClick={openCreateItem}>
              <Plus />
              Nuovo articolo
            </Button>
          ) : undefined
        }
      />

      {itemTarget ? (
        <ItemDialog
          key={
            itemTarget.mode === "edit"
              ? `edit-${itemTarget.item.id}`
              : `create-${itemTarget.idempotencyKey}`
          }
          target={itemTarget}
          suppliers={suppliers}
          onClose={() => setItemTarget(null)}
        />
      ) : null}

      {movementTarget ? (
        <MovementDialog
          key={movementTarget.idempotencyKey}
          target={movementTarget}
          item={activeItems.find((item) => item.id === movementTarget.itemId)}
          onClose={() => setMovementTarget(null)}
        />
      ) : null}

      <HistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        movements={movements}
        items={items}
      />

      <SuppliersDialog
        open={suppliersOpen}
        onOpenChange={setSuppliersOpen}
        suppliers={suppliers.filter((supplier) => supplier.isActive)}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <Icon
          className={
            tone === "warning"
              ? "size-4 text-amber-600 dark:text-amber-400"
              : "size-4 text-brand-700 dark:text-brand-400"
          }
        />
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
        {detail}
      </p>
    </div>
  );
}

function ItemDialog({
  target,
  suppliers,
  onClose,
}: {
  target: ItemTarget;
  suppliers: InventorySupplierRow[];
  onClose: () => void;
}) {
  const item = target.mode === "edit" ? target.item : null;
  const [state, formAction, pending] = useActionState(
    item ? updateInventoryItemAction : createInventoryItemAction,
    initialInventoryActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Articolo salvato.");
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {item ? "Modifica articolo" : "Nuovo articolo di magazzino"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "La giacenza si modifica solo con carichi, scarichi, sprechi o rettifiche tracciate."
              : "La giacenza iniziale viene registrata come primo carico nel registro movimenti."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {target.mode === "edit" ? (
            <input type="hidden" name="itemId" value={target.item.id} />
          ) : (
            <input
              type="hidden"
              name="idempotencyKey"
              value={target.idempotencyKey}
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nome"
              htmlFor="inventory-name"
              error={state.fieldErrors?.name}
            >
              <Input
                id="inventory-name"
                name="name"
                defaultValue={item?.name ?? ""}
                placeholder="Es. Pomodori San Marzano"
                maxLength={120}
                required
              />
            </Field>
            <Field
              label="Codice interno"
              htmlFor="inventory-sku"
              error={state.fieldErrors?.sku}
            >
              <Input
                id="inventory-sku"
                name="sku"
                defaultValue={item?.sku ?? ""}
                placeholder="Es. VER-001"
                maxLength={60}
              />
            </Field>
            <Field
              label="Categoria"
              htmlFor="inventory-category"
              error={state.fieldErrors?.category}
            >
              <Input
                id="inventory-category"
                name="category"
                defaultValue={item?.category ?? ""}
                placeholder="Es. Verdura"
                maxLength={80}
              />
            </Field>
            <Field
              label="Unità di misura"
              htmlFor="inventory-unit"
              error={state.fieldErrors?.unit}
            >
              <Input
                id="inventory-unit"
                name="unit"
                defaultValue={item?.unit ?? "kg"}
                placeholder="kg, l, pz"
                maxLength={12}
                required
              />
            </Field>
            <Field
              label="Costo per unità (€)"
              htmlFor="inventory-cost"
              error={state.fieldErrors?.cost}
            >
              <Input
                id="inventory-cost"
                name="cost"
                defaultValue={item ? toEuroInput(item.costPerUnitCents) : ""}
                placeholder="2,90"
                inputMode="decimal"
                required
              />
            </Field>
            <Field
              label="Scorta minima"
              htmlFor="inventory-min"
              error={state.fieldErrors?.minQuantity}
              hint="Usata per segnalare il riordino."
            >
              <Input
                id="inventory-min"
                name="minQuantity"
                defaultValue={
                  item ? formatQuantityMilli(item.minQuantityMilli) : "0"
                }
                placeholder="5"
                inputMode="decimal"
                required
              />
            </Field>
            {item ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Giacenza attuale
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                  {formatQuantityMilli(item.quantityMilli)} {item.unit}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Per variarla usa un movimento dalla tabella.
                </p>
              </div>
            ) : (
              <Field
                label="Giacenza iniziale"
                htmlFor="inventory-quantity"
                error={state.fieldErrors?.quantity}
              >
                <Input
                  id="inventory-quantity"
                  name="quantity"
                  defaultValue="0"
                  placeholder="10"
                  inputMode="decimal"
                  required
                />
              </Field>
            )}
            <Field
              label="Fornitore"
              htmlFor="inventory-supplier"
              error={state.fieldErrors?.supplierId}
            >
              <Select
                id="inventory-supplier"
                name="supplierId"
                defaultValue={item?.supplierId ?? ""}
              >
                <option value="">Nessun fornitore</option>
                {suppliers
                  .filter((supplier) => supplier.isActive)
                  .map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field
              label="Lotto"
              htmlFor="inventory-lot"
              error={state.fieldErrors?.lot}
            >
              <Input
                id="inventory-lot"
                name="lot"
                defaultValue={item?.lot ?? ""}
                placeholder="Es. L-2026-042"
                maxLength={60}
              />
            </Field>
            <Field
              label="Scadenza"
              htmlFor="inventory-expiry"
              error={state.fieldErrors?.expiresOn}
            >
              <Input
                id="inventory-expiry"
                name="expiresOn"
                type="date"
                defaultValue={item?.expiresOn ?? ""}
              />
            </Field>
            <Field
              label="Posizione"
              htmlFor="inventory-location"
              error={state.fieldErrors?.location}
            >
              <Input
                id="inventory-location"
                name="location"
                defaultValue={item?.location ?? ""}
                placeholder="Es. Frigo 2, scaffale B"
                maxLength={80}
              />
            </Field>
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
            <Button type="submit" disabled={pending}>
              {item ? "Salva modifiche" : "Crea articolo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({
  target,
  item,
  onClose,
}: {
  target: MovementTarget;
  item: InventoryItemRow | undefined;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<InventoryMovementKind>(target.kind);
  const [state, formAction, pending] = useActionState(
    recordInventoryMovementAction,
    initialInventoryActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Movimento registrato.");
      onClose();
    }
  }, [state, onClose]);

  if (!item) return null;

  const quantityLabel =
    kind === "load"
      ? "Quantità da caricare"
      : kind === "unload"
        ? "Quantità da scaricare"
        : kind === "waste"
          ? "Quantità sprecata"
          : "Variazione di giacenza";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Movimento di magazzino</DialogTitle>
          <DialogDescription>
            {item.name}: {formatQuantityMilli(item.quantityMilli)} {item.unit}{" "}
            disponibili. Ogni movimento è tracciato e non modificabile.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="itemId" value={item.id} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={target.idempotencyKey}
          />
          <Field label="Tipo di movimento" htmlFor="movement-kind">
            <Select
              id="movement-kind"
              name="kind"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as InventoryMovementKind)
              }
            >
              {(
                Object.keys(
                  INVENTORY_MOVEMENT_LABELS,
                ) as InventoryMovementKind[]
              ).map((entry) => (
                <option key={entry} value={entry}>
                  {INVENTORY_MOVEMENT_LABELS[entry]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={`${quantityLabel} (${item.unit})`}
            htmlFor="movement-quantity"
            error={state.fieldErrors?.quantity}
            hint={
              kind === "adjustment"
                ? "Usa un numero negativo per ridurre la giacenza."
                : "Inserisci un valore positivo."
            }
          >
            <Input
              id="movement-quantity"
              name="quantity"
              placeholder={kind === "adjustment" ? "es. -2,5" : "es. 5"}
              inputMode="decimal"
              required
            />
          </Field>
          {kind === "waste" ? (
            <Field
              label="Motivazione dello spreco"
              htmlFor="movement-reason"
              error={state.fieldErrors?.reason}
            >
              <Select id="movement-reason" name="reason" defaultValue="">
                <option value="" disabled>
                  Scegli una motivazione
                </option>
                {(Object.keys(WASTE_REASON_LABELS) as WasteReason[]).map(
                  (reason) => (
                    <option key={reason} value={reason}>
                      {WASTE_REASON_LABELS[reason]}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          ) : null}
          <Field
            label="Nota"
            htmlFor="movement-note"
            error={state.fieldErrors?.note}
          >
            <Textarea
              id="movement-note"
              name="note"
              maxLength={300}
              className="min-h-16"
              placeholder="Riferimento documento, fornitore o motivazione..."
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
            <Button
              type="submit"
              variant={kind === "waste" ? "destructive" : "default"}
              disabled={pending}
            >
              Registra {INVENTORY_MOVEMENT_LABELS[kind].toLowerCase()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({
  open,
  onOpenChange,
  movements,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movements: InventoryMovementRow[];
  items: InventoryItemRow[];
}) {
  const nameById = new Map(items.map((item) => [item.id, item.name]));
  const unitById = new Map(items.map((item) => [item.id, item.unit]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Registro movimenti</DialogTitle>
          <DialogDescription>
            Ultimi 40 movimenti del ristorante, dal più recente. Il registro
            non è modificabile.
          </DialogDescription>
        </DialogHeader>
        {movements.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Nessun movimento registrato.
          </p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {movements.map((movement) => {
              const unit = unitById.get(movement.itemId) ?? "pz";
              const positive = movement.quantityDeltaMilli > 0;
              return (
                <li
                  key={movement.id}
                  className="flex flex-wrap items-start justify-between gap-2 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          movement.kind === "load"
                            ? "success"
                            : movement.kind === "waste"
                              ? "danger"
                              : "secondary"
                        }
                      >
                        {INVENTORY_MOVEMENT_LABELS[movement.kind]}
                      </Badge>
                      <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {nameById.get(movement.itemId) ?? "Articolo rimosso"}
                      </span>
                      <span
                        className={
                          positive
                            ? "text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400"
                            : "text-sm font-semibold tabular-nums text-red-700 dark:text-red-400"
                        }
                      >
                        {positive ? "+" : "-"}
                        {formatQuantityMilli(
                          Math.abs(movement.quantityDeltaMilli),
                        )}{" "}
                        {unit}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Saldo {formatQuantityMilli(movement.quantityAfterMilli)}{" "}
                      {unit}
                      {movement.reason
                        ? ` - ${WASTE_REASON_LABELS[movement.reason as WasteReason] ?? movement.reason}`
                        : ""}
                      {movement.note ? ` - ${movement.note}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {relativeTime(movement.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SuppliersDialog({
  open,
  onOpenChange,
  suppliers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: InventorySupplierRow[];
}) {
  const [formTarget, setFormTarget] = useState<
    { mode: "create" } | { mode: "edit"; supplier: InventorySupplierRow } | null
  >(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setFormTarget(null);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fornitori</DialogTitle>
          <DialogDescription>
            Referenti collegati agli articoli di magazzino del ristorante.
          </DialogDescription>
        </DialogHeader>
        {formTarget ? (
          <SupplierForm
            key={
              formTarget.mode === "edit"
                ? formTarget.supplier.id
                : "new-supplier"
            }
            target={formTarget}
            onDone={() => setFormTarget(null)}
          />
        ) : (
          <>
            {suppliers.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Nessun fornitore registrato.
              </p>
            ) : (
              <ul className="max-h-[50vh] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
                {suppliers.map((supplier) => (
                  <li
                    key={supplier.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {supplier.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {[supplier.category, supplier.email, supplier.phone]
                          .filter(Boolean)
                          .join(" - ") || "Nessun contatto"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setFormTarget({ mode: "edit", supplier })
                      }
                    >
                      <Pencil />
                      Modifica
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Chiudi
              </Button>
              <Button
                type="button"
                onClick={() => setFormTarget({ mode: "create" })}
              >
                <Plus />
                Nuovo fornitore
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SupplierForm({
  target,
  onDone,
}: {
  target:
    | { mode: "create" }
    | { mode: "edit"; supplier: InventorySupplierRow };
  onDone: () => void;
}) {
  const supplier = target.mode === "edit" ? target.supplier : null;
  const [state, formAction, pending] = useActionState(
    supplier ? updateSupplierAction : createSupplierAction,
    initialInventoryActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Fornitore salvato.");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-3">
      {supplier ? (
        <input type="hidden" name="supplierId" value={supplier.id} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Nome"
          htmlFor="supplier-name"
          error={state.fieldErrors?.name}
        >
          <Input
            id="supplier-name"
            name="name"
            defaultValue={supplier?.name ?? ""}
            placeholder="Es. Ortofrutta Rossi"
            maxLength={120}
            required
          />
        </Field>
        <Field
          label="Categoria"
          htmlFor="supplier-category"
          error={state.fieldErrors?.category}
        >
          <Input
            id="supplier-category"
            name="category"
            defaultValue={supplier?.category ?? ""}
            placeholder="Es. Ortofrutta"
            maxLength={80}
          />
        </Field>
        <Field
          label="Email"
          htmlFor="supplier-email"
          error={state.fieldErrors?.email}
        >
          <Input
            id="supplier-email"
            name="email"
            type="email"
            defaultValue={supplier?.email ?? ""}
            placeholder="ordini@fornitore.it"
            maxLength={160}
          />
        </Field>
        <Field
          label="Telefono"
          htmlFor="supplier-phone"
          error={state.fieldErrors?.phone}
        >
          <Input
            id="supplier-phone"
            name="phone"
            type="tel"
            defaultValue={supplier?.phone ?? ""}
            placeholder="+39..."
            maxLength={40}
          />
        </Field>
      </div>
      <Field
        label="Note"
        htmlFor="supplier-notes"
        error={state.fieldErrors?.notes}
      >
        <Textarea
          id="supplier-notes"
          name="notes"
          defaultValue={supplier?.notes ?? ""}
          maxLength={500}
          className="min-h-16"
          placeholder="Giorni di consegna, condizioni, referente..."
        />
      </Field>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annulla
        </Button>
        <Button type="submit" disabled={pending}>
          {supplier ? "Salva fornitore" : "Crea fornitore"}
        </Button>
      </DialogFooter>
    </form>
  );
}


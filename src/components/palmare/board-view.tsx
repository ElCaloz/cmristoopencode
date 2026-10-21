"use client";

import {
  ChefHat,
  LogOut,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { cn, formatCents, formatTime } from "@/lib/utils";
import {
  palmareAddItemsAction,
  palmareLogoutAction,
  palmareOpenOrderAction,
} from "@/server/palmare/actions";
import {
  initialPalmareOrderActionState,
  type PalmareBoard,
  type PalmareMenuCategory,
  type PalmareOrder,
  type PalmareTable,
} from "@/server/palmare/types";

type Props = {
  board: PalmareBoard;
  menu: PalmareMenuCategory[];
};

const itemStatusLabels: Record<string, string> = {
  pending: "In attesa",
  preparing: "In preparazione",
  ready: "Pronto",
  served: "Servito",
};

function TableCard({
  table,
  onSelect,
}: {
  table: PalmareTable;
  onSelect: (table: PalmareTable) => void;
}) {
  const order = table.order;

  return (
    <button
      type="button"
      onClick={() => onSelect(table)}
      className={cn(
        "w-full rounded-xl border-2 p-3 text-left transition-colors",
        order
          ? "border-brand-300 bg-white hover:border-brand-500 dark:border-brand-800 dark:bg-zinc-900 dark:hover:border-brand-600"
          : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {table.name}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {table.seats} posti
          </p>
        </div>
        {order ? (
          <Badge variant="info">
            {order.guests ? `${order.guests} coperti` : "Occupato"}
          </Badge>
        ) : (
          <Badge variant="muted">Libero</Badge>
        )}
      </div>

      {order ? (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Aperto alle {formatTime(order.openedAt)} · {formatCents(order.totalCents)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {order.activeCount > 0 ? (
              <Badge variant="warning">{order.activeCount} in cucina</Badge>
            ) : null}
            {order.readyCount > 0 ? (
              <Badge variant="success">{order.readyCount} pronti</Badge>
            ) : null}
            {order.activeCount === 0 && order.readyCount === 0 ? (
              <Badge variant="muted">Nessuna comanda attiva</Badge>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs font-medium text-brand-700 dark:text-brand-400">
          Tocca per aprire il conto
        </p>
      )}
    </button>
  );
}

function OrderItemsList({ order }: { order: PalmareOrder }) {
  if (order.items.length === 0) {
    return (
      <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
        Nessun prodotto ancora ordinato.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {order.items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-zinc-900 dark:text-zinc-100">
              {item.quantity}× {item.name}
            </p>
            {item.note ? (
              <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {item.note}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant={
                item.status === "ready"
                  ? "success"
                  : item.status === "served"
                    ? "muted"
                    : "warning"
              }
            >
              {itemStatusLabels[item.status] ?? item.status}
            </Badge>
            <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {formatCents(item.unitPriceCents * item.quantity)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PalmareBoardView({ board, menu }: Props) {
  const [openState, openFormAction, openPending] = useActionState(
    palmareOpenOrderAction,
    initialPalmareOrderActionState,
  );
  const [addState, addFormAction, addPending] = useActionState(
    palmareAddItemsAction,
    initialPalmareOrderActionState,
  );
  const [, startTransition] = useTransition();
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, number>>({});

  useEffect(() => {
    if (openState.status === "success" && openState.message) {
      toast.success(openState.message);
    } else if (openState.status === "error" && openState.message) {
      toast.error(openState.message);
    }
  }, [openState]);

  useEffect(() => {
    if (addState.status === "success" && addState.message) {
      toast.success(addState.message);
    } else if (addState.status === "error" && addState.message) {
      toast.error(addState.message);
    }
  }, [addState]);

  const allTables = [
    ...board.areas.flatMap((area) => area.tables),
    ...board.looseTables,
  ];
  const occupied = allTables.filter((table) => table.order !== null).length;
  const readyTotal = allTables.reduce(
    (total, table) => total + (table.order?.readyCount ?? 0),
    0,
  );
  const activeTable =
    allTables.find((table) => table.id === activeTableId) ?? null;

  const closeDialog = () => {
    setActiveTableId(null);
    setSelection({});
  };

  const selectTable = (table: PalmareTable) => {
    setSelection({});
    setActiveTableId(table.id);
  };

  const selectedItems = Object.entries(selection)
    .filter(([, quantity]) => quantity > 0)
    .map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
  const selectedCount = selectedItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const adjustQuantity = (menuItemId: string, delta: number) => {
    setSelection((current) => {
      const next = Math.max(0, Math.min(99, (current[menuItemId] ?? 0) + delta));
      const updated = { ...current, [menuItemId]: next };
      if (next === 0) delete updated[menuItemId];
      return updated;
    });
  };

  const submitAddItems = (formData: FormData) => {
    if (selectedItems.length === 0) {
      toast.error("Seleziona almeno un prodotto.");
      return;
    }
    setSelection({});
    startTransition(() => {
      addFormAction(formData);
    });
  };

  return (
    <main className="min-h-screen bg-zinc-50 pb-24 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {board.deviceName || "Palmare"} · {board.restaurantName}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              Operatore: {board.operatorFullName} · sessione fino alle{" "}
              {formatTime(board.expiresAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/palmare" aria-label="Aggiorna la sala">
                <RefreshCw />
                <span className="hidden sm:inline">Aggiorna</span>
              </Link>
            </Button>
            <form action={palmareLogoutAction}>
              <Button type="submit" size="sm" variant="destructive">
                <LogOut />
                <span className="hidden sm:inline">Esci</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {occupied} di {allTables.length} tavoli occupati
          </Badge>
          {readyTotal > 0 ? (
            <Badge variant="success" dot>
              {readyTotal} piatti pronti al pass
            </Badge>
          ) : null}
        </div>

        {allTables.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
            <UtensilsCrossed className="size-8 text-zinc-400 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nessun tavolo configurato
            </p>
            <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Crea sale e tavoli dal gestionale, sezione Sala, per vederli qui.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            {board.areas.map((area) => (
              <section key={area.id}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {area.name}
                </h2>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {area.tables.length === 0 ? (
                    <p className="col-span-full text-xs text-zinc-500 dark:text-zinc-400">
                      Nessun tavolo in quest&apos;area.
                    </p>
                  ) : (
                    area.tables.map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        onSelect={selectTable}
                      />
                    ))
                  )}
                </div>
              </section>
            ))}

            {board.looseTables.length > 0 ? (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Senza area
                </h2>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {board.looseTables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      onSelect={selectTable}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <Dialog
        open={activeTable !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeTable?.order
                ? `Tavolo ${activeTable.name}`
                : `Apri il conto · ${activeTable?.name ?? ""}`}
            </DialogTitle>
            <DialogDescription>
              {activeTable?.order
                ? `Conto aperto alle ${formatTime(activeTable.order.openedAt)} · ${formatCents(activeTable.order.totalCents)}`
                : `${activeTable?.seats ?? 0} posti a sedere. I coperti aiutano la cucina e la cassa.`}
            </DialogDescription>
          </DialogHeader>

          {activeTable?.order ? (
            <div className="space-y-4">
              <OrderItemsList order={activeTable.order} />

              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <ChefHat className="size-4" />
                  Aggiungi prodotti
                </p>

                {menu.length === 0 ||
                menu.every((category) => category.items.length === 0) ? (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Nessun prodotto disponibile nel menu.
                  </p>
                ) : (
                  <div className="mt-2 max-h-72 space-y-4 overflow-y-auto pr-1">
                    {menu.map((category) => (
                      <div key={category.id ?? "uncategorized"}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {category.name}
                        </p>
                        <ul className="mt-1 space-y-1.5">
                          {category.items.map((item) => {
                            const quantity = selection[item.id] ?? 0;

                            return (
                              <li
                                key={item.id}
                                className={cn(
                                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2",
                                  quantity > 0
                                    ? "border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/40"
                                    : "border-zinc-200 dark:border-zinc-800",
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => adjustQuantity(item.id, 1)}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <span className="block truncate text-sm text-zinc-900 dark:text-zinc-100">
                                    {item.name}
                                  </span>
                                  <span className="block text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                                    {formatCents(item.priceCents)}
                                  </span>
                                </button>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  {quantity > 0 ? (
                                    <>
                                      <Button
                                        type="button"
                                        size="icon-sm"
                                        variant="outline"
                                        aria-label={`Riduci ${item.name}`}
                                        onClick={() =>
                                          adjustQuantity(item.id, -1)
                                        }
                                      >
                                        <Minus />
                                      </Button>
                                      <span className="w-6 text-center text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                                        {quantity}
                                      </span>
                                    </>
                                  ) : null}
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant={
                                      quantity > 0 ? "default" : "outline"
                                    }
                                    aria-label={`Aggiungi ${item.name}`}
                                    onClick={() => adjustQuantity(item.id, 1)}
                                  >
                                    <Plus />
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form action={submitAddItems} className="space-y-3">
                <input
                  type="hidden"
                  name="orderId"
                  value={activeTable.order.id}
                />
                <input
                  type="hidden"
                  name="items"
                  value={JSON.stringify(selectedItems)}
                />
                {addState.status === "error" && addState.message ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    {addState.message}
                  </p>
                ) : null}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                  >
                    Chiudi
                  </Button>
                  <Button
                    type="submit"
                    disabled={addPending || selectedItems.length === 0}
                  >
                    <ReceiptText />
                    {addPending
                      ? "Invio in corso…"
                      : selectedCount > 0
                        ? `Invia in cucina (${selectedCount})`
                        : "Invia in cucina"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          ) : (
            <form action={openFormAction} className="space-y-3">
              <input
                type="hidden"
                name="tableId"
                value={activeTable?.id ?? ""}
              />
              <Field
                label="Coperti"
                htmlFor="palmare-guests"
                error={
                  openState.status === "error" ? openState.message : undefined
                }
              >
                <Input
                  id="palmare-guests"
                  name="guests"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  defaultValue={activeTable ? Math.min(2, activeTable.seats) : 2}
                  required
                />
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Annulla
                </Button>
                <Button type="submit" disabled={openPending}>
                  {openPending ? "Apertura in corso…" : "Apri conto"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

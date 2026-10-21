"use client";

import {
  Banknote,
  CreditCard,
  Minus,
  Plus,
  Search,
  Send,
  Smartphone,
  Ticket,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
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
import { Field, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import {
  isOrderActive,
  orderSubtotalCents,
  orderTotalCents,
  PAYMENT_METHOD_LABELS,
  STATION_LABELS,
} from "@/lib/demo/calc";
import type {
  MenuProduct,
  Order,
  PaymentMethod,
  ProductVariant,
  Station,
} from "@/lib/demo/types";
import { cn, formatCents } from "@/lib/utils";

type CartLine = {
  key: string;
  productId: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  station: Station;
  variant?: string;
};

type PosContext = {
  type: Order["type"];
  tableId?: string;
  tableName?: string;
  covers: number;
  waiter: string;
};

const PAY_OPTIONS: Array<{
  method: PaymentMethod;
  icon: LucideIcon;
}> = [
  { method: "carta", icon: CreditCard },
  { method: "contanti", icon: Banknote },
  { method: "satispay", icon: Smartphone },
  { method: "buoni", icon: Ticket },
];

export default function PosPage() {
  const restaurant = useActiveRestaurant();
  const orders = useDemoStore((state) => state.orders);
  const products = useDemoStore((state) => state.products);
  const tables = useDemoStore((state) => state.tables);
  const categories = useDemoStore((state) => state.categories);
  const staff = useDemoStore((state) => state.staff);
  const createOrder = useDemoStore((state) => state.createOrder);
  const addItemsToOrder = useDemoStore((state) => state.addItemsToOrder);
  const payOrder = useDemoStore((state) => state.payOrder);

  const [context, setContext] = useState<PosContext | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [variantProduct, setVariantProduct] = useState<MenuProduct | null>(null);
  const [newForm, setNewForm] = useState<{
    type: "tavolo" | "asporto" | "delivery";
    tableId: string;
    covers: string;
    waiter: string;
  }>({ type: "tavolo", tableId: "", covers: "2", waiter: "" });

  if (!restaurant) return null;

  const restaurantProducts = products.filter(
    (product) => product.restaurantId === restaurant.id,
  );
  const restaurantTables = tables.filter(
    (table) => table.restaurantId === restaurant.id,
  );
  const restaurantCategories = categories[restaurant.id] ?? [];
  const activeOrders = orders
    .filter(
      (order) =>
        order.restaurantId === restaurant.id && isOrderActive(order),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selectedOrder = selectedOrderId
    ? orders.find((order) => order.id === selectedOrderId)
    : undefined;
  const waiters = staff
    .filter(
      (member) =>
        member.restaurantId === restaurant.id &&
        member.active &&
        ["cameriere", "cassiere", "admin"].includes(member.role),
    )
    .map((member) => member.name);
  const defaultWaiter = waiters[0] ?? "Staff demo";

  const visibleProducts = restaurantProducts.filter(
    (product) =>
      (activeCategory === "all" || product.categoryId === activeCategory) &&
      product.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const existingSubtotal = selectedOrder
    ? orderSubtotalCents(selectedOrder)
    : 0;
  const draftSubtotal = draft.reduce(
    (sum, line) => sum + line.unitPriceCents * line.qty,
    0,
  );
  const subtotal = existingSubtotal + draftSubtotal;
  const payableTotal = Math.round(subtotal * (1 - discount / 100));
  const canPay = selectedOrder
    ? draft.length === 0
    : Boolean(context && draft.length > 0);

  const openNewDialog = () => {
    setNewForm({
      type: "tavolo",
      tableId:
        restaurantTables.find((table) => table.status === "free")?.id ?? "",
      covers: "2",
      waiter: defaultWaiter,
    });
    setNewOpen(true);
  };

  const startNewAccount = () => {
    const table = restaurantTables.find(
      (entry) => entry.id === newForm.tableId,
    );
    if (newForm.type === "tavolo" && !table) {
      toast.error("Seleziona un tavolo per aprire il conto.");
      return;
    }
    const existing = table
      ? activeOrders.find((order) => order.tableId === table.id)
      : undefined;
    if (existing) {
      setSelectedOrderId(existing.id);
      setContext(null);
      setDraft([]);
      setNewOpen(false);
      toast.info(`Conto #${existing.number} ripreso`, {
        description: `Il tavolo ${table?.name} ha già una comanda attiva.`,
      });
      return;
    }
    setContext({
      type: newForm.type,
      tableId: table?.id,
      tableName:
        table?.name ??
        (newForm.type === "delivery" ? "Consegna" : "Banco asporto"),
      covers: Math.max(1, Number(newForm.covers) || 1),
      waiter: newForm.waiter || defaultWaiter,
    });
    setSelectedOrderId(null);
    setDraft([]);
    setNewOpen(false);
    toast.success("Conto pronto", {
      description: "Aggiungi i prodotti e invia la comanda in cucina.",
    });
  };

  const addLine = (product: MenuProduct, variant?: ProductVariant) => {
    if (!context && !selectedOrder) {
      toast.info("Apri prima un conto", {
        description: "Seleziona un conto aperto o creane uno nuovo.",
      });
      return;
    }
    const key = `${product.id}${variant ? `::${variant.name}` : ""}`;
    setDraft((current) => {
      const found = current.find((line) => line.key === key);
      if (found) {
        return current.map((line) =>
          line.key === key ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          name: variant
            ? `${product.name} · ${variant.name}`
            : product.name,
          qty: 1,
          unitPriceCents: product.priceCents + (variant?.priceDeltaCents ?? 0),
          station: product.station,
          variant: variant?.name,
        },
      ];
    });
  };

  const handleProductClick = (product: MenuProduct) => {
    if (!product.available) return;
    if (product.variants && product.variants.length > 0) {
      setVariantProduct(product);
      return;
    }
    addLine(product);
  };

  const changeDraftQty = (key: string, delta: number) => {
    setDraft((current) =>
      current.flatMap((line) => {
        if (line.key !== key) return [line];
        const qty = line.qty + delta;
        return qty <= 0 ? [] : [{ ...line, qty }];
      }),
    );
  };

  const resetPos = () => {
    setSelectedOrderId(null);
    setContext(null);
    setDraft([]);
    setDiscount(0);
  };

  const sendToKitchen = () => {
    if (selectedOrder) {
      if (draft.length === 0) {
        toast.info("Nessuna aggiunta da inviare.");
        return;
      }
      addItemsToOrder(
        selectedOrder.id,
        draft.map((line) => ({
          productId: line.productId,
          name: line.name,
          qty: line.qty,
          unitPriceCents: line.unitPriceCents,
          variant: line.variant,
          station: line.station,
        })),
      );
      setDraft([]);
      toast.success("Aggiunta inviata in cucina", {
        description: `Conto #${selectedOrder.number} aggiornato.`,
      });
      return;
    }
    if (!context) {
      toast.info("Apri prima un conto.");
      return;
    }
    if (draft.length === 0) {
      toast.info("Aggiungi almeno un prodotto al conto.");
      return;
    }
    const order = createOrder({
      restaurantId: restaurant.id,
      tableId: context.tableId,
      tableName: context.tableName,
      type: context.type,
      covers: context.covers,
      waiter: context.waiter,
      items: draft.map((line) => ({
        productId: line.productId,
        name: line.name,
        qty: line.qty,
        unitPriceCents: line.unitPriceCents,
        variant: line.variant,
        station: line.station,
      })),
    });
    setSelectedOrderId(order.id);
    setContext(null);
    setDraft([]);
    toast.success(`Comanda #${order.number} inviata`, {
      description: `${context.tableName ?? "Asporto"} · cucina aggiornata.`,
    });
  };

  const confirmPayment = (method: PaymentMethod) => {
    let order = selectedOrder;
    if (!order) {
      if (!context || draft.length === 0) {
        toast.error("Nessun conto da incassare.");
        return;
      }
      order = createOrder({
        restaurantId: restaurant.id,
        tableId: context.tableId,
        tableName: context.tableName,
        type: context.type,
        covers: context.covers,
        waiter: context.waiter,
        items: draft.map((line) => ({
          productId: line.productId,
          name: line.name,
          qty: line.qty,
          unitPriceCents: line.unitPriceCents,
          variant: line.variant,
          station: line.station,
        })),
      });
    }
    if (order.restaurantId !== restaurant.id) return;

    payOrder(order.id, method, discount);
    toast.success("Pagamento registrato", {
      description: `${PAYMENT_METHOD_LABELS[method]} · ${formatCents(
        Math.round(subtotal * (1 - discount / 100)),
      )} · demo`,
    });
    setPayOpen(false);
    resetPos();
  };

  const cartTitle = selectedOrder
    ? `Conto #${selectedOrder.number}`
    : context
      ? "Nuovo conto"
      : "Nessun conto attivo";
  const cartSubtitle = selectedOrder
    ? `${selectedOrder.tableName ?? "Asporto"} · ${selectedOrder.covers} coperti`
    : context
      ? `${context.tableName} · ${context.covers} coperti`
      : "Seleziona un conto aperto o aprine uno nuovo";

  return (
    <div>
      <PageHeader
        eyebrow="Vendita e incassi"
        title="Cassa POS"
        description="Componi il conto, invia le comande e registra l'incasso. I pagamenti sono simulati."
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button onClick={openNewDialog}>
            <Plus />
            Nuovo conto
          </Button>
        }
      />

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          {activeOrders.length > 0 ? (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xs">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Conti aperti
                </p>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {activeOrders.length} in servizio
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {activeOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setContext(null);
                      setDraft([]);
                    }}
                    className={cn(
                      "min-w-40 shrink-0 rounded-lg border p-2.5 text-left transition-colors",
                      selectedOrderId === order.id
                        ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/60 ring-1 ring-brand-500/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                        #{order.number} · {order.tableName ?? "Asporto"}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                      {order.waiter} · {order.covers} coperti
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-[11px] font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                        {formatCents(orderTotalCents(order))}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <div className="border-b border-zinc-100 dark:border-zinc-800 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cerca un prodotto…"
                  className="pl-9"
                  aria-label="Cerca prodotto"
                />
              </div>
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    activeCategory === "all"
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                  )}
                >
                  Tutto il menu
                </button>
                {restaurantCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                      activeCategory === category.id
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  disabled={!product.available}
                  onClick={() => handleProductClick(product)}
                  className={cn(
                    "group flex min-h-24 flex-col rounded-lg border p-3 text-left transition-colors",
                    product.available
                      ? "border-zinc-200 dark:border-zinc-800 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/40 dark:hover:bg-brand-950/40"
                      : "cursor-not-allowed border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold leading-snug text-zinc-800 dark:text-zinc-100">
                      {product.name}
                    </p>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-brand-700 dark:text-brand-400">
                      {formatCents(product.priceCents)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {product.description || STATION_LABELS[product.station]}
                  </p>
                  <div className="mt-auto flex items-center gap-1 pt-2">
                    <Badge
                      variant={product.available ? "secondary" : "muted"}
                      className="text-[9px]"
                    >
                      {product.available
                        ? STATION_LABELS[product.station]
                        : "Esaurito"}
                    </Badge>
                    {product.variants && product.variants.length > 0 ? (
                      <Badge variant="outline" className="text-[9px]">
                        {product.variants.length} varianti
                      </Badge>
                    ) : null}
                  </div>
                </button>
              ))}
              {visibleProducts.length === 0 ? (
                <p className="col-span-full py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Nessun prodotto trovato con questi filtri.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs xl:sticky xl:top-24">
          <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {cartTitle}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {cartSubtitle}
              </p>
            </div>
            {selectedOrder || context ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={resetPos}
                aria-label="Chiudi conto"
                className="text-zinc-500 dark:text-zinc-400"
              >
                <X />
              </Button>
            ) : null}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {!selectedOrder && draft.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Il conto è vuoto.
                </p>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Apri un nuovo conto per iniziare.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={openNewDialog}
                >
                  <Plus />
                  Nuovo conto
                </Button>
              </div>
            ) : null}

            {selectedOrder ? (
              <div className="border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Righe già inviate
                </p>
                <div className="space-y-1.5">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium text-zinc-800 dark:text-zinc-100">
                          {item.qty}×
                        </span>{" "}
                        {item.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                        {formatCents(item.unitPriceCents * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {draft.length > 0 ? (
              <div className="px-4 py-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                  {selectedOrder ? "Nuove righe" : "Righe del conto"}
                </p>
                <div className="space-y-2">
                  {draft.map((line) => (
                    <div key={line.key} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                          {line.name}
                        </p>
                        <p className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
                          {formatCents(line.unitPriceCents)} cad.
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeDraftQty(line.key, -1)}
                          className="flex size-5 items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          aria-label={`Riduci ${line.name}`}
                        >
                          {line.qty === 1 ? (
                            <Trash2 className="size-3" />
                          ) : (
                            <Minus className="size-3" />
                          )}
                        </button>
                        <span className="w-5 text-center text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeDraftQty(line.key, 1)}
                          className="flex size-5 items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          aria-label={`Aumenta ${line.name}`}
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <span className="w-14 shrink-0 text-right text-xs font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                        {formatCents(line.unitPriceCents * line.qty)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 text-xs">
            <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
              <span>Subtotale</span>
              <span className="tabular-nums">{formatCents(subtotal)}</span>
            </div>
            {selectedOrder?.discountPct ? (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Sconto già applicato</span>
                <span className="tabular-nums">
                  {selectedOrder.discountPct}%
                </span>
              </div>
            ) : null}
            <div className="flex justify-between pt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <span>Totale</span>
              <span className="tabular-nums">
                {formatCents(
                  selectedOrder
                    ? orderTotalCents(selectedOrder) +
                        draftSubtotal
                    : subtotal,
                )}
              </span>
            </div>
            <p className="pt-1 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Sconti e incassi vengono applicati al momento del pagamento.
              Nessun pagamento reale in questa demo.
            </p>
          </div>

          <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 p-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={sendToKitchen}
              disabled={!selectedOrder && !context}
            >
              <Send />
              {selectedOrder ? "Invia aggiunte" : "Invia comanda"}
            </Button>
            <Button
              className="w-full"
              disabled={!canPay}
              onClick={() => {
                setDiscount(selectedOrder?.discountPct ?? 0);
                setPayOpen(true);
              }}
            >
              <CreditCard />
              Incassa ora
            </Button>
            {selectedOrder && draft.length > 0 ? (
              <p className="text-center text-[10px] text-amber-600 dark:text-amber-400">
                Invia prima le nuove righe, poi incassa il conto.
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo conto</DialogTitle>
            <DialogDescription>
              Scegli tipo di servizio e tavolo. Se il tavolo ha già una
              comanda aperta, il conto esistente verrà ripreso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Tipo di servizio" htmlFor="pos-type">
              <Select
                id="pos-type"
                value={newForm.type}
                onChange={(event) =>
                  setNewForm((current) => ({
                    ...current,
                    type: event.target.value as PosContext["type"],
                  }))
                }
              >
                <option value="tavolo">Al tavolo</option>
                <option value="asporto">Asporto</option>
                <option value="delivery">Delivery</option>
              </Select>
            </Field>
            {newForm.type === "tavolo" ? (
              <Field label="Tavolo" htmlFor="pos-table">
                <Select
                  id="pos-table"
                  value={newForm.tableId}
                  onChange={(event) =>
                    setNewForm((current) => ({
                      ...current,
                      tableId: event.target.value,
                    }))
                  }
                >
                  <option value="">Seleziona un tavolo…</option>
                  {restaurantTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name} · {table.room} · {table.seats} posti (
                      {table.status === "free"
                        ? "libero"
                        : table.status === "occupied"
                          ? "occupato"
                          : table.status === "reserved"
                            ? "prenotato"
                            : "da riordinare"}
                      )
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Coperti" htmlFor="pos-covers">
                <Input
                  id="pos-covers"
                  type="number"
                  min={1}
                  max={40}
                  value={newForm.covers}
                  onChange={(event) =>
                    setNewForm((current) => ({
                      ...current,
                      covers: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Cameriere" htmlFor="pos-waiter">
                <Select
                  id="pos-waiter"
                  value={newForm.waiter || defaultWaiter}
                  onChange={(event) =>
                    setNewForm((current) => ({
                      ...current,
                      waiter: event.target.value,
                    }))
                  }
                >
                  {waiters.map((waiter) => (
                    <option key={waiter} value={waiter}>
                      {waiter}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Annulla
            </Button>
            <Button onClick={startNewAccount}>Apri conto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Incassa conto</DialogTitle>
            <DialogDescription>
              Importo calcolato sulle righe attuali. Il pagamento è simulato:
              nessun addebito reale.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Sconto" htmlFor="pos-discount">
              <Select
                id="pos-discount"
                value={String(discount)}
                onChange={(event) => setDiscount(Number(event.target.value))}
              >
                <option value="0">Nessuno sconto</option>
                <option value="5">5%</option>
                <option value="10">10%</option>
                <option value="20">20%</option>
              </Select>
            </Field>
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Subtotale</span>
                <span className="tabular-nums">{formatCents(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="mt-1 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Sconto {discount}%</span>
                  <span className="tabular-nums">
                    −{formatCents(subtotal - payableTotal)}
                  </span>
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <span>Totale da incassare</span>
                <span className="tabular-nums">
                  {formatCents(payableTotal)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PAY_OPTIONS.map((option) => (
                <button
                  key={option.method}
                  type="button"
                  onClick={() => confirmPayment(option.method)}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-left transition-colors hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-950/50"
                >
                  <option.icon className="size-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-100">
                    {PAYMENT_METHOD_LABELS[option.method]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={variantProduct !== null}
        onOpenChange={(open) => {
          if (!open) setVariantProduct(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{variantProduct?.name}</DialogTitle>
            <DialogDescription>
              Scegli la variante da aggiungere al conto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {variantProduct ? (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    addLine(variantProduct);
                    setVariantProduct(null);
                  }}
                >
                  <span>Base</span>
                  <span className="tabular-nums">
                    {formatCents(variantProduct.priceCents)}
                  </span>
                </Button>
                {variantProduct.variants?.map((variant) => (
                  <Button
                    key={variant.name}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      addLine(variantProduct, variant);
                      setVariantProduct(null);
                    }}
                  >
                    <span>{variant.name}</span>
                    <span className="tabular-nums">
                      {formatCents(
                        variantProduct.priceCents + variant.priceDeltaCents,
                      )}
                    </span>
                  </Button>
                ))}
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

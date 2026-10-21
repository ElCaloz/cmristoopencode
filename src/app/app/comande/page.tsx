"use client";

import {
  CheckCheck,
  ChefHat,
  Clock,
  CreditCard,
  ReceiptText,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  OrderStatusBadge,
  PaymentMethodBadge,
} from "@/components/ui/status-badge";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import {
  isOrderActive,
  nextItemStatus,
  orderTotalCents,
  ORDER_ITEM_STATUS_LABELS,
} from "@/lib/demo/calc";
import type { Order, OrderItem } from "@/lib/demo/types";
import { canAccess } from "@/lib/roles";
import { cn, formatCents, relativeTime, todayISODate } from "@/lib/utils";

type Filter = "active" | "ready" | "paid" | "all";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "active", label: "Attive" },
  { id: "ready", label: "Pronte" },
  { id: "paid", label: "Pagate oggi" },
  { id: "all", label: "Tutte" },
];

const ITEM_DOT: Record<string, string> = {
  pending: "bg-zinc-300",
  preparing: "bg-amber-500",
  ready: "bg-emerald-500",
  served: "bg-zinc-400",
};

export default function ComandePage() {
  const restaurant = useActiveRestaurant();
  const role = useDemoStore((state) => state.activeRole);
  const orders = useDemoStore((state) => state.orders);
  const updateOrderStatus = useDemoStore((state) => state.updateOrderStatus);
  const updateOrderItemStatus = useDemoStore(
    (state) => state.updateOrderItemStatus,
  );
  const cancelOrder = useDemoStore((state) => state.cancelOrder);

  const [filter, setFilter] = useState<Filter>("active");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  if (!restaurant) return null;

  const today = todayISODate();
  const restaurantOrders = orders
    .filter((order) => order.restaurantId === restaurant.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const activeOrders = restaurantOrders.filter((order) => isOrderActive(order));
  const readyOrders = activeOrders.filter((order) => order.status === "ready");
  const paidToday = restaurantOrders.filter(
    (order) =>
      order.status === "paid" && order.createdAt.slice(0, 10) === today,
  );

  const counts: Record<Filter, number> = {
    active: activeOrders.length,
    ready: readyOrders.length,
    paid: paidToday.length,
    all: restaurantOrders.length,
  };

  const visible = (
    filter === "active"
      ? activeOrders
      : filter === "ready"
        ? readyOrders
        : filter === "paid"
          ? paidToday
          : restaurantOrders
  ).slice(0, 40);

  const selectedOrder = selectedOrderId
    ? orders.find((order) => order.id === selectedOrderId)
    : undefined;
  const cancelTarget = cancelOrderId
    ? orders.find((order) => order.id === cancelOrderId)
    : undefined;

  const markAllReady = (order: Order) => {
    for (const item of order.items) {
      if (item.status !== "served") {
        updateOrderItemStatus(order.id, item.id, "ready");
      }
    }
    updateOrderStatus(order.id, "ready");
    toast.success(`Comanda #${order.number} pronta`, {
      description: "Tutte le righe sono state segnate come pronte.",
    });
  };

  const markServed = (order: Order) => {
    updateOrderStatus(order.id, "served");
    toast.success(`Comanda #${order.number} servita`, {
      description: "Le righe sono state segnate come servite.",
    });
  };

  const advanceItem = (order: Order, item: OrderItem) => {
    const next = nextItemStatus(item.status);
    updateOrderItemStatus(order.id, item.id, next);
    const nextItems = order.items.map((entry) =>
      entry.id === item.id ? { ...entry, status: next } : entry,
    );
    if (
      next === "ready" &&
      nextItems.every(
        (entry) => entry.status === "ready" || entry.status === "served",
      )
    ) {
      updateOrderStatus(order.id, "ready");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Servizio e cucina"
        title="Comande"
        description="Avanzamento degli ordini dalla cucina al tavolo. Ogni azione aggiorna la demo condivisa con POS e KDS."
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button variant="outline" asChild>
            <Link href="/app/cucina">
              <ChefHat />
              Kitchen Display
            </Link>
          </Button>
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilter(entry.id)}
            aria-pressed={filter === entry.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === entry.id
                ? "border-brand-700 bg-brand-700 text-white shadow-sm"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-brand-200 hover:bg-brand-50/60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-brand-900 dark:hover:bg-brand-950/40",
            )}
          >
            {entry.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] tabular-nums",
                filter === entry.id
                  ? "bg-white/15 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
              )}
            >
              {counts[entry.id]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 rounded-card border border-zinc-200 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState
            icon={ReceiptText}
            title="Nessuna comanda in questa vista"
            description="Quando arrivano ordini dal POS o dai palmari, li trovi qui con lo stato di avanzamento."
            action={
              canAccess(role, "pos") ? (
                <Button asChild>
                  <Link href="/app/pos">Apri la cassa</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {visible.map((order) => {
            const total = orderTotalCents(order);
            const pending = order.items.filter(
              (item) => item.status !== "served",
            ).length;
            return (
              <div
                key={order.id}
                className={cn(
                  "rounded-card border bg-white shadow-card transition-[border-color,box-shadow] duration-200 ease-smooth hover:shadow-lift dark:bg-zinc-900",
                  order.status === "ready"
                    ? "border-emerald-200 dark:border-emerald-800/50"
                    : "border-zinc-200 dark:border-zinc-800",
                )}
              >
                <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        #{order.number} · {order.tableName ?? "Asporto"}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {order.waiter} · {order.covers} coperti ·{" "}
                      {order.items.length} righe
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatCents(total)}
                    </p>
                    <p className="inline-flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                      <Clock className="size-3" />
                      {relativeTime(order.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 px-4 py-2.5">
                  {order.items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          ITEM_DOT[item.status],
                        )}
                      />
                      <span className="w-6 shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                        {item.qty}×
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {item.name}
                        {item.variant ? ` · ${item.variant}` : ""}
                      </span>
                      <span className="shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400">
                        {ORDER_ITEM_STATUS_LABELS[item.status]}
                      </span>
                    </div>
                  ))}
                  {order.items.length > 3 ? (
                    <p className="pl-3.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                      +{order.items.length - 3} altre righe
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 dark:border-zinc-800 px-3 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    Dettaglio
                  </Button>
                  {isOrderActive(order) ? (
                    <>
                      {order.status !== "ready" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAllReady(order)}
                        >
                          <CheckCheck />
                          Tutto pronto
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markServed(order)}
                        >
                          <Utensils />
                          Segna servito
                        </Button>
                      )}
                      {pending > 0 && canAccess(role, "pos") ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/app/pos">
                            <CreditCard />
                            Incassa
                          </Link>
                        </Button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setCancelOrderId(order.id)}
                        className="ml-auto text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        Annulla
                      </button>
                    </>
                  ) : order.status === "paid" ? (
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      {order.paymentMethod ? (
                        <PaymentMethodBadge method={order.paymentMethod} />
                      ) : null}
                      <span className="text-[11px] font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
                        {formatCents(
                          order.totalPaidCents ?? orderTotalCents(order),
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className="ml-auto text-[11px] text-zinc-500 dark:text-zinc-400">
                      Comanda annullata
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet
        open={selectedOrderId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
      >
        <SheetContent side="right" aria-describedby={undefined}>
          {selectedOrder ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  Comanda #{selectedOrder.number} ·{" "}
                  {selectedOrder.tableName ?? "Asporto"}
                </SheetTitle>
                <SheetDescription>
                  {selectedOrder.waiter} · {selectedOrder.covers} coperti ·{" "}
                  {relativeTime(selectedOrder.createdAt)}
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Stato comanda
                  </span>
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
                <div className="space-y-1.5">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-zinc-100 dark:border-zinc-800 px-3 py-2"
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          ITEM_DOT[item.status],
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                          {item.qty}× {item.name}
                          {item.variant ? ` · ${item.variant}` : ""}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {ORDER_ITEM_STATUS_LABELS[item.status]}
                          {item.notes ? ` · ${item.notes}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                        {formatCents(item.unitPriceCents * item.qty)}
                      </span>
                      {isOrderActive(selectedOrder) &&
                      item.status !== "served" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => advanceItem(selectedOrder, item)}
                        >
                          Avanza
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Totale comanda</span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatCents(orderTotalCents(selectedOrder))}
                    </span>
                  </div>
                  {selectedOrder.paymentMethod ? (
                    <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>Metodo di pagamento</span>
                      <PaymentMethodBadge
                        method={selectedOrder.paymentMethod}
                      />
                    </div>
                  ) : null}
                </div>
              </SheetBody>
              <SheetFooter className="flex flex-col gap-2 sm:flex-row">
                {isOrderActive(selectedOrder) ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        markAllReady(selectedOrder);
                        setSelectedOrderId(null);
                      }}
                    >
                      <CheckCheck />
                      Tutto pronto
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        markServed(selectedOrder);
                        setSelectedOrderId(null);
                      }}
                    >
                      <Utensils />
                      Segna servito
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrderId(null)}
                  >
                    Chiudi
                  </Button>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={cancelOrderId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelOrderId(null);
        }}
        title="Annullare la comanda?"
        description={
          cancelTarget
            ? `La comanda #${cancelTarget.number} verrà annullata e il tavolo liberato. L'operazione è dimostrativa e può essere ripristinata con «Ripristina dati demo».`
            : ""
        }
        confirmLabel="Annulla comanda"
        cancelLabel="Torna indietro"
        onConfirm={() => {
          if (cancelTarget) {
            cancelOrder(cancelTarget.id);
            toast.success(`Comanda #${cancelTarget.number} annullata`);
          }
        }}
      />
    </div>
  );
}

"use client";

import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DemoFloorPlan } from "@/components/app/demo-floor-plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ReservationStatusBadge,
  TableStatusBadge,
} from "@/components/ui/status-badge";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import {
  activeOrdersForTable,
  isOrderActive,
  orderTotalCents,
  TABLE_STATUS_LABELS,
} from "@/lib/demo/calc";
import type { RestaurantTable, TableStatus } from "@/lib/demo/types";
import { canAccess } from "@/lib/roles";
import {
  cn,
  formatCents,
  formatLongDate,
  todayISODate,
} from "@/lib/utils";

const STATUS_DOT: Record<TableStatus, string> = {
  free: "bg-emerald-500",
  occupied: "bg-amber-500",
  reserved: "bg-sky-500",
  to_clean: "bg-red-500",
};

export default function SalaPage() {
  const restaurant = useActiveRestaurant();
  const role = useDemoStore((state) => state.activeRole);
  const orders = useDemoStore((state) => state.orders);
  const tables = useDemoStore((state) => state.tables);
  const floorObjects = useDemoStore((state) => state.floorObjects ?? []);
  const reservations = useDemoStore((state) => state.reservations);
  const setTableStatus = useDemoStore((state) => state.setTableStatus);

  const [statusFilter, setStatusFilter] = useState<TableStatus | "all">("all");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  if (!restaurant) return null;

  const today = todayISODate();
  const restaurantTables = tables.filter(
    (table) => table.restaurantId === restaurant.id,
  );
  const restaurantObjects = floorObjects.filter(
    (object) => object.restaurantId === restaurant.id,
  );
  const canManage = role === "admin" || role === "super_admin";
  const activeOrders = orders
    .filter(
      (order) =>
        order.restaurantId === restaurant.id && isOrderActive(order),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const todayReservations = reservations
    .filter(
      (entry) => entry.restaurantId === restaurant.id && entry.date === today,
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  const selectedTable = selectedTableId
    ? restaurantTables.find((table) => table.id === selectedTableId)
    : undefined;
  const selectedOrder = selectedTable
    ? activeOrdersForTable(orders, selectedTable.id)
    : undefined;

  const counts: Record<TableStatus, number> = {
    free: restaurantTables.filter((table) => table.status === "free").length,
    occupied: restaurantTables.filter((table) => table.status === "occupied")
      .length,
    reserved: restaurantTables.filter((table) => table.status === "reserved")
      .length,
    to_clean: restaurantTables.filter((table) => table.status === "to_clean")
      .length,
  };

  const changeStatus = (table: RestaurantTable, status: TableStatus) => {
    if (table.status === "occupied" && status === "free") {
      const order = activeOrdersForTable(orders, table.id);
      if (order) {
        toast.error("Il tavolo ha un conto aperto", {
          description: `Incassa il conto #${order.number} prima di liberare il tavolo.`,
        });
        return;
      }
    }
    setTableStatus(table.id, status);
    toast.success(`${table.name}: ${TABLE_STATUS_LABELS[status].toLowerCase()}`, {
      description: "Stato tavolo aggiornato nella demo.",
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Servizio in sala"
        title="Sala e tavoli"
        description={`${restaurant.name} · ${formatLongDate(today)} — mappa tavoli, comande e servizio in corso.`}
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button variant="outline" asChild>
            <Link href="/app/prenotazioni">
              <CalendarCheck />
              Prenotazioni
            </Link>
          </Button>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          ["free", "occupied", "reserved", "to_clean"] as TableStatus[]
        ).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() =>
              setStatusFilter((current) =>
                current === status ? "all" : status,
              )
            }
            aria-pressed={statusFilter === status}
            className={cn(
              "flex items-center justify-between rounded-card border bg-white px-3 py-2.5 text-left shadow-card transition-colors dark:bg-zinc-900",
              statusFilter === status
                ? "border-brand-400 ring-1 ring-brand-400/20"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn("size-2 rounded-full", STATUS_DOT[status])}
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {TABLE_STATUS_LABELS[status]}
              </span>
            </span>
            <span className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
              {counts[status]}
            </span>
          </button>
        ))}
      </div>

      <DemoFloorPlan
        restaurantId={restaurant.id}
        tables={restaurantTables}
        objects={restaurantObjects}
        statusFilter={statusFilter}
        canManage={canManage}
        onOpenTable={(table) => setSelectedTableId(table.id)}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-zinc-200 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Comande attive
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {activeOrders.length} in sala
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/comande">
                Apri elenco <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {activeOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                  {order.number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                    {order.tableName ?? "Asporto"}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {order.waiter} · {order.items.length} righe
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
            ))}
            {activeOrders.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Nessuna comanda attiva.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-card border border-zinc-200 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Prenotazioni di oggi
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {todayReservations.length} in agenda
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/prenotazioni">
                Agenda <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {todayReservations.slice(0, 5).map((reservation) => (
              <div
                key={reservation.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="w-10 text-xs font-semibold tabular-nums text-brand-700 dark:text-brand-400">
                  {reservation.time}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                    {reservation.customerName}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {reservation.covers} coperti
                    {reservation.tableName
                      ? ` · ${reservation.tableName}`
                      : ""}
                  </p>
                </div>
                <ReservationStatusBadge status={reservation.status} />
              </div>
            ))}
            {todayReservations.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Nessuna prenotazione per oggi.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <Sheet
        open={selectedTableId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTableId(null);
        }}
      >
        <SheetContent side="right" aria-describedby={undefined}>
          {selectedTable ? (
            <>
              <SheetHeader>
                <SheetTitle>Tavolo {selectedTable.name}</SheetTitle>
                <SheetDescription>
                  {selectedTable.room} · {selectedTable.seats} posti ·{" "}
                  {TABLE_STATUS_LABELS[selectedTable.status]}
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Stato attuale
                  </span>
                  <TableStatusBadge status={selectedTable.status} />
                </div>

                {selectedOrder ? (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-3 py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                          Conto #{selectedOrder.number}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {selectedOrder.waiter} · {selectedOrder.covers} coperti
                        </p>
                      </div>
                      <OrderStatusBadge status={selectedOrder.status} />
                    </div>
                    <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                      {selectedOrder.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-3 py-2 text-xs"
                        >
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {item.qty}× {item.name}
                          </span>
                          <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                            {formatCents(item.unitPriceCents * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 px-3 py-2.5">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Totale
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatCents(orderTotalCents(selectedOrder))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-center">
                    <ReceiptText className="mx-auto size-5 text-zinc-300 dark:text-zinc-600" />
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Nessuna comanda collegata a questo tavolo.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Aggiorna stato
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeStatus(selectedTable, "free")}
                      disabled={selectedTable.status === "free"}
                    >
                      Libero
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeStatus(selectedTable, "occupied")}
                      disabled={selectedTable.status === "occupied"}
                    >
                      Occupato
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeStatus(selectedTable, "reserved")}
                      disabled={selectedTable.status === "reserved"}
                    >
                      Prenotato
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeStatus(selectedTable, "to_clean")}
                      disabled={selectedTable.status === "to_clean"}
                    >
                      Da riordinare
                    </Button>
                  </div>
                </div>
              </SheetBody>
              <SheetFooter className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href="/app/comande"
                    onClick={() => setSelectedTableId(null)}
                  >
                    <ReceiptText />
                    Comande
                  </Link>
                </Button>
                {canAccess(role, "pos") ? (
                  <Button size="sm" asChild>
                    <Link href="/app/pos" onClick={() => setSelectedTableId(null)}>
                      <CreditCard />
                      Vai alla cassa
                    </Link>
                  </Button>
                ) : null}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

"use client";

import {
  Download,
  Eye,
  ReceiptText,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { RowMenu } from "@/components/ui/row-menu";
import { StatCard } from "@/components/ui/stat-card";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PaymentMethodBadge,
} from "@/components/ui/status-badge";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import {
  averageTicketCents,
  orderSubtotalCents,
  orderTotalCents,
  PAYMENT_METHOD_LABELS,
  sumRevenueCents,
} from "@/lib/demo/calc";
import type { Order, PaymentMethod } from "@/lib/demo/types";
import {
  downloadCsv,
  formatCents,
  formatDate,
  formatTime,
} from "@/lib/utils";

export default function VenditePage() {
  const restaurant = useActiveRestaurant();
  const orders = useDemoStore((state) => state.orders);
  const [methodFilter, setMethodFilter] = useState<"all" | PaymentMethod>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  if (!restaurant) return null;

  const paidOrders = orders
    .filter(
      (order) =>
        order.restaurantId === restaurant.id &&
        order.status === "paid" &&
        (methodFilter === "all" || order.paymentMethod === methodFilter),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const allPaid = orders.filter(
    (order) =>
      order.restaurantId === restaurant.id && order.status === "paid",
  );
  const selectedOrder = selectedOrderId
    ? orders.find((order) => order.id === selectedOrderId)
    : undefined;

  const revenue = sumRevenueCents(paidOrders);
  const covers = paidOrders.reduce((sum, order) => sum + order.covers, 0);
  const averageTicket = averageTicketCents(paidOrders);

  const exportCsv = () => {
    downloadCsv(
      `vendite-${restaurant.id}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Scontrino",
        "Data",
        "Ora",
        "Tipo",
        "Tavolo",
        "Cameriere",
        "Coperti",
        "Metodo",
        "Totale (EUR)",
      ],
      paidOrders.map((order) => [
        order.number,
        formatDate(order.createdAt),
        formatTime(order.createdAt),
        order.type,
        order.tableName ?? "",
        order.waiter,
        order.covers,
        order.paymentMethod
          ? PAYMENT_METHOD_LABELS[order.paymentMethod]
          : "",
        ((order.totalPaidCents ?? orderTotalCents(order)) / 100)
          .toFixed(2)
          .replace(".", ","),
      ]),
    );
  };

  const columns: DataTableColumn<Order>[] = [
    {
      id: "number",
      header: "Scontrino",
      sortValue: (order) => order.number,
      cell: (order) => (
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">#{order.number}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
          </p>
        </div>
      ),
    },
    {
      id: "table",
      header: "Servizio",
      sortValue: (order) => order.tableName ?? order.type,
      cell: (order) => (
        <div>
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {order.tableName ?? "Banco"}
          </p>
          <p className="text-[10px] capitalize text-zinc-500 dark:text-zinc-400">{order.type}</p>
        </div>
      ),
    },
    {
      id: "waiter",
      header: "Cameriere",
      sortValue: (order) => order.waiter,
      cell: (order) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{order.waiter}</span>
      ),
    },
    {
      id: "covers",
      header: "Coperti",
      sortValue: (order) => order.covers,
      cell: (order) => (
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {order.covers}
        </span>
      ),
    },
    {
      id: "method",
      header: "Pagamento",
      sortValue: (order) => order.paymentMethod ?? "",
      cell: (order) =>
        order.paymentMethod ? (
          <PaymentMethodBadge method={order.paymentMethod} />
        ) : (
          <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
        ),
    },
    {
      id: "total",
      header: "Totale",
      sortValue: (order) =>
        order.totalPaidCents ?? orderTotalCents(order),
      cell: (order) => (
        <span className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
          {formatCents(order.totalPaidCents ?? orderTotalCents(order))}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Incassi e corrispettivi"
        title="Vendite"
        description="Scontrini e incassi registrati nella demo. Nessun collegamento a registratori di cassa o trasmissione fiscale reale."
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download />
            Esporta CSV
          </Button>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Incasso registrato"
          value={formatCents(revenue)}
          icon={Wallet}
          hint={`${paidOrders.length} scontrini`}
        />
        <StatCard
          label="Scontrini"
          value={String(paidOrders.length)}
          icon={ReceiptText}
          hint="ordini pagati nella demo"
        />
        <StatCard
          label="Coperti"
          value={String(covers)}
          icon={Users}
          hint="serviti sugli ordini pagati"
        />
        <StatCard
          label="Ticket medio"
          value={formatCents(averageTicket)}
          icon={ReceiptText}
          hint={
            allPaid.length > 0
              ? `storico demo: ${formatCents(sumRevenueCents(allPaid))}`
              : "nessun incasso"
          }
        />
      </div>

      <div className="mt-4">
        <DataTable
          data={paidOrders}
          columns={columns}
          getRowId={(order) => order.id}
          searchText={(order) =>
            `${order.number} ${order.tableName ?? ""} ${order.waiter} ${order.paymentMethod ?? ""}`
          }
          searchPlaceholder="Cerca scontrino, tavolo o cameriere…"
          pageSize={12}
          onRowClick={(order) => setSelectedOrderId(order.id)}
          toolbar={
            <select
              value={methodFilter}
              onChange={(event) =>
                setMethodFilter(event.target.value as "all" | PaymentMethod)
              }
              className="h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs text-zinc-700 dark:text-zinc-100"
              aria-label="Filtra metodo di pagamento"
            >
              <option value="all">Tutti i metodi</option>
              <option value="carta">Carta</option>
              <option value="contanti">Contanti</option>
              <option value="satispay">Satispay</option>
              <option value="buoni">Buoni pasto</option>
            </select>
          }
          rowActions={(order) => (
            <RowMenu
              items={[
                {
                  label: "Dettaglio scontrino",
                  icon: Eye,
                  onSelect: () => setSelectedOrderId(order.id),
                },
              ]}
            />
          )}
          emptyTitle="Nessuno scontrino"
          emptyDescription="Gli ordini incassati dal POS compariranno qui."
          footer={
            <p className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-2 text-[10px] text-zinc-500 dark:text-zinc-400">
              Lo storico aggregato per giorno è disponibile nella pagina
              Report. In produzione gli scontrini saranno soggetti a conservazione
              fiscale tramite adapter dedicato (non incluso in questa demo).
            </p>
          }
        />
      </div>

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
                <SheetTitle>Scontrino #{selectedOrder.number}</SheetTitle>
                <SheetDescription>
                  {formatDate(selectedOrder.createdAt)} ·{" "}
                  {formatTime(selectedOrder.createdAt)} ·{" "}
                  {selectedOrder.tableName ?? "Banco"}
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedOrder.waiter} · {selectedOrder.covers} coperti
                  </span>
                  {selectedOrder.paymentMethod ? (
                    <PaymentMethodBadge method={selectedOrder.paymentMethod} />
                  ) : null}
                </div>
                <div className="divide-y divide-zinc-50 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="text-zinc-700 dark:text-zinc-300">
                          {item.qty}× {item.name}
                          {item.variant ? (
                            <span className="text-zinc-500 dark:text-zinc-400">
                              {" "}
                              · {item.variant}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
                          {formatCents(item.unitPriceCents)} cad.
                        </p>
                      </div>
                      <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                        {formatCents(item.unitPriceCents * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5 text-xs">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Subtotale</span>
                    <span className="tabular-nums">
                      {formatCents(orderSubtotalCents(selectedOrder))}
                    </span>
                  </div>
                  {selectedOrder.discountPct ? (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Sconto {selectedOrder.discountPct}%</span>
                      <span className="tabular-nums">
                        −
                        {formatCents(
                          orderSubtotalCents(selectedOrder) -
                            orderTotalCents(selectedOrder),
                        )}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    <span>Totale</span>
                    <span className="tabular-nums">
                      {formatCents(
                        selectedOrder.totalPaidCents ??
                          orderTotalCents(selectedOrder),
                      )}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Documento dimostrativo privo di validità fiscale. In
                  produzione verranno gestiti numerazione, resi e
                  conservazione a norma tramite integrazione dedicata.
                </p>
              </SheetBody>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

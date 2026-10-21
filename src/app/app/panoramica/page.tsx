"use client";

import {
  ArrowRight,
  CalendarCheck,
  ChefHat,
  Package,
  ReceiptText,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame } from "@/components/ui/chart";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  OrderStatusBadge,
  RestaurantStatusBadge,
} from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  useActiveRestaurant,
  useDemoStore,
} from "@/lib/demo/store";
import {
  isOrderActive,
  orderTotalCents,
  salesForRange,
  topProducts,
} from "@/lib/demo/calc";
import {
  formatCents,
  formatLongDate,
  percentChange,
  relativeTime,
  todayISODate,
} from "@/lib/utils";

export default function PanoramicaPage() {
  const restaurant = useActiveRestaurant();
  const orders = useDemoStore((state) => state.orders);
  const tables = useDemoStore((state) => state.tables);
  const inventory = useDemoStore((state) => state.inventory);
  const reservations = useDemoStore((state) => state.reservations);
  const activity = useDemoStore((state) => state.activity);
  const sales = useDemoStore((state) => state.sales);
  const staff = useDemoStore((state) => state.staff);

  if (!restaurant) return null;

  const today = todayISODate();
  const series = sales[restaurant.id] ?? [];
  const todaySales = series[series.length - 1];
  const yesterdaySales = series[series.length - 2];
  const restaurantOrders = orders.filter(
    (order) => order.restaurantId === restaurant.id,
  );
  const paidOrders = restaurantOrders.filter((order) => order.status === "paid");
  const activeOrders = restaurantOrders
    .filter((order) => isOrderActive(order))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const restaurantTables = tables.filter(
    (table) => table.restaurantId === restaurant.id,
  );
  const occupiedTables = restaurantTables.filter(
    (table) => table.status === "occupied",
  );
  const lowStock = inventory.filter(
    (item) => item.restaurantId === restaurant.id && item.qty <= item.minQty,
  );
  const todayReservations = reservations
    .filter(
      (entry) => entry.restaurantId === restaurant.id && entry.date === today,
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const top = topProducts(paidOrders, 5);
  const monthRevenue = series
    .slice(-30)
    .reduce((sum, day) => sum + day.revenueCents, 0);
  const monthOrders = series
    .slice(-30)
    .reduce((sum, day) => sum + day.orders, 0);
  const monthTicket = monthOrders > 0 ? Math.round(monthRevenue / monthOrders) : 0;
  const admin = staff.find(
    (member) =>
      member.restaurantId === restaurant.id && member.role === "admin",
  );
  const firstName = admin?.name.split(" ")[0] ?? "buongiorno";
  const recentActivity = activity
    .filter(
      (entry) =>
        entry.restaurantId === null || entry.restaurantId === restaurant.id,
    )
    .slice(0, 6);

  const chartData = salesForRange(series, 14).map((day) => ({
    label: new Date(`${day.date}T12:00:00`).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
    }),
    incasso: Math.round(day.revenueCents / 100),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Panoramica operativa"
        title={`Buongiorno, ${firstName}`}
        description={`${restaurant.name} · ${formatLongDate(today)}`}
        badge={<RestaurantStatusBadge status={restaurant.status} />}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/app/sala">
                <UtensilsCrossed />
                Sala
              </Link>
            </Button>
            <Button asChild>
              <Link href="/app/pos">
                <Wallet />
                Apri cassa
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Incasso di oggi"
          value={formatCents(todaySales?.revenueCents ?? 0)}
          icon={Wallet}
          delta={percentChange(
            todaySales?.revenueCents ?? 0,
            yesterdaySales?.revenueCents ?? 0,
          )}
          deltaLabel="rispetto a ieri"
        />
        <StatCard
          label="Ordini chiusi oggi"
          value={String(todaySales?.orders ?? 0)}
          icon={ReceiptText}
          delta={percentChange(
            todaySales?.orders ?? 0,
            yesterdaySales?.orders ?? 0,
          )}
          deltaLabel="rispetto a ieri"
        />
        <StatCard
          label="Coperti serviti oggi"
          value={String(todaySales?.covers ?? 0)}
          icon={Users}
          hint={`Ticket medio ${formatCents(monthTicket)} · 30 gg`}
        />
        <StatCard
          label="Tavoli occupati"
          value={`${occupiedTables.length}/${restaurantTables.length}`}
          icon={UtensilsCrossed}
          hint={`${activeOrders.length} comande attive`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-card border border-zinc-200/90 bg-white p-4 shadow-card sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Andamento incassi
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Ultimi 14 giorni · dati dimostrativi
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3.5" />
              {formatCents(monthRevenue)} in 30 giorni
            </span>
          </div>
          <ChartFrame height={250} className="mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
              >
                <defs>
                  <linearGradient id="panoramica-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--chart-line)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  tickFormatter={(value: number) => `€${value}`}
                />
                <Tooltip
                  formatter={(value) => [
                    `€ ${Number(value).toLocaleString("it-IT")}`,
                    "Incasso",
                  ]}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--chart-tooltip-border)",
                    background: "var(--chart-tooltip-bg)",
                    color: "var(--chart-tooltip-text)",
                    fontSize: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="incasso"
                  stroke="var(--chart-line)"
                  strokeWidth={2}
                  fill="url(#panoramica-revenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>

        <div className="flex flex-col rounded-card border border-zinc-200/90 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Servizio in corso
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {activeOrders.length} comande aperte
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/comande">
                Vedi tutte <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="flex-1 divide-y divide-zinc-50 dark:divide-zinc-800">
            {activeOrders.slice(0, 4).map((order) => (
              <Link
                key={order.id}
                href="/app/comande"
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold leading-none text-zinc-600 dark:text-zinc-400">
                  <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">#</span>
                  {order.number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                    {order.tableName ?? "Asporto"} · {order.items.length} righe
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {order.waiter} · {relativeTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                    {formatCents(orderTotalCents(order))}
                  </p>
                  <div className="mt-0.5 flex justify-end">
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              </Link>
            ))}
            {activeOrders.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Nessuna comanda attiva: la sala è in pausa.
              </p>
            ) : null}
          </div>
          <div className="border-t border-zinc-100 dark:border-zinc-800 p-3">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/app/cucina">
                <ChefHat />
                Apri Kitchen Display
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-card border border-zinc-200/90 bg-white p-4 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Prodotti più venduti
            </p>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              30 giorni
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            {top.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                    {product.name}
                  </p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{
                        width: `${Math.round(
                          (product.revenueCents /
                            (top[0]?.revenueCents || 1)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                    {formatCents(product.revenueCents)}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{product.qty} pz</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-zinc-200/90 bg-white p-4 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Scorte sotto soglia
            </p>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/magazzino">
                Magazzino <ArrowRight />
              </Link>
            </Button>
          </div>
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Package className="size-6 text-emerald-500" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tutte le scorte sono sopra la soglia minima.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {lowStock.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-red-50/60 dark:bg-red-950/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      minima {item.minQty} {item.unit}
                    </p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-red-600 dark:text-red-400">
                    {item.qty} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-card border border-zinc-200/90 bg-white p-4 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Prenotazioni di oggi
            </p>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/prenotazioni">
                Agenda <ArrowRight />
              </Link>
            </Button>
          </div>
          {todayReservations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarCheck className="size-6 text-zinc-500 dark:text-zinc-400" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Nessuna prenotazione per oggi.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {todayReservations.slice(0, 4).map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 px-3 py-2"
                >
                  <span className="w-10 shrink-0 text-xs font-semibold tabular-nums text-brand-700 dark:text-brand-400">
                    {reservation.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                      {reservation.customerName}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {reservation.covers} coperti
                      {reservation.tableName
                        ? ` · tavolo ${reservation.tableName}`
                        : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-card border border-zinc-200/90 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Attività recente
          </p>
          <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Solo demo
          </span>
        </div>
        <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
          {recentActivity.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-800 dark:text-zinc-100">{entry.actor}</span>{" "}
                · {entry.action}{" "}
                <span className="text-zinc-500 dark:text-zinc-400">{entry.detail}</span>
              </p>
              <span className="shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400">
                {relativeTime(entry.time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

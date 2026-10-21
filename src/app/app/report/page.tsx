"use client";

import {
  BarChart3,
  Download,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartFrame } from "@/components/ui/chart";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import {
  averageTicketCents,
  paymentMix,
  salesForRange,
  sumRevenueCents,
  topProducts,
} from "@/lib/demo/calc";
import {
  cn,
  downloadCsv,
  formatCents,
  formatPercent,
  percentChange,
} from "@/lib/utils";

const RANGES = [7, 14, 30] as const;
const PIE_COLORS = ["#248455", "#4aa574", "#86c5a2", "#c9e4d3"];

export default function ReportPage() {
  const restaurant = useActiveRestaurant();
  const sales = useDemoStore((state) => state.sales);
  const orders = useDemoStore((state) => state.orders);
  const products = useDemoStore((state) => state.products);
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);

  if (!restaurant) return null;

  const series = sales[restaurant.id] ?? [];
  const rangeData = salesForRange(series, range);
  const previousData = series.slice(-(range * 2), -range);
  const revenue = rangeData.reduce((sum, day) => sum + day.revenueCents, 0);
  const ordersCount = rangeData.reduce((sum, day) => sum + day.orders, 0);
  const covers = rangeData.reduce((sum, day) => sum + day.covers, 0);
  const averageTicket = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;
  const hasPrevious = previousData.length === range;
  const previousRevenue = previousData.reduce(
    (sum, day) => sum + day.revenueCents,
    0,
  );
  const previousOrders = previousData.reduce(
    (sum, day) => sum + day.orders,
    0,
  );
  const previousTicket =
    previousOrders > 0 ? Math.round(previousRevenue / previousOrders) : 0;

  const restaurantPaid = orders.filter(
    (order) =>
      order.restaurantId === restaurant.id && order.status === "paid",
  );
  const paidRevenue = sumRevenueCents(restaurantPaid);
  const productById = new Map(
    products
      .filter((product) => product.restaurantId === restaurant.id)
      .map((product) => [product.id, product]),
  );
  const foodCostCents = restaurantPaid.reduce(
    (sum, order) =>
      sum +
      order.items.reduce(
        (itemSum, item) =>
          itemSum +
          (productById.get(item.productId)?.foodCostCents ?? 0) * item.qty,
        0,
      ),
    0,
  );
  const foodCostPct =
    paidRevenue > 0 ? (foodCostCents / paidRevenue) * 100 : 0;
  const top = topProducts(restaurantPaid, 6);
  const mix = paymentMix(restaurantPaid);
  const mixTotal = mix.reduce((sum, entry) => sum + entry.revenueCents, 0);

  const chartData = rangeData.map((day) => ({
    label: new Date(`${day.date}T12:00:00`).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
    }),
    incasso: Math.round(day.revenueCents / 100),
  }));

  const pieData = mix.map((entry) => ({
    name:
      entry.method === "carta"
        ? "Carta"
        : entry.method === "contanti"
          ? "Contanti"
          : entry.method === "satispay"
            ? "Satispay"
            : "Buoni pasto",
    value: entry.revenueCents,
  }));

  const exportCsv = () => {
    downloadCsv(
      `report-${restaurant.id}-${range}gg.csv`,
      ["Data", "Incasso (EUR)", "Ordini", "Coperti", "Ticket medio (EUR)"],
      rangeData.map((day) => [
        day.date,
        (day.revenueCents / 100).toFixed(2).replace(".", ","),
        day.orders,
        day.covers,
        day.orders > 0
          ? (day.revenueCents / 100 / day.orders).toFixed(2).replace(".", ",")
          : "0,00",
      ]),
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Performance del locale"
        title="Report"
        description={`Analisi degli ultimi ${range} giorni per ${restaurant.name}. Dati dimostrativi generati per mostrare la reportistica.`}
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download />
            Esporta CSV
          </Button>
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {RANGES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRange(value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              range === value
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800",
            )}
          >
            {value} giorni
          </button>
        ))}
        <span className="ml-1 text-[10px] text-zinc-500 dark:text-zinc-400">
          Confronto con il periodo precedente quando disponibile.
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Incasso periodo"
          value={formatCents(revenue)}
          icon={Wallet}
          delta={hasPrevious ? percentChange(revenue, previousRevenue) : null}
          deltaLabel="vs periodo precedente"
        />
        <StatCard
          label="Ordini"
          value={String(ordersCount)}
          icon={ReceiptText}
          delta={hasPrevious ? percentChange(ordersCount, previousOrders) : null}
          deltaLabel="vs periodo precedente"
        />
        <StatCard
          label="Ticket medio"
          value={formatCents(averageTicket)}
          icon={TrendingUp}
          delta={
            hasPrevious
              ? percentChange(averageTicket, previousTicket)
              : null
          }
          deltaLabel="vs periodo precedente"
        />
        <StatCard
          label="Coperti"
          value={String(covers)}
          icon={Users}
          hint={`Food cost stimato ${formatPercent(foodCostPct)}`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Incassi giornalieri
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Ultimi {range} giorni · valori in euro
              </p>
            </div>
            <BarChart3 className="size-4 text-zinc-300 dark:text-zinc-600" />
          </div>
          <ChartFrame height={280} className="mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 8, bottom: 0, left: -10 }}
              >
                <defs>
                  <linearGradient id="report-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.3} />
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
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="incasso"
                  stroke="var(--chart-line)"
                  strokeWidth={2}
                  fill="url(#report-revenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>

        <div className="min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs sm:p-5">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Mix pagamenti
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Sugli scontrini demo registrati
          </p>
          {pieData.length === 0 ? (
            <p className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Nessun pagamento registrato.
            </p>
          ) : (
            <>
              <ChartFrame height={200} className="mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCents(Number(value))}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e4e7",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>
              <div className="space-y-1.5">
                {mix.map((entry, index) => (
                  <div
                    key={entry.method}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                      <span
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor:
                            PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                      {pieData[index]?.name ?? entry.method}
                    </span>
                    <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatCents(entry.revenueCents)}
                    </span>
                    <span className="w-10 text-right text-zinc-500 dark:text-zinc-400">
                      {mixTotal > 0
                        ? formatPercent(
                            (entry.revenueCents / mixTotal) * 100,
                          )
                        : "0%"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Prodotti più venduti
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Per ricavo sugli scontrini demo
          </p>
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
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {product.qty} pezzi
                  </p>
                </div>
              </div>
            ))}
            {top.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Nessun prodotto venduto nella demo.
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Dettaglio giornaliero
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Ultimi {Math.min(7, rangeData.length)} giorni
              </p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Incasso</TableHead>
                <TableHead>Ordini</TableHead>
                <TableHead>Coperti</TableHead>
                <TableHead>Ticket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...rangeData]
                .slice(-7)
                .reverse()
                .map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="text-xs">
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                        "it-IT",
                        { day: "2-digit", month: "short" },
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium tabular-nums">
                      {formatCents(day.revenueCents)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {day.orders}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {day.covers}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatCents(
                        day.orders > 0
                          ? Math.round(day.revenueCents / day.orders)
                          : 0,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <p className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Food cost stimato: {formatCents(foodCostCents)} su{" "}
            {formatCents(paidRevenue)} di scontrini demo (
            {formatPercent(foodCostPct)}). I dati storici aggregati sono
            generati deterministicamente per la demo.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
        <BarChart3 className="mt-0.5 size-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
        <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Report dimostrativo. In produzione incassi, margini e food cost
          saranno calcolati dai dati reali su server con permessi verificati e
          tracciabilità delle modifiche.{" "}
          {formatCents(averageTicketCents(restaurantPaid))} è il ticket medio
          calcolato sugli scontrini demo registrati.
        </p>
      </div>
    </div>
  );
}

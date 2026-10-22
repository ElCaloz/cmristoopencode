"use client";

import {
  ArrowLeft,
  CheckCheck,
  ChefHat,
  Clock,
  Flame,
  LayoutDashboard,
  LogOut,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import {
  nextItemStatus,
  ORDER_ITEM_STATUS_LABELS,
} from "@/lib/demo/calc";
import type { Order, OrderItem, Station } from "@/lib/demo/types";
import { cn, formatTime } from "@/lib/utils";

const STATION_FILTERS: Array<{ id: "all" | Station; label: string }> = [
  { id: "all", label: "Tutte" },
  { id: "cucina", label: "Cucina" },
  { id: "pizzeria", label: "Pizzeria" },
  { id: "bar", label: "Bar" },
  { id: "dolci", label: "Dolci" },
];

const ITEM_STATUS_STYLES: Record<string, string> = {
  pending: "bg-zinc-700/60 text-zinc-300",
  preparing: "bg-amber-500/15 text-amber-300",
  ready: "bg-emerald-500/15 text-emerald-300",
  served: "bg-zinc-800 text-zinc-400",
};

export default function CucinaPage() {
  const restaurant = useActiveRestaurant();
  const role = useDemoStore((state) => state.activeRole);
  const orders = useDemoStore((state) => state.orders);
  const updateOrderStatus = useDemoStore((state) => state.updateOrderStatus);
  const updateOrderItemStatus = useDemoStore(
    (state) => state.updateOrderItemStatus,
  );
  const [station, setStation] = useState<"all" | Station>("all");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  if (!restaurant) return null;

  const isKitchen = role === "cucina";
  const activeOrders = orders
    .filter(
      (order) =>
        order.restaurantId === restaurant.id &&
        ["open", "preparing", "ready"].includes(order.status),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const tickets = activeOrders
    .map((order) => ({
      order,
      items: order.items.filter(
        (item) =>
          item.status !== "served" &&
          (station === "all" || item.station === station),
      ),
    }))
    .filter((ticket) => ticket.items.length > 0);

  const pendingItems = tickets.reduce(
    (sum, ticket) =>
      sum + ticket.items.filter((item) => item.status === "pending").length,
    0,
  );
  const preparingItems = tickets.reduce(
    (sum, ticket) =>
      sum + ticket.items.filter((item) => item.status === "preparing").length,
    0,
  );
  const readyTickets = tickets.filter((ticket) =>
    ticket.items.every((item) => item.status === "ready"),
  ).length;

  const elapsedMinutes = (order: Order) =>
    Math.max(1, Math.round((now - new Date(order.createdAt).getTime()) / 60000));

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

  const markTicketReady = (order: Order) => {
    for (const item of order.items) {
      if (item.status !== "served") {
        updateOrderItemStatus(order.id, item.id, "ready");
      }
    }
    updateOrderStatus(order.id, "ready");
    toast.success(`Comanda #${order.number} pronta al pass`, {
      description: "Il personale di sala è stato avvisato nella demo.",
    });
  };

  const markServed = (order: Order) => {
    updateOrderStatus(order.id, "served");
    toast.success(`Comanda #${order.number} servita`);
  };

  return (
    <div className="min-h-screen bg-[#080b0a] px-3 py-4 text-zinc-100 sm:px-5">
      <h1 className="sr-only">Cucina demo</h1>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(53,162,106,0.09),transparent_42%)]" />
      <div className="relative mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-950/30">
            <ChefHat className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">
                {restaurant.name}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Cucina demo
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Kitchen Display System · {tickets.length} comande in coda
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-xl font-semibold leading-none tabular-nums text-white">
                {new Intl.DateTimeFormat("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(now))}
              </p>
              <p className="mt-1 text-[10px] text-zinc-400">
                {new Intl.DateTimeFormat("it-IT", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                }).format(new Date(now))}
              </p>
            </div>
            {isKitchen ? (
              <Link
                href="/app/panoramica"
                className="flex min-h-9 items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-500/15 px-3 py-2 text-[11px] font-semibold text-brand-200 transition-colors hover:bg-brand-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <LayoutDashboard className="size-3.5" />
                Panoramica demo
              </Link>
            ) : (
              <Link
                href="/app/panoramica"
                className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <ArrowLeft className="size-3.5" />
                Dashboard
              </Link>
            )}
            {isKitchen ? (
              <Link
                href="/"
                className="hidden min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:flex"
              >
                <LogOut className="size-3.5" />
                Sito
              </Link>
            ) : null}
          </div>
        </header>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-2">
          <span className="hidden px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 sm:inline">
            Postazione
          </span>
          {STATION_FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setStation(entry.id)}
              aria-pressed={station === entry.id}
              className={cn(
                "min-h-8 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:px-3",
                station === entry.id
                  ? "border-brand-500/60 bg-brand-500/15 text-brand-200"
                  : "border-white/10 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
              )}
            >
              {entry.label}
            </button>
          ))}
          <span className="ml-auto hidden items-center gap-1.5 px-1 text-[10px] text-zinc-400 sm:flex">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Dati demo locali
          </span>
        </div>

        <div
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
          aria-live="polite"
        >
          <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Comande
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-white">
              {tickets.length}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              In attesa
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-zinc-200">
              {pendingItems}
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-400/80">
              In preparazione
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-amber-300">
              {preparingItems}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-400/80">
              Pronte al pass
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-emerald-300">
              {readyTickets}
            </p>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <Flame className="size-8 text-zinc-700" />
            <p className="text-sm font-medium text-zinc-300">
              Nessuna comanda in coda
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-zinc-400">
              Le nuove comande inviate dalla cassa o dai palmari compaiono qui.
              In questa demo puoi crearne una dalla Cassa POS.
            </p>
            {!isKitchen ? (
              <Link
                href="/app/pos"
                className="mt-1 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500"
              >
                Apri la cassa
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 columns-1 gap-3 md:columns-2 xl:columns-3">
            {tickets.map(({ order, items }) => {
              const minutes = elapsedMinutes(order);
              const readyItems = items.filter(
                (item) => item.status === "ready",
              ).length;
              const allReady = readyItems === items.length;
              const late = minutes >= 25;
              const progress = Math.round((readyItems / items.length) * 100);

              return (
                <article
                  key={order.id}
                  className={cn(
                    "animate-scale-in mb-3 flex break-inside-avoid flex-col overflow-hidden rounded-xl border bg-zinc-900/90 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.8)]",
                    allReady
                      ? "border-emerald-500/40"
                      : late
                        ? "border-red-500/45"
                        : "border-white/10",
                  )}
                >
                  <div
                    className={cn(
                      "h-1 w-full",
                      allReady
                        ? "bg-emerald-500"
                        : late
                          ? "bg-red-500"
                          : order.status === "preparing"
                            ? "bg-amber-500"
                            : "bg-zinc-600",
                    )}
                  />

                  <div className="flex items-start justify-between gap-2 border-b border-white/5 px-3.5 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold tracking-tight text-white">
                          #{order.number}
                        </p>
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
                            allReady
                              ? "bg-emerald-500/15 text-emerald-300"
                              : order.status === "preparing"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-zinc-700/50 text-zinc-300",
                          )}
                        >
                          {allReady
                            ? "Pronta"
                            : order.status === "preparing"
                              ? "In preparazione"
                              : "Aperta"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-zinc-400">
                        {order.tableName ?? "Asporto"} · {order.covers} coperti ·{" "}
                        {order.waiter}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold tabular-nums",
                        late
                          ? "bg-red-500/15 text-red-300"
                          : "bg-white/5 text-zinc-400",
                      )}
                    >
                      <Clock className="size-3" />
                      {minutes} min
                    </span>
                  </div>

                  <div className="flex-1 divide-y divide-white/5">
                    {items.map((item) => (
                      <div key={item.id} className="px-3.5 py-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-white/[0.07] text-[11px] font-semibold tabular-nums text-zinc-200">
                            {item.qty}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium leading-snug text-zinc-100">
                              {item.name}
                              {item.variant ? (
                                <span className="text-zinc-400">
                                  {" "}
                                  · {item.variant}
                                </span>
                              ) : null}
                            </p>
                            {item.notes ? (
                              <p className="mt-1 rounded bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300">
                                Nota: {item.notes}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium",
                              ITEM_STATUS_STYLES[item.status],
                            )}
                          >
                            {ORDER_ITEM_STATUS_LABELS[item.status]}
                          </span>
                        </div>
                        {item.status !== "ready" && item.status !== "served" ? (
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => advanceItem(order, item)}
                              className="min-h-8 rounded-md bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-zinc-200 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                            >
                              {item.status === "pending"
                                ? "Inizia preparazione"
                                : "Segna pronto"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/5 px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] text-zinc-400">
                        Inviata alle {formatTime(order.createdAt)}
                      </p>
                      <p className="text-[10px] font-medium tabular-nums text-zinc-400">
                        {readyItems}/{items.length} pronte
                      </p>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-500 ease-smooth",
                          allReady ? "bg-emerald-500" : "bg-brand-500",
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-white/5 px-3.5 py-2.5">
                    {allReady || order.status === "ready" ? (
                      <button
                        type="button"
                        onClick={() => markServed(order)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        <Utensils className="size-3.5" />
                        Servito
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markTicketReady(order)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-[11px] font-semibold text-zinc-200 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                      >
                        <CheckCheck className="size-3.5" />
                        Tutto pronto
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-center text-[10px] leading-relaxed text-zinc-400">
          Kitchen Display dimostrativo · comande e tempi fittizi. In produzione
          il KDS richiederà autenticazione dispositivo e sincronizzazione server.
        </p>
      </div>
    </div>
  );
}

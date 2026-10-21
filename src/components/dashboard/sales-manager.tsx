"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  ReceiptText,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { salesMethodLabels, summarizeSales } from "@/lib/sales";
import { downloadCsv, formatCents, formatTime } from "@/lib/utils";
import type { SalesDay, SalesOrderRow } from "@/server/sales/types";

type Props = {
  day: string;
  today: string;
  data: SalesDay;
};

function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

function dayLabel(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SalesManager({ day, today, data }: Props) {
  const router = useRouter();
  const [methodFilter, setMethodFilter] = useState<"all" | "cash" | "card" | "other">(
    "all",
  );
  const [selected, setSelected] = useState<SalesOrderRow | null>(null);

  const filteredOrders = useMemo(() => {
    if (methodFilter === "all") return data.orders;
    return data.orders.filter((order) => order.methods.includes(methodFilter));
  }, [data.orders, methodFilter]);

  const totals = useMemo(() => summarizeSales(filteredOrders), [filteredOrders]);

  const goToDay = (value: string) => {
    router.push(`/dashboard/vendite?date=${value}`);
  };

  const exportCsv = () => {
    downloadCsv(
      `vendite-${day}.csv`,
      [
        "Data",
        "Ora",
        "Tavolo",
        "Coperti",
        "Prodotti",
        "Metodo",
        "Incasso (EUR)",
        "Mancia (EUR)",
        "Totale conto (EUR)",
      ],
      filteredOrders.map((order) => [
        day,
        formatTime(order.paidAt),
        order.tableName ?? "Banco",
        order.guests ?? 0,
        order.itemsCount,
        order.methods.map((method) => salesMethodLabels[method]).join(" + "),
        (order.paidCents / 100).toFixed(2).replace(".", ","),
        (order.tipCents / 100).toFixed(2).replace(".", ","),
        (order.totalCents / 100).toFixed(2).replace(".", ","),
      ]),
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon-sm" asChild>
            <Link
              href={`/dashboard/vendite?date=${shiftDay(day, -1)}`}
              aria-label="Giorno precedente"
            >
              <ChevronLeft />
            </Link>
          </Button>
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <CalendarDays className="size-4 text-zinc-500 dark:text-zinc-400" />
            <span className="sr-only">Giorno</span>
            <input
              type="date"
              value={day}
              onChange={(event) => {
                if (event.target.value) goToDay(event.target.value);
              }}
              className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          <Button variant="outline" size="icon-sm" asChild>
            <Link
              href={`/dashboard/vendite?date=${shiftDay(day, 1)}`}
              aria-label="Giorno successivo"
            >
              <ChevronRight />
            </Link>
          </Button>
          {day !== today ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/vendite">Oggi</Link>
            </Button>
          ) : (
            <Badge variant="secondary">Oggi</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={methodFilter}
            onChange={(event) =>
              setMethodFilter(
                event.target.value as "all" | "cash" | "card" | "other",
              )
            }
            className="h-8 w-44 text-xs"
            aria-label="Filtra metodo di pagamento"
          >
            <option value="all">Tutti i metodi</option>
            <option value="cash">
              Contanti ({formatCents(data.totals.byMethod.cash)})
            </option>
            <option value="card">
              Carta ({formatCents(data.totals.byMethod.card)})
            </option>
            <option value="other">
              Altro ({formatCents(data.totals.byMethod.other)})
            </option>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={filteredOrders.length === 0}
          >
            <Download />
            Esporta CSV
          </Button>
        </div>
      </div>

      <p className="text-sm capitalize text-zinc-500 dark:text-zinc-400">
        {dayLabel(day)}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Incasso registrato"
          value={formatCents(totals.collectedCents)}
          icon={Wallet}
          hint={`${totals.ordersCount} ${totals.ordersCount === 1 ? "conto incassato" : "conti incassati"}`}
        />
        <StatCard
          label="Ticket medio"
          value={formatCents(totals.averageTicketCents)}
          icon={ReceiptText}
          hint={`${totals.itemsSold} prodotti venduti`}
        />
        <StatCard
          label="Coperti"
          value={String(totals.covers)}
          icon={Users}
          hint="sui conti incassati"
        />
        <StatCard
          label="Mance"
          value={formatCents(totals.tipsCents)}
          icon={Coins}
          hint="importo extra rispetto ai conti"
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <ReceiptText className="size-6 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nessun incasso in questa giornata
            </p>
            <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Gli incassi registrati dalla cassa POS compaiono qui, derivati dai
              pagamenti reali del database.
            </p>
            <Button className="mt-2" size="sm" variant="outline" asChild>
              <Link href="/dashboard/pos">Apri il POS</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredOrders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => setSelected(order)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {formatTime(order.paidAt)} · {order.tableName ?? "Banco"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {order.methods.map((method) => salesMethodLabels[method]).join(" + ")}
                      {" · "}
                      {order.itemsCount} {order.itemsCount === 1 ? "prodotto" : "prodotti"}
                      {order.guests ? ` · ${order.guests} coperti` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                      {formatCents(order.paidCents)}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                      {order.tipCents > 0
                        ? `+ mancia ${formatCents(order.tipCents)}`
                        : `conto ${formatCents(order.totalCents)}`}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Incassi derivati dalle transazioni reali registrate dal POS. Nessuna
        trasmissione fiscale: la numerazione e la conservazione a norma saranno
        gestite da un adapter dedicato.
      </p>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-md">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Conto {selected.tableName ?? "Banco"}
                </DialogTitle>
                <DialogDescription>
                  {dayLabel(day)} · {formatTime(selected.paidAt)} ·{" "}
                  {selected.guests
                    ? `${selected.guests} coperti`
                    : "coperti non indicati"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {selected.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                      >
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
                          {formatCents(item.unitPriceCents * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between border-t border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Totale conto
                    </span>
                    <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatCents(selected.totalCents)}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Pagamenti
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {selected.payments.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-zinc-600 dark:text-zinc-300">
                          {formatTime(payment.createdAt)} ·{" "}
                          {salesMethodLabels[payment.method]}
                          {payment.tipCents > 0
                            ? ` · mancia ${formatCents(payment.tipCents)}`
                            : ""}
                        </span>
                        <span className="tabular-nums text-zinc-700 dark:text-zinc-200">
                          {formatCents(payment.amountCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

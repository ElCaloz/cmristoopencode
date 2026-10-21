"use client";

import { CheckCheck, Clock, Flame, Play } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";
import { advanceItemAction } from "@/server/kds/actions";
import {
  initialKdsActionState,
  type KitchenBoardItem,
  type KitchenBoardItemStatus,
} from "@/server/kds/types";

type Props = {
  tables: Array<{ id: string; name: string }>;
  items: KitchenBoardItem[];
  canOperate: boolean;
};

const subscribeTick = (callback: () => void) => {
  const interval = window.setInterval(callback, 30_000);
  return () => window.clearInterval(interval);
};

const getTickSnapshot = () => Math.floor(Date.now() / 30_000) * 30_000;

const getTickServerSnapshot = () => 0;

const lateThresholdMs = 25 * 60_000;

const columns: Array<{
  status: KitchenBoardItemStatus;
  label: string;
  next: "preparing" | "ready" | "served";
  actionLabel: string;
  accent: string;
  badge: string;
  button: string;
}> = [
  {
    status: "pending",
    label: "In attesa",
    next: "preparing",
    actionLabel: "Inizia preparazione",
    accent: "text-zinc-300",
    badge: "bg-zinc-700/60 text-zinc-300",
    button: "bg-white/10 text-zinc-200 hover:bg-white/15",
  },
  {
    status: "preparing",
    label: "In preparazione",
    next: "ready",
    actionLabel: "Segna pronto",
    accent: "text-amber-300",
    badge: "bg-amber-500/15 text-amber-300",
    button: "bg-amber-600 text-white hover:bg-amber-500",
  },
  {
    status: "ready",
    label: "Pronti al pass",
    next: "served",
    actionLabel: "Segna servito",
    accent: "text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-300",
    button: "bg-emerald-600 text-white hover:bg-emerald-500",
  },
];

const columnIcons = {
  pending: Flame,
  preparing: Play,
  ready: CheckCheck,
} as const;

export function KitchenManager({ tables, items, canOperate }: Props) {
  const [state, formAction, pending] = useActionState(
    advanceItemAction,
    initialKdsActionState,
  );
  const tick = useSyncExternalStore(
    subscribeTick,
    getTickSnapshot,
    getTickServerSnapshot,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Riga aggiornata.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Operazione non riuscita.");
    }
  }, [state]);

  const tableName = (tableId: string | null) =>
    tables.find((table) => table.id === tableId)?.name ?? "Banco";

  const elapsedLabel = (item: KitchenBoardItem) => {
    if (tick === 0) return null;
    const minutes = Math.max(
      0,
      Math.floor((tick - new Date(item.openedAt).getTime()) / 60_000),
    );
    return minutes === 0 ? "ora" : `${minutes} min`;
  };

  const isLate = (item: KitchenBoardItem) =>
    tick > 0 && tick - new Date(item.openedAt).getTime() >= lateThresholdMs;

  const ordered = [...items].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <Flame className="size-8 text-zinc-700" />
        <p className="text-sm font-medium text-zinc-300">
          Nessuna comanda in coda
        </p>
        <p className="max-w-sm text-xs leading-relaxed text-zinc-500">
          Le righe inviate dalla cassa compaiono qui per la preparazione. Apri
          il POS, aggiungi prodotti a un conto e avanza gli stati da questa
          schermata.
        </p>
        <Button variant="dark" size="sm" className="mt-1" asChild>
          <Link href="/dashboard/pos">Apri il POS</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-2 md:grid-cols-3 xl:gap-3">
      {columns.map((column) => {
        const columnItems = ordered.filter(
          (item) => item.status === column.status,
        );
        const ColumnIcon = columnIcons[column.status];

        return (
          <section
            key={column.status}
            aria-label={column.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ColumnIcon className={cn("size-4", column.accent)} />
                <h2
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    column.accent,
                  )}
                >
                  {column.label}
                </h2>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                  column.badge,
                )}
              >
                {columnItems.length}
              </span>
            </div>

            {columnItems.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-[11px] text-zinc-500">
                Nessuna riga
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {columnItems.map((item) => {
                  const minutesLabel = elapsedLabel(item);
                  const late = isLate(item);

                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "rounded-xl border bg-zinc-900 p-3.5",
                        late ? "border-red-500/50" : "border-white/10",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {tableName(item.tableId)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-zinc-400">
                            {item.guests ? `${item.guests} coperti · ` : ""}
                            dalle {formatTime(item.openedAt)}
                          </p>
                        </div>
                        {minutesLabel ? (
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold tabular-nums",
                              late
                                ? "bg-red-500/15 text-red-300"
                                : "bg-white/5 text-zinc-400",
                            )}
                          >
                            <Clock className="size-3" />
                            {minutesLabel}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex items-start gap-2">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-white/5 text-[10px] font-semibold tabular-nums text-zinc-300">
                          {item.quantity}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-snug text-zinc-100">
                            {item.name}
                          </p>
                          {item.note ? (
                            <p className="mt-0.5 text-[10px] text-amber-300/90">
                              Nota: {item.note}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {canOperate ? (
                        <form action={formAction} className="mt-2.5 flex justify-end">
                          <input type="hidden" name="itemId" value={item.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={column.next}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={pending}
                            className={cn(
                              "min-h-8 rounded-md px-2.5 text-[10px] font-medium shadow-none",
                              column.button,
                            )}
                          >
                            {column.actionLabel}
                          </Button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

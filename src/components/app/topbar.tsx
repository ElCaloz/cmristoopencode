"use client";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Info,
  Menu,
  RotateCcw,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CommandPalette } from "@/components/app/command-palette";
import { UserMenu } from "@/components/app/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import type { NotificationKind } from "@/lib/demo/types";
import { cn, relativeTime } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/app/panoramica": "Panoramica",
  "/app/pos": "Cassa POS",
  "/app/sala": "Sala e tavoli",
  "/app/comande": "Comande",
  "/app/cucina": "Cucina",
  "/app/menu": "Menu",
  "/app/prenotazioni": "Prenotazioni",
  "/app/clienti": "Clienti",
  "/app/vendite": "Vendite",
  "/app/magazzino": "Magazzino",
  "/app/report": "Report",
  "/app/personale": "Personale",
  "/app/dispositivi": "Dispositivi",
  "/app/impostazioni": "Impostazioni",
  "/app/abbonamento": "Abbonamento",
  "/app/piattaforma": "Console piattaforma",
};

const KIND_ICONS: Record<NotificationKind, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const KIND_STYLES: Record<NotificationKind, string> = {
  info: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  success:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  warning:
    "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  error: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

function NotificationsMenu() {
  const notifications = useDemoStore((state) => state.notifications);
  const activeRestaurantId = useDemoStore((state) => state.activeRestaurantId);
  const markAllRead = useDemoStore((state) => state.markAllNotificationsRead);

  const visible = notifications
    .filter(
      (entry) =>
        entry.restaurantId === null || entry.restaurantId === activeRestaurantId,
    )
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 8);
  const unread = visible.filter((entry) => !entry.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-zinc-500"
          aria-label={`Notifiche${unread > 0 ? `, ${unread} non lette` : ""}`}
        >
          <Bell />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Notifiche demo
          </p>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="text-[11px] font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              Segna come lette
            </button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Nessuna notifica.
            </p>
          ) : (
            visible.map((entry) => {
              const Icon = KIND_ICONS[entry.kind];
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-start gap-2.5 border-b border-zinc-50 px-4 py-3 last:border-0 dark:border-zinc-800",
                    !entry.read && "bg-zinc-50/60 dark:bg-zinc-800/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      KIND_STYLES[entry.kind],
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                        {entry.title}
                      </p>
                      {!entry.read ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-brand-600 dark:bg-brand-400" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {entry.message}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                      {relativeTime(entry.time)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const restaurant = useActiveRestaurant();
  const resetDemo = useDemoStore((state) => state.resetDemo);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const title = PAGE_TITLES[pathname] ?? "Gestionale";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-zinc-500 lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Apri menu di navigazione"
          >
            <Menu />
          </Button>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="hidden max-w-44 truncate text-xs text-zinc-500 dark:text-zinc-400 sm:block">
              {restaurant?.name}
            </span>
            <ChevronRight className="hidden size-3 shrink-0 text-zinc-300 dark:text-zinc-600 sm:block" />
            <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {title}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-8 w-52 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-600 md:flex"
            >
              <Search className="size-3.5" />
              Cerca nel gestionale…
              <kbd className="ml-auto rounded border border-zinc-200 bg-white px-1 py-0.5 text-[9px] text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
                Ctrl K
              </kbd>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-zinc-500 md:hidden"
              onClick={() => setPaletteOpen(true)}
              aria-label="Cerca"
            >
              <Search />
            </Button>
            <Badge variant="warning" className="hidden sm:inline-flex">
              Demo
            </Badge>
            <NotificationsMenu />
            <UserMenu tone="light" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-amber-100 bg-amber-50 px-3 py-1.5 dark:border-amber-900/50 dark:bg-amber-950/40 sm:px-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Modalità demo
          </span>
          <span className="text-[11px] text-amber-700 dark:text-amber-300">
            dati fittizi · le modifiche restano in questo browser
          </span>
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 hover:underline dark:text-amber-200"
          >
            <RotateCcw className="size-3" />
            Ripristina
          </button>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Ripristinare i dati demo?"
        description="Tutti gli ordini, le modifiche al menu, i clienti e le impostazioni creati in questa demo torneranno allo stato iniziale. La demo è interamente fittizia: nessun dato reale viene toccato."
        confirmLabel="Ripristina demo"
        onConfirm={() => {
          resetDemo();
          toast.success("Demo ripristinata", {
            description: "I dati dimostrativi sono tornati allo stato iniziale.",
          });
        }}
      />
    </>
  );
}

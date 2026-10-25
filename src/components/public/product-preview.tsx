"use client";

import {
  ArrowRight,
  CalendarCheck,
  ChefHat,
  Clock,
  LayoutDashboard,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { label: "Panoramica", icon: LayoutDashboard, active: true },
  { label: "Cassa POS", icon: UtensilsCrossed },
  { label: "Sala", icon: CalendarCheck },
  { label: "Cucina", icon: ChefHat },
];

function WindowChrome() {
  return (
    <div className="flex items-center gap-2 border-b border-zinc-200/80 bg-zinc-50/90 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="size-2 rounded-full bg-red-300 dark:bg-red-400/60" />
        <span className="size-2 rounded-full bg-amber-300 dark:bg-amber-400/60" />
        <span className="size-2 rounded-full bg-emerald-300 dark:bg-emerald-400/60" />
      </span>
      <span className="ml-2 hidden min-w-0 flex-1 items-center gap-1.5 truncate rounded-md border border-zinc-200/80 bg-white px-2 py-1 text-[9px] text-zinc-500 sm:flex dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        <span className="size-1.5 rounded-full bg-brand-500" />
        demo.cmristo.it / panoramica
      </span>
      <Badge variant="warning" className="ml-auto px-1.5 py-0 text-[8px] leading-4">
        DATI DEMO
      </Badge>
    </div>
  );
}

function MiniSidebar() {
  return (
    <aside className="hidden w-[128px] shrink-0 flex-col gap-0.5 bg-[#0b100e] p-2.5 sm:flex">
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <span className="flex size-5 items-center justify-center rounded-md bg-brand-600 text-white">
          <UtensilsCrossed className="size-3" />
        </span>
        <span className="text-[10px] font-semibold tracking-tight text-white">CM Risto</span>
      </div>
      <div className="mb-2 rounded-md border border-white/10 bg-white/5 px-1.5 py-1.5">
        <p className="truncate text-[8px] font-medium text-white">Osteria del Borgo</p>
        <p className="truncate text-[7px] text-zinc-400">Firenze · piano Pro</p>
      </div>
      {sidebarItems.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[8px]",
            item.active ? "bg-white/10 text-white" : "text-zinc-400",
          )}
        >
          <item.icon className={cn("size-2.5", item.active && "text-brand-400")} />
          {item.label}
        </div>
      ))}
    </aside>
  );
}

function PanoramaPanel() {
  const bars = [38, 55, 44, 70, 58, 76, 64, 86, 72, 93, 80, 90];
  return (
    <div className="flex h-full">
      <MiniSidebar />
      <div className="min-w-0 flex-1 bg-[#fafaf9] p-3.5 dark:bg-zinc-950 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">
              Panoramica operativa
            </p>
            <p className="mt-0.5 text-[13px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Buongiorno, Marco
            </p>
            <p className="text-[8px] text-zinc-500 dark:text-zinc-400">Osteria del Borgo · servizio in corso</p>
          </div>
          <span className="hidden items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[8px] font-medium text-zinc-600 sm:flex dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Locale attivo
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            { label: "Incasso oggi", value: "€ 951,10", trend: "+12%" },
            { label: "Ordini chiusi", value: "26", trend: "+4" },
            { label: "Ticket medio", value: "€ 36,58", trend: "+3%" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-zinc-200/90 bg-white p-2 shadow-[0_1px_2px_rgb(24_24_27_/_0.03)] dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-[7px] text-zinc-500 dark:text-zinc-400">{kpi.label}</p>
              <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {kpi.value}
              </p>
              <p className="mt-0.5 text-[7px] font-medium text-emerald-700 dark:text-emerald-400">{kpi.trend}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 rounded-lg border border-zinc-200/90 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-medium text-zinc-700 dark:text-zinc-300">
              Andamento incassi
            </p>
            <span className="text-[7px] text-zinc-500 dark:text-zinc-400">ultimi 12 giorni</span>
          </div>
          <div className="mt-2 flex h-[72px] items-end gap-1">
            {bars.map((height, index) => (
              <span
                key={index}
                className={cn(
                  "flex-1 rounded-[2px] transition-colors",
                  index === bars.length - 1 ? "bg-brand-600" : "bg-brand-100 dark:bg-brand-900/70",
                )}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-zinc-200/90 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[7px] font-medium text-zinc-500 dark:text-zinc-400">Servizio in corso</p>
            {[
              ["T7", "2 coperti", "In preparazione"],
              ["T2", "3 coperti", "Pronta"],
            ].map(([table, covers, status]) => (
              <div key={table} className="mt-1.5 flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded bg-zinc-100 text-[7px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {table}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[7px] text-zinc-600 dark:text-zinc-300">{covers}</p>
                </div>
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    status === "Pronta" ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-zinc-200/90 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[7px] font-medium text-zinc-500 dark:text-zinc-400">Prenotazioni oggi</p>
            {["19:45 · Bianchi · 4", "20:15 · Vanni · 2", "20:30 · Fabbri · 3"].map(
              (entry) => (
                <p key={entry} className="mt-1.5 truncate text-[7px] text-zinc-500 dark:text-zinc-400">
                  {entry}
                </p>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const kdsTickets = [
  {
    number: "130",
    table: "T7 · 2 coperti",
    time: "24 min",
    status: "Pronta",
    tone: "emerald",
    items: ["Tagliere toscano", "Peposo dell'Impruneta"],
  },
  {
    number: "128",
    table: "T5 · 4 coperti",
    time: "9 min",
    status: "In preparazione",
    tone: "amber",
    items: ["Crostini neri", "Ribollita", "Peposo"],
  },
  {
    number: "131",
    table: "Banco · 1 coperto",
    time: "4 min",
    status: "In preparazione",
    tone: "amber",
    items: ["Spaghetti aglio e olio", "Acqua frizzante"],
  },
];

function KitchenPanel() {
  return (
    <div className="h-full bg-[#080b0a] p-3 sm:p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ChefHat className="size-3.5" />
          </span>
          <div>
            <p className="text-[9px] font-semibold text-white">Cucina · Osteria del Borgo</p>
            <p className="text-[7px] text-zinc-400">Kitchen Display · dati demo</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[7px] font-medium text-zinc-300">
          <span className="size-1.5 rounded-full bg-amber-400" />
          Servizio attivo
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {[
          ["In attesa", "7", "text-zinc-300"],
          ["In preparazione", "1", "text-amber-300"],
          ["Pronte", "1", "text-emerald-300"],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5">
            <p className="text-[6px] uppercase tracking-wide text-zinc-400">{label}</p>
            <p className={cn("text-[13px] font-semibold tabular-nums", tone)}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-2.5 grid gap-1.5 sm:grid-cols-3">
        {kdsTickets.map((ticket) => (
          <div
            key={ticket.number}
            className={cn(
              "flex flex-col overflow-hidden rounded-lg border bg-zinc-900/90",
              ticket.tone === "emerald"
                ? "border-emerald-500/40"
                : ticket.tone === "amber"
                  ? "border-amber-500/30"
                  : "border-white/10",
            )}
          >
            <div className="flex items-center justify-between gap-1 border-b border-white/5 px-2 py-1.5">
              <div>
                <p className="text-[8px] font-semibold text-white">#{ticket.number}</p>
                <p className="text-[6.5px] text-zinc-400">{ticket.table}</p>
              </div>
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded px-1 py-0.5 text-[6px] font-medium",
                  ticket.tone === "emerald"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : ticket.tone === "amber"
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-white/5 text-zinc-400",
                )}
              >
                <Clock className="size-2" />
                {ticket.time}
              </span>
            </div>
            <div className="flex-1 space-y-1.5 p-2">
              {ticket.items.map((item) => (
                <div key={item} className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-white/15" />
                  <p className="truncate text-[7px] text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 p-1.5">
              <span
                className={cn(
                  "block rounded px-1 py-1 text-center text-[6.5px] font-medium",
                  ticket.tone === "emerald"
                    ? "bg-emerald-600 text-white"
                    : "bg-white/10 text-zinc-300",
                )}
              >
                {ticket.tone === "emerald" ? "Servito" : "Avanza stato"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReservationsPanel() {
  return (
    <div className="h-full bg-[#fafaf9] p-3.5 dark:bg-zinc-950 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">
            Agenda di sala
          </p>
          <p className="mt-0.5 text-[13px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Prenotazioni di oggi
          </p>
          <p className="text-[8px] text-zinc-500 dark:text-zinc-400">18 coperti previsti · 7 tavoli liberi</p>
        </div>
        <span className="rounded-md bg-zinc-900 px-2 py-1 text-[8px] font-medium text-white">
          + Nuova
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
          <Search className="size-2.5 text-zinc-400" />
          <span className="text-[7px] text-zinc-500 dark:text-zinc-400">Cerca nome, telefono o email…</span>
          <span className="ml-auto rounded border border-zinc-200 px-1 py-0.5 text-[6px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Oggi
          </span>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {[
            ["19:45", "Famiglia Bianchi", "4 coperti · T4", "Confermata", "success"],
            ["20:15", "Laura Vanni", "2 coperti · T6", "Confermata", "success"],
            ["20:30", "Roberto Fabbri", "3 coperti · V3", "Da confermare", "warning"],
            ["21:00", "Giulia Pratesi", "2 coperti · T1", "In sala", "info"],
          ].map(([time, name, detail, status, tone]) => (
            <div key={time} className="flex items-center gap-2 px-2.5 py-2">
              <div className="w-7 shrink-0">
                <p className="text-[9px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {time}
                </p>
                <p className="text-[6px] text-zinc-500 dark:text-zinc-400">oggi</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[8px] font-medium text-zinc-800 dark:text-zinc-100">
                  {name}
                </p>
                <p className="text-[6.5px] text-zinc-500 dark:text-zinc-400">{detail}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[6px] font-medium",
                  tone === "success" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
                  tone === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                  tone === "info" && "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
                )}
              >
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between rounded-lg border border-brand-200/80 bg-brand-50/70 px-2.5 py-2 dark:border-brand-900 dark:bg-brand-950/50">
        <p className="text-[7px] font-medium text-brand-800 dark:text-brand-300">
          Disponibilità verificata su capienza, orari e chiusure.
        </p>
        <ArrowRight className="size-2.5 text-brand-700 dark:text-brand-400" />
      </div>
    </div>
  );
}

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <div
        data-ui
        className="overflow-hidden rounded-[1.25rem] border border-zinc-200/90 bg-white shadow-[0_28px_70px_-32px_rgba(24,24,27,0.38)] dark:border-zinc-800 dark:bg-zinc-900">
        <WindowChrome />
        <Tabs defaultValue="panoramica">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <TabsList className="h-8 bg-zinc-100/80 p-0.5 dark:bg-zinc-800/80">
              <TabsTrigger value="panoramica" className="h-7 px-2 text-[10px]">
                <LayoutDashboard />
                Panoramica
              </TabsTrigger>
              <TabsTrigger value="cucina" className="h-7 px-2 text-[10px]">
                <ChefHat />
                Cucina
              </TabsTrigger>
              <TabsTrigger value="prenotazioni" className="h-7 px-2 text-[10px]">
                <CalendarCheck />
                Prenotazioni
              </TabsTrigger>
            </TabsList>
            <span className="hidden items-center gap-1 text-[9px] font-medium text-zinc-500 sm:flex dark:text-zinc-400">
              <span className="size-1.5 rounded-full bg-brand-500" />
              Anteprima interattiva
            </span>
          </div>
          <TabsContent value="panoramica" className="m-0 sm:h-[382px]">
            <PanoramaPanel />
          </TabsContent>
          <TabsContent value="cucina" className="m-0 sm:h-[382px]">
            <KitchenPanel />
          </TabsContent>
          <TabsContent value="prenotazioni" className="m-0 sm:h-[382px]">
            <ReservationsPanel />
          </TabsContent>
        </Tabs>
        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-[9px] text-zinc-500 dark:text-zinc-400">
            Anteprima dell&apos;interfaccia demo. Dati fittizi.
          </p>
          <Link
            href="/app/panoramica"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700 transition-colors hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Apri la demo
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

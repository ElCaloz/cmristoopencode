"use client";

import {
  Armchair,
  BarChart3,
  BookOpen,
  CalendarCheck,
  ChefHat,
  CreditCard,
  LayoutDashboard,
  MonitorSmartphone,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDemoStore } from "@/lib/demo/store";
import { canAccess, type AppArea } from "@/lib/roles";
import { cn } from "@/lib/utils";

type PaletteItem = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  area?: AppArea;
  keywords: string;
};

const ITEMS: PaletteItem[] = [
  { href: "/app/panoramica", label: "Panoramica", hint: "Dashboard del locale", icon: LayoutDashboard, area: "dashboard", keywords: "home dashboard incassi kpi" },
  { href: "/app/pos", label: "Cassa POS", hint: "Conti, ordini e incassi", icon: CreditCard, area: "pos", keywords: "cassa pos pagamento tavolo" },
  { href: "/app/sala", label: "Sala e tavoli", hint: "Mappa tavoli e comande", icon: Armchair, area: "floor", keywords: "sala tavoli cameriere" },
  { href: "/app/comande", label: "Comande", hint: "Avanzamento ordini", icon: ReceiptText, area: "orders", keywords: "comande ordini servizio" },
  { href: "/app/cucina", label: "Cucina — Kitchen Display", hint: "Comande in tempo reale", icon: ChefHat, area: "kitchen", keywords: "cucina kds comande forno" },
  { href: "/app/menu", label: "Menu e prodotti", hint: "Prezzi, disponibilità e margini", icon: BookOpen, area: "menu", keywords: "menu prodotti prezzi categorie" },
  { href: "/app/prenotazioni", label: "Prenotazioni", hint: "Agenda e coperti", icon: CalendarCheck, area: "reservations", keywords: "prenotazioni coperti clienti" },
  { href: "/app/clienti", label: "Clienti", hint: "Anagrafica e preferenze", icon: Users, area: "customers", keywords: "clienti crm anagrafica" },
  { href: "/app/vendite", label: "Vendite", hint: "Ordini pagati e scontrini", icon: ReceiptText, area: "sales", keywords: "vendite scontrini pagamenti" },
  { href: "/app/magazzino", label: "Magazzino", hint: "Scorte e fornitori", icon: Package, area: "inventory", keywords: "magazzino scorte fornitori" },
  { href: "/app/report", label: "Report", hint: "Analisi incassi e margini", icon: BarChart3, area: "reports", keywords: "report analisi statistiche" },
  { href: "/app/personale", label: "Personale", hint: "Staff ruoli e turni", icon: UserCog, area: "staff", keywords: "personale staff dipendenti" },
  { href: "/app/dispositivi", label: "Dispositivi", hint: "Palmari, POS e KDS", icon: MonitorSmartphone, area: "devices", keywords: "dispositivi palmari pos kds" },
  { href: "/app/impostazioni", label: "Impostazioni", hint: "Dati del locale", icon: Settings, area: "settings", keywords: "impostazioni locale configurazione" },
  { href: "/app/abbonamento", label: "Abbonamento", hint: "Piano e limiti", icon: Wallet, area: "billing", keywords: "abbonamento piano fatturazione" },
  { href: "/app/piattaforma", label: "Console piattaforma", hint: "Super Admin CM Risto", icon: ShieldCheck, area: "platform", keywords: "piattaforma super admin ristoranti" },
  { href: "/", label: "Sito pubblico", hint: "Homepage e prezzi", icon: BookOpen, keywords: "sito home prezzi" },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <PaletteBody onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const role = useDemoStore((state) => state.activeRole);

  const results = useMemo(() => {
    const allowed = ITEMS.filter(
      (item) => !item.area || canAccess(role, item.area),
    );
    const needle = query.trim().toLowerCase();
    if (!needle) return allowed;
    return allowed.filter((item) =>
      `${item.label} ${item.hint} ${item.keywords}`
        .toLowerCase()
        .includes(needle),
    );
  }, [query, role]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <>
      <DialogTitle className="sr-only">Ricerca rapida</DialogTitle>
      <DialogDescription className="sr-only">
        Cerca una pagina o un&apos;azione del gestionale.
      </DialogDescription>
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 dark:border-zinc-800">
        <span className="text-zinc-500 dark:text-zinc-400">
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results.length > 0) {
              go(results[0].href);
            }
          }}
          placeholder="Cerca pagine e azioni…"
          className="h-12 w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
          ESC
        </kbd>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {results.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Nessun risultato per «{query}».
          </p>
        ) : (
          results.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => go(item.href)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
              )}
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <item.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {item.label}
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                  {item.hint}
                </span>
              </span>
              <span className="text-[10px] text-zinc-300 dark:text-zinc-600">Invio</span>
            </button>
          ))
        )}
      </div>
    </>
  );
}

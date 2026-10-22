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
  Plug,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCog,
  Users,
  UsersRound,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operatività",
    items: [
      { href: "/dashboard", label: "Panoramica", icon: LayoutDashboard },
      { href: "/dashboard/pos", label: "Cassa POS", icon: CreditCard },
      { href: "/dashboard/sala", label: "Sala e tavoli", icon: Armchair },
      { href: "/dashboard/cucina", label: "Cucina (KDS)", icon: ChefHat },
      { href: "/dashboard/prenotazioni", label: "Prenotazioni", icon: CalendarCheck },
    ],
  },
  {
    label: "Gestione",
    items: [
      { href: "/dashboard/menu", label: "Menu", icon: BookOpen },
      { href: "/dashboard/online", label: "Online e ordini", icon: ShoppingBag },
      { href: "/dashboard/clienti", label: "Clienti", icon: Users },
      { href: "/dashboard/marketing", label: "Marketing", icon: Sparkles },
      { href: "/dashboard/vendite", label: "Vendite", icon: ReceiptText },
      { href: "/dashboard/magazzino", label: "Magazzino", icon: Package },
      { href: "/dashboard/acquisti", label: "Acquisti", icon: UtensilsCrossed },
      { href: "/dashboard/ricette", label: "Ricette", icon: BarChart3 },
    ],
  },
  {
    label: "Analisi",
    items: [{ href: "/dashboard/report", label: "Report", icon: BarChart3 }],
  },
  {
    label: "Locale",
    items: [
      { href: "/dashboard/personale", label: "Personale", icon: UserCog },
      { href: "/dashboard/dispositivi", label: "Dispositivi", icon: MonitorSmartphone },
      { href: "/dashboard/sedi", label: "Sedi", icon: UsersRound },
      { href: "/dashboard/integrazioni", label: "Integrazioni", icon: Plug },
      { href: "/dashboard/abbonamento", label: "Abbonamento", icon: Wallet },
      { href: "/dashboard/sicurezza", label: "Sicurezza", icon: ShieldCheck },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigazione moduli"
      className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-3 py-2 lg:h-full lg:w-60 lg:shrink-0 lg:flex-col lg:gap-4 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:bg-zinc-950 lg:px-3 lg:py-4"
    >
      {NAV_GROUPS.map((group) => (
        <div
          key={group.label}
          className="flex shrink-0 items-center gap-1 lg:flex-col lg:items-stretch lg:gap-1"
        >
          <p className="mr-2 hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 lg:block lg:px-2 lg:pb-1">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                  active
                    ? "bg-brand-700 text-white lg:bg-white/10 lg:text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 lg:text-zinc-400 lg:hover:bg-white/5 lg:hover:text-zinc-100",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

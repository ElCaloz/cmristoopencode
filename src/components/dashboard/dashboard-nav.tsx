"use client";

import {
  Armchair,
  BarChart3,
  BookOpen,
  Bot,
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
      { href: "/dashboard/receptionist", label: "Receptionist AI", icon: Bot },
      { href: "/dashboard/vendite", label: "Vendite", icon: ReceiptText },
    ],
  },
  {
    label: "Gestione",
    items: [
      { href: "/dashboard/menu", label: "Menu", icon: BookOpen },
      { href: "/dashboard/online", label: "Online e ordini", icon: ShoppingBag },
      { href: "/dashboard/clienti", label: "Clienti", icon: Users },
      { href: "/dashboard/marketing", label: "Marketing", icon: Sparkles },
      { href: "/dashboard/magazzino", label: "Magazzino", icon: Package },
      { href: "/dashboard/acquisti", label: "Acquisti", icon: UtensilsCrossed },
      { href: "/dashboard/ricette", label: "Ricette", icon: BarChart3 },
      { href: "/dashboard/report", label: "Report", icon: BarChart3 },
    ],
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

export function DashboardNav({ tone = "light" }: { tone?: "light" | "dark" }) {
  const pathname = usePathname();
  const dark = tone === "dark";

  return (
    <nav
      aria-label="Navigazione moduli"
      className={cn(
        "flex w-full min-w-0 gap-1 overflow-x-auto border-b px-3 py-2 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-60 lg:shrink-0 lg:flex-col lg:gap-5 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-3 lg:py-5",
        dark
          ? "border-white/10 bg-zinc-950"
          : "border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950",
      )}
    >
      {NAV_GROUPS.map((group) => (
        <div
          key={group.label}
          className="flex shrink-0 items-center gap-1 lg:flex-col lg:items-stretch lg:gap-0.5"
        >
          <p
            className={cn(
              "mr-2 hidden text-[11px] font-medium lg:block lg:px-2 lg:pb-1.5",
              dark ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400",
            )}
          >
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
                  "inline-flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
                  active
                    ? dark
                      ? "bg-white/10 text-white"
                      : "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
                    : dark
                      ? "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
                )}
              >
                <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

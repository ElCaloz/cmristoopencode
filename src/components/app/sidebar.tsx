"use client";

import {
  Armchair,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Check,
  ChefHat,
  ChevronsUpDown,
  CreditCard,
  LayoutDashboard,
  MonitorSmartphone,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  Store,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { UserMenu } from "@/components/app/user-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import { PLANS } from "@/lib/plans";
import { canAccess, type AppArea } from "@/lib/roles";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  area?: AppArea;
};

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operatività",
    items: [
      { href: "/app/panoramica", label: "Panoramica", icon: LayoutDashboard, area: "dashboard" },
      { href: "/app/pos", label: "Cassa POS", icon: CreditCard, area: "pos" },
      { href: "/app/sala", label: "Sala e tavoli", icon: Armchair, area: "floor" },
      { href: "/app/cucina", label: "Cucina (KDS)", icon: ChefHat, area: "kitchen" },
      { href: "/app/prenotazioni", label: "Prenotazioni", icon: CalendarCheck, area: "reservations" },
    ],
  },
  {
    label: "Gestione",
    items: [
      { href: "/app/menu", label: "Menu", icon: BookOpen, area: "menu" },
      { href: "/app/clienti", label: "Clienti", icon: Users, area: "customers" },
      { href: "/app/vendite", label: "Vendite", icon: ReceiptText, area: "sales" },
      { href: "/app/magazzino", label: "Magazzino", icon: Package, area: "inventory" },
    ],
  },
  {
    label: "Analisi",
    items: [{ href: "/app/report", label: "Report", icon: BarChart3, area: "reports" }],
  },
  {
    label: "Locale",
    items: [
      { href: "/app/personale", label: "Personale", icon: UserCog, area: "staff" },
      { href: "/app/dispositivi", label: "Dispositivi", icon: MonitorSmartphone, area: "devices" },
      { href: "/app/impostazioni", label: "Impostazioni", icon: Settings, area: "settings" },
      { href: "/app/abbonamento", label: "Abbonamento", icon: Wallet, area: "billing" },
    ],
  },
];

const SUPER_ADMIN_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Piattaforma",
    items: [
      { href: "/app/piattaforma", label: "Dashboard piattaforma", icon: ShieldCheck, area: "platform" },
    ],
  },
  {
    label: "Risorse",
    items: [
      { href: "/prezzi", label: "Piani commerciali", icon: Wallet },
      { href: "/documentazione", label: "Documentazione", icon: BookOpen },
    ],
  },
];

const STATUS_DOTS: Record<string, string> = {
  active: "bg-emerald-500",
  trial: "bg-amber-500",
  suspended: "bg-red-500",
};

function RestaurantSwitcher() {
  const restaurant = useActiveRestaurant();
  const restaurants = useDemoStore((state) => state.restaurants);
  const setActiveRestaurant = useDemoStore(
    (state) => state.setActiveRestaurant,
  );
  const plan = restaurant ? PLANS[restaurant.planId] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-600/20 text-brand-300">
            <Store className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-white">
              {restaurant?.name ?? "Seleziona locale"}
            </span>
            <span className="block truncate text-[10px] text-zinc-400">
              {restaurant?.city} · piano {plan?.name}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-zinc-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Ristoranti demo</DropdownMenuLabel>
        {restaurants.map((entry) => (
          <DropdownMenuItem
            key={entry.id}
            onSelect={() => {
              if (entry.id !== restaurant?.id) {
                setActiveRestaurant(entry.id);
                toast.success(`Locale demo: ${entry.name}`, {
                  description: `${entry.city} · piano ${PLANS[entry.planId].name}`,
                });
              }
            }}
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                STATUS_DOTS[entry.status] ?? "bg-zinc-400",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{entry.name}</span>
              <span className="block truncate text-[10px] text-zinc-400">
                {entry.city} · {PLANS[entry.planId].name}
              </span>
            </span>
            {entry.id === restaurant?.id ? (
              <Check className="size-3.5! text-brand-700 dark:text-brand-400" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const role = useDemoStore((state) => state.activeRole);
  const restaurant = useActiveRestaurant();
  const plan = restaurant ? PLANS[restaurant.planId] : null;
  const groups =
    role === "super_admin" ? [...NAV_GROUPS, ...SUPER_ADMIN_GROUPS] : NAV_GROUPS;

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-4">
        <Link href="/app/panoramica" onClick={onNavigate} aria-label="CM Risto gestionale">
          <Logo inverted withTagline />
        </Link>
      </div>

      <div className="p-3">
        {role === "super_admin" ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-medium text-white">Console CM Risto</p>
              <p className="mt-0.5 text-[10px] text-zinc-400">
                Amministrazione della piattaforma
              </p>
            </div>
            <RestaurantSwitcher />
          </div>
        ) : (
          <RestaurantSwitcher />
        )}
      </div>

      <nav className="scrollbar-dark flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          const items = group.items.filter(
            (item) => !item.area || canAccess(role, item.area),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-[background-color,color] duration-200",
                        active
                          ? "bg-white/10 font-medium text-white before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brand-400"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4 shrink-0",
                          active ? "text-brand-400" : "text-zinc-500",
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.href === "/app/cucina" ? (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-zinc-400">
                          KDS
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-white/10 p-3">
        {restaurant && plan ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-white">
                Piano {plan.name}
              </p>
              <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-[9px] font-medium text-brand-300">
                {restaurant.status === "trial" ? "Prova" : "Attivo"}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
              {restaurant.status === "trial"
                ? `Prova gratuita fino al ${restaurant.trialEndsAt ?? "—"}`
                : "Palmari inclusi: fino a 4 per locale"}
            </p>
            {canAccess(role, "billing") ? (
              <Link
                href="/app/abbonamento"
                onClick={onNavigate}
                className="mt-2 inline-block text-[10px] font-medium text-brand-300 hover:underline"
              >
                Gestisci abbonamento →
              </Link>
            ) : null}
          </div>
        ) : null}
        {role === "super_admin" ? (
          <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] leading-relaxed text-zinc-400">
            Accesso riservato al personale CM Risto. Le azioni amministrative
            sono registrate nel registro attività.
          </p>
        ) : null}
        <UserMenu tone="dark" />
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
      <SidebarContent />
    </aside>
  );
}

"use client";

import {
  Check,
  ChevronsUpDown,
  Home,
  LayoutDashboard,
  RotateCcw,
  type LucideIcon,
  ChefHat,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import {
  DEMO_ROLES,
  homeRouteForRole,
  ROLE_LABELS,
  type Role,
} from "@/lib/roles";
import { cn, initials } from "@/lib/utils";

const ROLE_ICONS: Record<Role, LucideIcon> = {
  super_admin: ShieldCheck,
  admin: Store,
  cassiere: CreditCard,
  cameriere: Smartphone,
  cucina: ChefHat,
};

function useDemoUser() {
  const role = useDemoStore((state) => state.activeRole);
  const staff = useDemoStore((state) => state.staff);
  const restaurantId = useDemoStore((state) => state.activeRestaurantId);

  if (role === "super_admin") {
    return { name: "Super Admin", detail: "Console piattaforma" };
  }
  const member = staff.find(
    (entry) =>
      entry.restaurantId === restaurantId && entry.role === (role as string),
  );
  return {
    name: member?.name ?? "Utente demo",
    detail: ROLE_LABELS[role],
  };
}

export function UserMenu({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  const role = useDemoStore((state) => state.activeRole);
  const setActiveRole = useDemoStore((state) => state.setActiveRole);
  const resetDemo = useDemoStore((state) => state.resetDemo);
  const restaurant = useActiveRestaurant();
  const [resetOpen, setResetOpen] = useState(false);
  const user = useDemoUser();

  const changeRole = (next: Role) => {
    if (next === role) return;
    setActiveRole(next);
    toast.success(`Ruolo demo: ${ROLE_LABELS[next]}`, {
      description: "Interfaccia e permessi dimostrativi aggiornati.",
    });
    router.push(homeRouteForRole(next));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {tone === "dark" ? (
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 p-2 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                {initials(user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-white">
                  {user.name}
                </span>
                <span className="block truncate text-[10px] text-zinc-400">
                  {user.detail}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-zinc-500" />
            </button>
          ) : (
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-2 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                {initials(user.name)}
              </span>
              <span className="hidden text-left lg:block">
                <span className="block text-xs font-medium leading-tight text-zinc-800 dark:text-zinc-100">
                  {user.name}
                </span>
                <span className="block text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
                  {ROLE_LABELS[role]}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 text-zinc-500 dark:text-zinc-400" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Ruolo demo</DropdownMenuLabel>
          {DEMO_ROLES.map((entry) => {
            const Icon = ROLE_ICONS[entry];
            return (
              <DropdownMenuItem
                key={entry}
                onSelect={() => changeRole(entry)}
                className={cn(
                  "pr-2",
                  entry === role &&
                    "bg-brand-50/60 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200",
                )}
              >
                <Icon />
                <span className="flex-1">{ROLE_LABELS[entry]}</span>
                {entry === role ? (
                  <Check className="size-3.5! text-brand-700 dark:text-brand-400" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/app/panoramica")}>
            <LayoutDashboard />
            Panoramica demo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setResetOpen(true)}>
            <RotateCcw />
            Ripristina dati demo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/")}>
            <Home />
            Torna al sito
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Ripristinare i dati demo?"
        description={`Tutti gli ordini, le modifiche al menu, i clienti e le impostazioni creati in questa demo (${restaurant?.name ?? "locale"}) torneranno allo stato iniziale. L'operazione non tocca dati reali: la demo è interamente fittizia.`}
        confirmLabel="Ripristina demo"
        onConfirm={() => {
          resetDemo();
          toast.success("Demo ripristinata", {
            description: "I dati dimostrativi sono tornati allo stato iniziale.",
          });
          router.push("/app/panoramica");
        }}
      />
    </>
  );
}

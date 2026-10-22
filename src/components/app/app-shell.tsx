"use client";

import {
  Armchair,
  ChefHat,
  LayoutDashboard,
  ReceiptText,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Sidebar, SidebarContent } from "@/components/app/sidebar";
import { StoreGate } from "@/components/app/store-gate";
import { Topbar } from "@/components/app/topbar";
import { UserMenu } from "@/components/app/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import {
  canAccess,
  homeRouteForRole,
  ROLE_LABELS,
  type AppArea,
} from "@/lib/roles";
import { cn } from "@/lib/utils";

const AREA_BY_PATH: Record<string, AppArea> = {
  "/app/panoramica": "dashboard",
  "/app/pos": "pos",
  "/app/sala": "floor",
  "/app/comande": "orders",
  "/app/cucina": "kitchen",
  "/app/menu": "menu",
  "/app/prenotazioni": "reservations",
  "/app/clienti": "customers",
  "/app/vendite": "sales",
  "/app/magazzino": "inventory",
  "/app/report": "reports",
  "/app/personale": "staff",
  "/app/dispositivi": "devices",
  "/app/impostazioni": "settings",
  "/app/abbonamento": "billing",
  "/app/piattaforma": "platform",
};

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-brand-300"
    >
      Vai al contenuto
    </a>
  );
}

const WAITER_LINKS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/app/panoramica", label: "Panoramica", icon: LayoutDashboard },
  { href: "/app/sala", label: "Sala", icon: Armchair },
  { href: "/app/comande", label: "Comande", icon: ReceiptText },
];

function WaiterFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const restaurant = useActiveRestaurant();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2.5 px-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
            <ChefHat className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">
              {restaurant?.name}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Cameriere · demo</p>
          </div>
          <Badge variant="warning">Demo</Badge>
          <UserMenu />
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-lg px-4 pb-24 pt-4 focus:outline-none"
      >
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mx-auto flex max-w-lg">
          {WAITER_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  active
                    ? "text-brand-700 dark:text-brand-400"
                    : "text-zinc-500 dark:text-zinc-400",
                )}
              >
                <link.icon
                  className={cn("size-5", active ? "text-brand-600" : "")}
                />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useDemoStore((state) => state.activeRole);
  const [mobileOpen, setMobileOpen] = useState(false);

  const area = AREA_BY_PATH[pathname];
  const denied = area ? !canAccess(role, area) : false;

  if (denied) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <SkipLink />
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-lg px-4 py-12 focus:outline-none"
        >
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <EmptyState
              icon={ShieldAlert}
              headingLevel={1}
              title="Area non disponibile per questo ruolo"
              description={`Il ruolo demo "${ROLE_LABELS[role]}" non ha accesso a questa sezione. Dal menu in alto a destra puoi cambiare ruolo e vedere l'interfaccia riservata.`}
              action={
                <Button onClick={() => router.push(homeRouteForRole(role))}>
                  Vai alla mia area
                </Button>
              }
            />
          </div>
        </main>
      </div>
    );
  }

  if (pathname === "/app/cucina") {
    return (
      <div className="min-h-screen bg-zinc-950">
        <SkipLink />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-screen focus:outline-none"
        >
          {children}
        </main>
      </div>
    );
  }

  if (role === "cameriere") {
    return <WaiterFrame>{children}</WaiterFrame>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <SkipLink />
      <Sidebar />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          aria-describedby={undefined}
          className="w-72 max-w-72 border-0 p-0"
        >
          <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <StoreGate>
      <AppShellInner>{children}</AppShellInner>
    </StoreGate>
  );
}

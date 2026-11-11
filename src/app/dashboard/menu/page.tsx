import type { Metadata } from "next";
import { ChefHat } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { MenuManager } from "@/components/dashboard/menu-manager";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import {
  canManageMenu,
  getActiveRestaurant,
  getMenu,
} from "@/server/menu/queries";

export const metadata: Metadata = {
  title: "Menu e prodotti",
  description: "Gestione reale di categorie, prodotti e disponibilità del menu.",
};

async function MenuContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/menu");
  }

  if (session.membershipsError) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Impossibile verificare l&apos;account
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Il database non è raggiungibile in questo momento. Riprova tra poco.
        </p>
        <Button className="mt-5" asChild>
          <Link href="/dashboard/menu">Riprova</Link>
        </Button>
      </div>
    );
  }

  const membership = session.activeMembership;

  if (!membership && !session.isPlatformAdmin) {
    redirect("/onboarding");
  }

  const restaurant = await getActiveRestaurant();

  if (!restaurant) {
    return (
      <NoRestaurant
        eyebrow="Menu e prodotti"
        title="Menu e prodotti"
        description="Serve una sede attiva per gestire categorie, prodotti e disponibilità."
      />
    );
  }

  const [menu, canManage] = await Promise.all([
    getMenu(restaurant.id),
    canManageMenu(restaurant.id),
  ]);

  return (
    <DashboardShell
      eyebrow="Menu e prodotti"
      title={restaurant.name}
      description={`Categorie, prodotti e disponibilità salvati nel database reale di ${restaurant.organizationName}.`}
      actions={
        canManage ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/ricette">
              <ChefHat />
              Ricette e food cost
            </Link>
          </Button>
        ) : (
          <Badge variant="muted">Solo lettura per il tuo ruolo</Badge>
        )
      }
    >
      <MenuManager
        categories={menu.categories}
        items={menu.items}
        canManage={canManage}
      />
    </DashboardShell>
  );
}

export default function DashboardMenuPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MenuContent />
    </Suspense>
  );
}

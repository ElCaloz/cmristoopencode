import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { FloorManager } from "@/components/dashboard/floor-manager";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import { getActiveRestaurant } from "@/server/restaurant/active";
import { canManageFloor, getFloor } from "@/server/tables/queries";

export const metadata: Metadata = {
  title: "Sala e tavoli",
  description: "Gestione reale di aree, tavoli e capienze del locale.",
};

async function FloorContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/sala");
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
          <Link href="/dashboard/sala">Riprova</Link>
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
        eyebrow="Sala e tavoli"
        title="Sala e tavoli"
        description="Serve una sede attiva per gestire aree, tavoli e piantina."
      />
    );
  }

  const [floor, canManage] = await Promise.all([
    getFloor(restaurant.id),
    canManageFloor(restaurant.id),
  ]);

  return (
    <DashboardShell
      eyebrow="Sala e tavoli"
      title={restaurant.name}
      description={`Aree, tavoli e capienze salvati nel database reale di ${restaurant.organizationName}.`}
      actions={
        !canManage ? (
          <Badge variant="muted">Solo lettura per il tuo ruolo</Badge>
        ) : undefined
      }
    >
      <FloorManager
        areas={floor.areas}
        tables={floor.tables}
        objects={floor.objects}
        canManage={canManage}
      />
    </DashboardShell>
  );
}

export default function DashboardSalaPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <FloorContent />
    </Suspense>
  );
}

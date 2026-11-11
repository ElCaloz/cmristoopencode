import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { PosManager } from "@/components/dashboard/pos-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMenu } from "@/server/menu/queries";
import { canOperatePos, getOpenOrders } from "@/server/pos/queries";
import { getActiveRestaurant } from "@/server/restaurant/active";
import { getSessionContext } from "@/server/auth/session";
import { getFloor } from "@/server/tables/queries";

export const metadata: Metadata = {
  title: "Cassa POS",
  description:
    "Cassa reale: conti tavolo, prodotti, pagamenti idempotenti e saldo.",
};

async function PosContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/pos");
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
          <Link href="/dashboard/pos">Riprova</Link>
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
        eyebrow="Cassa POS"
        title="Cassa POS"
        description="Serve una sede attiva per aprire conti e registrare incassi."
      />
    );
  }

  const [floor, menu, posData, canOperate] = await Promise.all([
    getFloor(restaurant.id),
    getMenu(restaurant.id),
    getOpenOrders(restaurant.id),
    canOperatePos(restaurant.id),
  ]);

  const availableItems = menu.items.filter((item) => item.isAvailable);

  return (
    <DashboardShell
      eyebrow="Cassa POS"
      title={restaurant.name}
      description={`Conti tavolo con prezzi presi dal menu reale, pagamenti idempotenti e tracciamento nel registro attività di ${restaurant.organizationName}.`}
      actions={
        !canOperate ? (
          <Badge variant="muted">Solo lettura per il tuo ruolo</Badge>
        ) : undefined
      }
    >
      <PosManager
        areas={floor.areas}
        tables={floor.tables.filter((table) => table.isActive)}
        categories={menu.categories}
        items={availableItems}
        openOrders={posData.openOrders}
        canOperate={canOperate}
      />
    </DashboardShell>
  );
}

export default function DashboardPosPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PosContent />
    </Suspense>
  );
}

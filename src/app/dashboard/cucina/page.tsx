import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { KitchenManager } from "@/components/dashboard/kitchen-manager";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import { canOperateKitchen, getKitchenBoard } from "@/server/kds/queries";
import { getActiveRestaurant } from "@/server/restaurant/active";
import { getFloor } from "@/server/tables/queries";

export const metadata: Metadata = {
  title: "Cucina (KDS)",
  description:
    "Kitchen Display reale: righe in attesa, in preparazione e pronte al pass con transizioni verificate lato database.",
};

async function KitchenContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/cucina");
  }

  if (session.membershipsError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white">
        <h1 className="text-xl font-semibold">Impossibile verificare l&apos;account</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Il database non è raggiungibile in questo momento. Riprova tra poco.
        </p>
        <Button className="mt-5" variant="dark" asChild>
          <Link href="/dashboard/cucina">Riprova</Link>
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
        eyebrow="Cucina (KDS)"
        title="Cucina (KDS)"
        description="Serve una sede attiva per ricevere le comande in cucina."
        tone="dark"
      />
    );
  }

  const [floor, board, canOperate] = await Promise.all([
    getFloor(restaurant.id),
    getKitchenBoard(restaurant.id),
    canOperateKitchen(restaurant.id),
  ]);

  const tables = floor.tables
    .filter((table) => table.isActive)
    .map((table) => ({ id: table.id, name: table.name }));

  return (
    <DashboardShell
      eyebrow="Cucina (KDS)"
      title={restaurant.name}
      description="Righe dei conti aperti: avvia la preparazione, segna pronto al pass e servito. Le transizioni sono validate dal database."
      tone="dark"
      actions={
        !canOperate ? (
          <Badge variant="dark">Solo lettura per il tuo ruolo</Badge>
        ) : undefined
      }
    >
      <KitchenManager
        tables={tables}
        items={board.items}
        canOperate={canOperate}
      />
    </DashboardShell>
  );
}

export default function DashboardCucinaPage() {
  return (
    <Suspense fallback={<DashboardSkeleton tone="dark" />}>
      <KitchenContent />
    </Suspense>
  );
}

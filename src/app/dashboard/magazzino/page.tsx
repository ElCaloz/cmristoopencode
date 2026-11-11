import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { InventoryManager } from "@/components/dashboard/inventory-manager";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import {
  canManageInventory,
  getActiveRestaurant,
  getInventory,
} from "@/server/inventory/queries";

export const metadata: Metadata = {
  title: "Magazzino",
  description:
    "Gestione reale di fornitori, giacenze, lotti, scadenze e movimenti di magazzino.",
};

async function InventoryContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/magazzino");
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
          <Link href="/dashboard/magazzino">Riprova</Link>
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
        eyebrow="Magazzino"
        title="Magazzino"
        description="Serve una sede attiva per gestire giacenze, lotti e movimenti."
      />
    );
  }

  const canManage = await canManageInventory(restaurant.id);

  return (
    <DashboardShell
      eyebrow="Magazzino"
      title={restaurant.name}
      description={`Giacenze, fornitori, lotti e scadenze salvati nel database reale di ${restaurant.organizationName}.`}
      actions={
        <Badge variant="secondary">
          {membership?.roleName ?? "Piattaforma"}
        </Badge>
      }
    >
      {canManage ? (
        <InventoryData restaurantId={restaurant.id} />
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex items-center gap-2">
            <LockKeyhole className="size-4 text-amber-700 dark:text-amber-300" />
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Accesso riservato
            </h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            Il ruolo {membership?.roleName ?? "assegnato"} non dispone del
            permesso di gestire il magazzino. Chiedi a un proprietario o a un
            responsabile di abilitarti.
          </p>
          <Button className="mt-4" size="sm" variant="outline" asChild>
            <Link href="/dashboard">Torna alla dashboard</Link>
          </Button>
        </section>
      )}
    </DashboardShell>
  );
}

async function InventoryData({ restaurantId }: { restaurantId: string }) {
  const inventory = await getInventory(restaurantId);

  return (
    <InventoryManager
      items={inventory.items}
      suppliers={inventory.suppliers}
      movements={inventory.movements}
    />
  );
}

export default function DashboardInventoryPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <InventoryContent />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { PurchasingManager } from "@/components/dashboard/purchasing-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import {
  canManagePurchasing,
  canReadPurchasing,
  getActiveRestaurant,
  getPurchasingData,
} from "@/server/purchasing/queries";

export const metadata: Metadata = {
  title: "Acquisti",
  description:
    "Ordini ai fornitori, ricezioni e aggiornamento reale delle giacenze di magazzino.",
};

async function PurchasingContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/acquisti");
  }

  if (session.membershipsError) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Impossibile verificare l&apos;account
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Il database non e raggiungibile in questo momento. Riprova tra poco.
        </p>
        <Button className="mt-5" asChild>
          <Link href="/dashboard/acquisti">Riprova</Link>
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
        eyebrow="Acquisti"
        title="Acquisti"
        description="Serve una sede attiva per emettere ordini ai fornitori e registrarne la ricezione."
      />
    );
  }

  const [canManage, canRead] = await Promise.all([
    canManagePurchasing(restaurant.id),
    canReadPurchasing(restaurant.id),
  ]);

  return (
    <DashboardShell
      eyebrow="Acquisti"
      title={restaurant.name}
      description={`Ordini ai fornitori, ricezioni e aggiornamento delle giacenze di ${restaurant.organizationName}.`}
      actions={
        <Badge variant="secondary">
          {membership?.roleName ?? "Piattaforma"}
        </Badge>
      }
    >
      {canRead ? (
        <PurchasingData
          restaurantId={restaurant.id}
          readOnly={!canManage}
        />
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex items-center gap-2">
            <LockKeyhole className="size-4 text-amber-700 dark:text-amber-300" />
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Accesso riservato
            </h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            Gli acquisti richiedono il permesso di gestione magazzino o di
            lettura report. Il ruolo{" "}
            {membership?.roleName ?? "assegnato"} non dispone di questi
            permessi. Chiedi a un proprietario o a un responsabile di
            abilitarti.
          </p>
          <Button className="mt-4" size="sm" variant="outline" asChild>
            <Link href="/dashboard">Torna alla dashboard</Link>
          </Button>
        </section>
      )}
    </DashboardShell>
  );
}

async function PurchasingData({
  restaurantId,
  readOnly,
}: {
  restaurantId: string;
  readOnly: boolean;
}) {
  const data = await getPurchasingData(restaurantId);

  return (
    <PurchasingManager
      suppliers={data.suppliers}
      items={data.items}
      orders={data.orders}
      readOnly={readOnly}
    />
  );
}

function PurchasingSkeleton() {
  return <DashboardSkeleton />;
}

export default function DashboardPurchasingPage() {
  return (
    <Suspense fallback={<PurchasingSkeleton />}>
      <PurchasingContent />
    </Suspense>
  );
}

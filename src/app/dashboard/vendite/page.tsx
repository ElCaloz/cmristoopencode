import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { SalesManager } from "@/components/dashboard/sales-manager";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import { getActiveRestaurant } from "@/server/restaurant/active";
import {
  canReadSales,
  dayFromDate,
  getSalesDay,
  normalizeDay,
} from "@/server/sales/queries";

export const metadata: Metadata = {
  title: "Vendite e incassi",
  description:
    "Incassi reali derivati dai pagamenti registrati dalla cassa POS.",
};

type SalesSearchParams = Promise<{ date?: string }>;

async function SalesContent({
  searchParams,
}: {
  searchParams: SalesSearchParams;
}) {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/vendite");
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
          <Link href="/dashboard/vendite">Riprova</Link>
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
        eyebrow="Vendite e incassi"
        title="Vendite e incassi"
        description="Serve una sede attiva per consultare incassi e chiusure."
      />
    );
  }

  const params = await searchParams;
  const today = dayFromDate(new Date());
  const day = normalizeDay(params.date, today);

  const allowed = await canReadSales(restaurant.id);

  if (!allowed) {
    return (
      <DashboardShell
        eyebrow="Vendite e incassi"
        title={restaurant.name}
        description={`Incassi derivati dalle transazioni reali registrate dal POS e tracciate nel registro attività di ${restaurant.organizationName}.`}
      >
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Vendite non disponibili per il tuo ruolo
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            La consultazione di vendite e incassi richiede il permesso di
            reportistica, verificato lato server. Ruoli abilitati:
            proprietario, amministratore, responsabile, cassiere,
            commercialista e marketing.
          </p>
          <Button className="mt-4" size="sm" variant="outline" asChild>
            <Link href="/dashboard">Torna alla dashboard</Link>
          </Button>
        </section>
      </DashboardShell>
    );
  }

  const data = await getSalesDay(restaurant.id, day);

  return (
    <DashboardShell
      eyebrow="Vendite e incassi"
      title={restaurant.name}
      description={`Incassi derivati dalle transazioni reali registrate dal POS e tracciate nel registro attività di ${restaurant.organizationName}.`}
    >
      <SalesManager day={day} today={today} data={data} />
    </DashboardShell>
  );
}

export default function DashboardSalesPage({
  searchParams,
}: {
  searchParams: SalesSearchParams;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SalesContent searchParams={searchParams} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { DevicesManager } from "@/components/dashboard/devices-manager";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import {
  canManageDevices,
  getDevicesOverview,
  getOperatorPinsOverview,
} from "@/server/devices/queries";
import { getActiveRestaurant } from "@/server/restaurant/active";

export const metadata: Metadata = {
  title: "Dispositivi",
  description:
    "Registro dei palmari e dei dispositivi collegati al locale, con codici di attivazione monouso e limite verificato lato server.",
};

async function DevicesContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/dispositivi");
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
          <Link href="/dashboard/dispositivi">Riprova</Link>
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
        eyebrow="Dispositivi"
        title="Dispositivi"
        description="Serve una sede attiva per registrare palmari e codici di attivazione."
      />
    );
  }

  const allowed = await canManageDevices(restaurant.id);

  if (!allowed) {
    return (
      <DashboardShell
        eyebrow="Dispositivi"
        title={restaurant.name}
        description={`Palmari e dispositivi del locale con stati, codici di attivazione monouso e limite di quattro palmari verificato dal database di ${restaurant.organizationName}.`}
      >
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Gestione dispositivi non disponibile per il tuo ruolo
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            La registrazione e la revoca dei palmari richiede il permesso di
            gestione dispositivi, verificato lato server. Ruoli abilitati:
            proprietario, amministratore e responsabile.
          </p>
          <Button className="mt-4" size="sm" variant="outline" asChild>
            <Link href="/dashboard">Torna alla dashboard</Link>
          </Button>
        </section>
      </DashboardShell>
    );
  }

  const [overview, operators] = await Promise.all([
    getDevicesOverview(restaurant.id),
    getOperatorPinsOverview(restaurant.id),
  ]);

  return (
    <DashboardShell
      eyebrow="Dispositivi"
      title={restaurant.name}
      description={`Palmari e dispositivi del locale con stati, codici di attivazione monouso e limite di quattro palmari verificato dal database di ${restaurant.organizationName}.`}
    >
      <DevicesManager overview={overview} operators={operators} />
    </DashboardShell>
  );
}

export default function DashboardDevicesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DevicesContent />
    </Suspense>
  );
}

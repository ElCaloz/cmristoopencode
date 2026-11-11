import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { ReservationsManager } from "@/components/dashboard/reservations-manager";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import {
  canManageReservations,
  getReservations,
} from "@/server/reservations/queries";
import { getActiveRestaurant } from "@/server/restaurant/active";

export const metadata: Metadata = {
  title: "Prenotazioni",
  description:
    "Prenotazioni reali del locale con disponibilità verificata su capienza, orari e chiusure.",
};

async function ReservationsContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/prenotazioni");
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
          <Link href="/dashboard/prenotazioni">Riprova</Link>
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
        eyebrow="Prenotazioni"
        title="Prenotazioni"
        description="Serve una sede attiva per gestire agenda e disponibilità."
      />
    );
  }

  const allowed = await canManageReservations(restaurant.id);

  if (!allowed) {
    return (
      <DashboardShell
        eyebrow="Prenotazioni"
        title={restaurant.name}
        description={`Prenotazioni del locale con disponibilità calcolata su tavoli attivi, orari e chiusure di ${restaurant.organizationName}.`}
      >
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Prenotazioni non disponibili per il tuo ruolo
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            La gestione delle prenotazioni richiede il permesso verificato
            lato server. Ruoli abilitati: proprietario, amministratore,
            responsabile e host.
          </p>
          <Button className="mt-4" size="sm" variant="outline" asChild>
            <Link href="/dashboard">Torna alla dashboard</Link>
          </Button>
        </section>
      </DashboardShell>
    );
  }

  const reservations = await getReservations(restaurant.id);

  return (
    <DashboardShell
      eyebrow="Prenotazioni"
      title={restaurant.name}
      description={`Prenotazioni del locale con disponibilità calcolata su tavoli attivi, orari e chiusure di ${restaurant.organizationName}.`}
    >
      <ReservationsManager reservations={reservations} />
    </DashboardShell>
  );
}

export default function DashboardReservationsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ReservationsContent />
    </Suspense>
  );
}

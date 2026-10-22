import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LocationsManager } from "@/components/dashboard/locations-manager";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { Button } from "@/components/ui/button";
import { requireDashboardContext } from "@/server/dashboard/context";
import {
  canManageRestaurants,
  canManageSettings,
  getOrganizationRestaurants,
} from "@/server/restaurant/queries";

export const metadata: Metadata = {
  title: "Sedi",
  description: "Gestione delle sedi dell'organizzazione e sede attiva.",
};

async function LocationsContent() {
  const { session, restaurant } = await requireDashboardContext("/dashboard/sedi");

  if (!restaurant) {
    return (
      <NoRestaurant
        eyebrow="Sedi"
        title="Sedi dell'organizzazione"
        description="Crea e gestisci le sedi del ristorante."
      />
    );
  }

  const data = await getOrganizationRestaurants();
  if (!data) {
    return (
      <NoRestaurant
        eyebrow="Sedi"
        title="Sedi dell'organizzazione"
        description="Organizzazione non disponibile."
      />
    );
  }

  const [manageRestaurants, manageSettings] = await Promise.all([
    canManageRestaurants(data.organizationId),
    canManageSettings(restaurant.id),
  ]);

  return (
    <DashboardShell
      eyebrow="Sedi"
      title={data.organizationName}
      description={`Ogni sede ha menu, sala, cassa e dati separati. La sede attiva è usata da tutte le pagine operative; i membri con accesso a una sola sede non possono cambiarla. Utente: ${session.user.email ?? ""}`}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Panoramica</Link>
        </Button>
      }
    >
      <LocationsManager
        data={data}
        activeRestaurantId={restaurant.id}
        canManageRestaurants={manageRestaurants}
        canManageSettings={manageSettings}
      />
    </DashboardShell>
  );
}

function LocationsSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 h-40 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function DashboardLocationsPage() {
  return (
    <Suspense fallback={<LocationsSkeleton />}>
      <LocationsContent />
    </Suspense>
  );
}

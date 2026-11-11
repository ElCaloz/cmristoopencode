import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { ReceptionistManager } from "@/components/dashboard/receptionist-manager";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import {
  canManageReceptionist,
  getReceptionistOverview,
  isReceptionistApiConfigured,
} from "@/server/receptionist/queries";
import { getActiveRestaurant } from "@/server/restaurant/active";

export const metadata: Metadata = {
  title: "Receptionist AI",
  description:
    "Configurazione del receptionist vocale: orari, chiusure, limiti e registro chiamate. Nessun servizio telefonico reale è collegato.",
};

async function ReceptionistContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/receptionist");
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
          <Link href="/dashboard/receptionist">Riprova</Link>
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
        eyebrow="Receptionist AI"
        title="Receptionist AI"
        description="Serve una sede attiva per configurare orari, limiti e chiamate."
      />
    );
  }

  const allowed = await canManageReceptionist(restaurant.id);

  if (!allowed) {
    return (
      <DashboardShell
        eyebrow="Receptionist AI"
        title={restaurant.name}
        description={`Orari, chiusure, limiti e registro chiamate di ${restaurant.organizationName}. Le prenotazioni telefoniche nascono sempre da confermare.`}
      >
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Configurazione non disponibile per il tuo ruolo
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            La configurazione del receptionist richiede il permesso dedicato,
            verificato lato server. Ruoli abilitati: proprietario,
            amministratore e responsabile.
          </p>
          <Button className="mt-4" size="sm" variant="outline" asChild>
            <Link href="/dashboard">Torna alla dashboard</Link>
          </Button>
        </section>
      </DashboardShell>
    );
  }

  const overview = await getReceptionistOverview(restaurant.id);
  const apiConfigured = isReceptionistApiConfigured();

  return (
    <DashboardShell
      eyebrow="Receptionist AI"
      title={restaurant.name}
      description={`Orari, chiusure, limiti e registro chiamate di ${restaurant.organizationName}. Le prenotazioni telefoniche nascono sempre da confermare.`}
    >
      <ReceptionistManager overview={overview} apiConfigured={apiConfigured} />
    </DashboardShell>
  );
}

export default function DashboardReceptionistPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ReceptionistContent />
    </Suspense>
  );
}

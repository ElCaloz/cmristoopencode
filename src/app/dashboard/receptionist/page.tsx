import type { Metadata } from "next";
import { ArrowLeft, Bot, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { ReceptionistManager } from "@/components/dashboard/receptionist-manager";
import { SignOutForm } from "@/components/dashboard/sign-out-form";
import { Badge } from "@/components/ui/badge";
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/dashboard" aria-label="CM Risto - dashboard">
              <Logo />
            </Link>
            <SignOutForm compact />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-amber-700 dark:text-amber-300" />
              <h1 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Nessun ristorante associato
              </h1>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              Questo account non ha un ristorante attivo di cui configurare il
              receptionist.
            </p>
            <Button className="mt-4" size="sm" variant="outline" asChild>
              <Link href="/dashboard">Torna alla dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const allowed = await canManageReceptionist(restaurant.id);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/dashboard" aria-label="CM Risto - dashboard">
              <Logo />
            </Link>
            <SignOutForm compact />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-zinc-500 dark:text-zinc-400" />
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Configurazione non disponibile per il tuo ruolo
              </h1>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              La configurazione del receptionist richiede il permesso dedicato,
              verificato lato server. Ruoli abilitati: proprietario,
              amministratore e responsabile.
            </p>
            <Button className="mt-4" size="sm" variant="outline" asChild>
              <Link href="/dashboard">Torna alla dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const overview = await getReceptionistOverview(restaurant.id);
  const apiConfigured = isReceptionistApiConfigured();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" aria-label="CM Risto - dashboard">
              <Logo />
            </Link>
            <Badge variant="success" dot className="hidden sm:inline-flex">
              Area reale
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft />
                Dashboard
              </Link>
            </Button>
            <SignOutForm compact />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">
            <Bot className="size-3.5" />
            Receptionist AI
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {restaurant.name}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Orari, chiusure, limiti e registro chiamate di{" "}
            {restaurant.organizationName}. Le prenotazioni telefoniche nascono
            sempre da confermare.
          </p>
        </div>

        <div className="mt-6">
          <ReceptionistManager overview={overview} apiConfigured={apiConfigured} />
        </div>
      </main>
    </div>
  );
}

function ReceptionistSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto h-16 w-full max-w-6xl px-4 sm:px-6" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 h-40 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
        <div className="mt-4 h-72 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function DashboardReceptionistPage() {
  return (
    <Suspense fallback={<ReceptionistSkeleton />}>
      <ReceptionistContent />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { PurchasingManager } from "@/components/dashboard/purchasing-manager";
import { SignOutForm } from "@/components/dashboard/sign-out-form";
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
              Questo account non ha un ristorante attivo su cui gestire gli
              acquisti.
            </p>
            <Button className="mt-4" size="sm" variant="outline" asChild>
              <Link href="/dashboard">Torna alla dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const [canManage, canRead] = await Promise.all([
    canManagePurchasing(restaurant.id),
    canReadPurchasing(restaurant.id),
  ]);

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
              <Link href="/dashboard/magazzino">
                <ArrowLeft />
                Magazzino
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <SignOutForm compact />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">
              Acquisti
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {restaurant.name}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Ordini ai fornitori, ricezioni e aggiornamento delle giacenze di{" "}
              {restaurant.organizationName}.
            </p>
          </div>
          <Badge variant="secondary">
            {membership?.roleName ?? "Piattaforma"}
          </Badge>
        </div>

        <div className="mt-6">
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
        </div>
      </main>
    </div>
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
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto h-16 w-full max-w-6xl px-4 sm:px-6" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
        <div className="mt-5 h-80 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function DashboardPurchasingPage() {
  return (
    <Suspense fallback={<PurchasingSkeleton />}>
      <PurchasingContent />
    </Suspense>
  );
}

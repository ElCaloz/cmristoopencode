import type { Metadata } from "next";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { PosManager } from "@/components/dashboard/pos-manager";
import { SignOutForm } from "@/components/dashboard/sign-out-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMenu } from "@/server/menu/queries";
import { canOperatePos, getOpenOrders } from "@/server/pos/queries";
import { getActiveRestaurant } from "@/server/restaurant/active";
import { getSessionContext } from "@/server/auth/session";
import { getFloor } from "@/server/tables/queries";

export const metadata: Metadata = {
  title: "Cassa POS",
  description:
    "Cassa reale: conti tavolo, prodotti, pagamenti idempotenti e saldo.",
};

async function PosContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/pos");
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
          <Link href="/dashboard/pos">Riprova</Link>
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
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/dashboard" aria-label="CM Risto — dashboard">
              <Logo />
            </Link>
            <SignOutForm compact />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-amber-700 dark:text-amber-300" />
              <h1 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Nessun ristorante associato
              </h1>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              Questo account non ha un ristorante attivo su cui operare con la
              cassa. Se hai appena ricevuto un invito, verifica di essere
              membro attivo dell&apos;organizzazione.
            </p>
            <Button className="mt-4" size="sm" variant="outline" asChild>
              <Link href="/dashboard">Torna alla dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const [floor, menu, posData, canOperate] = await Promise.all([
    getFloor(restaurant.id),
    getMenu(restaurant.id),
    getOpenOrders(restaurant.id),
    canOperatePos(restaurant.id),
  ]);

  const availableItems = menu.items.filter((item) => item.isAvailable);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" aria-label="CM Risto — dashboard">
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">
              Cassa POS
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {restaurant.name}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Conti tavolo con prezzi presi dal menu reale, pagamenti
              idempotenti e tracciamento nel registro attività di{" "}
              {restaurant.organizationName}.
            </p>
          </div>
          {!canOperate ? (
            <Badge variant="muted">Solo lettura per il tuo ruolo</Badge>
          ) : null}
        </div>

        <div className="mt-6">
          <PosManager
            areas={floor.areas}
            tables={floor.tables.filter((table) => table.isActive)}
            categories={menu.categories}
            items={availableItems}
            openOrders={posData.openOrders}
            canOperate={canOperate}
          />
        </div>
      </main>
    </div>
  );
}

function PosSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto h-16 w-full max-w-6xl px-4 sm:px-6" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="h-72 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
          <div className="h-72 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPosPage() {
  return (
    <Suspense fallback={<PosSkeleton />}>
      <PosContent />
    </Suspense>
  );
}

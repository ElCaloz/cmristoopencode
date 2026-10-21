import type { Metadata } from "next";
import { ArrowLeft, ChefHat, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { KitchenManager } from "@/components/dashboard/kitchen-manager";
import { SignOutForm } from "@/components/dashboard/sign-out-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import { canOperateKitchen, getKitchenBoard } from "@/server/kds/queries";
import { getActiveRestaurant } from "@/server/restaurant/active";
import { getFloor } from "@/server/tables/queries";

export const metadata: Metadata = {
  title: "Cucina (KDS)",
  description:
    "Kitchen Display reale: righe in attesa, in preparazione e pronte al pass con transizioni verificate lato database.",
};

async function KitchenContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/cucina");
  }

  if (session.membershipsError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white">
        <h1 className="text-xl font-semibold">Impossibile verificare l&apos;account</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Il database non è raggiungibile in questo momento. Riprova tra poco.
        </p>
        <Button className="mt-5" variant="dark" asChild>
          <Link href="/dashboard/cucina">Riprova</Link>
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
      <div className="min-h-screen bg-zinc-950 text-white">
        <header className="border-b border-white/10">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/dashboard" aria-label="CM Risto — dashboard">
              <Logo inverted />
            </Link>
            <SignOutForm compact inverted />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-amber-300" />
              <h1 className="text-sm font-semibold text-amber-200">
                Nessun ristorante associato
              </h1>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
              Questo account non ha un ristorante attivo su cui operare con la
              cucina. Se hai appena ricevuto un invito, verifica di essere
              membro attivo dell&apos;organizzazione.
            </p>
            <Button className="mt-4" size="sm" variant="dark" asChild>
              <Link href="/dashboard">Torna alla dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const [floor, board, canOperate] = await Promise.all([
    getFloor(restaurant.id),
    getKitchenBoard(restaurant.id),
    canOperateKitchen(restaurant.id),
  ]);

  const tables = floor.tables
    .filter((table) => table.isActive)
    .map((table) => ({ id: table.id, name: table.name }));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" aria-label="CM Risto — dashboard">
              <Logo inverted />
            </Link>
            <Badge variant="dark" className="hidden sm:inline-flex">
              Area reale
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-zinc-300" asChild>
              <Link href="/dashboard">
                <ArrowLeft />
                Dashboard
              </Link>
            </Button>
            <SignOutForm compact inverted />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-700 text-white">
              <ChefHat className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-400">
                Cucina · Kitchen Display
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
                {restaurant.name}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Righe dei conti aperti: avvia la preparazione, segna pronto al
                pass e servito. Le transizioni sono validate dal database.
              </p>
            </div>
          </div>
          {!canOperate ? (
            <Badge variant="dark">Solo lettura per il tuo ruolo</Badge>
          ) : null}
        </div>

        <div className="mt-6">
          <KitchenManager
            tables={tables}
            items={board.items}
            canOperate={canOperate}
          />
        </div>
      </main>
    </div>
  );
}

function KitchenSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-white/10">
        <div className="mx-auto h-16 w-full max-w-6xl px-4 sm:px-6" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-800" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-zinc-800" />
        <div className="mt-6 grid gap-2 md:grid-cols-3 xl:gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardCucinaPage() {
  return (
    <Suspense fallback={<KitchenSkeleton />}>
      <KitchenContent />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { ShieldCheck, TabletSmartphone } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { PalmareBoardView } from "@/components/palmare/board-view";
import { ClaimForm } from "@/components/palmare/claim-form";
import { PalmareLoginForm } from "@/components/palmare/login-form";
import { getPalmareState } from "@/server/palmare/queries";

export const metadata: Metadata = {
  title: "Palmare",
  description:
    "Palmare CM Risto: attivazione dispositivo, accesso operatore con PIN personale e consultazione della sala in tempo reale.",
};

async function PalmareContent() {
  const state = await getPalmareState();

  if (state.kind === "board") {
    return <PalmareBoardView board={state.board} menu={state.menu} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Link href="/" aria-label="CM Risto — home">
            <Logo />
          </Link>
          <span className="mt-5 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400">
            {state.kind === "login" ? (
              <ShieldCheck className="size-6" />
            ) : (
              <TabletSmartphone className="size-6" />
            )}
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {state.kind === "login" ? "Accesso operatore" : "Attivazione dispositivo"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {state.kind === "login"
              ? `Palmare "${state.device.name || "attivo"}" collegato a ${
                  state.device.restaurantName || "questo ristorante"
                }. Ogni operatore usa il proprio PIN personale.`
              : "Inserisci il codice monouso generato dal gestionale, sezione Dispositivi. Ogni codice attiva un solo dispositivo e scade dopo 15 minuti."}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {state.kind === "login" ? (
            <PalmareLoginForm
              device={state.device}
              operators={state.operators}
            />
          ) : (
            <ClaimForm />
          )}
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Il limite dei palmari, gli stati dei dispositivi e i PIN operatore
          sono verificati dal server a ogni accesso. La gestione è riservata ai
          ruoli autorizzati nel gestionale.
        </p>
      </div>
    </main>
  );
}

function PalmareSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mx-auto h-8 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 h-64 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </main>
  );
}

export default function PalmarePage() {
  return (
    <Suspense fallback={<PalmareSkeleton />}>
      <PalmareContent />
    </Suspense>
  );
}

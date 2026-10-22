import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MfaManager } from "@/components/dashboard/mfa-manager";
import { getMfaOverview } from "@/server/auth/mfa";
import { getSessionContext } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Sicurezza account",
  description:
    "Verifica in due passaggi con app di autenticazione per proteggere l'account.",
};

type SecuritySearchParams = Promise<{ mfa?: string }>;

async function SecurityContent({
  searchParams,
}: {
  searchParams: SecuritySearchParams;
}) {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/sicurezza");
  }

  const [overview, params] = await Promise.all([
    getMfaOverview(),
    searchParams,
  ]);

  if (!overview) {
    redirect("/login?reason=session&next=/dashboard/sicurezza");
  }

  return (
    <DashboardShell
      eyebrow="Sicurezza account"
      title={session.user.email ?? "Il tuo account"}
      description="La verifica in due passaggi protegge la dashboard anche in caso di password compromessa. Quando è attiva, il proxy richiede una sessione elevata (aal2) prima di accedere alle pagine operative."
    >
      {params.mfa === "required" ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          Per continuare devi completare la verifica in due passaggi: inserisci
          il codice generato dall&apos;app di autenticazione qui sotto.
        </p>
      ) : null}
      <MfaManager overview={overview} />
    </DashboardShell>
  );
}

function SecuritySkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 h-40 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function DashboardSecurityPage({
  searchParams,
}: {
  searchParams: SecuritySearchParams;
}) {
  return (
    <Suspense fallback={<SecuritySkeleton />}>
      <SecurityContent searchParams={searchParams} />
    </Suspense>
  );
}

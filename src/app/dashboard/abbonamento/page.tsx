import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BillingManager } from "@/components/dashboard/billing-manager";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getBillingOverview } from "@/server/billing/queries";
import { requireDashboardContext } from "@/server/dashboard/context";

export const metadata: Metadata = {
  title: "Abbonamento e fatturazione",
  description: "Piano attivo, attivazione con Stripe e gestione della fatturazione.",
};

type BillingSearchParams = Promise<{ checkout?: string; billing?: string }>;

async function BillingContent({
  searchParams,
}: {
  searchParams: BillingSearchParams;
}) {
  const { session } = await requireDashboardContext("/dashboard/abbonamento");

  const membership = session.activeMembership;
  if (!membership) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const [{ data: allowed }, overview, params] = await Promise.all([
    supabase.rpc("auth_has_permission", {
      p_organization_id: membership.organizationId,
      p_permission: "organization.manage",
    }),
    getBillingOverview(membership.organizationId),
    searchParams,
  ]);

  if (!overview) {
    return (
      <DashboardShell
        eyebrow="Abbonamento e fatturazione"
        title="Organizzazione non trovata"
        description="Impossibile leggere i dati di fatturazione dell'organizzazione attiva."
      >
        <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Torna alla dashboard e riprova.
        </p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      eyebrow="Abbonamento e fatturazione"
      title={overview.organizationName}
      description="Attiva o gestisci il piano dell'organizzazione. Pagamenti e fatture restano su Stripe; CM Risto registra solo l'esito del webhook firmato."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/integrazioni">Integrazioni</Link>
        </Button>
      }
    >
      <BillingManager
        overview={overview}
        canManage={allowed === true}
        checkoutResult={params.checkout ?? null}
        billingNotice={params.billing ?? null}
      />
    </DashboardShell>
  );
}

function BillingSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 h-40 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function DashboardBillingPage({
  searchParams,
}: {
  searchParams: BillingSearchParams;
}) {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent searchParams={searchParams} />
    </Suspense>
  );
}

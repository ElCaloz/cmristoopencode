import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { IntegrationsManager } from "@/components/dashboard/integrations-manager";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { Button } from "@/components/ui/button";
import { getIntegrationStatuses } from "@/lib/integrations/config";
import { getInboundSettings } from "@/server/billing/queries";
import { requireDashboardContext } from "@/server/dashboard/context";
import { canManagePrinters, getPrinterData } from "@/server/printers/queries";

export const metadata: Metadata = {
  title: "Integrazioni e stampanti",
  description:
    "Stato delle integrazioni, stampanti scontrino 58/80 mm, test email e SMS, ricezione messaggi.",
};

async function IntegrationsContent() {
  const { restaurant } = await requireDashboardContext("/dashboard/integrazioni");

  if (!restaurant) {
    return (
      <NoRestaurant
        eyebrow="Integrazioni e stampanti"
        title="Integrazioni"
        description="Stato dei servizi esterni e collegamento delle stampanti."
      />
    );
  }

  const [printerData, inbound, canManage] = await Promise.all([
    getPrinterData(restaurant.id),
    getInboundSettings(restaurant.id),
    canManagePrinters(restaurant.id),
  ]);

  return (
    <DashboardShell
      eyebrow="Integrazioni e stampanti"
      title={restaurant.name}
      description="Stato reale dei servizi configurati, stampanti collegate al servizio locale e test manuali dei canali email e SMS. Le integrazioni non configurate restano in modalità test."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/abbonamento">Piano e fatturazione</Link>
        </Button>
      }
    >
      <IntegrationsManager
        printers={printerData}
        inbound={inbound}
        integrations={getIntegrationStatuses()}
        canManage={canManage}
      />
    </DashboardShell>
  );
}

function IntegrationsSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 h-40 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function DashboardIntegrationsPage() {
  return (
    <Suspense fallback={<IntegrationsSkeleton />}>
      <IntegrationsContent />
    </Suspense>
  );
}

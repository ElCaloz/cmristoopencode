import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CrmManager } from "@/components/dashboard/crm-manager";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { Button } from "@/components/ui/button";
import {
  canManageCrmSettings,
  canManageCustomers,
  getCrmData,
} from "@/server/crm/queries";
import { requireDashboardContext } from "@/server/dashboard/context";

export const metadata: Metadata = {
  title: "Clienti e fedeltà",
  description: "CRM reale del ristorante: clienti, consensi, fedeltà e messaggi.",
};

async function CrmContent() {
  const { restaurant } = await requireDashboardContext("/dashboard/clienti");

  if (!restaurant) {
    return (
      <NoRestaurant
        eyebrow="Clienti e fedeltà"
        title="CRM"
        description="Gestione clienti, consensi marketing e programma fedeltà."
      />
    );
  }

  const [data, canManage, canManageSettings] = await Promise.all([
    getCrmData(restaurant.id),
    canManageCustomers(restaurant.id),
    canManageCrmSettings(restaurant.id),
  ]);

  return (
    <DashboardShell
      eyebrow="Clienti e fedeltà"
      title={restaurant.name}
      description="Anagrafica clienti, consensi tracciati, punti fedeltà e messaggi verso email e SMS. I dati restano isolati per organizzazione."
      actions={
        canManage ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/marketing">Campagne e inbox</Link>
          </Button>
        ) : null
      }
    >
      <CrmManager
        data={data}
        canManage={canManage}
        canManageSettings={canManageSettings}
      />
    </DashboardShell>
  );
}

function CrmSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 h-40 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function DashboardCustomersPage() {
  return (
    <Suspense fallback={<CrmSkeleton />}>
      <CrmContent />
    </Suspense>
  );
}

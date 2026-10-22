import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MarketingManager } from "@/components/dashboard/marketing-manager";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { Button } from "@/components/ui/button";
import { canManageMarketing, getMarketingData } from "@/server/marketing/queries";
import { requireDashboardContext } from "@/server/dashboard/context";

export const metadata: Metadata = {
  title: "Marketing e inbox",
  description: "Campagne email/SMS con consenso e inbox unificata dei messaggi.",
};

async function MarketingContent() {
  const { restaurant } = await requireDashboardContext("/dashboard/marketing");

  if (!restaurant) {
    return (
      <NoRestaurant
        eyebrow="Marketing e inbox"
        title="Marketing"
        description="Campagne email e SMS, segmenti e messaggi dei clienti."
      />
    );
  }

  const [data, canManage] = await Promise.all([
    getMarketingData(restaurant.id),
    canManageMarketing(restaurant.id),
  ]);

  return (
    <DashboardShell
      eyebrow="Marketing e inbox"
      title={restaurant.name}
      description="Campagne verso contatti con consenso, segmentazione reale e registro degli invii. L'invio richiede un provider configurato in Integrazioni."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/clienti">Clienti e consensi</Link>
        </Button>
      }
    >
      <MarketingManager data={data} canManage={canManage} />
    </DashboardShell>
  );
}

function MarketingSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 h-40 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function DashboardMarketingPage() {
  return (
    <Suspense fallback={<MarketingSkeleton />}>
      <MarketingContent />
    </Suspense>
  );
}

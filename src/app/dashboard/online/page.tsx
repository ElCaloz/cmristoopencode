import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { OnlineManager } from "@/components/dashboard/online-manager";
import { Button } from "@/components/ui/button";
import { getPublicSiteUrl } from "@/lib/integrations/config";
import { requireDashboardContext } from "@/server/dashboard/context";
import {
  canConfirmOnlineOrders,
  canManageOnline,
  getOnlineData,
} from "@/server/online/queries";

export const metadata: Metadata = {
  title: "Menu online e ordini",
  description: "Link pubblici con token, menu digitale e ordini online.",
};

async function OnlineContent() {
  const { restaurant } = await requireDashboardContext("/dashboard/online");

  if (!restaurant) {
    return (
      <NoRestaurant
        eyebrow="Menu online e ordini"
        title="Canali online"
        description="Link pubblici al menu e ordini ricevuti dai clienti."
      />
    );
  }

  const [data, canManage, canConfirm] = await Promise.all([
    getOnlineData(restaurant.id),
    canManageOnline(restaurant.id),
    canConfirmOnlineOrders(restaurant.id),
  ]);

  return (
    <DashboardShell
      eyebrow="Menu online e ordini"
      title={restaurant.name}
      description="Pubblica il menu con un link non prevedibile, ricevi ordini per ritiro, consegna o tavolo e trasformali in conti reali con un clic."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/menu">Gestisci il menu</Link>
        </Button>
      }
    >
      <OnlineManager
        data={data}
        siteUrl={getPublicSiteUrl()}
        restaurantName={restaurant.name}
        canManage={canManage}
        canConfirm={canConfirm}
      />
    </DashboardShell>
  );
}

function OnlineSkeleton() {
  return <DashboardSkeleton />;
}

export default function DashboardOnlinePage() {
  return (
    <Suspense fallback={<OnlineSkeleton />}>
      <OnlineContent />
    </Suspense>
  );
}

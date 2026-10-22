import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { StaffManager } from "@/components/dashboard/staff-manager";
import { Button } from "@/components/ui/button";
import { requireDashboardContext } from "@/server/dashboard/context";
import {
  canManageMembers,
  canManageStaff,
  getStaffData,
} from "@/server/staff/queries";

export const metadata: Metadata = {
  title: "Personale e turni",
  description: "Membri dello staff, ruoli, costo orario e pianificazione turni.",
};

async function StaffContent() {
  const { session, restaurant } = await requireDashboardContext("/dashboard/personale");

  if (!restaurant) {
    return (
      <NoRestaurant
        eyebrow="Personale e turni"
        title="Staff"
        description="Membri, ruoli, costo orario e turni della sede."
      />
    );
  }

  const [data, manageMembers, manageStaff] = await Promise.all([
    getStaffData(restaurant.id, restaurant.organizationId),
    canManageMembers(restaurant.id),
    canManageStaff(restaurant.id),
  ]);

  return (
    <DashboardShell
      eyebrow="Personale e turni"
      title={restaurant.name}
      description={`Membri dell'organizzazione ${session.activeMembership?.organizationName ?? ""}, ruoli verificati dal database e turni della sede attiva.`}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/sicurezza">Sicurezza account</Link>
        </Button>
      }
    >
      <StaffManager
        data={data}
        canManageMembers={manageMembers}
        canManageStaff={manageStaff}
      />
    </DashboardShell>
  );
}

function StaffSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 h-40 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function DashboardStaffPage() {
  return (
    <Suspense fallback={<StaffSkeleton />}>
      <StaffContent />
    </Suspense>
  );
}

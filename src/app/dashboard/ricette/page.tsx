import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { RecipeManager } from "@/components/dashboard/recipe-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import {
  canManageRecipes,
  getActiveRestaurant,
  getRecipes,
} from "@/server/recipes/queries";

export const metadata: Metadata = {
  title: "Ricette e food cost",
  description:
    "Gestione reale di ricette, ingredienti, sfridi, food cost e margini sui prezzi del menu.",
};

async function RecipesContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/ricette");
  }

  if (session.membershipsError) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Impossibile verificare l&apos;account
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Il database non e raggiungibile in questo momento. Riprova tra poco.
        </p>
        <Button className="mt-5" asChild>
          <Link href="/dashboard/ricette">Riprova</Link>
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
      <NoRestaurant
        eyebrow="Ricette e food cost"
        title="Ricette e food cost"
        description="Serve una sede attiva per collegare ingredienti, sfridi e costi."
      />
    );
  }

  const canManage = await canManageRecipes(restaurant.id);

  return (
    <DashboardShell
      eyebrow="Ricette e food cost"
      title={restaurant.name}
      description={`Ingredienti, sfridi e porzioni collegati al menu e ai costi del magazzino di ${restaurant.organizationName}.`}
      actions={
        <Badge variant="secondary">
          {membership?.roleName ?? "Piattaforma"}
        </Badge>
      }
    >
      {canManage ? (
        <RecipesData restaurantId={restaurant.id} />
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex items-center gap-2">
            <LockKeyhole className="size-4 text-amber-700 dark:text-amber-300" />
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Accesso riservato
            </h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            Ricette e food cost richiedono i permessi menu e magazzino. Il
            ruolo {membership?.roleName ?? "assegnato"} non dispone di
            entrambi. Chiedi a un proprietario o a un responsabile di
            abilitarti.
          </p>
          <Button className="mt-4" size="sm" variant="outline" asChild>
            <Link href="/dashboard">Torna alla dashboard</Link>
          </Button>
        </section>
      )}
    </DashboardShell>
  );
}

async function RecipesData({ restaurantId }: { restaurantId: string }) {
  const data = await getRecipes(restaurantId);

  return (
    <RecipeManager
      menuItems={data.menuItems}
      inventoryItems={data.inventoryItems}
    />
  );
}

function RecipesSkeleton() {
  return <DashboardSkeleton />;
}

export default function DashboardRecipesPage() {
  return (
    <Suspense fallback={<RecipesSkeleton />}>
      <RecipesContent />
    </Suspense>
  );
}

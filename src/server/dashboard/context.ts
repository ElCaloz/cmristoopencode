import { redirect } from "next/navigation";
import { getSessionContext, type SessionContext } from "@/server/auth/session";
import {
  getActiveRestaurant,
  type ActiveRestaurant,
} from "@/server/restaurant/active";

export type DashboardContext = {
  session: SessionContext;
  restaurant: ActiveRestaurant | null;
};

/**
 * Verifica sessione e sedi attive per le pagine della dashboard.
 * Reindirizza a /login o /onboarding quando mancano i prerequisiti;
 * la pagina decide come mostrare l'assenza di una sede attiva.
 */
export async function requireDashboardContext(
  nextPath: string,
): Promise<DashboardContext> {
  const session = await getSessionContext();

  if (!session) {
    redirect(`/login?reason=session&next=${encodeURIComponent(nextPath)}`);
  }

  if (session.membershipsError) {
    redirect(`${nextPath}?reason=database`);
  }

  if (!session.activeMembership && !session.isPlatformAdmin) {
    redirect("/onboarding");
  }

  const restaurant = await getActiveRestaurant();

  return { session, restaurant };
}

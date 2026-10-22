import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getSessionContext,
  type SessionContext,
} from "@/server/auth/session";
import {
  getActiveRestaurant,
  type ActiveRestaurant,
} from "@/server/restaurant/active";

export type AuthorizedRestaurant = {
  session: SessionContext;
  restaurant: ActiveRestaurant;
};

export type AuthorizationResult =
  | { ok: true; context: AuthorizedRestaurant }
  | { ok: false; message: string };

export async function authorizeRestaurant(
  permission: string,
  loginNext: string,
  deniedMessage: string,
): Promise<AuthorizationResult> {
  const session = await getSessionContext();
  if (!session) redirect(`/login?reason=session&next=${encodeURIComponent(loginNext)}`);

  const restaurant = await getActiveRestaurant();
  if (!restaurant) {
    return {
      ok: false,
      message: "Nessuna sede attiva. Seleziona o crea una sede dalla dashboard.",
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurant.id,
    p_permission: permission,
  });

  if (data !== true) {
    return { ok: false, message: deniedMessage };
  }

  return { ok: true, context: { session, restaurant } };
}

export async function hasRestaurantPermission(
  restaurantId: string,
  permission: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: permission,
  });
  return data === true;
}

import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/server/auth/session";

export const ACTIVE_RESTAURANT_COOKIE = "cm_active_restaurant";

export type ActiveRestaurant = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
};

type RestaurantRow = {
  id: string;
  name: string;
  organization_id: string;
};

function toActive(
  row: RestaurantRow,
  organizationName: string,
): ActiveRestaurant {
  return {
    id: row.id,
    name: row.name,
    organizationId: row.organization_id,
    organizationName,
  };
}

export const getActiveRestaurant = cache(
  async (): Promise<ActiveRestaurant | null> => {
    const session = await getSessionContext();
    const membership = session?.activeMembership;
    if (!session || !membership) return null;

    const supabase = await createClient();

    if (membership.restaurantId) {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, organization_id")
        .eq("id", membership.restaurantId)
        .maybeSingle();

      if (!data) return null;
      return toActive(data as RestaurantRow, membership.organizationName);
    }

    const cookieStore = await cookies();
    const preferredId = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value;

    if (preferredId) {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, organization_id")
        .eq("id", preferredId)
        .eq("organization_id", membership.organizationId)
        .maybeSingle();

      if (data) {
        return toActive(data as RestaurantRow, membership.organizationName);
      }
    }

    const { data } = await supabase
      .from("restaurants")
      .select("id, name, organization_id")
      .eq("organization_id", membership.organizationId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return toActive(data as RestaurantRow, membership.organizationName);
  },
);

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/server/auth/session";

export type ActiveRestaurant = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
};

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

      return {
        id: data.id as string,
        name: data.name as string,
        organizationId: data.organization_id as string,
        organizationName: membership.organizationName,
      };
    }

    const { data } = await supabase
      .from("restaurants")
      .select("id, name, organization_id")
      .eq("organization_id", membership.organizationId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    return {
      id: data.id as string,
      name: data.name as string,
      organizationId: data.organization_id as string,
      organizationName: membership.organizationName,
    };
  },
);

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/server/auth/session";
import { getActiveRestaurant } from "@/server/restaurant/active";
import type {
  LocationRow,
  OrganizationRestaurantsData,
} from "@/server/restaurant/types";
import { PLANS, type PlanId } from "@/lib/plans";

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "paused" | "closed";
  description: string;
  cuisine: string;
  address: string | null;
  phone: string | null;
  created_at: string;
};

function mapLocation(row: RestaurantRow): LocationRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    description: row.description,
    cuisine: row.cuisine,
    address: row.address,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

export const canManageRestaurants = cache(async (organizationId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission", {
    p_organization_id: organizationId,
    p_permission: "restaurant.manage",
  });
  return data === true;
});

export const canManageSettings = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: "settings.manage",
  });
  return data === true;
});

export async function getOrganizationRestaurants(): Promise<OrganizationRestaurantsData | null> {
  const session = await getSessionContext();
  const membership = session?.activeMembership;
  if (!session || !membership) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("id, name, slug, status, description, cuisine, address, phone, created_at")
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: true });

  const plan =
    membership.requestedPlan && membership.requestedPlan in PLANS
      ? PLANS[membership.requestedPlan as PlanId]
      : null;

  return {
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    planName: plan?.name ?? null,
    locationsLimit: plan?.locations ?? null,
    locations: ((data ?? []) as RestaurantRow[]).map(mapLocation),
  };
}

export async function getRestaurantProfile() {
  const restaurant = await getActiveRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("id, name, slug, description, cuisine, address, phone, public_menu_note")
    .eq("id", restaurant.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    description: data.description as string,
    cuisine: data.cuisine as string,
    address: (data.address as string | null) ?? "",
    phone: (data.phone as string | null) ?? "",
    publicMenuNote: data.public_menu_note as string,
  };
}

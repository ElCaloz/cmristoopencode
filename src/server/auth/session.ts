import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type MembershipSummary = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationStatus: string;
  requestedPlan: string | null;
  planStatus: string;
  restaurantId: string | null;
  restaurantName: string | null;
  roleKey: string;
  roleName: string;
};

export type SessionContext = {
  user: {
    id: string;
    email: string | null;
  };
  fullName: string;
  memberships: MembershipSummary[];
  activeMembership: MembershipSummary | null;
  isPlatformAdmin: boolean;
  membershipsError: boolean;
  platformAdminError: boolean;
};

type Nested<T> = T | T[] | null;

type MembershipRow = {
  id: string;
  organization_id: string;
  restaurant_id: string | null;
  roles: Nested<{ key: string; name: string }>;
  organizations: Nested<{
    name: string;
    slug: string;
    status: string;
    requested_plan: string | null;
    plan_status: string;
  }>;
  restaurants: Nested<{ name: string }>;
};

function first<T>(value: Nested<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profileResult, membershipsResult, platformAdminResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("memberships")
      .select(
        "id, organization_id, restaurant_id, roles(key, name), organizations(name, slug, status, requested_plan, plan_status), restaurants(name)",
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
    supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const memberships = ((membershipsResult.data ?? []) as unknown as MembershipRow[])
    .map((row): MembershipSummary | null => {
      const organization = first(row.organizations);
      const role = first(row.roles);
      if (!organization || !role) return null;

      return {
        id: row.id,
        organizationId: row.organization_id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        organizationStatus: organization.status,
        requestedPlan: organization.requested_plan,
        planStatus: organization.plan_status,
        restaurantId: row.restaurant_id,
        restaurantName: first(row.restaurants)?.name ?? null,
        roleKey: role.key,
        roleName: role.name,
      };
    })
    .filter((membership): membership is MembershipSummary => membership !== null);

  const activeMembership =
    memberships.find((membership) => membership.restaurantId === null) ??
    memberships[0] ??
    null;

  const fullName =
    (profileResult.data?.full_name as string | undefined)?.trim() ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "");

  return {
    user: { id: user.id, email: user.email ?? null },
    fullName,
    memberships,
    activeMembership,
    isPlatformAdmin: Boolean(platformAdminResult.data),
    membershipsError: Boolean(membershipsResult.error),
    platformAdminError: Boolean(platformAdminResult.error),
  };
});

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasRestaurantPermission } from "@/server/auth/authorize";
import type {
  RoleOption,
  ShiftRow,
  StaffData,
  StaffMemberRow,
} from "@/server/staff/types";

export const canManageStaff = cache(async (restaurantId: string) =>
  hasRestaurantPermission(restaurantId, "staff.manage"),
);

export const canManageMembers = cache(async (restaurantId: string) =>
  hasRestaurantPermission(restaurantId, "members.manage"),
);

type Nested<T> = T | T[] | null;

function first<T>(value: Nested<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

type MembershipDbRow = {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  status: "invited" | "active" | "suspended";
  hired_at: string | null;
  hourly_rate_cents: number | string | null;
  notes: string;
  created_at: string;
  profiles: Nested<{ full_name: string; email: string; phone: string }>;
  roles: Nested<{ id: string; key: string; name: string }>;
  restaurants: Nested<{ name: string }>;
};

export async function getStaffData(
  restaurantId: string,
  organizationId: string,
): Promise<StaffData> {
  const supabase = await createClient();

  const [membershipsResult, rolesResult, shiftsResult] = await Promise.all([
    supabase
      .from("memberships")
      .select(
        "id, user_id, restaurant_id, status, hired_at, hourly_rate_cents, notes, created_at, profiles(full_name, email, phone), roles(id, key, name), restaurants(name)",
      )
      .eq("organization_id", organizationId)
      .or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`)
      .order("created_at", { ascending: true }),
    supabase
      .from("roles")
      .select("id, key, name")
      .order("name", { ascending: true }),
    supabase
      .from("staff_shifts")
      .select("id, membership_id, starts_at, ends_at, role_note, status, memberships(profiles(full_name))")
      .eq("restaurant_id", restaurantId)
      .gte("ends_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(120),
  ]);

  const staff = ((membershipsResult.data ?? []) as unknown as MembershipDbRow[]).map(
    (row): StaffMemberRow => {
      const profile = first(row.profiles);
      const role = first(row.roles);
      const restaurant = first(row.restaurants);
      return {
        membershipId: row.id,
        userId: row.user_id,
        fullName: profile?.full_name || profile?.email || row.user_id,
        email: profile?.email ?? "",
        phone: profile?.phone ?? "",
        roleId: role?.id ?? "",
        roleKey: role?.key ?? "",
        roleName: role?.name ?? "Ruolo sconosciuto",
        restaurantId: row.restaurant_id,
        restaurantName: restaurant?.name ?? null,
        status: row.status,
        hiredAt: row.hired_at,
        hourlyRateCents:
          row.hourly_rate_cents === null ? null : Number(row.hourly_rate_cents),
        notes: row.notes,
        createdAt: row.created_at,
      };
    },
  );

  const staffNames = new Map(
    staff.map((member) => [member.membershipId, member.fullName]),
  );

  const shifts = ((shiftsResult.data ?? []) as unknown as Array<{
    id: string;
    membership_id: string;
    starts_at: string;
    ends_at: string;
    role_note: string;
    status: ShiftRow["status"];
    memberships: Nested<{ profiles: Nested<{ full_name: string }> }>;
  }>).map((row) => {
    const membership = first(row.memberships);
    const profile = membership ? first(membership.profiles) : null;
    return {
      id: row.id,
      membershipId: row.membership_id,
      staffName:
        profile?.full_name || staffNames.get(row.membership_id) || "Membro",
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      roleNote: row.role_note,
      status: row.status,
    };
  });

  return {
    staff,
    roles: ((rolesResult.data ?? []) as RoleOption[]),
    shifts,
  };
}

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  DeviceRow,
  DeviceStatus,
  DeviceType,
  DevicesOverview,
  OperatorPinRow,
} from "@/server/devices/types";

const deviceStatuses: readonly DeviceStatus[] = [
  "pending",
  "authorized",
  "active",
  "offline",
  "revoked",
  "blocked",
];

const deviceTypes: readonly DeviceType[] = [
  "palmare",
  "pos",
  "kds",
  "printer",
  "other",
];

function asStatus(value: string): DeviceStatus {
  return (deviceStatuses as readonly string[]).includes(value)
    ? (value as DeviceStatus)
    : "pending";
}

function asType(value: string): DeviceType {
  return (deviceTypes as readonly string[]).includes(value)
    ? (value as DeviceType)
    : "other";
}

export const canManageDevices = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: "devices.manage",
  });
  return data === true;
});

export async function getDevicesOverview(
  restaurantId: string,
): Promise<DevicesOverview> {
  const supabase = await createClient();

  const [devicesResult, limitResult] = await Promise.all([
    supabase
      .from("devices")
      .select(
        "id, name, device_type, status, platform, last_seen_at, pairing_expires_at, revoked_at, created_at",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
    supabase.rpc("device_limit"),
  ]);

  const devices: DeviceRow[] = (
    (devicesResult.data ?? []) as Array<{
      id: string;
      name: string;
      device_type: string;
      status: string;
      platform: string;
      last_seen_at: string | null;
      pairing_expires_at: string | null;
      revoked_at: string | null;
      created_at: string;
    }>
  ).map((row) => ({
    id: row.id,
    name: row.name,
    type: asType(row.device_type),
    status: asStatus(row.status),
    platform: row.platform,
    lastSeenAt: row.last_seen_at,
    pairingExpiresAt: row.pairing_expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  }));

  const palmariInUse = devices.filter(
    (device) => device.type === "palmare" && device.status !== "revoked",
  ).length;

  const palmariLimit =
    typeof limitResult.data === "number" ? limitResult.data : 4;

  return { devices, palmariInUse, palmariLimit };
}

export async function getOperatorPinsOverview(
  restaurantId: string,
): Promise<OperatorPinRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("operator_pins_overview", {
    p_restaurant_id: restaurantId,
  });

  return (
    (data ?? []) as Array<{
      membership_id: string;
      user_id: string;
      full_name: string;
      email: string | null;
      role_key: string;
      role_name: string;
      status: string;
      has_pin: boolean;
      locked_until: string | null;
      pin_updated_at: string | null;
    }>
  ).map((row) => ({
    membershipId: row.membership_id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    roleKey: row.role_key,
    roleName: row.role_name,
    status: row.status,
    hasPin: row.has_pin,
    lockedUntil: row.locked_until,
    pinUpdatedAt: row.pin_updated_at,
  }));
}

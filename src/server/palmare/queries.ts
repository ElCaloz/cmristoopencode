import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEVICE_COOKIE_NAME } from "@/server/devices/types";
import {
  OPERATOR_COOKIE_NAME,
  type PalmareBoard,
  type PalmareDevice,
  type PalmareMenuCategory,
  type PalmareOperatorOption,
  type PalmareOrder,
  type PalmareOrderItem,
  type PalmareTable,
} from "@/server/palmare/types";

export type PalmareState =
  | { kind: "claim" }
  | { kind: "login"; device: PalmareDevice; operators: PalmareOperatorOption[] }
  | { kind: "board"; board: PalmareBoard; menu: PalmareMenuCategory[] };

type RawHeartbeat = {
  device_id?: string;
  device_name?: string;
  device_type?: string;
  restaurant_id?: string;
  restaurant_name?: string;
};

type RawItem = {
  id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  status: string;
  note: string;
};

type RawOrder = {
  id: string;
  guests: number | null;
  opened_at: string;
  total_cents: number;
  active_count: number;
  ready_count: number;
  items: RawItem[];
};

type RawTable = {
  id: string;
  name: string;
  seats: number;
  order: RawOrder | null;
};

type RawArea = {
  id: string;
  name: string;
  tables: RawTable[];
};

type RawBoard = {
  membership_id: string;
  operator_full_name: string;
  role_key: string;
  device_id: string;
  device_name: string;
  device_status: string;
  restaurant_id: string;
  restaurant_name: string;
  issued_at: string;
  expires_at: string;
  areas: RawArea[];
  loose_tables: RawTable[];
};

type RawMenuCategory = {
  id: string | null;
  name: string;
  items: Array<{ id: string; name: string; price_cents: number }>;
};

function mapMenu(payload: { categories?: RawMenuCategory[] }): PalmareMenuCategory[] {
  return (payload.categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    items: (category.items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      priceCents: item.price_cents,
    })),
  }));
}

function mapItem(row: RawItem): PalmareOrderItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    status: row.status,
    note: row.note,
  };
}

function mapOrder(row: RawOrder): PalmareOrder {
  return {
    id: row.id,
    guests: row.guests,
    openedAt: row.opened_at,
    totalCents: row.total_cents ?? 0,
    activeCount: row.active_count ?? 0,
    readyCount: row.ready_count ?? 0,
    items: (row.items ?? []).map(mapItem),
  };
}

function mapTable(row: RawTable): PalmareTable {
  return {
    id: row.id,
    name: row.name,
    seats: row.seats,
    order: row.order ? mapOrder(row.order) : null,
  };
}

function mapBoard(payload: RawBoard): PalmareBoard {
  return {
    membershipId: payload.membership_id,
    operatorFullName: payload.operator_full_name,
    roleKey: payload.role_key,
    deviceId: payload.device_id,
    deviceName: payload.device_name,
    deviceStatus: payload.device_status,
    restaurantId: payload.restaurant_id,
    restaurantName: payload.restaurant_name,
    issuedAt: payload.issued_at,
    expiresAt: payload.expires_at,
    areas: (payload.areas ?? []).map((area) => ({
      id: area.id,
      name: area.name,
      tables: (area.tables ?? []).map(mapTable),
    })),
    looseTables: (payload.loose_tables ?? []).map(mapTable),
  };
}

export async function getPalmareState(): Promise<PalmareState> {
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_COOKIE_NAME)?.value;

  if (!deviceToken) {
    return { kind: "claim" };
  }

  const supabase = await createClient();
  const heartbeat = await supabase.rpc("device_heartbeat", {
    p_device_token: deviceToken,
  });

  if (heartbeat.error || !heartbeat.data) {
    return { kind: "claim" };
  }

  const payload = heartbeat.data as RawHeartbeat;
  const device: PalmareDevice = {
    id: payload.device_id ?? "",
    name: payload.device_name ?? "",
    type: payload.device_type ?? "",
    restaurantId: payload.restaurant_id ?? "",
    restaurantName: payload.restaurant_name ?? "",
  };

  const sessionToken = cookieStore.get(OPERATOR_COOKIE_NAME)?.value;

  if (sessionToken) {
    const board = await supabase.rpc("palmare_board", {
      p_session_token: sessionToken,
    });

    if (!board.error && board.data) {
      const menu = await supabase.rpc("palamare_menu", {
        p_session_token: sessionToken,
      });

      return {
        kind: "board",
        board: mapBoard(board.data as RawBoard),
        menu:
          menu.error || !menu.data
            ? []
            : mapMenu(menu.data as { categories?: RawMenuCategory[] }),
      };
    }
  }

  const operators = await supabase.rpc("palmare_operators", {
    p_device_token: deviceToken,
  });

  if (operators.error || !operators.data) {
    return { kind: "claim" };
  }

  return {
    kind: "login",
    device,
    operators: (
      operators.data as Array<{
        membership_id: string;
        full_name: string;
        role_key: string;
        role_name: string;
        locked_until: string | null;
      }>
    ).map((row) => ({
      membershipId: row.membership_id,
      fullName: row.full_name,
      roleKey: row.role_key,
      roleName: row.role_name,
      lockedUntil: row.locked_until,
    })),
  };
}

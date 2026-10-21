import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PosData, PosOrderRow } from "@/server/pos/types";

export const canOperatePos = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: "pos.operate",
  });
  return data === true;
});

const itemStatuses = ["pending", "preparing", "ready", "served", "cancelled"] as const;
const paymentMethods = ["cash", "card", "other"] as const;

function asItemStatus(
  value: string,
): (typeof itemStatuses)[number] {
  return (itemStatuses as readonly string[]).includes(value)
    ? (value as (typeof itemStatuses)[number])
    : "pending";
}

function asPaymentMethod(
  value: string,
): (typeof paymentMethods)[number] {
  return (paymentMethods as readonly string[]).includes(value)
    ? (value as (typeof paymentMethods)[number])
    : "other";
}

export async function getOpenOrders(restaurantId: string): Promise<PosData> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, table_id, guests, note, status, opened_at, order_items(id, menu_item_id, name, unit_price_cents, quantity, note, status, created_at), payments(id, method, amount_cents, tip_cents, created_at)",
    )
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .order("opened_at", { ascending: true })
    .order("created_at", { referencedTable: "order_items", ascending: true })
    .order("created_at", { referencedTable: "payments", ascending: true });

  const rows = (data ?? []) as Array<{
    id: string;
    table_id: string | null;
    guests: number | null;
    note: string;
    status: string;
    opened_at: string;
    order_items: Array<{
      id: string;
      menu_item_id: string | null;
      name: string;
      unit_price_cents: number;
      quantity: number;
      note: string;
      status: string;
      created_at: string;
    }>;
    payments: Array<{
      id: string;
      method: string;
      amount_cents: number;
      tip_cents: number;
      created_at: string;
    }>;
  }>;

  const openOrders = rows.map((row): PosOrderRow => ({
    id: row.id,
    tableId: row.table_id,
    guests: row.guests,
    note: row.note,
    status: "open",
    openedAt: row.opened_at,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      menuItemId: item.menu_item_id,
      name: item.name,
      unitPriceCents: item.unit_price_cents,
      quantity: item.quantity,
      note: item.note,
      status: asItemStatus(item.status),
      createdAt: item.created_at,
    })),
    payments: (row.payments ?? []).map((payment) => ({
      id: payment.id,
      method: asPaymentMethod(payment.method),
      amountCents: payment.amount_cents,
      tipCents: payment.tip_cents,
      createdAt: payment.created_at,
    })),
  }));

  return { openOrders };
}

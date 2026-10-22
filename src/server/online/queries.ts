import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasRestaurantPermission } from "@/server/auth/authorize";
import type {
  OnlineData,
  OnlineOrderItemRow,
  OnlineOrderRow,
  OnlineOrderStatus,
  PublicLinkRow,
  PublicMenuData,
  TableOption,
} from "@/server/online/types";

type Nested<T> = T | T[] | null;

function first<T>(value: Nested<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export const canManageOnline = cache(async (restaurantId: string) => {
  const [orders, menu] = await Promise.all([
    hasRestaurantPermission(restaurantId, "orders.manage"),
    hasRestaurantPermission(restaurantId, "menu.manage"),
  ]);
  return orders || menu;
});

export const canConfirmOnlineOrders = cache(async (restaurantId: string) =>
  hasRestaurantPermission(restaurantId, "orders.manage"),
);

type LinkDbRow = {
  id: string;
  token: string;
  kind: "menu" | "table";
  label: string;
  table_id: string | null;
  allow_ordering: boolean;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  restaurant_tables: Nested<{ name: string }>;
};

type OrderDbRow = {
  id: string;
  public_link_id: string | null;
  customer_name: string;
  email: string;
  phone: string;
  fulfillment: "pickup" | "delivery" | "dine_in";
  table_id: string | null;
  status: OnlineOrderStatus;
  payment_status: "unpaid" | "paid" | "refunded";
  payment_method: "on_site" | "online";
  subtotal_cents: number | string;
  total_cents: number | string;
  notes: string;
  order_id: string | null;
  created_at: string;
  restaurant_tables: Nested<{ name: string }>;
};

export async function getOnlineData(restaurantId: string): Promise<OnlineData> {
  const supabase = await createClient();

  const [linksResult, ordersResult, tablesResult] = await Promise.all([
    supabase
      .from("restaurant_public_links")
      .select(
        "id, token, kind, label, table_id, allow_ordering, is_active, expires_at, created_at, restaurant_tables(name)",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("online_orders")
      .select(
        "id, public_link_id, customer_name, email, phone, fulfillment, table_id, status, payment_status, payment_method, subtotal_cents, total_cents, notes, order_id, created_at, restaurant_tables(name)",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("restaurant_tables")
      .select("id, name, seats, floor_areas(name)")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const links: PublicLinkRow[] = ((linksResult.data ?? []) as unknown as LinkDbRow[]).map(
    (row) => ({
      id: row.id,
      token: row.token,
      kind: row.kind,
      label: row.label,
      tableId: row.table_id,
      tableName: first(row.restaurant_tables)?.name ?? null,
      allowOrdering: row.allow_ordering,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }),
  );

  const orders: OnlineOrderRow[] = (
    (ordersResult.data ?? []) as unknown as OrderDbRow[]
  ).map((row) => ({
      id: row.id,
      publicLinkId: row.public_link_id,
      customerName: row.customer_name,
      email: row.email,
      phone: row.phone,
      fulfillment: row.fulfillment,
      tableId: row.table_id,
      tableName: first(row.restaurant_tables)?.name ?? null,
      status: row.status,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      subtotalCents: Number(row.subtotal_cents),
      totalCents: Number(row.total_cents),
      notes: row.notes,
      orderId: row.order_id,
      items: [],
      createdAt: row.created_at,
    }),
  );

  if (orders.length > 0) {
    const { data: itemRows } = await supabase
      .from("online_order_items")
      .select("id, online_order_id, name, unit_price_cents, quantity, note")
      .in(
        "online_order_id",
        orders.map((order) => order.id),
      )
      .order("created_at", { ascending: true });

    const byOrder = new Map<string, OnlineOrderItemRow[]>();
    for (const item of (itemRows ?? []) as Array<{
      id: string;
      online_order_id: string;
      name: string;
      unit_price_cents: number | string;
      quantity: number;
      note: string;
    }>) {
      const list = byOrder.get(item.online_order_id) ?? [];
      list.push({
        id: item.id,
        name: item.name,
        unitPriceCents: Number(item.unit_price_cents),
        quantity: item.quantity,
        note: item.note,
      });
      byOrder.set(item.online_order_id, list);
    }

    for (const order of orders) {
      order.items = byOrder.get(order.id) ?? [];
    }
  }

  const tables: TableOption[] = ((tablesResult.data ?? []) as unknown as Array<{
    id: string;
    name: string;
    seats: number;
    floor_areas: Nested<{ name: string }>;
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    seats: row.seats,
    areaName: first(row.floor_areas)?.name ?? null,
  }));

  return { links, orders, tables };
}

export async function getPublicMenuData(
  token: string,
): Promise<PublicMenuData | null> {
  if (token.length < 16 || token.length > 200) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_menu", {
    p_token: token,
  });

  if (error || !data) return null;
  return data as PublicMenuData;
}

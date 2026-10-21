import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  KitchenBoard,
  KitchenBoardItem,
  KitchenBoardItemStatus,
} from "@/server/kds/types";

export const canOperateKitchen = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const [kitchen, pos] = await Promise.all([
    supabase.rpc("auth_has_permission_for_restaurant", {
      p_restaurant_id: restaurantId,
      p_permission: "kitchen.operate",
    }),
    supabase.rpc("auth_has_permission_for_restaurant", {
      p_restaurant_id: restaurantId,
      p_permission: "pos.operate",
    }),
  ]);
  return kitchen.data === true || pos.data === true;
});

const boardStatuses = ["pending", "preparing", "ready"] as const;

function asBoardStatus(value: string): KitchenBoardItemStatus {
  return (boardStatuses as readonly string[]).includes(value)
    ? (value as KitchenBoardItemStatus)
    : "pending";
}

export async function getKitchenBoard(restaurantId: string): Promise<KitchenBoard> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, table_id, guests, opened_at, order_items!inner(id, name, quantity, note, status, created_at)",
    )
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .in("order_items.status", ["pending", "preparing", "ready"])
    .order("opened_at", { ascending: true })
    .order("created_at", { referencedTable: "order_items", ascending: true });

  const rows = (data ?? []) as Array<{
    id: string;
    table_id: string | null;
    guests: number | null;
    opened_at: string;
    order_items: Array<{
      id: string;
      name: string;
      quantity: number;
      note: string;
      status: string;
      created_at: string;
    }>;
  }>;

  const items = rows.flatMap((row) =>
    (row.order_items ?? []).map(
      (item): KitchenBoardItem => ({
        id: item.id,
        orderId: row.id,
        tableId: row.table_id,
        guests: row.guests,
        openedAt: row.opened_at,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        status: asBoardStatus(item.status),
        createdAt: item.created_at,
      }),
    ),
  );

  return { items };
}

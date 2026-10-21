import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  InventoryData,
  InventoryItemRow,
  InventoryMovementKind,
  InventoryMovementRow,
  InventorySupplierRow,
} from "@/server/inventory/types";

export { getActiveRestaurant } from "@/server/restaurant/active";

const movementKinds: InventoryMovementKind[] = [
  "load",
  "unload",
  "waste",
  "adjustment",
];

function asMovementKind(value: string): InventoryMovementKind {
  return movementKinds.includes(value as InventoryMovementKind)
    ? (value as InventoryMovementKind)
    : "adjustment";
}

export const canManageInventory = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: "inventory.manage",
  });
  return data === true;
});

export async function getInventory(restaurantId: string): Promise<InventoryData> {
  const supabase = await createClient();

  const [suppliersResult, itemsResult, movementsResult] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, name, category, email, phone, notes, is_active")
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_items")
      .select(
        "id, supplier_id, name, sku, category, unit, quantity_milli, min_quantity_milli, cost_per_unit_cents, lot, expires_on, location, is_active",
      )
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_movements")
      .select(
        "id, item_id, kind, quantity_delta_milli, quantity_after_milli, reason, note, created_at",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const suppliers = ((suppliersResult.data ?? []) as Array<{
    id: string;
    name: string;
    category: string;
    email: string;
    phone: string;
    notes: string;
    is_active: boolean;
  }>).map(
    (row): InventorySupplierRow => ({
      id: row.id,
      name: row.name,
      category: row.category,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
      isActive: row.is_active,
    }),
  );

  const items = ((itemsResult.data ?? []) as Array<{
    id: string;
    supplier_id: string | null;
    name: string;
    sku: string;
    category: string;
    unit: string;
    quantity_milli: number | string;
    min_quantity_milli: number | string;
    cost_per_unit_cents: number | string;
    lot: string;
    expires_on: string | null;
    location: string;
    is_active: boolean;
  }>).map(
    (row): InventoryItemRow => ({
      id: row.id,
      supplierId: row.supplier_id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      unit: row.unit,
      quantityMilli: Number(row.quantity_milli),
      minQuantityMilli: Number(row.min_quantity_milli),
      costPerUnitCents: Number(row.cost_per_unit_cents),
      lot: row.lot,
      expiresOn: row.expires_on,
      location: row.location,
      isActive: row.is_active,
    }),
  );

  const movements = ((movementsResult.data ?? []) as Array<{
    id: string;
    item_id: string;
    kind: string;
    quantity_delta_milli: number | string;
    quantity_after_milli: number | string;
    reason: string;
    note: string;
    created_at: string;
  }>).map(
    (row): InventoryMovementRow => ({
      id: row.id,
      itemId: row.item_id,
      kind: asMovementKind(row.kind),
      quantityDeltaMilli: Number(row.quantity_delta_milli),
      quantityAfterMilli: Number(row.quantity_after_milli),
      reason: row.reason,
      note: row.note,
      createdAt: row.created_at,
    }),
  );

  return { suppliers, items, movements };
}

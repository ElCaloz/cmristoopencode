import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  purchaseOrderDiscrepancyCount,
  purchaseOrderDiscrepancyMilli,
  purchaseOrderLineTotalCents,
  purchaseOrderReceivedTotalCents,
  purchaseOrderTotalCents,
} from "@/lib/purchasing";
import type {
  InventoryItemRow,
  InventorySupplierRow,
} from "@/server/inventory/types";
import type {
  PurchaseOrderLineRow,
  PurchaseOrderRow,
  PurchaseOrderStatus,
} from "@/server/purchasing/types";
import { isPurchaseOrderStatus } from "@/server/purchasing/types";

export { getActiveRestaurant } from "@/server/restaurant/active";

export const canManagePurchasing = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: "inventory.manage",
  });
  return data === true;
});

export const canReadPurchasing = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const [inventory, reports] = await Promise.all([
    supabase.rpc("auth_has_permission_for_restaurant", {
      p_restaurant_id: restaurantId,
      p_permission: "inventory.manage",
    }),
    supabase.rpc("auth_has_permission_for_restaurant", {
      p_restaurant_id: restaurantId,
      p_permission: "reports.read",
    }),
  ]);
  return inventory.data === true || reports.data === true;
});

type PurchasingData = {
  suppliers: InventorySupplierRow[];
  items: InventoryItemRow[];
  orders: PurchaseOrderRow[];
};

type OrderRecord = {
  id: string;
  order_number: string;
  supplier_id: string;
  status: string;
  expected_on: string | null;
  notes: string;
  receipt_note: string;
  ordered_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

type OrderItemRecord = {
  id: string;
  purchase_order_id: string;
  inventory_item_id: string | null;
  item_name: string;
  unit: string;
  quantity_milli: number | string;
  received_quantity_milli: number | string;
  unit_cost_cents: number | string;
};

export async function getPurchasingData(
  restaurantId: string,
): Promise<PurchasingData> {
  const supabase = await createClient();

  const [ordersResult, suppliersResult, itemsResult] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(
        "id, order_number, supplier_id, status, expected_on, notes, receipt_note, ordered_at, received_at, cancelled_at, created_at",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(200),
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

  const orders = (ordersResult.data ?? []) as OrderRecord[];
  const orderIds = orders.map((order) => order.id);

  let itemRecords: OrderItemRecord[] = [];

  if (orderIds.length > 0) {
    const { data } = await supabase
      .from("purchase_order_items")
      .select(
        "id, purchase_order_id, inventory_item_id, item_name, unit, quantity_milli, received_quantity_milli, unit_cost_cents",
      )
      .in("purchase_order_id", orderIds)
      .order("item_name", { ascending: true });

    itemRecords = (data ?? []) as OrderItemRecord[];
  }

  const supplierNames = new Map(
    suppliers.map((supplier) => [supplier.id, supplier.name]),
  );
  const linesByOrder = new Map<string, PurchaseOrderLineRow[]>();

  for (const row of itemRecords) {
    const quantityMilli = Number(row.quantity_milli);
    const receivedQuantityMilli = Number(row.received_quantity_milli);
    const unitCostCents = Number(row.unit_cost_cents);
    const line: PurchaseOrderLineRow = {
      id: row.id,
      inventoryItemId: row.inventory_item_id,
      itemName: row.item_name,
      unit: row.unit,
      quantityMilli,
      receivedQuantityMilli,
      unitCostCents,
      totalCents: purchaseOrderLineTotalCents(quantityMilli, unitCostCents),
      receivedTotalCents: purchaseOrderLineTotalCents(
        receivedQuantityMilli,
        unitCostCents,
      ),
    };
    const current = linesByOrder.get(row.purchase_order_id) ?? [];
    current.push(line);
    linesByOrder.set(row.purchase_order_id, current);
  }

  const mappedOrders = orders.map((order): PurchaseOrderRow => {
    const status: PurchaseOrderStatus = isPurchaseOrderStatus(order.status)
      ? order.status
      : "draft";
    const lines = linesByOrder.get(order.id) ?? [];

    return {
      id: order.id,
      orderNumber: order.order_number,
      supplierId: order.supplier_id,
      supplierName:
        supplierNames.get(order.supplier_id) ?? "Fornitore non disponibile",
      status,
      expectedOn: order.expected_on,
      notes: order.notes,
      receiptNote: order.receipt_note,
      orderedAt: order.ordered_at,
      receivedAt: order.received_at,
      cancelledAt: order.cancelled_at,
      createdAt: order.created_at,
      lines,
      totalCents: purchaseOrderTotalCents(lines),
      receivedTotalCents: purchaseOrderReceivedTotalCents(lines),
      discrepancyMilli: purchaseOrderDiscrepancyMilli(lines),
      discrepancyCount: purchaseOrderDiscrepancyCount(lines),
    };
  });

  return { suppliers, items, orders: mappedOrders };
}

import { cache } from "react";
import { summarizeSales } from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";
import type {
  SalesDay,
  SalesItemRow,
  SalesOrderRow,
  SalesPaymentMethod,
  SalesPaymentRow,
} from "@/server/sales/types";

const paymentMethods = ["cash", "card", "other"] as const;

function asPaymentMethod(value: string): SalesPaymentMethod {
  return (paymentMethods as readonly string[]).includes(value)
    ? (value as SalesPaymentMethod)
    : "other";
}

export const canReadSales = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: "reports.read",
  });
  return data === true;
});

export const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeDay(value: string | undefined, fallback: string) {
  if (value && dayPattern.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return value;
  }
  return fallback;
}

export function dayFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyDay(day: string): SalesDay {
  return { day, orders: [], totals: summarizeSales([]) };
}

export async function getSalesDay(
  restaurantId: string,
  day: string,
): Promise<SalesDay> {
  const supabase = await createClient();

  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data: paymentData, error: paymentsError } = await supabase
    .from("payments")
    .select("id, order_id, method, amount_cents, tip_cents, created_at")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (paymentsError || !paymentData || paymentData.length === 0) {
    return emptyDay(day);
  }

  const paymentRows = paymentData as Array<{
    id: string;
    order_id: string;
    method: string;
    amount_cents: number;
    tip_cents: number;
    created_at: string;
  }>;

  const orderIds = [...new Set(paymentRows.map((row) => row.order_id))];

  const { data: orderData } = await supabase
    .from("orders")
    .select(
      "id, table_id, guests, opened_at, closed_at, order_items(id, name, quantity, unit_price_cents, status)",
    )
    .eq("restaurant_id", restaurantId)
    .in("id", orderIds);

  const orderRows = (orderData ?? []) as Array<{
    id: string;
    table_id: string | null;
    guests: number | null;
    opened_at: string;
    closed_at: string | null;
    order_items: Array<{
      id: string;
      name: string;
      quantity: number;
      unit_price_cents: number;
      status: string;
    }>;
  }>;

  const tableIds = [
    ...new Set(
      orderRows
        .map((row) => row.table_id)
        .filter((value): value is string => value !== null),
    ),
  ];

  const tableNames = new Map<string, string>();

  if (tableIds.length > 0) {
    const { data: tableData } = await supabase
      .from("restaurant_tables")
      .select("id, name")
      .eq("restaurant_id", restaurantId)
      .in("id", tableIds);

    for (const table of (tableData ?? []) as Array<{
      id: string;
      name: string;
    }>) {
      tableNames.set(table.id, table.name);
    }
  }

  const paymentsByOrder = new Map<string, SalesPaymentRow[]>();

  for (const row of paymentRows) {
    const payment: SalesPaymentRow = {
      id: row.id,
      method: asPaymentMethod(row.method),
      amountCents: row.amount_cents,
      tipCents: row.tip_cents,
      createdAt: row.created_at,
    };
    const list = paymentsByOrder.get(row.order_id) ?? [];
    list.push(payment);
    paymentsByOrder.set(row.order_id, list);
  }

  const orders: SalesOrderRow[] = orderRows
    .map((row): SalesOrderRow => {
      const payments = paymentsByOrder.get(row.id) ?? [];
      const activeItems = (row.order_items ?? []).filter(
        (item) => item.status !== "cancelled",
      );
      const items: SalesItemRow[] = activeItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        status: item.status,
      }));
      const totalCents = activeItems.reduce(
        (sum, item) => sum + item.unit_price_cents * item.quantity,
        0,
      );
      const paidCents = payments.reduce(
        (sum, payment) => sum + payment.amountCents,
        0,
      );
      const tipCents = payments.reduce(
        (sum, payment) => sum + payment.tipCents,
        0,
      );
      const methods = [...new Set(payments.map((payment) => payment.method))];
      const paidAt =
        payments[payments.length - 1]?.createdAt ?? row.closed_at ?? row.opened_at;

      return {
        id: row.id,
        tableName: row.table_id ? tableNames.get(row.table_id) ?? null : null,
        guests: row.guests,
        openedAt: row.opened_at,
        closedAt: row.closed_at,
        paidAt,
        itemsCount: items.length,
        itemsSold: items.reduce((sum, item) => sum + item.quantity, 0),
        totalCents,
        paidCents,
        tipCents,
        methods,
        items,
        payments,
      };
    })
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  return { day, orders, totals: summarizeSales(orders) };
}

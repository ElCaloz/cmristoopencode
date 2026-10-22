import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasRestaurantPermission } from "@/server/auth/authorize";
import type { ReportData } from "@/server/reports/types";

export const canReadReports = cache(async (restaurantId: string) =>
  hasRestaurantPermission(restaurantId, "reports.read"),
);

const dayLabel = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
});

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function defaultReportRange(): { from: string; to: string } {
  const to = startOfDay(new Date());
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString(), to: new Date(to.getTime() + 86_400_000).toISOString() };
}

export function normalizeReportRange(
  fromParam: string | undefined,
  toParam: string | undefined,
): { from: string; to: string } {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  const fallback = defaultReportRange();

  if (!fromParam || !toParam || !pattern.test(fromParam) || !pattern.test(toParam)) {
    return fallback;
  }

  const from = new Date(`${fromParam}T00:00:00`);
  const to = new Date(`${toParam}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return fallback;
  }

  const maxTo = new Date(from);
  maxTo.setDate(maxTo.getDate() + 180);

  return {
    from: from.toISOString(),
    to: new Date(Math.min(to.getTime(), maxTo.getTime()) + 86_400_000).toISOString(),
  };
}

export async function getReportData(
  restaurantId: string,
  organizationId: string,
  range: { from: string; to: string },
): Promise<ReportData> {
  const supabase = await createClient();

  const [paymentsResult, itemsResult, onlineResult, customersResult, staffResult, shiftsResult, orgPaymentsResult, restaurantsResult] =
    await Promise.all([
      supabase
        .from("payments")
        .select("order_id, method, amount_cents, tip_cents, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", range.from)
        .lt("created_at", range.to),
      supabase
        .from("order_items")
        .select("name, quantity, unit_price_cents, status, created_at")
        .eq("restaurant_id", restaurantId)
        .neq("status", "cancelled")
        .gte("created_at", range.from)
        .lt("created_at", range.to),
      supabase
        .from("online_orders")
        .select("total_cents, status, payment_status, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", range.from)
        .lt("created_at", range.to),
      supabase
        .from("customers")
        .select("loyalty_points, created_at")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "active"),
      supabase
        .from("staff_shifts")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .gte("starts_at", range.from)
        .lt("starts_at", range.to)
        .neq("status", "cancelled"),
      supabase
        .from("payments")
        .select("restaurant_id, order_id, amount_cents, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", range.from)
        .lt("created_at", range.to),
      supabase
        .from("restaurants")
        .select("id, name")
        .eq("organization_id", organizationId),
    ]);

  const payments = (paymentsResult.data ?? []) as Array<{
    order_id: string;
    method: string;
    amount_cents: number | string;
    tip_cents: number | string;
    created_at: string;
  }>;

  const revenueCents = payments.reduce(
    (sum, payment) => sum + Number(payment.amount_cents),
    0,
  );
  const tipsCents = payments.reduce(
    (sum, payment) => sum + Number(payment.tip_cents),
    0,
  );
  const orderIds = new Set(payments.map((payment) => payment.order_id));
  const orders = orderIds.size;
  const averageTicketCents = orders > 0 ? Math.round(revenueCents / orders) : 0;

  const dailyMap = new Map<string, { revenueCents: number; orders: Set<string> }>();
  for (const payment of payments) {
    const key = dayKey(payment.created_at);
    const entry = dailyMap.get(key) ?? { revenueCents: 0, orders: new Set<string>() };
    entry.revenueCents += Number(payment.amount_cents);
    entry.orders.add(payment.order_id);
    dailyMap.set(key, entry);
  }

  const daily: ReportData["daily"] = [];
  const cursor = new Date(range.from);
  const end = new Date(range.to);
  while (cursor < end) {
    const key = cursor.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    daily.push({
      day: key,
      label: dayLabel.format(cursor),
      revenueCents: entry?.revenueCents ?? 0,
      orders: entry?.orders.size ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const methodTotals = new Map<string, number>();
  for (const payment of payments) {
    methodTotals.set(
      payment.method,
      (methodTotals.get(payment.method) ?? 0) + Number(payment.amount_cents),
    );
  }
  const methodLabels: Record<string, string> = {
    cash: "Contanti",
    card: "Carta",
    other: "Altro",
  };
  const paymentMethods = [...methodTotals.entries()].map(([method, amountCents]) => ({
    method,
    label: methodLabels[method] ?? method,
    amountCents,
  }));

  const itemTotals = new Map<string, { quantity: number; revenueCents: number }>();
  for (const item of (itemsResult.data ?? []) as Array<{
    name: string;
    quantity: number;
    unit_price_cents: number | string;
  }>) {
    const entry = itemTotals.get(item.name) ?? { quantity: 0, revenueCents: 0 };
    entry.quantity += item.quantity;
    entry.revenueCents += Number(item.unit_price_cents) * item.quantity;
    itemTotals.set(item.name, entry);
  }
  const topItems = [...itemTotals.entries()]
    .map(([name, value]) => ({ name, ...value }))
    .sort((left, right) => right.revenueCents - left.revenueCents)
    .slice(0, 10);

  const online = (onlineResult.data ?? []) as Array<{
    total_cents: number | string;
    status: string;
  }>;
  const onlineOrders = online.filter((order) => order.status !== "cancelled").length;
  const onlineRevenueCents = online
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.total_cents), 0);

  const customers = (customersResult.data ?? []) as Array<{
    loyalty_points: number;
    created_at: string;
  }>;
  const newCustomers = customers.filter(
    (customer) => customer.created_at >= range.from && customer.created_at < range.to,
  ).length;
  const loyaltyPoints = customers.reduce(
    (sum, customer) => sum + customer.loyalty_points,
    0,
  );

  const locationNames = new Map(
    ((restaurantsResult.data ?? []) as Array<{ id: string; name: string }>).map(
      (row) => [row.id, row.name],
    ),
  );
  const locationMap = new Map<string, { revenueCents: number; orders: Set<string> }>();
  for (const payment of (orgPaymentsResult.data ?? []) as Array<{
    restaurant_id: string;
    order_id: string;
    amount_cents: number | string;
  }>) {
    const entry = locationMap.get(payment.restaurant_id) ?? {
      revenueCents: 0,
      orders: new Set<string>(),
    };
    entry.revenueCents += Number(payment.amount_cents);
    entry.orders.add(payment.order_id);
    locationMap.set(payment.restaurant_id, entry);
  }
  const locations = [...locationMap.entries()]
    .map(([id, value]) => ({
      id,
      name: locationNames.get(id) ?? "Sede",
      revenueCents: value.revenueCents,
      orders: value.orders.size,
    }))
    .sort((left, right) => right.revenueCents - left.revenueCents);

  return {
    period: range,
    kpis: {
      revenueCents,
      orders,
      averageTicketCents,
      tipsCents,
      onlineOrders,
      onlineRevenueCents,
      newCustomers,
      loyaltyPoints,
      activeStaff: staffResult.count ?? 0,
      shifts: shiftsResult.count ?? 0,
    },
    daily,
    paymentMethods,
    topItems,
    locations,
  };
}

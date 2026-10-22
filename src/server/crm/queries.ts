import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasRestaurantPermission } from "@/server/auth/authorize";
import type {
  CrmData,
  CustomerMessageRow,
  CustomerRow,
  LoyaltySettingsRow,
  LoyaltyTransactionRow,
} from "@/server/crm/types";

type CustomerDbRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  tags: string[] | null;
  allergies: string;
  notes: string;
  marketing_email: boolean;
  marketing_sms: boolean;
  visits: number;
  total_spent_cents: number | string;
  last_visit_at: string | null;
  loyalty_points: number;
  created_at: string;
};

function fullName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function mapCustomer(row: CustomerDbRow): CustomerRow {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: fullName(row.first_name, row.last_name) || row.email || row.phone,
    email: row.email,
    phone: row.phone,
    tags: row.tags ?? [],
    allergies: row.allergies,
    notes: row.notes,
    marketingEmail: row.marketing_email,
    marketingSms: row.marketing_sms,
    visits: row.visits,
    totalSpentCents: Number(row.total_spent_cents),
    lastVisitAt: row.last_visit_at,
    loyaltyPoints: row.loyalty_points,
    createdAt: row.created_at,
  };
}

export const canManageCustomers = cache(async (restaurantId: string) =>
  hasRestaurantPermission(restaurantId, "customers.manage"),
);

export const canManageCrmSettings = cache(async (restaurantId: string) =>
  hasRestaurantPermission(restaurantId, "settings.manage"),
);

export async function getCustomers(restaurantId: string): Promise<CustomerRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select(
      "id, first_name, last_name, email, phone, tags, allergies, notes, marketing_email, marketing_sms, visits, total_spent_cents, last_visit_at, loyalty_points, created_at",
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(500);

  return ((data ?? []) as CustomerDbRow[]).map(mapCustomer);
}

export async function getLoyaltySettings(
  restaurantId: string,
): Promise<LoyaltySettingsRow> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loyalty_settings")
    .select("points_per_euro, point_value_cents, min_redeem_points, is_active")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!data) {
    return {
      pointsPerEuro: 10,
      pointValueCents: 1,
      minRedeemPoints: 100,
      isActive: true,
    };
  }

  return {
    pointsPerEuro: data.points_per_euro as number,
    pointValueCents: data.point_value_cents as number,
    minRedeemPoints: data.min_redeem_points as number,
    isActive: data.is_active as boolean,
  };
}

export async function getLoyaltyTransactions(
  restaurantId: string,
): Promise<LoyaltyTransactionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loyalty_transactions")
    .select("id, customer_id, points, reason, created_at, customers(first_name, last_name, email, phone)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(60);

  return ((data ?? []) as Array<{
    id: string;
    customer_id: string;
    points: number;
    reason: string;
    created_at: string;
    customers:
      | { first_name: string; last_name: string; email: string; phone: string }
      | Array<{ first_name: string; last_name: string; email: string; phone: string }>
      | null;
  }>).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    return {
      id: row.id,
      customerId: row.customer_id,
      customerName:
        fullName(customer?.first_name ?? "", customer?.last_name ?? "") ||
        customer?.email ||
        customer?.phone ||
        "Cliente",
      points: row.points,
      reason: row.reason,
      createdAt: row.created_at,
    };
  });
}

export async function getCustomerMessages(
  restaurantId: string,
): Promise<CustomerMessageRow[]> {
  const supabase = await createClient();
  const [messagesResult, customersResult] = await Promise.all([
    supabase
      .from("customer_messages")
      .select(
        "id, customer_id, channel, direction, recipient, subject, body, status, error, created_at, read_at",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("customers")
      .select("id, first_name, last_name, email, phone")
      .eq("restaurant_id", restaurantId)
      .limit(500),
  ]);

  const customerNames = new Map<string, string>();
  for (const customer of (customersResult.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  }>) {
    customerNames.set(
      customer.id,
      fullName(customer.first_name, customer.last_name) ||
        customer.email ||
        customer.phone,
    );
  }

  return ((messagesResult.data ?? []) as Array<{
    id: string;
    customer_id: string | null;
    channel: CustomerMessageRow["channel"];
    direction: CustomerMessageRow["direction"];
    recipient: string;
    subject: string;
    body: string;
    status: CustomerMessageRow["status"];
    error: string | null;
    created_at: string;
    read_at: string | null;
  }>).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_id ? customerNames.get(row.customer_id) ?? null : null,
    channel: row.channel,
    direction: row.direction,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

export async function getCrmData(restaurantId: string): Promise<CrmData> {
  const [customers, loyalty, transactions, messages] = await Promise.all([
    getCustomers(restaurantId),
    getLoyaltySettings(restaurantId),
    getLoyaltyTransactions(restaurantId),
    getCustomerMessages(restaurantId),
  ]);

  return {
    customers,
    loyalty,
    transactions,
    messages,
    summary: {
      customers: customers.length,
      marketingConsents: customers.filter(
        (customer) => customer.marketingEmail || customer.marketingSms,
      ).length,
      loyaltyPoints: customers.reduce(
        (sum, customer) => sum + customer.loyaltyPoints,
        0,
      ),
      unreadMessages: messages.filter(
        (message) => message.direction === "inbound" && !message.readAt,
      ).length,
    },
  };
}

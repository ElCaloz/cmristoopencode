import { createClient } from "@/lib/supabase/server";
import type { ActiveRestaurant } from "@/server/restaurant/active";

type ReceiptItem = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  note: string;
};

type ReceiptPayload = {
  kind: "receipt";
  restaurantName: string;
  address: string;
  phone: string;
  orderNumber: string;
  tableName: string | null;
  createdAt: string;
  items: ReceiptItem[];
  subtotalCents: number;
  taxCents: number;
  serviceChargeCents: number;
  totalCents: number;
  tipCents: number;
  paymentMethod: string;
  footer: string;
  paperWidth: 58 | 80;
};

type KitchenPayload = {
  kind: "kitchen";
  restaurantName: string;
  orderNumber: string;
  tableName: string | null;
  createdAt: string;
  items: Array<{ name: string; quantity: number; note: string }>;
  notes: string;
  paperWidth: 58 | 80;
};

function paymentLabel(methods: string[]): string {
  const unique = [...new Set(methods)];
  if (unique.length === 0) return "Non registrato";
  if (unique.length > 1) return "Pagamento misto";
  if (unique[0] === "cash") return "Contanti";
  if (unique[0] === "card") return "Carta";
  return "Altro";
}

export async function enqueueReceiptForOrder(input: {
  orderId: string;
  restaurant: ActiveRestaurant;
  userId: string;
}): Promise<{ queued: boolean; reason?: string }> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, note, opened_at, restaurant_tables(name)")
    .eq("id", input.orderId)
    .eq("restaurant_id", input.restaurant.id)
    .maybeSingle();

  if (!order) return { queued: false, reason: "order_not_found" };

  const [itemsResult, paymentsResult, settingsResult, printerResult, restaurantResult] =
    await Promise.all([
      supabase
        .from("order_items")
        .select("name, quantity, unit_price_cents, note")
        .eq("order_id", input.orderId)
        .neq("status", "cancelled")
        .order("created_at", { ascending: true }),
      supabase
        .from("payments")
        .select("method, amount_cents, tip_cents")
        .eq("order_id", input.orderId),
      supabase
        .from("restaurant_settings")
        .select("receipt_footer, prices_include_tax, tax_rate_bps")
        .eq("restaurant_id", input.restaurant.id)
        .maybeSingle(),
      supabase
        .from("printer_profiles")
        .select("id, paper_width")
        .eq("restaurant_id", input.restaurant.id)
        .eq("station", "receipt")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("restaurants")
        .select("address, phone")
        .eq("id", input.restaurant.id)
        .maybeSingle(),
    ]);

  if (!printerResult.data) {
    return { queued: false, reason: "no_receipt_printer" };
  }

  const items = (itemsResult.data ?? []) as Array<{
    name: string;
    quantity: number;
    unit_price_cents: number | string;
    note: string;
  }>;

  const payments = (paymentsResult.data ?? []) as Array<{
    method: string;
    amount_cents: number | string;
    tip_cents: number | string;
  }>;

  const subtotalCents = items.reduce(
    (sum, item) => sum + Number(item.unit_price_cents) * item.quantity,
    0,
  );
  const totalCents = payments.reduce(
    (sum, payment) => sum + Number(payment.amount_cents),
    0,
  );
  const tipCents = payments.reduce(
    (sum, payment) => sum + Number(payment.tip_cents),
    0,
  );

  const taxRate = Number(settingsResult.data?.tax_rate_bps ?? 1000);
  const pricesIncludeTax = settingsResult.data?.prices_include_tax ?? true;
  const taxCents = pricesIncludeTax
    ? Math.round((subtotalCents * taxRate) / (10000 + taxRate))
    : Math.round((subtotalCents * taxRate) / 10000);

  const table = Array.isArray(order.restaurant_tables)
    ? order.restaurant_tables[0]
    : order.restaurant_tables;

  const payload: ReceiptPayload = {
    kind: "receipt",
    restaurantName: input.restaurant.name,
    address: (restaurantResult.data?.address as string | null) ?? "",
    phone: (restaurantResult.data?.phone as string | null) ?? "",
    orderNumber: input.orderId.slice(0, 8).toUpperCase(),
    tableName: table?.name ?? null,
    createdAt: new Date().toISOString(),
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: Number(item.unit_price_cents),
      lineTotalCents: Number(item.unit_price_cents) * item.quantity,
      note: item.note,
    })),
    subtotalCents,
    taxCents,
    serviceChargeCents: 0,
    totalCents,
    tipCents,
    paymentMethod: paymentLabel(payments.map((payment) => payment.method)),
    footer:
      (settingsResult.data?.receipt_footer as string | null) ??
      "Grazie e arrivederci",
    paperWidth: printerResult.data.paper_width as 58 | 80,
  };

  const { error } = await supabase.from("print_jobs").upsert(
    {
      organization_id: input.restaurant.organizationId,
      restaurant_id: input.restaurant.id,
      printer_id: printerResult.data.id,
      order_id: input.orderId,
      job_type: "receipt",
      payload,
      status: "queued",
      idempotency_key: `receipt:${input.orderId}`,
      created_by: input.userId,
    },
    { onConflict: "restaurant_id,idempotency_key", ignoreDuplicates: true },
  );

  if (error) {
    return { queued: false, reason: "insert_failed" };
  }

  return { queued: true };
}

export async function enqueueKitchenTicketForOrder(input: {
  orderId: string;
  restaurant: ActiveRestaurant;
  userId: string;
}): Promise<{ queued: boolean; reason?: string }> {
  const supabase = await createClient();

  const [itemsResult, printerResult, orderResult] = await Promise.all([
    supabase
      .from("order_items")
      .select("name, quantity, note")
      .eq("order_id", input.orderId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true }),
    supabase
      .from("printer_profiles")
      .select("id, paper_width")
      .eq("restaurant_id", input.restaurant.id)
      .eq("station", "kitchen")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id, note, restaurant_tables(name)")
      .eq("id", input.orderId)
      .eq("restaurant_id", input.restaurant.id)
      .maybeSingle(),
  ]);

  if (!printerResult.data || !orderResult.data) {
    return { queued: false, reason: "not_configured" };
  }

  const table = Array.isArray(orderResult.data.restaurant_tables)
    ? orderResult.data.restaurant_tables[0]
    : orderResult.data.restaurant_tables;

  const payload: KitchenPayload = {
    kind: "kitchen",
    restaurantName: input.restaurant.name,
    orderNumber: input.orderId.slice(0, 8).toUpperCase(),
    tableName: table?.name ?? null,
    createdAt: new Date().toISOString(),
    items: ((itemsResult.data ?? []) as Array<{
      name: string;
      quantity: number;
      note: string;
    }>).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      note: item.note,
    })),
    notes: (orderResult.data.note as string) ?? "",
    paperWidth: printerResult.data.paper_width as 58 | 80,
  };

  const { error } = await supabase.from("print_jobs").upsert(
    {
      organization_id: input.restaurant.organizationId,
      restaurant_id: input.restaurant.id,
      printer_id: printerResult.data.id,
      order_id: input.orderId,
      job_type: "kitchen",
      payload,
      status: "queued",
      idempotency_key: `kitchen:${input.orderId}`,
      created_by: input.userId,
    },
    { onConflict: "restaurant_id,idempotency_key", ignoreDuplicates: true },
  );

  return error ? { queued: false, reason: "insert_failed" } : { queued: true };
}

"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFromZod, formCheckbox, formString } from "@/lib/forms";
import type { PublicOrderState } from "@/server/online/types";

const itemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  note: z.string().trim().max(200).optional().default(""),
});

const orderSchema = z.object({
  token: z.string().min(16, "Link non valido.").max(200),
  customerName: z
    .string()
    .trim()
    .min(2, "Inserisci il tuo nome.")
    .max(160, "Nome troppo lungo."),
  email: z
    .string()
    .trim()
    .max(254)
    .refine(
      (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "Email non valida.",
    ),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(
      (value) => value === "" || /^[+0-9 ().-]{6,40}$/.test(value),
      "Telefono non valido.",
    ),
  fulfillment: z.enum(["pickup", "delivery", "dine_in"]),
  tableId: z.string().trim(),
  notes: z.string().trim().max(500, "Note troppo lunghe."),
  marketingEmail: z.boolean(),
  marketingSms: z.boolean(),
  idempotencyKey: z.string().min(8).max(120),
});

export async function submitPublicOrderAction(
  _prevState: PublicOrderState,
  formData: FormData,
): Promise<PublicOrderState> {
  // Honeypot: i bot compilano il campo nascosto, le persone no.
  if (formString(formData, "website") !== "") {
    return { status: "error", message: "Richiesta non valida." };
  }

  const parsed = orderSchema.safeParse({
    token: formString(formData, "token"),
    customerName: formString(formData, "customerName"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    fulfillment: formString(formData, "fulfillment") || "pickup",
    tableId: formString(formData, "tableId"),
    notes: formString(formData, "notes"),
    marketingEmail: formCheckbox(formData, "marketingEmail"),
    marketingSms: formCheckbox(formData, "marketingSms"),
    idempotencyKey: formString(formData, "idempotencyKey"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (parsed.data.email === "" && parsed.data.phone === "") {
    return {
      status: "error",
      fieldErrors: { email: "Inserisci email o telefono per essere contattato." },
    };
  }

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(formString(formData, "items") || "[]");
  } catch {
    return { status: "error", fieldErrors: { items: "Carrello non valido." } };
  }

  const itemsParsed = z.array(itemSchema).min(1).max(50).safeParse(rawItems);
  if (!itemsParsed.success) {
    return {
      status: "error",
      fieldErrors: { items: "Aggiungi almeno un prodotto al carrello." },
    };
  }

  const payload = {
    customer_name: parsed.data.customerName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    fulfillment: parsed.data.fulfillment,
    table_id: parsed.data.tableId || null,
    notes: parsed.data.notes,
    marketing_email: parsed.data.marketingEmail,
    marketing_sms: parsed.data.marketingSms,
    idempotency_key: parsed.data.idempotencyKey,
    items: itemsParsed.data.map((item) => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      note: item.note,
    })),
  };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_online_order", {
    p_token: parsed.data.token,
    p_payload: payload,
  });

  if (error) {
    if (error.code === "P0002") {
      return { status: "error", message: "Link non valido o scaduto." };
    }
    if (error.code === "42501") {
      return {
        status: "error",
        message: "Questo menu non accetta ordini online.",
      };
    }
    if (error.code === "23514" || error.code === "23503") {
      return {
        status: "error",
        message: error.message || "Uno dei prodotti non è più disponibile.",
      };
    }
    return {
      status: "error",
      message: "Invio dell'ordine non riuscito. Riprova tra poco.",
    };
  }

  const result = data as {
    order_id: string;
    order_number: string;
    total_cents: number;
    currency: string;
    duplicate: boolean;
  };

  return {
    status: "success",
    message: result.duplicate
      ? "Questo ordine era già stato ricevuto."
      : "Ordine inviato al ristorante.",
    orderId: result.order_id,
    orderNumber: result.order_number,
    totalCents: Number(result.total_cents),
    currency: result.currency,
  };
}

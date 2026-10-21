"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseQuantityToMilli } from "@/lib/inventory";
import { createClient } from "@/lib/supabase/server";
import { parseEuroToCents } from "@/lib/utils";
import { getSessionContext } from "@/server/auth/session";
import {
  canManagePurchasing,
  getActiveRestaurant,
} from "@/server/purchasing/queries";
import type { PurchaseOrderActionState } from "@/server/purchasing/types";

const MAX_ORDER_LINES = 50;

const uuidField = z.string().uuid("Elemento non valido.");

const nullableUuidField = z
  .union([z.string().uuid("Elemento non valido."), z.literal("")])
  .transform((value) => (value === "" ? null : value));

const quantityField = z
  .string()
  .trim()
  .min(1, "Inserisci una quantita.")
  .transform(parseQuantityToMilli)
  .refine(
    (value): value is number => value !== null && value > 0,
    "Usa una quantita positiva, ad esempio 2,5.",
  );

const receivedQuantityField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? 0 : parseQuantityToMilli(value)))
  .refine(
    (value): value is number => value !== null && value >= 0,
    "Usa una quantita ricevuta valida.",
  );

const costField = z
  .string()
  .trim()
  .min(1, "Inserisci il costo.")
  .max(12, "Il costo e troppo lungo.")
  .regex(
    /^(\d{1,3}(\.\d{3})+|\d{1,7})(,\d{1,2})?$/,
    "Usa un formato valido, ad esempio 8,90.",
  )
  .transform(parseEuroToCents)
  .refine(
    (cents) => cents >= 0 && cents <= 100_000_000,
    "Il costo non e valido.",
  );

const expectedOnField = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida."),
    z.literal(""),
  ])
  .transform((value) => (value === "" ? null : value))
  .refine((value) => {
    if (value === null) return true;
    const parsed = new Date(`${value}T00:00:00`);
    return !Number.isNaN(parsed.getTime());
  }, "Data non valida.");

const orderLineSchema = z.object({
  inventoryItemId: uuidField,
  quantity: quantityField,
  cost: costField,
});

const orderSchema = z.object({
  orderId: nullableUuidField,
  supplierId: uuidField,
  expectedOn: expectedOnField,
  notes: z.string().trim().max(500, "Le note sono troppo lunghe."),
  items: z
    .array(orderLineSchema)
    .min(1, "Aggiungi almeno una riga.")
    .max(MAX_ORDER_LINES, "Puoi inserire al massimo 50 righe."),
  idempotencyKey: z.string().uuid("Richiesta non valida."),
});

const receiptLineSchema = z.object({
  itemId: uuidField,
  quantity: receivedQuantityField,
});

const receiptSchema = z.object({
  orderId: uuidField,
  note: z.string().trim().max(500, "Le note sono troppo lunghe."),
  items: z
    .array(receiptLineSchema)
    .max(MAX_ORDER_LINES, "Troppe righe di ricezione."),
});

function fieldErrors(error: z.ZodError): PurchaseOrderActionState {
  const result: Record<string, string | undefined> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }

  return { status: "error", fieldErrors: result };
}

function parseJsonField(
  formData: FormData,
  name: string,
): { ok: true; value: unknown } | { ok: false; state: PurchaseOrderActionState } {
  try {
    return {
      ok: true,
      value: JSON.parse(String(formData.get(name) ?? "[]")),
    };
  } catch {
    return {
      ok: false,
      state: {
        status: "error",
        fieldErrors: { [name]: "La lista delle righe non e valida." },
      },
    };
  }
}

function databaseMessage(code: string | undefined): string {
  switch (code) {
    case "23505":
      return "Questo ordine e gia stato registrato.";
    case "23503":
      return "Fornitore o articolo non appartiene a questo ristorante.";
    case "23514":
      return "Operazione non valida: controlla stato, quantita e costi.";
    case "42501":
      return "Non hai i permessi per gestire gli acquisti.";
    case "P0002":
      return "Ordine, fornitore o articolo non trovati: aggiorna la pagina.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

async function authorize(): Promise<
  | { ok: true; restaurantId: string }
  | { ok: false; state: PurchaseOrderActionState }
> {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/acquisti");
  }

  const restaurant = await getActiveRestaurant();

  if (!restaurant) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Nessun ristorante associato a questo account.",
      },
    };
  }

  const allowed = await canManagePurchasing(restaurant.id);

  if (!allowed) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Il tuo ruolo non consente di gestire gli acquisti.",
      },
    };
  }

  return { ok: true, restaurantId: restaurant.id };
}

function revalidatePurchasing() {
  revalidatePath("/dashboard/acquisti");
  revalidatePath("/dashboard/magazzino");
}

export async function savePurchaseOrderAction(
  _prevState: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const rawItems = parseJsonField(formData, "items");
  if (!rawItems.ok) return rawItems.state;

  const parsed = orderSchema.safeParse({
    orderId: formData.get("orderId") ?? "",
    supplierId: formData.get("supplierId") ?? "",
    expectedOn: formData.get("expectedOn") ?? "",
    notes: formData.get("notes") ?? "",
    items: rawItems.value,
    idempotencyKey: formData.get("idempotencyKey") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const uniqueItems = new Set(
    parsed.data.items.map((item) => item.inventoryItemId),
  );
  if (uniqueItems.size !== parsed.data.items.length) {
    return {
      status: "error",
      fieldErrors: {
        items: "Ogni articolo puo comparire una sola volta nell'ordine.",
      },
    };
  }

  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_purchase_order", {
    p_restaurant_id: auth.restaurantId,
    p_order_id: parsed.data.orderId,
    p_supplier_id: parsed.data.supplierId,
    p_expected_on: parsed.data.expectedOn,
    p_notes: parsed.data.notes,
    p_items: parsed.data.items.map((item) => ({
      inventory_item_id: item.inventoryItemId,
      quantity_milli: item.quantity,
      unit_cost_cents: item.cost,
    })),
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  revalidatePurchasing();
  return {
    status: "success",
    message: parsed.data.orderId
      ? "Ordine aggiornato."
      : "Ordine di acquisto creato.",
  };
}

export async function markPurchaseOrderOrderedAction(
  _prevState: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const parsed = z.object({ orderId: uuidField }).safeParse({
    orderId: formData.get("orderId") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_purchase_order_ordered", {
    p_order_id: parsed.data.orderId,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  revalidatePurchasing();
  return { status: "success", message: "Ordine segnato come ordinato." };
}

export async function cancelPurchaseOrderAction(
  _prevState: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const parsed = z.object({ orderId: uuidField }).safeParse({
    orderId: formData.get("orderId") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_purchase_order", {
    p_order_id: parsed.data.orderId,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  revalidatePurchasing();
  return { status: "success", message: "Ordine annullato." };
}

export async function receivePurchaseOrderAction(
  _prevState: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const rawItems = parseJsonField(formData, "items");
  if (!rawItems.ok) return rawItems.state;

  const parsed = receiptSchema.safeParse({
    orderId: formData.get("orderId") ?? "",
    note: formData.get("note") ?? "",
    items: rawItems.value,
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const uniqueItems = new Set(parsed.data.items.map((item) => item.itemId));
  if (uniqueItems.size !== parsed.data.items.length) {
    return {
      status: "error",
      fieldErrors: {
        items: "Ogni riga puo comparire una sola volta nella ricezione.",
      },
    };
  }

  if (!parsed.data.items.some((item) => item.quantity > 0)) {
    return {
      status: "error",
      fieldErrors: { items: "Registra almeno una quantita ricevuta." },
    };
  }

  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_purchase_order", {
    p_order_id: parsed.data.orderId,
    p_items: parsed.data.items.map((item) => ({
      item_id: item.itemId,
      quantity_milli: item.quantity,
    })),
    p_note: parsed.data.note,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  revalidatePurchasing();
  return {
    status: "success",
    message: "Ricezione registrata e giacenze aggiornate.",
  };
}

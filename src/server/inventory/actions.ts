"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseQuantityToMilli } from "@/lib/inventory";
import { createClient } from "@/lib/supabase/server";
import { parseEuroToCents } from "@/lib/utils";
import { getSessionContext, type SessionContext } from "@/server/auth/session";
import {
  canManageInventory,
  getActiveRestaurant,
} from "@/server/inventory/queries";
import type { InventoryActionState } from "@/server/inventory/types";
import { WASTE_REASON_LABELS } from "@/server/inventory/types";
import type { ActiveRestaurant } from "@/server/restaurant/active";

const uuidField = z.string().uuid("Elemento non valido.");

const supplierIdField = z
  .union([z.string().uuid("Fornitore non valido."), z.literal("")])
  .transform((value) => (value === "" ? null : value));

const nameField = z
  .string()
  .trim()
  .min(1, "Inserisci un nome.")
  .max(120, "Il nome e troppo lungo.");

const skuField = z
  .string()
  .trim()
  .max(60, "Il codice e troppo lungo.");

const categoryField = z
  .string()
  .trim()
  .max(80, "La categoria e troppo lunga.");

const unitField = z
  .string()
  .trim()
  .min(1, "Inserisci un'unita di misura.")
  .max(12, "L'unita di misura e troppo lunga.");

const quantityField = z
  .string()
  .trim()
  .min(1, "Inserisci una quantita.")
  .transform(parseQuantityToMilli)
  .refine((value): value is number => value !== null, "Usa una quantita valida, ad esempio 12,5.");

const nonNegativeQuantityField = quantityField.refine(
  (value) => value >= 0,
  "La quantita non puo essere negativa.",
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

const expiresOnField = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida."), z.literal("")])
  .transform((value) => (value === "" ? null : value))
  .refine((value) => {
    if (value === null) return true;
    const parsed = new Date(`${value}T00:00:00`);
    return !Number.isNaN(parsed.getTime());
  }, "Data non valida.");

const itemSchema = z.object({
  name: nameField,
  sku: skuField,
  category: categoryField,
  unit: unitField,
  quantity: nonNegativeQuantityField,
  minQuantity: nonNegativeQuantityField,
  cost: costField,
  supplierId: supplierIdField,
  lot: z.string().trim().max(60, "Il lotto e troppo lungo."),
  expiresOn: expiresOnField,
  location: z.string().trim().max(80, "La posizione e troppo lunga."),
});

const createItemSchema = itemSchema.extend({
  idempotencyKey: z.string().uuid("Richiesta non valida."),
});

const updateItemSchema = itemSchema.omit({ quantity: true }).extend({
  itemId: uuidField,
});

const supplierSchema = z.object({
  name: nameField,
  category: z.string().trim().max(80, "La categoria e troppo lunga."),
  email: z
    .string()
    .trim()
    .max(160, "L'email e troppo lunga.")
    .refine(
      (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "Inserisci un'email valida.",
    ),
  phone: z.string().trim().max(40, "Il telefono e troppo lungo."),
  notes: z.string().trim().max(500, "Le note sono troppo lunghe."),
});

const createSupplierSchema = supplierSchema;
const updateSupplierSchema = supplierSchema.extend({ supplierId: uuidField });

const movementSchema = z.object({
  itemId: uuidField,
  kind: z.enum(["load", "unload", "waste", "adjustment"]),
  quantity: quantityField,
  reason: z.enum(Object.keys(WASTE_REASON_LABELS) as [string, ...string[]]).optional(),
  note: z.string().trim().max(300, "La nota e troppo lunga."),
  idempotencyKey: z.string().uuid("Richiesta non valida."),
});

function fieldErrors(error: z.ZodError): InventoryActionState {
  const result: Record<string, string | undefined> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }

  return { status: "error", fieldErrors: result };
}

function databaseMessage(code: string | undefined): string {
  switch (code) {
    case "23505":
      return "Esiste gia un elemento con questo nome o questa chiave.";
    case "23503":
      return "Il fornitore selezionato non appartiene a questo ristorante.";
    case "23514":
      return "Operazione non valida: controlla quantita, motivazione e giacenza.";
    case "42501":
      return "Non hai i permessi per gestire il magazzino.";
    case "P0002":
      return "Elemento non trovato: aggiorna la pagina e riprova.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

type Authorized = {
  session: SessionContext;
  restaurant: ActiveRestaurant;
};

async function authorize(): Promise<
  { ok: true; context: Authorized } | { ok: false; state: InventoryActionState }
> {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/magazzino");
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

  const allowed = await canManageInventory(restaurant.id);

  if (!allowed) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Il tuo ruolo non consente di gestire il magazzino.",
      },
    };
  }

  return { ok: true, context: { session, restaurant } };
}

async function audit(
  context: Authorized,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>,
) {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert({
    organization_id: context.restaurant.organizationId,
    restaurant_id: context.restaurant.id,
    actor_user_id: context.session.user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export async function createInventoryItemAction(
  _prevState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = createItemSchema.safeParse({
    name: formData.get("name") ?? "",
    sku: formData.get("sku") ?? "",
    category: formData.get("category") ?? "",
    unit: formData.get("unit") ?? "",
    quantity: formData.get("quantity") ?? "",
    minQuantity: formData.get("minQuantity") ?? "",
    cost: formData.get("cost") ?? "",
    supplierId: formData.get("supplierId") ?? "",
    lot: formData.get("lot") ?? "",
    expiresOn: formData.get("expiresOn") ?? "",
    location: formData.get("location") ?? "",
    idempotencyKey: formData.get("idempotencyKey") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_inventory_item", {
    p_restaurant_id: context.restaurant.id,
    p_name: parsed.data.name,
    p_sku: parsed.data.sku,
    p_category: parsed.data.category || "Generale",
    p_unit: parsed.data.unit,
    p_quantity_milli: parsed.data.quantity,
    p_min_quantity_milli: parsed.data.minQuantity,
    p_cost_per_unit_cents: parsed.data.cost,
    p_supplier_id: parsed.data.supplierId,
    p_lot: parsed.data.lot,
    p_expires_on: parsed.data.expiresOn,
    p_location: parsed.data.location,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  revalidatePath("/dashboard/magazzino");
  return { status: "success", message: "Articolo creato con giacenza iniziale." };
}

export async function updateInventoryItemAction(
  _prevState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = updateItemSchema.safeParse({
    itemId: formData.get("itemId") ?? "",
    name: formData.get("name") ?? "",
    sku: formData.get("sku") ?? "",
    category: formData.get("category") ?? "",
    unit: formData.get("unit") ?? "",
    minQuantity: formData.get("minQuantity") ?? "",
    cost: formData.get("cost") ?? "",
    supplierId: formData.get("supplierId") ?? "",
    lot: formData.get("lot") ?? "",
    expiresOn: formData.get("expiresOn") ?? "",
    location: formData.get("location") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku,
      category: parsed.data.category || "Generale",
      unit: parsed.data.unit,
      min_quantity_milli: parsed.data.minQuantity,
      cost_per_unit_cents: parsed.data.cost,
      supplier_id: parsed.data.supplierId,
      lot: parsed.data.lot,
      expires_on: parsed.data.expiresOn,
      location: parsed.data.location,
    })
    .eq("id", parsed.data.itemId)
    .eq("restaurant_id", context.restaurant.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { status: "error", message: databaseMessage(error?.code) };
  }

  await audit(context, "inventory.item_updated", "inventory_item", parsed.data.itemId, {
    name: parsed.data.name,
  });
  revalidatePath("/dashboard/magazzino");
  return { status: "success", message: "Articolo aggiornato." };
}

export async function createSupplierAction(
  _prevState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = createSupplierSchema.safeParse({
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      organization_id: context.restaurant.organizationId,
      restaurant_id: context.restaurant.id,
      name: parsed.data.name,
      category: parsed.data.category,
      email: parsed.data.email,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { status: "error", message: databaseMessage(error?.code) };
  }

  await audit(context, "inventory.supplier_created", "supplier", data.id as string, {
    name: parsed.data.name,
  });
  revalidatePath("/dashboard/magazzino");
  return { status: "success", message: "Fornitore creato." };
}

export async function updateSupplierAction(
  _prevState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = updateSupplierSchema.safeParse({
    supplierId: formData.get("supplierId") ?? "",
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update({
      name: parsed.data.name,
      category: parsed.data.category,
      email: parsed.data.email,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
    })
    .eq("id", parsed.data.supplierId)
    .eq("restaurant_id", context.restaurant.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { status: "error", message: databaseMessage(error?.code) };
  }

  await audit(context, "inventory.supplier_updated", "supplier", parsed.data.supplierId, {
    name: parsed.data.name,
  });
  revalidatePath("/dashboard/magazzino");
  return { status: "success", message: "Fornitore aggiornato." };
}

export async function recordInventoryMovementAction(
  _prevState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = movementSchema.safeParse({
    itemId: formData.get("itemId") ?? "",
    kind: formData.get("kind") ?? "",
    quantity: formData.get("quantity") ?? "",
    reason: formData.get("reason") || undefined,
    note: formData.get("note") ?? "",
    idempotencyKey: formData.get("idempotencyKey") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;

  let delta = parsed.data.quantity;
  if (parsed.data.kind === "adjustment") {
    if (delta === 0) {
      return { status: "error", fieldErrors: { quantity: "La rettifica non puo essere zero." } };
    }
  } else {
    if (delta <= 0) {
      return {
        status: "error",
        fieldErrors: { quantity: "Inserisci una quantita positiva." },
      };
    }
    delta = parsed.data.kind === "load" ? delta : -delta;
  }

  if (parsed.data.kind === "waste" && !parsed.data.reason) {
    return {
      status: "error",
      fieldErrors: { reason: "Scegli la motivazione dello spreco." },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_inventory_movement", {
    p_item_id: parsed.data.itemId,
    p_kind: parsed.data.kind,
    p_quantity_delta_milli: delta,
    p_reason: parsed.data.kind === "waste" ? (parsed.data.reason ?? "") : "",
    p_note: parsed.data.note,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  const result = data as { duplicate?: boolean } | null;
  revalidatePath("/dashboard/magazzino");
  return {
    status: "success",
    message: result?.duplicate
      ? "Movimento gia registrato."
      : "Movimento di magazzino registrato.",
  };
}



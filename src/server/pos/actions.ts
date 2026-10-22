"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseEuroToCents } from "@/lib/utils";
import { getSessionContext, type SessionContext } from "@/server/auth/session";
import { canOperatePos } from "@/server/pos/queries";
import type { PosActionState } from "@/server/pos/types";
import { enqueueReceiptForOrder } from "@/server/printers/receipts";
import {
  getActiveRestaurant,
  type ActiveRestaurant,
} from "@/server/restaurant/active";

const uuidField = z.string().uuid("Elemento non valido.");

const tableIdField = z
  .union([z.string().uuid("Tavolo non valido."), z.literal("")])
  .transform((value) => (value === "" ? null : value))
  .optional()
  .transform((value) => value ?? null);

const guestsField = z
  .union([z.string().trim().regex(/^\d{1,2}$/), z.literal("")])
  .transform((value) => (value === "" ? null : Number(value)))
  .refine(
    (guests) => guests === null || (guests >= 1 && guests <= 50),
    "Il numero di coperti deve essere tra 1 e 50.",
  );

const noteField = z
  .string()
  .trim()
  .max(300, "La nota è troppo lunga.")
  .optional()
  .transform((value) => value ?? "");

const amountField = z
  .string()
  .trim()
  .min(1, "Inserisci l'importo.")
  .max(12, "L'importo è troppo lungo.")
  .regex(
    /^(\d{1,3}(\.\d{3})+|\d{1,7})(,\d{1,2})?$/,
    "Usa un formato valido, ad esempio 12,50.",
  )
  .transform(parseEuroToCents)
  .refine(
    (cents) => cents >= 1 && cents <= 100_000_000,
    "L'importo non è valido.",
  );

const tipField = z
  .string()
  .trim()
  .max(12, "La mancia è troppo lunga.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : "0"))
  .pipe(
    z
      .string()
      .regex(
        /^(\d{1,3}(\.\d{3})+|\d{1,7})(,\d{1,2})?$/,
        "Usa un formato valido per la mancia.",
      )
      .transform(parseEuroToCents),
  )
  .refine(
    (cents) => cents >= 0 && cents <= 10_000_000,
    "La mancia non è valida.",
  );

const openOrderSchema = z.object({
  tableId: tableIdField,
  guests: guestsField,
  note: noteField,
});

const addItemSchema = z.object({
  orderId: uuidField,
  menuItemId: uuidField,
  quantity: z
    .string()
    .trim()
    .min(1)
    .regex(/^\d{1,2}$/, "Quantità non valida.")
    .transform(Number)
    .refine((value) => value >= 1 && value <= 99, "Quantità non valida."),
});

const itemActionSchema = z.object({ itemId: uuidField });

const orderActionSchema = z.object({ orderId: uuidField });

const payOrderSchema = z.object({
  orderId: uuidField,
  method: z.enum(["cash", "card", "other"], {
    message: "Scegli un metodo di pagamento.",
  }),
  amount: amountField,
  tip: tipField,
  idempotencyKey: z.string().uuid("Chiave di pagamento non valida."),
});

function fieldErrors(error: z.ZodError): PosActionState {
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
      return "Operazione già registrata: aggiorna la pagina e riprova.";
    case "23503":
      return "Il riferimento selezionato non è valido per questo ristorante.";
    case "23514":
      return "Operazione non consentita nello stato attuale del conto.";
    case "P0002":
      return "Elemento non trovato: aggiorna la pagina e riprova.";
    case "42501":
      return "Non hai i permessi per operare sulla cassa.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

type Authorized = {
  session: SessionContext;
  restaurant: ActiveRestaurant;
};

async function authorize(): Promise<
  { ok: true; context: Authorized } | { ok: false; state: PosActionState }
> {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/pos");
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

  const allowed = await canOperatePos(restaurant.id);

  if (!allowed) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Il tuo ruolo non consente di operare sulla cassa.",
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

export async function openOrderAction(
  _prevState: PosActionState,
  formData: FormData,
): Promise<PosActionState> {
  const parsed = openOrderSchema.safeParse({
    tableId: formData.get("tableId") ?? "",
    guests: formData.get("guests") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_order", {
    p_restaurant_id: context.restaurant.id,
    p_table_id: parsed.data.tableId,
    p_guests: parsed.data.guests,
    p_note: parsed.data.note,
  });

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        status: "error",
        message: "Il tavolo ha già un conto aperto.",
      };
    }
    return { status: "error", message: databaseMessage(error?.code) };
  }

  await audit(context, "pos.order_opened", "order", data as string, {
    table_id: parsed.data.tableId,
    guests: parsed.data.guests,
  });

  revalidatePath("/dashboard/pos");
  return { status: "success", message: "Conto aperto." };
}

export async function addItemAction(
  _prevState: PosActionState,
  formData: FormData,
): Promise<PosActionState> {
  const parsed = addItemSchema.safeParse({
    orderId: formData.get("orderId"),
    menuItemId: formData.get("menuItemId"),
    quantity: formData.get("quantity") ?? "1",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_order_items", {
    p_order_id: parsed.data.orderId,
    p_items: [
      {
        menu_item_id: parsed.data.menuItemId,
        quantity: parsed.data.quantity,
      },
    ],
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  await audit(context, "pos.items_added", "order", parsed.data.orderId, {
    menu_item_id: parsed.data.menuItemId,
    quantity: parsed.data.quantity,
    items: data,
  });

  revalidatePath("/dashboard/pos");
  return { status: "success", message: "Prodotto aggiunto al conto." };
}

export async function cancelItemAction(
  _prevState: PosActionState,
  formData: FormData,
): Promise<PosActionState> {
  const parsed = itemActionSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order_item", {
    p_item_id: parsed.data.itemId,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  await audit(context, "pos.item_cancelled", "order_item", parsed.data.itemId, {});

  revalidatePath("/dashboard/pos");
  return { status: "success", message: "Riga annullata." };
}

export async function payOrderAction(
  _prevState: PosActionState,
  formData: FormData,
): Promise<PosActionState> {
  const parsed = payOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    method: formData.get("method"),
    amount: formData.get("amount"),
    tip: formData.get("tip") ?? "",
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pay_order", {
    p_order_id: parsed.data.orderId,
    p_method: parsed.data.method,
    p_amount_cents: parsed.data.amount,
    p_tip_cents: parsed.data.tip,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  const result = data as {
    status?: string;
    total_cents?: number;
    paid_cents?: number;
    replayed?: boolean;
  } | null;

  if (result?.replayed) {
    return { status: "success", message: "Pagamento già registrato." };
  }

  const closed = result?.status === "paid";

  await audit(
    context,
    closed ? "pos.order_paid" : "pos.payment_recorded",
    "order",
    parsed.data.orderId,
    {
      method: parsed.data.method,
      amount_cents: parsed.data.amount,
      tip_cents: parsed.data.tip,
      paid_cents: result?.paid_cents ?? null,
      total_cents: result?.total_cents ?? null,
    },
  );

  let receiptQueued = false;
  if (closed) {
    const receipt = await enqueueReceiptForOrder({
      orderId: parsed.data.orderId,
      restaurant: context.restaurant,
      userId: context.session.user.id,
    });
    receiptQueued = receipt.queued;
  }

  revalidatePath("/dashboard/pos");
  return {
    status: "success",
    message: closed
      ? receiptQueued
        ? "Conto incassato e chiuso. Scontrino inviato alla stampante."
        : "Conto incassato e chiuso. Nessuna stampante scontrini attiva: configura la stampante in Integrazioni."
      : "Pagamento registrato: il conto resta aperto per il saldo.",
  };
}

export async function voidOrderAction(
  _prevState: PosActionState,
  formData: FormData,
): Promise<PosActionState> {
  const parsed = orderActionSchema.safeParse({
    orderId: formData.get("orderId"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_order", {
    p_order_id: parsed.data.orderId,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  await audit(context, "pos.order_voided", "order", parsed.data.orderId, {});

  revalidatePath("/dashboard/pos");
  return { status: "success", message: "Conto annullato." };
}

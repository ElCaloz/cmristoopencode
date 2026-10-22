"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsFromZod,
  formCheckbox,
  formString,
} from "@/lib/forms";
import { authorizeRestaurant } from "@/server/auth/authorize";
import type { OnlineActionState } from "@/server/online/types";
import { enqueueKitchenTicketForOrder } from "@/server/printers/receipts";

const linkSchema = z
  .object({
    label: z.string().trim().max(120, "Etichetta troppo lunga."),
    kind: z.enum(["menu", "table"]),
    tableId: z.string().trim(),
    allowOrdering: z.boolean(),
    expiresAt: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
        "Data non valida.",
      ),
  })
  .refine(
    (data) => data.kind !== "table" || /^[0-9a-f-]{36}$/i.test(data.tableId),
    { message: "Seleziona un tavolo.", path: ["tableId"] },
  );

const orderIdSchema = z.object({
  orderId: z.string().uuid("Ordine non valido."),
});

const statusSchema = z.object({
  orderId: z.string().uuid("Ordine non valido."),
  status: z.enum([
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "completed",
    "cancelled",
  ]),
});

export async function createPublicLinkAction(
  _prevState: OnlineActionState,
  formData: FormData,
): Promise<OnlineActionState> {
  const parsed = linkSchema.safeParse({
    label: formString(formData, "label"),
    kind: formString(formData, "kind") || "menu",
    tableId: formString(formData, "tableId"),
    allowOrdering: formCheckbox(formData, "allowOrdering"),
    expiresAt: formString(formData, "expiresAt"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "menu.manage",
    "/dashboard/online",
    "Il tuo ruolo non consente di creare link pubblici.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_public_links")
    .insert({
      organization_id: restaurant.organizationId,
      restaurant_id: restaurant.id,
      kind: parsed.data.kind,
      label:
        parsed.data.label ||
        (parsed.data.kind === "table" ? "Menu del tavolo" : "Menu pubblico"),
      table_id: parsed.data.kind === "table" ? parsed.data.tableId : null,
      allow_ordering: parsed.data.allowOrdering,
      expires_at:
        parsed.data.expiresAt === ""
          ? null
          : new Date(`${parsed.data.expiresAt}T23:59:59`).toISOString(),
      created_by: session.user.id,
    })
    .select("id, token")
    .single();

  if (error || !data) {
    return {
      status: "error",
      message:
        error?.code === "23503"
          ? "Il tavolo selezionato non appartiene a questa sede."
          : "Creazione del link non riuscita.",
    };
  }

  await supabase.from("audit_logs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    actor_user_id: session.user.id,
    action: "online.link_created",
    entity_type: "restaurant_public_link",
    entity_id: data.id,
    metadata: { kind: parsed.data.kind, allow_ordering: parsed.data.allowOrdering },
  });

  revalidatePath("/dashboard/online");
  return {
    status: "success",
    message: parsed.data.allowOrdering
      ? "Link creato: menu e ordini online attivi."
      : "Link creato: solo consultazione del menu.",
  };
}

export async function togglePublicLinkAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formString(formData, "linkId"));
  const next = formString(formData, "isActive") === "true";
  if (!id.success) return;

  const auth = await authorizeRestaurant(
    "menu.manage",
    "/dashboard/online",
    "Permesso insufficiente.",
  );
  if (!auth.ok) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurant_public_links")
    .update({ is_active: next })
    .eq("id", id.data)
    .eq("restaurant_id", auth.context.restaurant.id);

  if (error) return;

  await supabase.from("audit_logs").insert({
    organization_id: auth.context.restaurant.organizationId,
    restaurant_id: auth.context.restaurant.id,
    actor_user_id: auth.context.session.user.id,
    action: "online.link_toggled",
    entity_type: "restaurant_public_link",
    entity_id: id.data,
    metadata: { is_active: next },
  });

  revalidatePath("/dashboard/online");
}

export async function confirmOnlineOrderAction(
  _prevState: OnlineActionState,
  formData: FormData,
): Promise<OnlineActionState> {
  const parsed = orderIdSchema.safeParse({
    orderId: formString(formData, "orderId"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "orders.manage",
    "/dashboard/online",
    "Il tuo ruolo non consente di confermare ordini online.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_online_order", {
    p_online_order_id: parsed.data.orderId,
  });

  revalidatePath("/dashboard/online");
  revalidatePath("/dashboard/cucina");
  revalidatePath("/dashboard/pos");

  if (error || typeof data !== "string") {
    return {
      status: "error",
      message:
        error?.code === "42501"
          ? "Permesso insufficiente."
          : error?.code === "23514"
            ? "L'ordine non può essere confermato nello stato attuale."
            : "Conferma dell'ordine non riuscita.",
    };
  }

  const kitchen = await enqueueKitchenTicketForOrder({
    orderId: data,
    restaurant: auth.context.restaurant,
    userId: auth.context.session.user.id,
  });

  return {
    status: "success",
    message: kitchen.queued
      ? `Ordine confermato: comanda ${data.slice(0, 8).toUpperCase()} inviata a cucina e stampante.`
      : `Ordine confermato e inviato in cucina (comanda ${data.slice(0, 8).toUpperCase()}). Nessuna stampante cucina attiva.`,
  };
}

export async function setOnlineOrderPaymentAction(
  _prevState: OnlineActionState,
  formData: FormData,
): Promise<OnlineActionState> {
  const parsed = z
    .object({
      orderId: z.string().uuid("Ordine non valido."),
      paymentStatus: z.enum(["unpaid", "paid", "refunded"]),
    })
    .safeParse({
      orderId: formString(formData, "orderId"),
      paymentStatus: formString(formData, "paymentStatus"),
    });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "orders.manage",
    "/dashboard/online",
    "Il tuo ruolo non consente di registrare pagamenti degli ordini online.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_online_order_payment_status", {
    p_online_order_id: parsed.data.orderId,
    p_payment_status: parsed.data.paymentStatus,
  });

  revalidatePath("/dashboard/online");

  if (error) {
    return { status: "error", message: "Aggiornamento del pagamento non riuscito." };
  }

  return {
    status: "success",
    message:
      parsed.data.paymentStatus === "paid"
        ? "Pagamento registrato."
        : "Stato del pagamento aggiornato.",
  };
}

export async function updateOnlineOrderStatusAction(
  _prevState: OnlineActionState,
  formData: FormData,
): Promise<OnlineActionState> {
  const parsed = statusSchema.safeParse({
    orderId: formString(formData, "orderId"),
    status: formString(formData, "status"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "orders.manage",
    "/dashboard/online",
    "Il tuo ruolo non consente di aggiornare gli ordini online.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_online_order_status", {
    p_online_order_id: parsed.data.orderId,
    p_status: parsed.data.status,
  });

  revalidatePath("/dashboard/online");
  revalidatePath("/dashboard/cucina");
  revalidatePath("/dashboard/pos");

  if (error) {
    return { status: "error", message: "Aggiornamento dell'ordine non riuscito." };
  }

  return { status: "success", message: "Stato dell'ordine aggiornato." };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseEuroToCents } from "@/lib/utils";
import { getSessionContext, type SessionContext } from "@/server/auth/session";
import { canManageMenu, getActiveRestaurant } from "@/server/menu/queries";
import type {
  ActiveRestaurant,
  MenuActionState,
} from "@/server/menu/types";

const entityNameField = z
  .string()
  .trim()
  .min(1, "Inserisci un nome.")
  .max(120, "Il nome è troppo lungo.");

const categoryNameField = z
  .string()
  .trim()
  .min(1, "Inserisci un nome.")
  .max(80, "Il nome è troppo lungo.");

const priceField = z
  .string()
  .trim()
  .min(1, "Inserisci il prezzo.")
  .max(12, "Il prezzo è troppo lungo.")
  .regex(
    /^(\d{1,3}(\.\d{3})+|\d{1,7})(,\d{1,2})?$/,
    "Usa un formato valido, ad esempio 12,50.",
  )
  .transform(parseEuroToCents)
  .refine(
    (cents) => cents >= 0 && cents <= 100_000_000,
    "Il prezzo non è valido.",
  );

const descriptionField = z
  .string()
  .trim()
  .max(500, "La descrizione è troppo lunga.");

const categoryIdField = z
  .union([z.string().uuid("Categoria non valida."), z.literal("")])
  .transform((value) => (value === "" ? null : value))
  .optional()
  .transform((value) => value ?? null);

const uuidField = z.string().uuid("Elemento non valido.");

const createCategorySchema = z.object({ name: categoryNameField });

const renameCategorySchema = z.object({
  categoryId: uuidField,
  name: categoryNameField,
});

const deleteCategorySchema = z.object({ categoryId: uuidField });

const itemSchema = z.object({
  name: entityNameField,
  price: priceField,
  categoryId: categoryIdField,
  description: descriptionField,
});

const updateItemSchema = itemSchema.extend({ itemId: uuidField });

const itemActionSchema = z.object({ itemId: uuidField });

const toggleAvailabilitySchema = z.object({
  itemId: uuidField,
  available: z.enum(["true", "false"]),
});

function fieldErrors(error: z.ZodError): MenuActionState {
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
      return "Esiste già una voce con questo nome. Usa un nome diverso.";
    case "23503":
      return "Il riferimento selezionato non è valido per questo ristorante.";
    case "23514":
      return "I dati inseriti non sono validi.";
    case "42501":
      return "Non hai i permessi per modificare il menu.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

type Authorized = {
  session: SessionContext;
  restaurant: ActiveRestaurant;
};

async function authorize(): Promise<
  { ok: true; context: Authorized } | { ok: false; state: MenuActionState }
> {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/menu");
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

  const allowed = await canManageMenu(restaurant.id);

  if (!allowed) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Il tuo ruolo non consente di modificare il menu.",
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

export async function createCategoryAction(
  _prevState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const parsed = createCategorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .insert({
      organization_id: context.restaurant.organizationId,
      restaurant_id: context.restaurant.id,
      name: parsed.data.name,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: databaseMessage(error?.code) };
  }

  await audit(context, "menu.category_created", "menu_category", data.id, {
    name: parsed.data.name,
  });

  revalidatePath("/dashboard/menu");
  return { status: "success", message: "Categoria creata." };
}

export async function renameCategoryAction(
  _prevState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const parsed = renameCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.categoryId)
    .eq("restaurant_id", context.restaurant.id)
    .select("id");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Categoria non trovata." };
  }

  await audit(context, "menu.category_renamed", "menu_category", parsed.data.categoryId, {
    name: parsed.data.name,
  });

  revalidatePath("/dashboard/menu");
  return { status: "success", message: "Categoria aggiornata." };
}

export async function deleteCategoryAction(
  _prevState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const parsed = deleteCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("menu_categories")
    .select("name")
    .eq("id", parsed.data.categoryId)
    .eq("restaurant_id", context.restaurant.id)
    .maybeSingle();

  if (!existing) {
    return { status: "error", message: "Categoria non trovata." };
  }

  const { data, error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", parsed.data.categoryId)
    .eq("restaurant_id", context.restaurant.id)
    .select("id");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Categoria non trovata." };
  }

  await audit(context, "menu.category_deleted", "menu_category", parsed.data.categoryId, {
    name: (existing as { name: string }).name,
  });

  revalidatePath("/dashboard/menu");
  return { status: "success", message: "Categoria eliminata." };
}

export async function createItemAction(
  _prevState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    categoryId: formData.get("categoryId") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      organization_id: context.restaurant.organizationId,
      restaurant_id: context.restaurant.id,
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description,
      price_cents: parsed.data.price,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: databaseMessage(error?.code) };
  }

  await audit(context, "menu.item_created", "menu_item", data.id, {
    name: parsed.data.name,
    price_cents: parsed.data.price,
  });

  revalidatePath("/dashboard/menu");
  return { status: "success", message: "Prodotto aggiunto al menu." };
}

export async function updateItemAction(
  _prevState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const parsed = updateItemSchema.safeParse({
    itemId: formData.get("itemId"),
    name: formData.get("name"),
    price: formData.get("price"),
    categoryId: formData.get("categoryId") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update({
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description,
      price_cents: parsed.data.price,
    })
    .eq("id", parsed.data.itemId)
    .eq("restaurant_id", context.restaurant.id)
    .select("id");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Prodotto non trovato." };
  }

  await audit(context, "menu.item_updated", "menu_item", parsed.data.itemId, {
    name: parsed.data.name,
    price_cents: parsed.data.price,
  });

  revalidatePath("/dashboard/menu");
  return { status: "success", message: "Prodotto aggiornato." };
}

export async function toggleItemAvailabilityAction(
  _prevState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const parsed = toggleAvailabilitySchema.safeParse({
    itemId: formData.get("itemId"),
    available: formData.get("available"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const nextAvailable = parsed.data.available === "true";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_available: nextAvailable })
    .eq("id", parsed.data.itemId)
    .eq("restaurant_id", context.restaurant.id)
    .select("id");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Prodotto non trovato." };
  }

  await audit(
    context,
    nextAvailable ? "menu.item_available" : "menu.item_unavailable",
    "menu_item",
    parsed.data.itemId,
    {},
  );

  revalidatePath("/dashboard/menu");
  return {
    status: "success",
    message: nextAvailable
      ? "Prodotto segnato come disponibile."
      : "Prodotto segnato come esaurito.",
  };
}

export async function deleteItemAction(
  _prevState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const parsed = itemActionSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", parsed.data.itemId)
    .eq("restaurant_id", context.restaurant.id)
    .select("name");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Prodotto non trovato." };
  }

  await audit(context, "menu.item_deleted", "menu_item", parsed.data.itemId, {
    name: (data[0] as { name: string }).name,
  });

  revalidatePath("/dashboard/menu");
  return { status: "success", message: "Prodotto eliminato." };
}

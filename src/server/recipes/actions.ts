"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseQuantityToMilli } from "@/lib/inventory";
import {
  MAX_RECIPE_INGREDIENTS,
  MAX_RECIPE_PORTIONS,
  parseWastePercentToBp,
} from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/server/auth/session";
import {
  canManageRecipes,
  getActiveRestaurant,
} from "@/server/recipes/queries";
import type { RecipeActionState } from "@/server/recipes/types";

const uuidField = z.string().uuid("Elemento non valido.");

const quantityField = z
  .string()
  .trim()
  .min(1, "Inserisci una quantita.")
  .transform(parseQuantityToMilli)
  .refine(
    (value): value is number => value !== null && value > 0,
    "Usa una quantita positiva, ad esempio 0,5.",
  );

const wasteField = z
  .string()
  .trim()
  .transform(parseWastePercentToBp)
  .refine(
    (value): value is number => value !== null,
    "Usa uno sfrido tra 0 e 100.",
  );

const ingredientSchema = z.object({
  inventoryItemId: uuidField,
  quantity: quantityField,
  wastePercent: wasteField,
});

const recipeSchema = z.object({
  menuItemId: uuidField,
  yieldPortions: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, "Inserisci le porzioni prodotte.")
    .transform(Number)
    .refine(
      (value) => value >= 1 && value <= MAX_RECIPE_PORTIONS,
      "Le porzioni devono essere tra 1 e 1000.",
    ),
  notes: z.string().trim().max(500, "Le note sono troppo lunghe."),
  ingredients: z
    .array(ingredientSchema)
    .min(1, "Aggiungi almeno un ingrediente.")
    .max(
      MAX_RECIPE_INGREDIENTS,
      `Puoi inserire al massimo ${MAX_RECIPE_INGREDIENTS} ingredienti.`,
    ),
});

function fieldErrors(error: z.ZodError): RecipeActionState {
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
      return "Ogni articolo puo comparire una sola volta nella ricetta.";
    case "23503":
      return "Un ingrediente non appartiene al magazzino di questo ristorante.";
    case "23514":
      return "Operazione non valida: controlla porzioni, quantita e sfrido.";
    case "42501":
      return "Non hai i permessi per gestire ricette e food cost.";
    case "P0002":
      return "Prodotto o ricetta non trovati: aggiorna la pagina e riprova.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

async function authorize(): Promise<
  | { ok: true; restaurantId: string }
  | { ok: false; state: RecipeActionState }
> {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/ricette");
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

  const allowed = await canManageRecipes(restaurant.id);

  if (!allowed) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Il tuo ruolo non consente di gestire ricette e food cost.",
      },
    };
  }

  return { ok: true, restaurantId: restaurant.id };
}

export async function saveRecipeAction(
  _prevState: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  let rawIngredients: unknown;

  try {
    rawIngredients = JSON.parse(String(formData.get("ingredients") ?? "[]"));
  } catch {
    return {
      status: "error",
      fieldErrors: { ingredients: "La lista degli ingredienti non e valida." },
    };
  }

  const parsed = recipeSchema.safeParse({
    menuItemId: formData.get("menuItemId") ?? "",
    yieldPortions: formData.get("yieldPortions") ?? "",
    notes: formData.get("notes") ?? "",
    ingredients: rawIngredients,
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const uniqueItems = new Set(
    parsed.data.ingredients.map((ingredient) => ingredient.inventoryItemId),
  );
  if (uniqueItems.size !== parsed.data.ingredients.length) {
    return {
      status: "error",
      fieldErrors: {
        ingredients: "Ogni articolo puo comparire una sola volta nella ricetta.",
      },
    };
  }

  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_recipe", {
    p_restaurant_id: auth.restaurantId,
    p_menu_item_id: parsed.data.menuItemId,
    p_yield_portions: parsed.data.yieldPortions,
    p_notes: parsed.data.notes,
    p_ingredients: parsed.data.ingredients.map((ingredient) => ({
      inventory_item_id: ingredient.inventoryItemId,
      quantity_milli: ingredient.quantity,
      waste_bp: ingredient.wastePercent,
    })),
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  revalidatePath("/dashboard/ricette");
  return { status: "success", message: "Ricetta e food cost aggiornati." };
}

export async function deleteRecipeAction(
  _prevState: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const parsed = z.object({ recipeId: uuidField }).safeParse({
    recipeId: formData.get("recipeId") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_recipe", {
    p_recipe_id: parsed.data.recipeId,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  revalidatePath("/dashboard/ricette");
  return { status: "success", message: "Ricetta eliminata." };
}

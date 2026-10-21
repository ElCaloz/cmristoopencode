import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  foodCostBasisPoints,
  marginBasisPoints,
  recipeFoodCostCents,
} from "@/lib/recipes";
import type { InventoryItemRow } from "@/server/inventory/types";
import type {
  RecipeData,
  RecipeIngredientRow,
  RecipeMenuItemRow,
  RecipeRow,
} from "@/server/recipes/types";

export { getActiveRestaurant } from "@/server/restaurant/active";

export const canManageRecipes = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const [menuPermission, inventoryPermission] = await Promise.all([
    supabase.rpc("auth_has_permission_for_restaurant", {
      p_restaurant_id: restaurantId,
      p_permission: "menu.manage",
    }),
    supabase.rpc("auth_has_permission_for_restaurant", {
      p_restaurant_id: restaurantId,
      p_permission: "inventory.manage",
    }),
  ]);

  return menuPermission.data === true && inventoryPermission.data === true;
});

export async function getRecipes(restaurantId: string): Promise<RecipeData> {
  const supabase = await createClient();

  const [
    categoriesResult,
    menuItemsResult,
    inventoryResult,
    recipesResult,
    ingredientsResult,
  ] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name")
      .eq("restaurant_id", restaurantId),
    supabase
      .from("menu_items")
      .select("id, category_id, name, price_cents, is_available")
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_items")
      .select(
        "id, supplier_id, name, sku, category, unit, quantity_milli, min_quantity_milli, cost_per_unit_cents, lot, expires_on, location, is_active",
      )
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true }),
    supabase
      .from("recipes")
      .select("id, menu_item_id, yield_portions, notes")
      .eq("restaurant_id", restaurantId),
    supabase
      .from("recipe_ingredients")
      .select(
        "id, recipe_id, inventory_item_id, quantity_milli, waste_bp",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true }),
  ]);

  const categories = new Map(
    ((categoriesResult.data ?? []) as Array<{ id: string; name: string }>).map(
      (row) => [row.id, row.name],
    ),
  );

  const inventoryItems = ((inventoryResult.data ?? []) as Array<{
    id: string;
    supplier_id: string | null;
    name: string;
    sku: string;
    category: string;
    unit: string;
    quantity_milli: number | string;
    min_quantity_milli: number | string;
    cost_per_unit_cents: number | string;
    lot: string;
    expires_on: string | null;
    location: string;
    is_active: boolean;
  }>).map(
    (row): InventoryItemRow => ({
      id: row.id,
      supplierId: row.supplier_id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      unit: row.unit,
      quantityMilli: Number(row.quantity_milli),
      minQuantityMilli: Number(row.min_quantity_milli),
      costPerUnitCents: Number(row.cost_per_unit_cents),
      lot: row.lot,
      expiresOn: row.expires_on,
      location: row.location,
      isActive: row.is_active,
    }),
  );

  const inventoryById = new Map(
    inventoryItems.map((item) => [item.id, item]),
  );

  const ingredientsByRecipe = new Map<string, RecipeIngredientRow[]>();

  for (const row of (ingredientsResult.data ?? []) as Array<{
    id: string;
    recipe_id: string;
    inventory_item_id: string;
    quantity_milli: number | string;
    waste_bp: number | string;
  }>) {
    const current = ingredientsByRecipe.get(row.recipe_id) ?? [];
    current.push({
      id: row.id,
      inventoryItemId: row.inventory_item_id,
      quantityMilli: Number(row.quantity_milli),
      wasteBp: Number(row.waste_bp),
    });
    ingredientsByRecipe.set(row.recipe_id, current);
  }

  const recipesByMenuItem = new Map<string, RecipeRow>();

  for (const row of (recipesResult.data ?? []) as Array<{
    id: string;
    menu_item_id: string;
    yield_portions: number | string;
    notes: string;
  }>) {
    recipesByMenuItem.set(row.menu_item_id, {
      id: row.id,
      menuItemId: row.menu_item_id,
      yieldPortions: Number(row.yield_portions),
      notes: row.notes,
      ingredients: ingredientsByRecipe.get(row.id) ?? [],
    });
  }

  const menuItems = ((menuItemsResult.data ?? []) as Array<{
    id: string;
    category_id: string | null;
    name: string;
    price_cents: number | string;
    is_available: boolean;
  }>).map((row): RecipeMenuItemRow => {
    const recipe = recipesByMenuItem.get(row.id) ?? null;
    const priceCents = Number(row.price_cents);
    let foodCostCents: number | null = null;
    let missingCost = false;

    if (recipe) {
      const ingredientCosts = recipe.ingredients.map((ingredient) => {
        const inventoryItem = inventoryById.get(ingredient.inventoryItemId);
        if (!inventoryItem || inventoryItem.costPerUnitCents <= 0) {
          missingCost = true;
        }
        return {
          quantityMilli: ingredient.quantityMilli,
          wasteBp: ingredient.wasteBp,
          costPerUnitCents: inventoryItem?.costPerUnitCents ?? 0,
        };
      });

      foodCostCents = recipeFoodCostCents(
        ingredientCosts,
        recipe.yieldPortions,
      );
    }

    const foodCostBp =
      foodCostCents === null
        ? null
        : foodCostBasisPoints(foodCostCents, priceCents);
    const marginCents =
      foodCostCents === null || priceCents <= 0
        ? null
        : priceCents - foodCostCents;

    return {
      id: row.id,
      name: row.name,
      categoryName: row.category_id
        ? (categories.get(row.category_id) ?? "Senza categoria")
        : "Senza categoria",
      priceCents,
      isAvailable: row.is_available,
      recipe,
      foodCostCents,
      foodCostBp,
      marginCents,
      marginBp:
        marginCents === null
          ? null
          : marginBasisPoints(foodCostCents ?? 0, priceCents),
      missingCost,
    };
  });

  return { menuItems, inventoryItems };
}

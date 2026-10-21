import type { InventoryItemRow } from "@/server/inventory/types";

export type RecipeIngredientRow = {
  id: string;
  inventoryItemId: string;
  quantityMilli: number;
  wasteBp: number;
};

export type RecipeRow = {
  id: string;
  menuItemId: string;
  yieldPortions: number;
  notes: string;
  ingredients: RecipeIngredientRow[];
};

export type RecipeMenuItemRow = {
  id: string;
  name: string;
  categoryName: string;
  priceCents: number;
  isAvailable: boolean;
  recipe: RecipeRow | null;
  foodCostCents: number | null;
  foodCostBp: number | null;
  marginCents: number | null;
  marginBp: number | null;
  missingCost: boolean;
};

export type RecipeData = {
  menuItems: RecipeMenuItemRow[];
  inventoryItems: InventoryItemRow[];
};

export type RecipeActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialRecipeActionState: RecipeActionState = { status: "idle" };

export type { ActiveRestaurant } from "@/server/restaurant/active";

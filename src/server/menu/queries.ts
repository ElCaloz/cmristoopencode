import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  MenuCategoryRow,
  MenuData,
  MenuItemRow,
} from "@/server/menu/types";

export { getActiveRestaurant } from "@/server/restaurant/active";

export const canManageMenu = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: "menu.manage",
  });
  return data === true;
});

export async function getMenu(restaurantId: string): Promise<MenuData> {
  const supabase = await createClient();

  const [categoriesResult, itemsResult] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, sort_order, is_active")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id, category_id, name, description, price_cents, is_available, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const categories = ((categoriesResult.data ?? []) as Array<{
    id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
  }>).map((row): MenuCategoryRow => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));

  const items = ((itemsResult.data ?? []) as Array<{
    id: string;
    category_id: string | null;
    name: string;
    description: string;
    price_cents: number;
    is_available: boolean;
    sort_order: number;
  }>).map((row): MenuItemRow => ({
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    isAvailable: row.is_available,
    sortOrder: row.sort_order,
  }));

  return { categories, items };
}

export type MenuActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialMenuActionState: MenuActionState = { status: "idle" };

export type { ActiveRestaurant } from "@/server/restaurant/active";

export type MenuCategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type MenuItemRow = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
  sortOrder: number;
};

export type MenuData = {
  categories: MenuCategoryRow[];
  items: MenuItemRow[];
};

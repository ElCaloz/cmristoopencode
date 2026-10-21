import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  FloorAreaRow,
  FloorData,
  FloorObjectKind,
  FloorObjectRow,
  FloorTableRow,
  FloorTableShape,
} from "@/server/tables/types";

export const canManageFloor = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: "reservations.manage",
  });
  return data === true;
});

export async function getFloor(restaurantId: string): Promise<FloorData> {
  const supabase = await createClient();

  const [areasResult, tablesResult, objectsResult] = await Promise.all([
    supabase
      .from("floor_areas")
      .select("id, name, sort_order, is_active")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("restaurant_tables")
      .select(
        "id, area_id, name, seats, sort_order, is_active, shape, pos_x, pos_y, width, height",
      )
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("floor_objects")
      .select("id, area_id, kind, label, pos_x, pos_y, width, height")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true }),
  ]);

  const areas = ((areasResult.data ?? []) as Array<{
    id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
  }>).map((row): FloorAreaRow => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));

  const tables = ((tablesResult.data ?? []) as Array<{
    id: string;
    area_id: string | null;
    name: string;
    seats: number;
    sort_order: number;
    is_active: boolean;
    shape: FloorTableShape;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
  }>).map((row): FloorTableRow => ({
    id: row.id,
    areaId: row.area_id,
    name: row.name,
    seats: row.seats,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    shape: row.shape,
    posX: row.pos_x,
    posY: row.pos_y,
    width: row.width,
    height: row.height,
  }));

  const objects = ((objectsResult.data ?? []) as Array<{
    id: string;
    area_id: string;
    kind: FloorObjectKind;
    label: string;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
  }>).map((row): FloorObjectRow => ({
    id: row.id,
    areaId: row.area_id,
    kind: row.kind,
    label: row.label,
    posX: row.pos_x,
    posY: row.pos_y,
    width: row.width,
    height: row.height,
  }));

  return { areas, tables, objects };
}

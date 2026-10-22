import { createClient } from "@/lib/supabase/server";
import {
  BASE_ROOM_AREA_NAME,
  BASE_ROOM_OBJECTS,
  BASE_ROOM_TABLES,
} from "@/lib/floor-plan";

/**
 * Semina la configurazione base della sala per un ristorante appena creato.
 * La piantina resta poi modificabile dall'editor dedicato; l'operazione è
 * idempotente: se la sala base esiste già non fa nulla.
 */
export async function seedBaseRoomPlan(input: {
  organizationId: string;
  restaurantId: string;
}): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("floor_areas")
    .select("id")
    .eq("restaurant_id", input.restaurantId)
    .eq("name", BASE_ROOM_AREA_NAME)
    .maybeSingle();

  if (existing) return;

  const { data: area } = await supabase
    .from("floor_areas")
    .insert({
      organization_id: input.organizationId,
      restaurant_id: input.restaurantId,
      name: BASE_ROOM_AREA_NAME,
    })
    .select("id")
    .single();

  if (!area) return;

  await supabase.from("restaurant_tables").insert(
    BASE_ROOM_TABLES.map((table, index) => ({
      organization_id: input.organizationId,
      restaurant_id: input.restaurantId,
      area_id: area.id as string,
      name: table.name,
      seats: table.seats,
      sort_order: index,
      shape: "rect",
      pos_x: table.posX,
      pos_y: table.posY,
      width: table.width,
      height: table.height,
    })),
  );

  await supabase.from("floor_objects").insert(
    BASE_ROOM_OBJECTS.map((object) => ({
      organization_id: input.organizationId,
      restaurant_id: input.restaurantId,
      area_id: area.id as string,
      kind: object.kind,
      label: object.label,
      pos_x: object.posX,
      pos_y: object.posY,
      width: object.width,
      height: object.height,
    })),
  );
}

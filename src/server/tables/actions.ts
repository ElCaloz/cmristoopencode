"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, type SessionContext } from "@/server/auth/session";
import { getActiveRestaurant, type ActiveRestaurant } from "@/server/restaurant/active";
import { canManageFloor } from "@/server/tables/queries";
import {
  FLOOR_GRID_X,
  FLOOR_GRID_Y,
  type FloorActionState,
} from "@/server/tables/types";

const areaNameField = z
  .string()
  .trim()
  .min(1, "Inserisci un nome.")
  .max(80, "Il nome è troppo lungo.");

const tableNameField = z
  .string()
  .trim()
  .min(1, "Inserisci un nome.")
  .max(40, "Il nome è troppo lungo.");

const seatsField = z
  .string()
  .trim()
  .min(1, "Inserisci il numero di posti.")
  .regex(/^\d{1,2}$/, "Il numero di posti deve essere tra 1 e 50.")
  .transform(Number)
  .refine(
    (seats) => seats >= 1 && seats <= 50,
    "Il numero di posti deve essere tra 1 e 50.",
  );

const areaIdField = z
  .union([z.string().uuid("Area non valida."), z.literal("")])
  .transform((value) => (value === "" ? null : value))
  .optional()
  .transform((value) => value ?? null);

const uuidField = z.string().uuid("Elemento non valido.");

const createAreaSchema = z.object({ name: areaNameField });

const renameAreaSchema = z.object({
  areaId: uuidField,
  name: areaNameField,
});

const areaActionSchema = z.object({ areaId: uuidField });

const tableSchema = z.object({
  name: tableNameField,
  seats: seatsField,
  areaId: areaIdField,
});

const updateTableSchema = tableSchema.extend({ tableId: uuidField });

const tableActionSchema = z.object({ tableId: uuidField });

const toggleTableSchema = z.object({
  tableId: uuidField,
  active: z.enum(["true", "false"]),
});

const layoutTableSchema = z
  .object({
    id: z.string().uuid().nullable(),
    name: tableNameField,
    seats: z.number().int().min(1, "Da 1 a 50 posti.").max(50, "Da 1 a 50 posti."),
    shape: z.enum(["rect", "round"], { message: "Forma non valida." }),
    posX: z.number().int().min(0).max(FLOOR_GRID_X - 1),
    posY: z.number().int().min(0).max(FLOOR_GRID_Y - 1),
    width: z.number().int().min(2).max(24),
    height: z.number().int().min(2).max(16),
  })
  .refine((table) => table.posX + table.width <= FLOOR_GRID_X, {
    message: "Il tavolo esce dalla piantina.",
    path: ["posX"],
  })
  .refine((table) => table.posY + table.height <= FLOOR_GRID_Y, {
    message: "Il tavolo esce dalla piantina.",
    path: ["posY"],
  });

const layoutObjectSchema = z
  .object({
    id: z.string().uuid().nullable(),
    kind: z.enum(["wall", "counter", "door", "plant", "label"], {
      message: "Tipo di oggetto non valido.",
    }),
    label: z.string().trim().max(40, "Il testo è troppo lungo."),
    posX: z.number().int().min(0).max(FLOOR_GRID_X - 1),
    posY: z.number().int().min(0).max(FLOOR_GRID_Y - 1),
    width: z.number().int().min(1).max(48),
    height: z.number().int().min(1).max(32),
  })
  .refine((object) => object.posX + object.width <= FLOOR_GRID_X, {
    message: "L'oggetto esce dalla piantina.",
    path: ["posX"],
  })
  .refine((object) => object.posY + object.height <= FLOOR_GRID_Y, {
    message: "L'oggetto esce dalla piantina.",
    path: ["posY"],
  });

const floorLayoutSchema = z.object({
  areaId: uuidField,
  tables: z.array(layoutTableSchema).max(200, "Troppi tavoli nel layout."),
  objects: z.array(layoutObjectSchema).max(200, "Troppi oggetti nel layout."),
  removeTableIds: z.array(z.string().uuid()).max(200),
  removeObjectIds: z.array(z.string().uuid()).max(200),
});

function fieldErrors(error: z.ZodError): FloorActionState {
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
      return "L'area selezionata non è valida per questo ristorante.";
    case "23514":
      return "I dati inseriti non sono validi.";
    case "42501":
      return "Non hai i permessi per modificare la sala.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

function layoutDatabaseMessage(code: string | undefined): string {
  switch (code) {
    case "42501":
      return "Il tuo ruolo non consente di modificare il layout della sala.";
    case "23505":
      return "Esiste già un tavolo con questo nome. Usa un nome diverso.";
    case "23503":
      return "Un tavolo del layout ha ordini o prenotazioni collegati e non può essere eliminato.";
    case "23514":
      return "Il layout non è valido. Controlla gli elementi.";
    case "22P02":
      return "I dati del layout non sono validi.";
    case "P0002":
      return "Un elemento del layout non appartiene più a questa area.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

type Authorized = {
  session: SessionContext;
  restaurant: ActiveRestaurant;
};

async function authorize(): Promise<
  { ok: true; context: Authorized } | { ok: false; state: FloorActionState }
> {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/sala");
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

  const allowed = await canManageFloor(restaurant.id);

  if (!allowed) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Il tuo ruolo non consente di modificare la sala.",
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

export async function createAreaAction(
  _prevState: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  const parsed = createAreaSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("floor_areas")
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

  await audit(context, "floor.area_created", "floor_area", data.id, {
    name: parsed.data.name,
  });

  revalidatePath("/dashboard/sala");
  return { status: "success", message: "Area creata." };
}

export async function renameAreaAction(
  _prevState: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  const parsed = renameAreaSchema.safeParse({
    areaId: formData.get("areaId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("floor_areas")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.areaId)
    .eq("restaurant_id", context.restaurant.id)
    .select("id");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Area non trovata." };
  }

  await audit(context, "floor.area_renamed", "floor_area", parsed.data.areaId, {
    name: parsed.data.name,
  });

  revalidatePath("/dashboard/sala");
  return { status: "success", message: "Area aggiornata." };
}

export async function deleteAreaAction(
  _prevState: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  const parsed = areaActionSchema.safeParse({ areaId: formData.get("areaId") });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("floor_areas")
    .select("name")
    .eq("id", parsed.data.areaId)
    .eq("restaurant_id", context.restaurant.id)
    .maybeSingle();

  if (!existing) {
    return { status: "error", message: "Area non trovata." };
  }

  const { data, error } = await supabase
    .from("floor_areas")
    .delete()
    .eq("id", parsed.data.areaId)
    .eq("restaurant_id", context.restaurant.id)
    .select("id");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Area non trovata." };
  }

  await audit(context, "floor.area_deleted", "floor_area", parsed.data.areaId, {
    name: (existing as { name: string }).name,
  });

  revalidatePath("/dashboard/sala");
  return { status: "success", message: "Area eliminata." };
}

export async function createTableAction(
  _prevState: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  const parsed = tableSchema.safeParse({
    name: formData.get("name"),
    seats: formData.get("seats"),
    areaId: formData.get("areaId") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();

  const countQuery = supabase
    .from("restaurant_tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", context.restaurant.id);
  const { count } = await (parsed.data.areaId
    ? countQuery.eq("area_id", parsed.data.areaId)
    : countQuery.is("area_id", null));

  const slot = (count ?? 0) % 24;
  const posX = 2 + (slot % 6) * 8;
  const posY = 2 + Math.floor(slot / 6) * 7;

  const { data, error } = await supabase
    .from("restaurant_tables")
    .insert({
      organization_id: context.restaurant.organizationId,
      restaurant_id: context.restaurant.id,
      area_id: parsed.data.areaId,
      name: parsed.data.name,
      seats: parsed.data.seats,
      pos_x: posX,
      pos_y: posY,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: databaseMessage(error?.code) };
  }

  await audit(context, "floor.table_created", "restaurant_table", data.id, {
    name: parsed.data.name,
    seats: parsed.data.seats,
  });

  revalidatePath("/dashboard/sala");
  return { status: "success", message: "Tavolo aggiunto." };
}

export async function updateTableAction(
  _prevState: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  const parsed = updateTableSchema.safeParse({
    tableId: formData.get("tableId"),
    name: formData.get("name"),
    seats: formData.get("seats"),
    areaId: formData.get("areaId") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .update({
      area_id: parsed.data.areaId,
      name: parsed.data.name,
      seats: parsed.data.seats,
    })
    .eq("id", parsed.data.tableId)
    .eq("restaurant_id", context.restaurant.id)
    .select("id");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Tavolo non trovato." };
  }

  await audit(context, "floor.table_updated", "restaurant_table", parsed.data.tableId, {
    name: parsed.data.name,
    seats: parsed.data.seats,
  });

  revalidatePath("/dashboard/sala");
  return { status: "success", message: "Tavolo aggiornato." };
}

export async function toggleTableActiveAction(
  _prevState: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  const parsed = toggleTableSchema.safeParse({
    tableId: formData.get("tableId"),
    active: formData.get("active"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const nextActive = parsed.data.active === "true";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .update({ is_active: nextActive })
    .eq("id", parsed.data.tableId)
    .eq("restaurant_id", context.restaurant.id)
    .select("id");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Tavolo non trovato." };
  }

  await audit(
    context,
    nextActive ? "floor.table_activated" : "floor.table_deactivated",
    "restaurant_table",
    parsed.data.tableId,
    {},
  );

  revalidatePath("/dashboard/sala");
  return {
    status: "success",
    message: nextActive
      ? "Tavolo riattivato."
      : "Tavolo sospeso: non comparirà tra quelli disponibili.",
  };
}

export async function deleteTableAction(
  _prevState: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  const parsed = tableActionSchema.safeParse({
    tableId: formData.get("tableId"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .delete()
    .eq("id", parsed.data.tableId)
    .eq("restaurant_id", context.restaurant.id)
    .select("name");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Tavolo non trovato." };
  }

  await audit(context, "floor.table_deleted", "restaurant_table", parsed.data.tableId, {
    name: (data[0] as { name: string }).name,
  });

  revalidatePath("/dashboard/sala");
  return { status: "success", message: "Tavolo eliminato." };
}

export async function saveFloorLayoutAction(
  _prevState: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  let payload: unknown;

  try {
    payload = JSON.parse(String(formData.get("layout") ?? ""));
  } catch {
    return { status: "error", message: "I dati del layout non sono validi." };
  }

  const parsed = floorLayoutSchema.safeParse(payload);

  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return {
      status: "error",
      message: "Controlla gli elementi della piantina e riprova.",
      fieldErrors: errors.fieldErrors,
    };
  }

  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_floor_layout", {
    p_area_id: parsed.data.areaId,
    p_tables: parsed.data.tables,
    p_objects: parsed.data.objects,
    p_remove_table_ids: parsed.data.removeTableIds,
    p_remove_object_ids: parsed.data.removeObjectIds,
  });

  if (error) {
    return { status: "error", message: layoutDatabaseMessage(error.code) };
  }

  revalidatePath("/dashboard/sala");
  return { status: "success", message: "Layout salvato." };
}

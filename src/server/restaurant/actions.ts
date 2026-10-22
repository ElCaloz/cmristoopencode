"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsFromZod,
  formString,
  slugify,
} from "@/lib/forms";
import { PLANS, type PlanId } from "@/lib/plans";
import { getSessionContext } from "@/server/auth/session";
import {
  ACTIVE_RESTAURANT_COOKIE,
  getActiveRestaurant,
} from "@/server/restaurant/active";
import type { LocationActionState } from "@/server/restaurant/types";
import { seedBaseRoomPlan } from "@/server/tables/seed";

const nameField = z
  .string()
  .trim()
  .min(2, "Inserisci un nome di almeno 2 caratteri.")
  .max(120, "Il nome è troppo lungo.");

const slugField = z
  .string()
  .trim()
  .max(60, "Lo slug è troppo lungo.")
  .refine(
    (value) => value === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value),
    "Usa solo lettere minuscole, numeri e trattini.",
  );

const optionalTextField = z.string().trim().max(300, "Testo troppo lungo.");

const createRestaurantSchema = z.object({
  name: nameField,
  slug: slugField,
  description: optionalTextField,
  cuisine: optionalTextField,
  address: optionalTextField,
  phone: optionalTextField,
});

const updateRestaurantSchema = z.object({
  name: nameField,
  description: optionalTextField,
  cuisine: optionalTextField,
  address: optionalTextField,
  phone: optionalTextField,
  publicMenuNote: optionalTextField,
});

function slugBase(name: string) {
  const generated = slugify(name);
  return generated.length >= 2 ? generated : `sede-${Date.now().toString(36)}`;
}

export async function setActiveRestaurantAction(formData: FormData): Promise<void> {
  const session = await getSessionContext();
  if (!session) redirect("/login?reason=session&next=/dashboard/sedi");

  const membership = session.activeMembership;
  if (!membership) redirect("/onboarding");

  const nextRaw = formString(formData, "next");
  const next =
    nextRaw.startsWith("/dashboard") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/dashboard/sedi";

  const parsed = z.string().uuid().safeParse(formString(formData, "restaurantId"));
  if (!parsed.success) redirect("/dashboard/sedi");

  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("id, organization_id")
    .eq("id", parsed.data)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  if (!data) redirect("/dashboard/sedi");

  if (membership.restaurantId && membership.restaurantId !== data.id) {
    redirect("/dashboard/sedi");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_RESTAURANT_COOKIE, data.id as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
  redirect(next);
}

export async function createRestaurantAction(
  _prevState: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const parsed = createRestaurantSchema.safeParse({
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    description: formString(formData, "description"),
    cuisine: formString(formData, "cuisine"),
    address: formString(formData, "address"),
    phone: formString(formData, "phone"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const session = await getSessionContext();
  if (!session) redirect("/login?reason=session&next=/dashboard/sedi");
  const membership = session.activeMembership;
  if (!membership) return { status: "error", message: "Nessuna organizzazione attiva." };

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("auth_has_permission", {
    p_organization_id: membership.organizationId,
    p_permission: "restaurant.manage",
  });

  if (allowed !== true) {
    return {
      status: "error",
      message: "Il tuo ruolo non consente di creare nuove sedi.",
    };
  }

  const plan =
    membership.requestedPlan && membership.requestedPlan in PLANS
      ? PLANS[membership.requestedPlan as PlanId]
      : null;

  if (plan?.locations != null) {
    const { count } = await supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organizationId);

    if ((count ?? 0) >= plan.locations) {
      return {
        status: "error",
        message: `Il piano ${plan.name} consente ${plan.locations} sedi. Passa a un piano superiore per aggiungerne altre.`,
      };
    }
  }

  const slug = parsed.data.slug || slugBase(parsed.data.name);

  const { data: created, error } = await supabase
    .from("restaurants")
    .insert({
      organization_id: membership.organizationId,
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      cuisine: parsed.data.cuisine,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (error?.code === "23505") {
      return {
        status: "error",
        message: "Esiste già una sede con questo slug. Scegline un altro.",
      };
    }
    return { status: "error", message: "Creazione della sede non riuscita." };
  }

  await supabase.from("audit_logs").insert({
    organization_id: membership.organizationId,
    restaurant_id: created.id,
    actor_user_id: session.user.id,
    action: "restaurant.created",
    entity_type: "restaurant",
    entity_id: created.id,
    metadata: { name: parsed.data.name, slug },
  });

  await seedBaseRoomPlan({
    organizationId: membership.organizationId,
    restaurantId: created.id as string,
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_RESTAURANT_COOKIE, created.id as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/dashboard/sedi");
  revalidatePath("/dashboard");
  return { status: "success", message: "Nuova sede creata e attivata." };
}

export async function updateRestaurantProfileAction(
  _prevState: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const parsed = updateRestaurantSchema.safeParse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    cuisine: formString(formData, "cuisine"),
    address: formString(formData, "address"),
    phone: formString(formData, "phone"),
    publicMenuNote: formString(formData, "publicMenuNote"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const session = await getSessionContext();
  if (!session) redirect("/login?reason=session&next=/dashboard/sedi");
  const restaurant = await getActiveRestaurant();
  if (!restaurant) return { status: "error", message: "Nessuna sede attiva." };

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc(
    "auth_has_permission_for_restaurant",
    {
      p_restaurant_id: restaurant.id,
      p_permission: "settings.manage",
    },
  );

  if (allowed !== true) {
    return {
      status: "error",
      message: "Il tuo ruolo non consente di modificare i dati della sede.",
    };
  }

  const { error } = await supabase
    .from("restaurants")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      cuisine: parsed.data.cuisine,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      public_menu_note: parsed.data.publicMenuNote,
    })
    .eq("id", restaurant.id);

  if (error) {
    return { status: "error", message: "Aggiornamento della sede non riuscito." };
  }

  await supabase.from("audit_logs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    actor_user_id: session.user.id,
    action: "restaurant.profile_updated",
    entity_type: "restaurant",
    entity_id: restaurant.id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/dashboard/sedi");
  revalidatePath("/dashboard/online");
  return { status: "success", message: "Dati della sede aggiornati." };
}

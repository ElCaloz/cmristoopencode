"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseEuroToCents } from "@/lib/utils";
import {
  fieldErrorsFromZod,
  formString,
  safeErrorMessage,
} from "@/lib/forms";
import { getPublicSiteUrl } from "@/lib/integrations/config";
import { authorizeRestaurant } from "@/server/auth/authorize";
import type { StaffActionState } from "@/server/staff/types";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Inserisci un'email valida.")
  .max(254);

const inviteSchema = z.object({
  email: emailField,
  roleId: z.string().uuid("Seleziona un ruolo."),
  scope: z.enum(["restaurant", "organization"]),
});

const updateStaffSchema = z.object({
  membershipId: z.string().uuid("Membro non valido."),
  roleId: z.string().uuid("Seleziona un ruolo."),
  status: z.enum(["invited", "active", "suspended"]),
  phone: z.string().trim().max(40, "Telefono troppo lungo."),
  hiredAt: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Data non valida.",
    ),
  hourlyRate: z.string().trim().max(20, "Importo troppo lungo."),
  notes: z.string().trim().max(1000, "Note troppo lunghe."),
});

const shiftSchema = z
  .object({
    membershipId: z.string().uuid("Seleziona un membro."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida."),
    startsAt: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Ora di inizio non valida."),
    endsAt: z.string().regex(/^\d{2}:\d{2}$/, "Ora di fine non valida."),
    roleNote: z.string().trim().max(120, "Nota troppo lunga."),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: "L'ora di fine deve essere successiva all'inizio.",
    path: ["endsAt"],
  });

function romeOffset(date: string, time: string): string {
  const guess = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    timeZoneName: "longOffset",
  }).formatToParts(guess);
  const zone = parts.find((part) => part.type === "timeZoneName")?.value;
  if (!zone || zone === "GMT") return "+00:00";
  return zone.replace("GMT", "") || "+00:00";
}

function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00${romeOffset(date, time)}`).toISOString();
}

export async function inviteStaffAction(
  _prevState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = inviteSchema.safeParse({
    email: formString(formData, "email"),
    roleId: formString(formData, "roleId"),
    scope: formString(formData, "scope") || "restaurant",
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "members.manage",
    "/dashboard/personale",
    "Il tuo ruolo non consente di invitare membri dello staff.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      status: "error",
      message:
        "Inviti non configurati: manca SUPABASE_SERVICE_ROLE_KEY lato server. Puoi comunque gestire i membri già presenti.",
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      status: "error",
      message: "Client amministrativo Supabase non disponibile.",
    };
  }

  let invitedUserId: string | null = null;
  const invite = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${getPublicSiteUrl()}/dashboard`,
  });

  if (invite.error) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", parsed.data.email)
      .maybeSingle();

    if (!profile?.id) {
      return {
        status: "error",
        message:
          invite.error.message.includes("already")
            ? "Utente già registrato ma senza profilo collegato. Contatta l'assistenza."
            : "Invito non riuscito. Verifica l'email e la configurazione SMTP di Supabase.",
      };
    }

    invitedUserId = profile.id as string;
  } else {
    invitedUserId = invite.data.user?.id ?? null;
  }

  if (!invitedUserId) {
    return { status: "error", message: "Invito non riuscito: utente non creato." };
  }

  const { error } = await admin.from("memberships").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: parsed.data.scope === "restaurant" ? restaurant.id : null,
    user_id: invitedUserId,
    role_id: parsed.data.roleId,
    status: "invited",
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "Questo utente è già membro dell'organizzazione o della sede.",
      };
    }
    return {
      status: "error",
      message:
        error.code === "42501"
          ? "Non puoi assegnare un ruolo pari o superiore al tuo."
          : "Creazione della membership non riuscita.",
    };
  }

  await admin.from("audit_logs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    actor_user_id: session.user.id,
    action: "staff.invited",
    entity_type: "membership",
    entity_id: invitedUserId,
    metadata: {
      email: parsed.data.email,
      role_id: parsed.data.roleId,
      scope: parsed.data.scope,
    },
  });

  revalidatePath("/dashboard/personale");
  return {
    status: "success",
    message:
      "Invito inviato. Il membro comparirà come invitato finché non accetta e accede.",
  };
}

export async function updateStaffAction(
  _prevState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const rawRate = formString(formData, "hourlyRate");
  const parsed = updateStaffSchema.safeParse({
    membershipId: formString(formData, "membershipId"),
    roleId: formString(formData, "roleId"),
    status: formString(formData, "status"),
    phone: formString(formData, "phone"),
    hiredAt: formString(formData, "hiredAt"),
    hourlyRate: rawRate,
    notes: formString(formData, "notes"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (rawRate !== "" && !/^(\d{1,3}(\.\d{3})+|\d{1,7})(,\d{1,2})?$/.test(rawRate)) {
    return {
      status: "error",
      fieldErrors: { hourlyRate: "Usa un formato valido, ad esempio 12,50." },
    };
  }

  const hourlyRateCents =
    rawRate === "" ? null : parseEuroToCents(rawRate);

  if (hourlyRateCents !== null && (hourlyRateCents < 0 || hourlyRateCents > 100_000_000)) {
    return {
      status: "error",
      fieldErrors: { hourlyRate: "Importo fuori intervallo." },
    };
  }

  const auth = await authorizeRestaurant(
    "members.manage",
    "/dashboard/personale",
    "Il tuo ruolo non consente di modificare i membri dello staff.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, organization_id, restaurant_id")
    .eq("id", parsed.data.membershipId)
    .eq("organization_id", restaurant.organizationId)
    .maybeSingle();

  if (!membership) {
    return { status: "error", message: "Membro non trovato nell'organizzazione." };
  }

  if (
    membership.restaurant_id !== null &&
    membership.restaurant_id !== restaurant.id
  ) {
    return { status: "error", message: "Il membro appartiene a un'altra sede." };
  }

  const { error } = await supabase
    .from("memberships")
    .update({
      role_id: parsed.data.roleId,
      status: parsed.data.status,
      phone: parsed.data.phone || null,
      hired_at: parsed.data.hiredAt || null,
      hourly_rate_cents: hourlyRateCents,
      notes: parsed.data.notes,
    })
    .eq("id", parsed.data.membershipId)
    .eq("organization_id", restaurant.organizationId);

  if (error) {
    return {
      status: "error",
      message:
        error.code === "42501"
          ? "Non puoi modificare un ruolo pari o superiore al tuo."
          : "Aggiornamento del membro non riuscito.",
    };
  }

  await supabase.from("audit_logs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    actor_user_id: session.user.id,
    action: "staff.updated",
    entity_type: "membership",
    entity_id: parsed.data.membershipId,
    metadata: {
      role_id: parsed.data.roleId,
      status: parsed.data.status,
      hired_at: parsed.data.hiredAt || null,
    },
  });

  revalidatePath("/dashboard/personale");
  return { status: "success", message: "Membro aggiornato." };
}

export async function addShiftAction(
  _prevState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = shiftSchema.safeParse({
    membershipId: formString(formData, "membershipId"),
    date: formString(formData, "date"),
    startsAt: formString(formData, "startsAt"),
    endsAt: formString(formData, "endsAt"),
    roleNote: formString(formData, "roleNote"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "staff.manage",
    "/dashboard/personale",
    "Il tuo ruolo non consente di pianificare i turni.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, organization_id")
    .eq("id", parsed.data.membershipId)
    .eq("organization_id", restaurant.organizationId)
    .maybeSingle();

  if (!membership) {
    return { status: "error", message: "Membro non trovato nell'organizzazione." };
  }

  const startsAt = toIso(parsed.data.date, parsed.data.startsAt);
  const endsAt = toIso(parsed.data.date, parsed.data.endsAt);

  const { data, error } = await supabase
    .from("staff_shifts")
    .insert({
      organization_id: restaurant.organizationId,
      restaurant_id: restaurant.id,
      membership_id: parsed.data.membershipId,
      starts_at: startsAt,
      ends_at: endsAt,
      role_note: parsed.data.roleNote,
      created_by: session.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: "Creazione del turno non riuscita." };
  }

  await supabase.from("audit_logs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    actor_user_id: session.user.id,
    action: "staff.shift_created",
    entity_type: "staff_shift",
    entity_id: data.id,
    metadata: { starts_at: startsAt, ends_at: endsAt },
  });

  revalidatePath("/dashboard/personale");
  return { status: "success", message: "Turno aggiunto." };
}

export async function cancelShiftAction(formData: FormData): Promise<void> {
  const parsed = z.string().uuid().safeParse(formString(formData, "shiftId"));
  if (!parsed.success) return;

  const auth = await authorizeRestaurant(
    "staff.manage",
    "/dashboard/personale",
    "Permesso insufficiente.",
  );
  if (!auth.ok) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff_shifts")
    .update({ status: "cancelled" })
    .eq("id", parsed.data)
    .eq("restaurant_id", auth.context.restaurant.id);

  if (error) {
    await supabase.from("audit_logs").insert({
      organization_id: auth.context.restaurant.organizationId,
      restaurant_id: auth.context.restaurant.id,
      actor_user_id: auth.context.session.user.id,
      action: "staff.shift_cancel_failed",
      entity_type: "staff_shift",
      entity_id: parsed.data,
      metadata: { error: safeErrorMessage(error) },
    });
    return;
  }

  await supabase.from("audit_logs").insert({
    organization_id: auth.context.restaurant.organizationId,
    restaurant_id: auth.context.restaurant.id,
    actor_user_id: auth.context.session.user.id,
    action: "staff.shift_cancelled",
    entity_type: "staff_shift",
    entity_id: parsed.data,
    metadata: {},
  });

  revalidatePath("/dashboard/personale");
}

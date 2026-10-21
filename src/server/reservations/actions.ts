"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, type SessionContext } from "@/server/auth/session";
import { canManageReservations } from "@/server/reservations/queries";
import type { ReservationActionState } from "@/server/reservations/types";
import {
  getActiveRestaurant,
  type ActiveRestaurant,
} from "@/server/restaurant/active";

const uuidField = z.string().uuid("Prenotazione non valida.");

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Inserisci una data valida.");

const timeField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Inserisci un orario valido.");

const nameField = z
  .string()
  .trim()
  .min(2, "Inserisci il nome del cliente.")
  .max(120, "Il nome è troppo lungo.");

const phoneField = z
  .string()
  .trim()
  .min(5, "Inserisci un telefono valido.")
  .max(30, "Il telefono è troppo lungo.");

const emailField = z
  .union([z.literal(""), z.string().trim().email("Inserisci un'email valida.")])
  .transform((value) => (value === "" ? null : value));

const partyField = z
  .string()
  .trim()
  .regex(/^\d{1,2}$/, "Inserisci un numero di persone tra 1 e 50.")
  .transform(Number)
  .refine((value) => value >= 1 && value <= 50, "Inserisci un numero di persone tra 1 e 50.");

const durationField = z
  .union([z.literal(""), z.string().trim().regex(/^\d{2,3}$/, "Durata non valida.")])
  .transform((value) => (value === "" ? null : Number(value)))
  .refine(
    (value) => value === null || (value >= 30 && value <= 240),
    "La durata deve essere tra 30 e 240 minuti.",
  );

const notesField = z
  .union([z.literal(""), z.string().trim().max(1000, "Le note sono troppo lunghe.")])
  .transform((value) => (value === "" ? null : value));

const createReservationSchema = z.object({
  customerName: nameField,
  customerPhone: phoneField,
  customerEmail: emailField,
  partySize: partyField,
  reservationDate: dateField,
  reservationTime: timeField,
  durationMinutes: durationField,
  notes: notesField,
  idempotencyKey: z
    .string()
    .trim()
    .min(8, "Richiesta non valida.")
    .max(120, "Richiesta non valida."),
  confirm: z.boolean(),
});

const statusSchema = z.object({
  reservationId: uuidField,
  status: z.enum([
    "confirmed",
    "seated",
    "completed",
    "cancelled",
    "no_show",
  ]),
  reason: z
    .union([z.literal(""), z.string().trim().max(500, "Il motivo è troppo lungo.")])
    .transform((value) => (value === "" ? null : value)),
});

const notesSchema = z.object({
  reservationId: uuidField,
  notes: z
    .union([z.literal(""), z.string().trim().max(1000, "Le note sono troppo lunghe.")])
    .transform((value) => (value === "" ? null : value)),
});

function fieldErrors(error: z.ZodError): ReservationActionState {
  const result: Record<string, string | undefined> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }

  return { status: "error", fieldErrors: result };
}

function availabilityMessage(reason: string | null) {
  switch (reason) {
    case "insufficient_capacity":
      return "Non ci sono abbastanza posti disponibili in questa fascia oraria.";
    case "no_capacity":
      return "Configura almeno un tavolo attivo nella sala prima di creare prenotazioni.";
    case "outside_opening_hours":
      return "L'orario scelto è fuori dagli orari di apertura configurati.";
    case "closed_date":
      return "Il ristorante è chiuso nella data selezionata.";
    case "date_in_past":
      return "Non è possibile prenotare una data passata.";
    case "date_too_far":
      return "La data supera il limite massimo di prenotazione configurato.";
    case "too_late_notice":
      return "La richiesta arriva troppo tardi rispetto al preavviso minimo.";
    case "party_too_large":
      return "Il numero di persone supera il limite configurato.";
    case "invalid_duration":
      return "La durata della prenotazione non è valida.";
    default:
      return "La fascia oraria non è disponibile.";
  }
}

function databaseMessage(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? "";

  if (message.includes("reservation_unavailable:")) {
    return availabilityMessage(message.split("reservation_unavailable:")[1]?.trim() ?? null);
  }

  switch (error?.code) {
    case "42501":
      return "Il tuo ruolo non consente di gestire le prenotazioni.";
    case "22023":
      return "I dati della prenotazione non sono validi.";
    case "P0002":
      return "Prenotazione non trovata.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

type Authorized = {
  session: SessionContext;
  restaurant: ActiveRestaurant;
};

async function authorize(): Promise<
  { ok: true; context: Authorized } | { ok: false; state: ReservationActionState }
> {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/prenotazioni");
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

  const allowed = await canManageReservations(restaurant.id);

  if (!allowed) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Il tuo ruolo non consente di gestire le prenotazioni.",
      },
    };
  }

  return { ok: true, context: { session, restaurant } };
}

async function audit(
  context: Authorized,
  action: string,
  entityId: string,
  metadata: Record<string, unknown>,
) {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert({
    organization_id: context.restaurant.organizationId,
    restaurant_id: context.restaurant.id,
    actor_user_id: context.session.user.id,
    action,
    entity_type: "reservation",
    entity_id: entityId,
    metadata,
  });
}

export async function createReservationAction(
  _prevState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const parsed = createReservationSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail") ?? "",
    partySize: formData.get("partySize"),
    reservationDate: formData.get("reservationDate"),
    reservationTime: formData.get("reservationTime"),
    durationMinutes: formData.get("durationMinutes") ?? "",
    notes: formData.get("notes") ?? "",
    idempotencyKey: formData.get("idempotencyKey"),
    confirm: formData.get("confirm") === "on",
  });

  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_reservation", {
    p_restaurant_id: context.restaurant.id,
    p_customer_name: parsed.data.customerName,
    p_customer_phone: parsed.data.customerPhone,
    p_customer_email: parsed.data.customerEmail,
    p_party_size: parsed.data.partySize,
    p_reservation_date: parsed.data.reservationDate,
    p_reservation_time: parsed.data.reservationTime,
    p_duration_minutes: parsed.data.durationMinutes,
    p_source: "dashboard",
    p_notes: parsed.data.notes,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_call_id: null,
    p_confirm: parsed.data.confirm,
  });

  if (error || !data) {
    return { status: "error", message: databaseMessage(error) };
  }

  const result = data as {
    reservation_id?: string;
    status?: string;
    created?: boolean;
  };

  if (!result.reservation_id) {
    return { status: "error", message: "Operazione non riuscita. Riprova tra poco." };
  }

  if (result.created) {
    await audit(context, "reservation.created", result.reservation_id, {
      status: result.status,
      source: "dashboard",
      date: parsed.data.reservationDate,
      time: parsed.data.reservationTime,
      party_size: parsed.data.partySize,
    });
  }

  revalidatePath("/dashboard/prenotazioni");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: result.created
      ? "Prenotazione registrata."
      : "Prenotazione già registrata: nessun duplicato creato.",
  };
}

export async function setReservationStatusAction(
  _prevState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const parsed = statusSchema.safeParse({
    reservationId: formData.get("reservationId"),
    status: formData.get("status"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_reservation_status", {
    p_reservation_id: parsed.data.reservationId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason,
  });

  if (error || !data) {
    return { status: "error", message: databaseMessage(error) };
  }

  const labels: Record<string, string> = {
    confirmed: "Prenotazione confermata.",
    seated: "Cliente segnato come arrivato.",
    completed: "Prenotazione completata.",
    cancelled: "Prenotazione annullata.",
    no_show: "Prenotazione segnata come no-show.",
  };

  await audit(context, "reservation.status_changed", parsed.data.reservationId, {
    status: parsed.data.status,
    reason: parsed.data.reason,
  });

  revalidatePath("/dashboard/prenotazioni");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: labels[parsed.data.status] ?? "Prenotazione aggiornata.",
  };
}

export async function updateReservationNotesAction(
  _prevState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const parsed = notesSchema.safeParse({
    reservationId: formData.get("reservationId"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_reservation_notes", {
    p_reservation_id: parsed.data.reservationId,
    p_notes: parsed.data.notes,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error) };
  }

  await audit(context, "reservation.notes_updated", parsed.data.reservationId, {});

  revalidatePath("/dashboard/prenotazioni");
  return { status: "success", message: "Note aggiornate." };
}

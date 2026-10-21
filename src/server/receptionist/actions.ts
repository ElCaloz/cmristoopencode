"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseEuroToCents } from "@/lib/utils";
import { getSessionContext, type SessionContext } from "@/server/auth/session";
import { canManageReceptionist } from "@/server/receptionist/queries";
import type { ReceptionistActionState } from "@/server/receptionist/types";
import {
  getActiveRestaurant,
  type ActiveRestaurant,
} from "@/server/restaurant/active";

const uuidField = z.string().uuid("Elemento non valido.");

const phoneField = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^\+[1-9][0-9]{6,14}$/, "Usa il formato internazionale, es. +390212345678."),
  ])
  .transform((value) => (value === "" ? null : value));

const timeField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Inserisci un orario valido.");

const weekdayField = z
  .string()
  .trim()
  .regex(/^[1-7]$/, "Seleziona un giorno valido.")
  .transform(Number);

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Inserisci una data valida.");

const moneyField = z
  .string()
  .trim()
  .regex(/^\d{0,7}([.,]\d{0,2})?$/, "Inserisci un importo valido.")
  .transform((value) => parseEuroToCents(value || "0"))
  .refine(
    (value) => value >= 0 && value <= 100_000_000,
    "Il budget deve essere tra 0 e 1.000.000 €.",
  );

function intField(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .regex(/^\d+$/, message)
    .transform(Number)
    .refine((value) => value >= min && value <= max, message);
}

const settingsSchema = z.object({
  displayName: z
    .union([z.literal(""), z.string().trim().max(120, "Il nome è troppo lungo.")])
    .transform((value) => (value === "" ? null : value)),
  greeting: z
    .union([z.literal(""), z.string().trim().max(500, "Il messaggio è troppo lungo.")])
    .transform((value) => (value === "" ? null : value)),
  language: z.enum(["it", "en"]),
  voice: z.string().trim().min(1, "Inserisci la voce.").max(40, "La voce è troppo lunga."),
  model: z.string().trim().min(1, "Inserisci il modello.").max(80, "Il modello è troppo lungo."),
  inboundPhone: phoneField,
  transferPhone: phoneField,
  maxCallSeconds: intField(60, 1800, "La durata massima deve essere tra 60 e 1800 secondi."),
  maxDailyCalls: intField(1, 2000, "Il limite giornaliero deve essere tra 1 e 2000."),
  monthlyBudget: moneyField,
  reservationDurationMinutes: intField(30, 240, "La durata deve essere tra 30 e 240 minuti."),
  maxPartySize: intField(1, 50, "Il numero massimo di persone deve essere tra 1 e 50."),
  minNoticeMinutes: intField(0, 10080, "Il preavviso deve essere tra 0 e 10080 minuti."),
  maxDaysAhead: intField(1, 365, "Il limite deve essere tra 1 e 365 giorni."),
  isEnabled: z.boolean(),
});

const openingHourSchema = z
  .object({
    hourId: z.union([z.literal(""), uuidField]).transform((value) => (value === "" ? null : value)),
    weekday: weekdayField,
    opensAt: timeField,
    closesAt: timeField,
    isActive: z.boolean(),
  })
  .refine((value) => value.opensAt < value.closesAt, {
    path: ["closesAt"],
    message: "L'orario di chiusura deve essere successivo all'apertura.",
  });

const idSchema = z.object({ id: uuidField });

const closedDateSchema = z.object({
  closedOn: dateField,
  reason: z
    .union([z.literal(""), z.string().trim().max(200, "Il motivo è troppo lungo.")])
    .transform((value) => (value === "" ? null : value)),
});

function fieldErrors(error: z.ZodError): ReceptionistActionState {
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
      return "Esiste già una voce con questi dati.";
    case "23514":
      return "I dati inseriti non sono validi.";
    case "42501":
      return "Il tuo ruolo non consente di configurare il receptionist.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

type Authorized = {
  session: SessionContext;
  restaurant: ActiveRestaurant;
};

async function authorize(): Promise<
  { ok: true; context: Authorized } | { ok: false; state: ReceptionistActionState }
> {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/receptionist");
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

  const allowed = await canManageReceptionist(restaurant.id);

  if (!allowed) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Il tuo ruolo non consente di configurare il receptionist.",
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

function revalidateReceptionist() {
  revalidatePath("/dashboard/receptionist");
  revalidatePath("/dashboard/prenotazioni");
  revalidatePath("/dashboard");
}

export async function updateReceptionistSettingsAction(
  _prevState: ReceptionistActionState,
  formData: FormData,
): Promise<ReceptionistActionState> {
  const parsed = settingsSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    greeting: formData.get("greeting") ?? "",
    language: formData.get("language"),
    voice: formData.get("voice"),
    model: formData.get("model"),
    inboundPhone: formData.get("inboundPhone") ?? "",
    transferPhone: formData.get("transferPhone") ?? "",
    maxCallSeconds: formData.get("maxCallSeconds"),
    maxDailyCalls: formData.get("maxDailyCalls"),
    monthlyBudget: formData.get("monthlyBudget"),
    reservationDurationMinutes: formData.get("reservationDurationMinutes"),
    maxPartySize: formData.get("maxPartySize"),
    minNoticeMinutes: formData.get("minNoticeMinutes"),
    maxDaysAhead: formData.get("maxDaysAhead"),
    isEnabled: formData.get("isEnabled") === "on",
  });

  if (!parsed.success) return fieldErrors(parsed.error);

  if (parsed.data.isEnabled && !parsed.data.inboundPhone) {
    return {
      status: "error",
      fieldErrors: {
        inboundPhone: "Inserisci il numero chiamato prima di attivare il receptionist.",
      },
    };
  }

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { error } = await supabase.from("receptionist_settings").upsert(
    {
      restaurant_id: context.restaurant.id,
      is_enabled: parsed.data.isEnabled,
      display_name: parsed.data.displayName,
      greeting: parsed.data.greeting,
      language: parsed.data.language,
      voice: parsed.data.voice,
      model: parsed.data.model,
      inbound_phone_number: parsed.data.inboundPhone,
      transfer_phone: parsed.data.transferPhone,
      max_call_seconds: parsed.data.maxCallSeconds,
      max_daily_calls: parsed.data.maxDailyCalls,
      monthly_budget_cents: parsed.data.monthlyBudget,
      reservation_duration_minutes: parsed.data.reservationDurationMinutes,
      max_party_size: parsed.data.maxPartySize,
      min_notice_minutes: parsed.data.minNoticeMinutes,
      max_days_ahead: parsed.data.maxDaysAhead,
    },
    { onConflict: "restaurant_id" },
  );

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  await audit(
    context,
    "receptionist.settings_updated",
    "receptionist_settings",
    context.restaurant.id,
    {
      is_enabled: parsed.data.isEnabled,
      inbound_phone_configured: Boolean(parsed.data.inboundPhone),
      transfer_phone_configured: Boolean(parsed.data.transferPhone),
      model: parsed.data.model,
      language: parsed.data.language,
    },
  );

  revalidateReceptionist();
  return { status: "success", message: "Configurazione receptionist aggiornata." };
}

export async function saveOpeningHourAction(
  _prevState: ReceptionistActionState,
  formData: FormData,
): Promise<ReceptionistActionState> {
  const parsed = openingHourSchema.safeParse({
    hourId: formData.get("hourId") ?? "",
    weekday: formData.get("weekday"),
    opensAt: formData.get("opensAt"),
    closesAt: formData.get("closesAt"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const values = {
    organization_id: context.restaurant.organizationId,
    restaurant_id: context.restaurant.id,
    weekday: parsed.data.weekday,
    opens_at: parsed.data.opensAt,
    closes_at: parsed.data.closesAt,
    is_active: parsed.data.isActive,
  };

  if (parsed.data.hourId) {
    const { data, error } = await supabase
      .from("restaurant_opening_hours")
      .update({
        weekday: values.weekday,
        opens_at: values.opens_at,
        closes_at: values.closes_at,
        is_active: values.is_active,
      })
      .eq("id", parsed.data.hourId)
      .eq("restaurant_id", context.restaurant.id)
      .select("id");

    if (error) {
      return { status: "error", message: databaseMessage(error.code) };
    }

    if (!data || data.length === 0) {
      return { status: "error", message: "Fascia oraria non trovata." };
    }

    await audit(context, "receptionist.opening_hour_updated", "restaurant_opening_hours", parsed.data.hourId, {
      weekday: parsed.data.weekday,
      opens_at: parsed.data.opensAt,
      closes_at: parsed.data.closesAt,
    });
  } else {
    const { data, error } = await supabase
      .from("restaurant_opening_hours")
      .insert(values)
      .select("id")
      .single();

    if (error || !data) {
      return { status: "error", message: databaseMessage(error?.code) };
    }

    await audit(context, "receptionist.opening_hour_created", "restaurant_opening_hours", data.id, {
      weekday: parsed.data.weekday,
      opens_at: parsed.data.opensAt,
      closes_at: parsed.data.closesAt,
    });
  }

  revalidateReceptionist();
  return { status: "success", message: "Fascia oraria salvata." };
}

export async function deleteOpeningHourAction(
  _prevState: ReceptionistActionState,
  formData: FormData,
): Promise<ReceptionistActionState> {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_opening_hours")
    .delete()
    .eq("id", parsed.data.id)
    .eq("restaurant_id", context.restaurant.id)
    .select("id");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Fascia oraria non trovata." };
  }

  await audit(context, "receptionist.opening_hour_deleted", "restaurant_opening_hours", parsed.data.id, {});

  revalidateReceptionist();
  return { status: "success", message: "Fascia oraria eliminata." };
}

export async function createDefaultOpeningHoursAction(
  _prevState: ReceptionistActionState,
  _formData: FormData,
): Promise<ReceptionistActionState> {
  void _prevState;
  void _formData;
  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const rows = Array.from({ length: 7 }, (_, index) => index + 1).flatMap((weekday) => [
    {
      organization_id: context.restaurant.organizationId,
      restaurant_id: context.restaurant.id,
      weekday,
      opens_at: "12:00",
      closes_at: "14:30",
      is_active: true,
    },
    {
      organization_id: context.restaurant.organizationId,
      restaurant_id: context.restaurant.id,
      weekday,
      opens_at: "19:00",
      closes_at: "22:30",
      is_active: true,
    },
  ]);

  const supabase = await createClient();
  const { error } = await supabase.from("restaurant_opening_hours").upsert(rows, {
    onConflict: "restaurant_id,weekday,opens_at",
    ignoreDuplicates: true,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  await audit(context, "receptionist.opening_hours_seeded", "restaurant_opening_hours", context.restaurant.id, {
    periods: 14,
  });

  revalidateReceptionist();
  return { status: "success", message: "Orari standard aggiunti." };
}

export async function addClosedDateAction(
  _prevState: ReceptionistActionState,
  formData: FormData,
): Promise<ReceptionistActionState> {
  const parsed = closedDateSchema.safeParse({
    closedOn: formData.get("closedOn"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_closed_dates")
    .insert({
      organization_id: context.restaurant.organizationId,
      restaurant_id: context.restaurant.id,
      closed_on: parsed.data.closedOn,
      reason: parsed.data.reason,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: databaseMessage(error?.code) };
  }

  await audit(context, "receptionist.closed_date_created", "restaurant_closed_dates", data.id, {
    closed_on: parsed.data.closedOn,
  });

  revalidateReceptionist();
  return { status: "success", message: "Data di chiusura aggiunta." };
}

export async function deleteClosedDateAction(
  _prevState: ReceptionistActionState,
  formData: FormData,
): Promise<ReceptionistActionState> {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_closed_dates")
    .delete()
    .eq("id", parsed.data.id)
    .eq("restaurant_id", context.restaurant.id)
    .select("id");

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  if (!data || data.length === 0) {
    return { status: "error", message: "Data di chiusura non trovata." };
  }

  await audit(context, "receptionist.closed_date_deleted", "restaurant_closed_dates", parsed.data.id, {});

  revalidateReceptionist();
  return { status: "success", message: "Data di chiusura eliminata." };
}

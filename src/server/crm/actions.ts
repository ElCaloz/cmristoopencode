"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsFromZod,
  formCheckbox,
  formString,
} from "@/lib/forms";
import { sendEmail } from "@/lib/integrations/email";
import { sendSms } from "@/lib/integrations/sms";
import { authorizeRestaurant } from "@/server/auth/authorize";
import type { CrmActionState } from "@/server/crm/types";

const emailField = z
  .string()
  .trim()
  .max(254, "Email troppo lunga.")
  .refine(
    (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
    "Inserisci un indirizzo email valido.",
  );

const phoneField = z
  .string()
  .trim()
  .max(40, "Telefono troppo lungo.")
  .refine(
    (value) => value === "" || /^[+0-9 ().-]{6,40}$/.test(value),
    "Inserisci un numero di telefono valido.",
  );

const customerSchema = z
  .object({
    customerId: z.string().uuid().optional(),
    firstName: z.string().trim().max(80, "Nome troppo lungo."),
    lastName: z.string().trim().max(80, "Cognome troppo lungo."),
    email: emailField,
    phone: phoneField,
    tags: z.string().trim().max(500, "Tag troppo lunghi."),
    allergies: z.string().trim().max(500, "Allergie troppo lunghe."),
    notes: z.string().trim().max(1000, "Note troppo lunghe."),
    marketingEmail: z.boolean(),
    marketingSms: z.boolean(),
  })
  .refine((data) => data.email !== "" || data.phone !== "", {
    message: "Inserisci almeno email o telefono.",
    path: ["email"],
  });

const loyaltySchema = z.object({
  pointsPerEuro: z.coerce.number().int().min(1).max(1000),
  pointValueCents: z.coerce.number().int().min(1).max(10000),
  minRedeemPoints: z.coerce.number().int().min(1).max(1000000),
  isActive: z.boolean(),
});

const loyaltyTransactionSchema = z.object({
  customerId: z.string().uuid("Cliente non valido."),
  points: z.coerce
    .number()
    .int("Inserisci un numero intero di punti.")
    .min(-1000000)
    .max(1000000)
    .refine((value) => value !== 0, "I punti devono essere diversi da zero."),
  reason: z.string().trim().min(2, "Indica il motivo.").max(200),
});

const messageSchema = z.object({
  customerId: z.string().uuid("Cliente non valido."),
  channel: z.enum(["email", "sms"]),
  subject: z.string().trim().max(200, "Oggetto troppo lungo."),
  body: z.string().trim().min(2, "Scrivi un messaggio.").max(4000, "Messaggio troppo lungo."),
});

function normalizeTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20)
        .map((tag) => tag.slice(0, 30)),
    ),
  ];
}

export async function saveCustomerAction(
  _prevState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const rawId = formString(formData, "customerId");
  const parsed = customerSchema.safeParse({
    customerId: rawId === "" ? undefined : rawId,
    firstName: formString(formData, "firstName"),
    lastName: formString(formData, "lastName"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    tags: formString(formData, "tags"),
    allergies: formString(formData, "allergies"),
    notes: formString(formData, "notes"),
    marketingEmail: formCheckbox(formData, "marketingEmail"),
    marketingSms: formCheckbox(formData, "marketingSms"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "customers.manage",
    "/dashboard/clienti",
    "Il tuo ruolo non consente di gestire i clienti.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  const supabase = await createClient();
  const payload = {
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone,
    tags: normalizeTags(parsed.data.tags),
    allergies: parsed.data.allergies,
    notes: parsed.data.notes,
    marketing_email: parsed.data.marketingEmail,
    marketing_sms: parsed.data.marketingSms,
    consent_at:
      parsed.data.marketingEmail || parsed.data.marketingSms
        ? new Date().toISOString()
        : null,
  };

  const query = parsed.data.customerId
    ? supabase
        .from("customers")
        .update(payload)
        .eq("id", parsed.data.customerId)
        .eq("restaurant_id", restaurant.id)
        .select("id")
        .single()
    : supabase.from("customers").insert(payload).select("id").single();

  const { data, error } = await query;

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        status: "error",
        message: "Esiste già un cliente con questa email o questo telefono.",
      };
    }
    return { status: "error", message: "Salvataggio del cliente non riuscito." };
  }

  await supabase.from("audit_logs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    actor_user_id: session.user.id,
    action: parsed.data.customerId ? "crm.customer_updated" : "crm.customer_created",
    entity_type: "customer",
    entity_id: data.id,
    metadata: { email: parsed.data.email, phone: parsed.data.phone },
  });

  revalidatePath("/dashboard/clienti");
  revalidatePath("/dashboard/marketing");
  return {
    status: "success",
    message: parsed.data.customerId ? "Cliente aggiornato." : "Cliente creato.",
  };
}

export async function saveLoyaltySettingsAction(
  _prevState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = loyaltySchema.safeParse({
    pointsPerEuro: formString(formData, "pointsPerEuro"),
    pointValueCents: formString(formData, "pointValueCents"),
    minRedeemPoints: formString(formData, "minRedeemPoints"),
    isActive: formCheckbox(formData, "isActive"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "settings.manage",
    "/dashboard/clienti",
    "Solo chi gestisce le impostazioni può modificare il programma fedeltà.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  const supabase = await createClient();
  const { error } = await supabase.from("loyalty_settings").upsert(
    {
      restaurant_id: restaurant.id,
      organization_id: restaurant.organizationId,
      points_per_euro: parsed.data.pointsPerEuro,
      point_value_cents: parsed.data.pointValueCents,
      min_redeem_points: parsed.data.minRedeemPoints,
      is_active: parsed.data.isActive,
    },
    { onConflict: "restaurant_id" },
  );

  if (error) {
    return { status: "error", message: "Salvataggio del programma fedeltà non riuscito." };
  }

  await supabase.from("audit_logs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    actor_user_id: session.user.id,
    action: "crm.loyalty_settings_updated",
    entity_type: "loyalty_settings",
    entity_id: restaurant.id,
    metadata: parsed.data,
  });

  revalidatePath("/dashboard/clienti");
  return { status: "success", message: "Programma fedeltà aggiornato." };
}

export async function recordLoyaltyAction(
  _prevState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = loyaltyTransactionSchema.safeParse({
    customerId: formString(formData, "customerId"),
    points: formString(formData, "points"),
    reason: formString(formData, "reason"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "customers.manage",
    "/dashboard/clienti",
    "Il tuo ruolo non consente di gestire i punti fedeltà.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_loyalty_transaction", {
    p_customer_id: parsed.data.customerId,
    p_points: parsed.data.points,
    p_reason: parsed.data.reason,
    p_idempotency_key: `manual:${crypto.randomUUID()}`,
  });

  if (error) {
    return {
      status: "error",
      message:
        error.code === "23514"
          ? "Punti insufficienti o valore non valido."
          : "Movimento punti non riuscito.",
    };
  }

  revalidatePath("/dashboard/clienti");
  return {
    status: "success",
    message: `Punti aggiornati. Saldo cliente: ${Number(data ?? 0)}.`,
  };
}

export async function sendCustomerMessageAction(
  _prevState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = messageSchema.safeParse({
    customerId: formString(formData, "customerId"),
    channel: formString(formData, "channel"),
    subject: formString(formData, "subject"),
    body: formString(formData, "body"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "customers.manage",
    "/dashboard/clienti",
    "Il tuo ruolo non consente di inviare messaggi ai clienti.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, email, phone, first_name, last_name")
    .eq("id", parsed.data.customerId)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  if (!customer) {
    return { status: "error", message: "Cliente non trovato nella sede attiva." };
  }

  const recipient =
    parsed.data.channel === "email"
      ? (customer.email as string)
      : (customer.phone as string);

  if (!recipient) {
    return {
      status: "error",
      message:
        parsed.data.channel === "email"
          ? "Il cliente non ha un'email."
          : "Il cliente non ha un numero di telefono.",
    };
  }

  const subject =
    parsed.data.subject ||
    (parsed.data.channel === "email" ? "Messaggio da CM Risto" : "");
  const { data: message, error: insertError } = await supabase
    .from("customer_messages")
    .insert({
      organization_id: restaurant.organizationId,
      restaurant_id: restaurant.id,
      customer_id: customer.id,
      channel: parsed.data.channel,
      direction: "outbound",
      recipient,
      subject,
      body: parsed.data.body,
      status: "queued",
      provider: parsed.data.channel === "email" ? "resend" : "twilio",
      created_by: session.user.id,
    })
    .select("id")
    .single();

  if (insertError || !message) {
    return { status: "error", message: "Registrazione del messaggio non riuscita." };
  }

  const result =
    parsed.data.channel === "email"
      ? await sendEmail({ to: recipient, subject, text: parsed.data.body })
      : await sendSms({ to: recipient, body: parsed.data.body });

  await supabase
    .from("customer_messages")
    .update({
      status: result.ok ? "sent" : "failed",
      provider_id: result.ok ? result.providerId : null,
      error: result.ok ? null : result.error.slice(0, 500),
      attempts: 1,
    })
    .eq("id", message.id);

  revalidatePath("/dashboard/clienti");
  revalidatePath("/dashboard/marketing");

  if (!result.ok) {
    return {
      status: "error",
      message: `Messaggio registrato ma non inviato: ${result.error}`,
    };
  }

  return { status: "success", message: "Messaggio inviato e tracciato." };
}

export async function markMessagesReadAction(): Promise<void> {
  const auth = await authorizeRestaurant(
    "customers.manage",
    "/dashboard/clienti",
    "Permesso insufficiente.",
  );
  if (!auth.ok) return;

  const supabase = await createClient();
  await supabase
    .from("customer_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("restaurant_id", auth.context.restaurant.id)
    .eq("direction", "inbound")
    .is("read_at", null);

  revalidatePath("/dashboard/clienti");
  revalidatePath("/dashboard/marketing");
}

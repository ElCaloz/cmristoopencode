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
import type { IntegrationActionState } from "@/server/billing/types";

const emailTestSchema = z.object({
  email: z.string().trim().email("Inserisci un'email valida.").max(254),
});

const smsTestSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9][0-9]{6,15}$/, "Usa il formato internazionale, es. +393331234567."),
  consent: z.literal(true, {
    message: "Conferma di avere il consenso del destinatario.",
  }),
});

const inboundSchema = z.object({
  inboundPhone: z
    .string()
    .trim()
    .max(40, "Telefono troppo lungo.")
    .refine(
      (value) => value === "" || /^\+[0-9 ()-]{6,40}$/.test(value),
      "Usa un numero in formato internazionale.",
    ),
  inboundEmail: z
    .string()
    .trim()
    .max(254)
    .refine(
      (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "Email non valida.",
    ),
  receiptFooter: z.string().trim().max(200, "Testo troppo lungo."),
});

export async function sendTestEmailAction(
  _prevState: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = emailTestSchema.safeParse({
    email: formString(formData, "email"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "settings.manage",
    "/dashboard/integrazioni",
    "Il tuo ruolo non consente di inviare test di integrazione.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };

  const result = await sendEmail({
    to: parsed.data.email,
    subject: "Test email · CM Risto",
    text: `Questa è un'email di prova inviata da CM Risto per la sede ${auth.context.restaurant.name}.\n\nSe la ricevi, il canale email è configurato correttamente.`,
  });

  return result.ok
    ? {
        status: "success",
        message: `Email di prova inviata a ${parsed.data.email} (ID ${result.providerId}).`,
      }
    : { status: "error", message: `Invio non riuscito: ${result.error}` };
}

export async function sendTestSmsAction(
  _prevState: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = smsTestSchema.safeParse({
    phone: formString(formData, "phone"),
    consent: formCheckbox(formData, "consent"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "settings.manage",
    "/dashboard/integrazioni",
    "Il tuo ruolo non consente di inviare test di integrazione.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };

  const result = await sendSms({
    to: parsed.data.phone,
    body: `Test SMS CM Risto · ${auth.context.restaurant.name}. Se lo ricevi, il canale SMS è configurato.`,
  });

  return result.ok
    ? {
        status: "success",
        message: `SMS di prova inviato (ID ${result.providerId}).`,
      }
    : { status: "error", message: `Invio non riuscito: ${result.error}` };
}

export async function saveInboundSettingsAction(
  _prevState: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = inboundSchema.safeParse({
    inboundPhone: formString(formData, "inboundPhone"),
    inboundEmail: formString(formData, "inboundEmail"),
    receiptFooter: formString(formData, "receiptFooter"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "settings.manage",
    "/dashboard/integrazioni",
    "Il tuo ruolo non consente di modificare le impostazioni di integrazione.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };

  const supabase = await createClient();
  const { error } = await supabase.from("restaurant_settings").upsert(
    {
      restaurant_id: auth.context.restaurant.id,
      inbound_phone: parsed.data.inboundPhone || null,
      inbound_email: parsed.data.inboundEmail || null,
      receipt_footer: parsed.data.receiptFooter || null,
    },
    { onConflict: "restaurant_id" },
  );

  if (error) {
    return { status: "error", message: "Salvataggio delle impostazioni non riuscito." };
  }

  await supabase.from("audit_logs").insert({
    organization_id: auth.context.restaurant.organizationId,
    restaurant_id: auth.context.restaurant.id,
    actor_user_id: auth.context.session.user.id,
    action: "integration.inbound_settings_updated",
    entity_type: "restaurant_settings",
    entity_id: auth.context.restaurant.id,
    metadata: {
      has_phone: parsed.data.inboundPhone !== "",
      has_email: parsed.data.inboundEmail !== "",
    },
  });

  revalidatePath("/dashboard/integrazioni");
  return { status: "success", message: "Impostazioni di ricezione aggiornate." };
}

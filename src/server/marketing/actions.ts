"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFromZod, formString } from "@/lib/forms";
import { sendEmail } from "@/lib/integrations/email";
import { sendSms } from "@/lib/integrations/sms";
import { authorizeRestaurant } from "@/server/auth/authorize";
import type { MarketingActionState } from "@/server/marketing/types";

const campaignSchema = z.object({
  name: z.string().trim().min(2, "Inserisci un nome.").max(120),
  channel: z.enum(["email", "sms"]),
  subject: z.string().trim().max(200).optional().default(""),
  body: z.string().trim().min(2, "Scrivi il messaggio.").max(4000),
  segment: z.enum(["all", "loyal", "new", "inactive", "vip"]),
});

const sendCampaignSchema = z.object({
  campaignId: z.string().uuid("Campagna non valida."),
});

type RecipientRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

const segmentLabels: Record<string, string> = {
  all: "tutti i contatti consensati",
  loyal: "clienti fedeli",
  new: "nuovi clienti",
  inactive: "clienti inattivi",
  vip: "clienti VIP",
};

export async function createCampaignAction(
  _prevState: MarketingActionState,
  formData: FormData,
): Promise<MarketingActionState> {
  const parsed = campaignSchema.safeParse({
    name: formString(formData, "name"),
    channel: formString(formData, "channel"),
    subject: formString(formData, "subject"),
    body: formString(formData, "body"),
    segment: formString(formData, "segment"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "customers.manage",
    "/dashboard/marketing",
    "Il tuo ruolo non consente di gestire le campagne.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  if (parsed.data.channel === "email" && parsed.data.subject.length === 0) {
    return {
      status: "error",
      fieldErrors: { subject: "Per le email serve un oggetto." },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .insert({
      organization_id: restaurant.organizationId,
      restaurant_id: restaurant.id,
      name: parsed.data.name,
      channel: parsed.data.channel,
      subject: parsed.data.subject,
      body: parsed.data.body,
      segment: parsed.data.segment,
      status: "draft",
      created_by: session.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: "Creazione della campagna non riuscita." };
  }

  await supabase.from("audit_logs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    actor_user_id: session.user.id,
    action: "marketing.campaign_created",
    entity_type: "marketing_campaign",
    entity_id: data.id,
    metadata: {
      name: parsed.data.name,
      channel: parsed.data.channel,
      segment: parsed.data.segment,
    },
  });

  revalidatePath("/dashboard/marketing");
  return {
    status: "success",
    message: "Campagna creata in bozza. Controlla il messaggio e premi Invia.",
  };
}

export async function sendCampaignAction(
  _prevState: MarketingActionState,
  formData: FormData,
): Promise<MarketingActionState> {
  const parsed = sendCampaignSchema.safeParse({
    campaignId: formString(formData, "campaignId"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "customers.manage",
    "/dashboard/marketing",
    "Il tuo ruolo non consente di inviare campagne.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("marketing_campaigns")
    .select("id, name, channel, subject, body, segment, status, sent_count, failed_count")
    .eq("id", parsed.data.campaignId)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  if (!campaign) {
    return { status: "error", message: "Campagna non trovata." };
  }

  if (campaign.status === "sent" || campaign.status === "cancelled") {
    return {
      status: "error",
      message: "Questa campagna è già stata inviata o annullata.",
    };
  }

  const channel = campaign.channel as "email" | "sms";
  let recipientsQuery = supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone")
    .eq("restaurant_id", restaurant.id)
    .limit(500);

  if (channel === "email") {
    recipientsQuery = recipientsQuery
      .eq("marketing_email", true)
      .neq("email", "");
  } else {
    recipientsQuery = recipientsQuery.eq("marketing_sms", true).neq("phone", "");
  }

  switch (campaign.segment) {
    case "loyal":
      recipientsQuery = recipientsQuery.gte("loyalty_points", 100);
      break;
    case "new": {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      recipientsQuery = recipientsQuery.gte("created_at", since);
      break;
    }
    case "inactive": {
      const before = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      recipientsQuery = recipientsQuery.or(
        `last_visit_at.is.null,last_visit_at.lt.${before}`,
      );
      break;
    }
    case "vip":
      recipientsQuery = recipientsQuery.gte("total_spent_cents", 50000);
      break;
    default:
      break;
  }

  const { data: recipientsData, error: recipientsError } = await recipientsQuery;
  if (recipientsError) {
    return { status: "error", message: "Lettura dei destinatari non riuscita." };
  }

  const recipients = (recipientsData ?? []) as RecipientRow[];
  if (recipients.length === 0) {
    return {
      status: "error",
      message: `Nessun destinatario con consenso per ${segmentLabels[campaign.segment] ?? "questo segmento"}.`,
    };
  }

  const { data: existing } = await supabase
    .from("marketing_campaign_recipients")
    .select("customer_id")
    .eq("campaign_id", campaign.id);

  const alreadySent = new Set(
    ((existing ?? []) as Array<{ customer_id: string }>).map(
      (row) => row.customer_id,
    ),
  );

  const pending = recipients.filter((recipient) => !alreadySent.has(recipient.id));
  if (pending.length === 0) {
    await supabase
      .from("marketing_campaigns")
      .update({ status: "sent" })
      .eq("id", campaign.id);
    return { status: "success", message: "Tutti i destinatari erano già stati contattati." };
  }

  const batch = pending.slice(0, 25);
  await supabase
    .from("marketing_campaigns")
    .update({ status: "sending" })
    .eq("id", campaign.id);

  let sent = 0;
  let failed = 0;

  for (const recipient of batch) {
    const to = channel === "email" ? recipient.email : recipient.phone;
    const subject =
      campaign.subject || (channel === "email" ? "Novità da CM Risto" : "");

    const { error: recipientError } = await supabase
      .from("marketing_campaign_recipients")
      .insert({
        campaign_id: campaign.id,
        customer_id: recipient.id,
        status: "queued",
      });

    if (recipientError) {
      if (recipientError.code === "23505") continue;
      failed += 1;
      continue;
    }

    const { data: message } = await supabase
      .from("customer_messages")
      .insert({
        organization_id: restaurant.organizationId,
        restaurant_id: restaurant.id,
        customer_id: recipient.id,
        campaign_id: campaign.id,
        channel,
        direction: "outbound",
        recipient: to,
        subject,
        body: campaign.body as string,
        status: "queued",
        provider: channel === "email" ? "resend" : "twilio",
        created_by: session.user.id,
      })
      .select("id")
      .single();

    const result =
      channel === "email"
        ? await sendEmail({
            to,
            subject,
            text: campaign.body as string,
          })
        : await sendSms({ to, body: campaign.body as string });

    if (result.ok) sent += 1;
    else failed += 1;

    if (message?.id) {
      await supabase
        .from("customer_messages")
        .update({
          status: result.ok ? "sent" : "failed",
          provider_id: result.ok ? result.providerId : null,
          error: result.ok ? null : result.error.slice(0, 500),
          attempts: 1,
        })
        .eq("id", message.id);
    }

    await supabase
      .from("marketing_campaign_recipients")
      .update({
        status: result.ok ? "sent" : "failed",
        provider_id: result.ok ? result.providerId : null,
        error: result.ok ? null : result.error.slice(0, 500),
        sent_at: result.ok ? new Date().toISOString() : null,
      })
      .eq("campaign_id", campaign.id)
      .eq("customer_id", recipient.id);
  }

  const remaining = pending.length - batch.length;
  const previousSent = Number(campaign.sent_count ?? 0);
  const previousFailed = Number(campaign.failed_count ?? 0);

  await supabase
    .from("marketing_campaigns")
    .update({
      status: remaining > 0 ? "sending" : "sent",
      sent_count: previousSent + sent,
      failed_count: previousFailed + failed,
    })
    .eq("id", campaign.id);

  await supabase.from("audit_logs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    actor_user_id: session.user.id,
    action: "marketing.campaign_sent",
    entity_type: "marketing_campaign",
    entity_id: campaign.id,
    metadata: { sent, failed, remaining },
  });

  revalidatePath("/dashboard/marketing");

  if (sent === 0) {
    return {
      status: "error",
      message:
        "Nessun invio riuscito. Verifica che il provider email/SMS sia configurato e che il destinatario sia valido.",
    };
  }

  return {
    status: "success",
    message:
      remaining > 0
        ? `${sent} messaggi inviati, ${failed} falliti. Restano ${remaining} destinatari: premi Invia di nuovo.`
        : `Campagna completata: ${sent} inviati, ${failed} falliti.`,
  };
}

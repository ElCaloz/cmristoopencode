import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { verifySvixSignature } from "@/lib/integrations/webhooks";
import { captureException } from "@/lib/observability/sentry";


type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: Record<string, unknown>;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asRecipient(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const internalSecret = process.env.INTEGRATION_INTERNAL_SECRET?.trim();

  if (!webhookSecret || !internalSecret) {
    return NextResponse.json(
      { error: "Resend webhook non configurato." },
      { status: 503 },
    );
  }

  const payload = await request.text();

  if (
    !verifySvixSignature({
      payload,
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
      secret: webhookSecret,
    })
  ) {
    return NextResponse.json({ error: "Firma non valida." }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(payload) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Payload non valido." }, { status: 400 });
  }

  const type = event.type ?? "";
  const eventId =
    request.headers.get("svix-id") ||
    `${type}:${asString(event.data?.email_id) || Date.now().toString(36)}`;
  const data = event.data ?? {};

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (type === "email.received") {
      const from = asString(data.from);
      const to = asRecipient(data.to);
      const body =
        asString(data.text) || asString(data.plain) || asString(data.html);

      if (from && to) {
        const { error } = await supabase.rpc("record_inbound_message", {
          p_provider: "resend",
          p_secret: internalSecret,
          p_channel: "email",
          p_from: from,
          p_to: to,
          p_body: body,
          p_provider_id: asString(data.email_id) || eventId,
        });

        if (error) throw error;
      } else {
        await supabase.rpc("record_integration_event", {
          p_provider: "resend",
          p_secret: internalSecret,
          p_event_id: eventId,
          p_event_type: type,
          p_payload: event,
        });
      }
    } else if (
      type === "email.delivered" ||
      type === "email.bounced" ||
      type === "email.failed" ||
      type === "email.complained" ||
      type === "email.delivery_delayed"
    ) {
      const providerId = asString(data.email_id) || asString(data.id);
      if (providerId) {
        const status =
          type === "email.bounced" || type === "email.failed"
            ? "failed"
            : type === "email.delivered"
              ? "delivered"
              : "sent";

        await supabase.rpc("update_message_status_by_provider", {
          p_provider: "resend",
          p_secret: internalSecret,
          p_provider_id: providerId,
          p_status: status,
          p_error: type === "email.bounced" ? "Email rimbalzata." : null,
        });
      }

      await supabase.rpc("record_integration_event", {
        p_provider: "resend",
        p_secret: internalSecret,
        p_event_id: eventId,
        p_event_type: type,
        p_payload: event,
      });
    } else {
      await supabase.rpc("record_integration_event", {
        p_provider: "resend",
        p_secret: internalSecret,
        p_event_id: eventId,
        p_event_type: type,
        p_payload: event,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await captureException(error, {
      route: "/api/resend/webhook",
      eventType: type,
      eventId,
    });
    return NextResponse.json({ error: "Errore interno." }, { status: 500 });
  }
}

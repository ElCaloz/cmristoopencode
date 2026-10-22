import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { verifyTwilioSignature } from "@/lib/integrations/webhooks";
import { captureException } from "@/lib/observability/sentry";


export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const internalSecret = process.env.INTEGRATION_INTERNAL_SECRET?.trim();

  if (!authToken || !internalSecret) {
    return NextResponse.json(
      { error: "Twilio webhook non configurato." },
      { status: 503 },
    );
  }

  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const signatureUrl = process.env.TWILIO_WEBHOOK_URL?.trim() || request.url;

  if (
    !verifyTwilioSignature({
      url: signatureUrl,
      params,
      signature: request.headers.get("x-twilio-signature"),
      authToken,
    })
  ) {
    return new NextResponse("Firma non valida", { status: 403 });
  }

  const messageSid = params.MessageSid ?? params.SmsSid ?? "";
  const from = params.From ?? "";
  const to = params.To ?? "";
  const body = params.Body ?? "";
  const status = (params.MessageStatus ?? params.SmsStatus ?? "").toLowerCase();

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (body !== "" && messageSid) {
      const { error } = await supabase.rpc("record_inbound_message", {
        p_provider: "twilio",
        p_secret: internalSecret,
        p_channel: "sms",
        p_from: from,
        p_to: to,
        p_body: body,
        p_provider_id: messageSid,
      });

      if (error) throw error;
    } else if (messageSid && status) {
      const mapped =
        status === "delivered"
          ? "delivered"
          : status === "failed" || status === "undelivered"
            ? "failed"
            : status === "sent" || status === "accepted" || status === "sending"
              ? "sent"
              : null;

      if (mapped) {
        await supabase.rpc("update_message_status_by_provider", {
          p_provider: "twilio",
          p_secret: internalSecret,
          p_provider_id: messageSid,
          p_status: mapped,
          p_error:
            status === "failed" || status === "undelivered"
              ? params.ErrorMessage ?? "Invio SMS fallito."
              : null,
        });
      }

      await supabase.rpc("record_integration_event", {
        p_provider: "twilio",
        p_secret: internalSecret,
        p_event_id: `${messageSid}:${status || "status"}`,
        p_event_type: `message.${status || "status"}`,
        p_payload: Object.fromEntries(
          Object.entries(params).filter(
            ([key]) =>
              !key.toLowerCase().includes("token") &&
              !key.toLowerCase().includes("secret"),
          ),
        ),
      });
    }

    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "content-type": "text/xml; charset=utf-8" },
    });
  } catch (error) {
    await captureException(error, {
      route: "/api/twilio/webhook",
      messageSid,
      status,
    });
    return new NextResponse("<Response></Response>", {
      status: 500,
      headers: { "content-type": "text/xml; charset=utf-8" },
    });
  }
}

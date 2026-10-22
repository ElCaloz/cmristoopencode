import type { DeliveryResult } from "@/lib/integrations/config";
import { isSmsConfigured } from "@/lib/integrations/config";

type SendSmsInput = {
  to: string;
  body: string;
};

export async function sendSms(input: SendSmsInput): Promise<DeliveryResult> {
  if (!isSmsConfigured()) {
    return { ok: false, error: "SMS non configurati (credenziali Twilio mancanti)." };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  if (!accountSid || !authToken) {
    return { ok: false, error: "SMS non configurati." };
  }

  const body = new URLSearchParams();
  body.set("To", input.to);
  body.set("Body", input.body.slice(0, 1600));
  if (messagingServiceSid) body.set("MessagingServiceSid", messagingServiceSid);
  else if (from) body.set("From", from);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(12000),
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | { sid?: string; message?: string; code?: number }
      | null;

    if (!response.ok || !payload?.sid) {
      return {
        ok: false,
        error:
          payload?.message ??
          (payload?.code ? `Errore Twilio ${payload.code}.` : "Invio SMS non riuscito."),
      };
    }

    return { ok: true, providerId: payload.sid };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invio SMS non riuscito.",
    };
  }
}

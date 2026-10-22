import type { DeliveryResult } from "@/lib/integrations/config";
import { getEmailFrom, isEmailConfigured } from "@/lib/integrations/config";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<DeliveryResult> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Email non configurata (RESEND_API_KEY mancante)." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY?.trim()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFrom(),
        to: [input.to],
        subject: input.subject.slice(0, 200),
        text: input.text,
        html: input.html,
        reply_to: input.replyTo,
      }),
      signal: AbortSignal.timeout(12000),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!response.ok || !payload?.id) {
      return {
        ok: false,
        error:
          payload?.message ??
          payload?.name ??
          `Invio email non riuscito (HTTP ${response.status}).`,
      };
    }

    return { ok: true, providerId: payload.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invio email non riuscito.",
    };
  }
}

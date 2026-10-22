import { createHmac, timingSafeEqual } from "node:crypto";
import { isStripeConfigured } from "@/lib/integrations/config";
import type { PlanId } from "@/lib/plans";

type StripeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

const STRIPE_API = "https://api.stripe.com/v1";

function secretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

async function stripeRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: URLSearchParams,
): Promise<StripeResult<T>> {
  const key = secretKey();
  if (!key) {
    return { ok: false, error: "Stripe non configurato.", status: 503 };
  }

  try {
    const response = await fetch(`${STRIPE_API}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${key}`,
        ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      },
      body: body?.toString(),
      signal: AbortSignal.timeout(15000),
    });

    const payload = (await response.json().catch(() => null)) as
      | (T & { error?: { message?: string } })
      | null;

    if (!response.ok || !payload) {
      return {
        ok: false,
        error: payload?.error?.message ?? `Errore Stripe (HTTP ${response.status}).`,
        status: response.status,
      };
    }

    return { ok: true, data: payload };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Errore di rete Stripe.",
      status: 502,
    };
  }
}

export function getStripePriceId(
  plan: PlanId,
  interval: "month" | "year",
): string | null {
  if (plan === "enterprise") return null;
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return process.env[key]?.trim() || null;
}

export type CheckoutLineItem = {
  priceId: string;
  quantity: number;
};

export async function createCheckoutSession(input: {
  lineItems: CheckoutLineItem[];
  mode: "payment" | "subscription";
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  clientReferenceId?: string;
  metadata?: Record<string, string>;
  subscriptionMetadata?: Record<string, string>;
}): Promise<StripeResult<{ id: string; url: string }>> {
  const body = new URLSearchParams();
  body.set("mode", input.mode);
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("allow_promotion_codes", "true");
  if (input.customerEmail) body.set("customer_email", input.customerEmail);
  if (input.clientReferenceId) {
    body.set("client_reference_id", input.clientReferenceId);
  }
  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    body.set(`metadata[${key}]`, value.slice(0, 500));
  }
  if (input.mode === "subscription") {
    for (const [key, value] of Object.entries(input.subscriptionMetadata ?? {})) {
      body.set(`subscription_data[metadata][${key}]`, value.slice(0, 500));
    }
  }
  input.lineItems.forEach((item, index) => {
    body.set(`line_items[${index}][price]`, item.priceId);
    body.set(`line_items[${index}][quantity]`, String(Math.max(1, item.quantity)));
  });

  return stripeRequest<{ id: string; url: string }>(
    "POST",
    "/checkout/sessions",
    body,
  );
}

export async function createBillingPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<StripeResult<{ url: string }>> {
  const body = new URLSearchParams();
  body.set("customer", input.customerId);
  body.set("return_url", input.returnUrl);
  return stripeRequest<{ url: string }>("POST", "/billing_portal/sessions", body);
}

export function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestampPart || signatures.length === 0) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  return signatures.some((signature) => {
    const provided = Buffer.from(signature, "utf8");
    return (
      provided.length === expectedBuffer.length &&
      timingSafeEqual(provided, expectedBuffer)
    );
  });
}

export function isStripeBillingReady(): boolean {
  return Boolean(
    isStripeConfigured() &&
      getStripePriceId("starter", "month") &&
      getStripePriceId("pro", "month") &&
      getStripePriceId("business", "month"),
  );
}

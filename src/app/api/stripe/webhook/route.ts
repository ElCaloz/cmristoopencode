import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { verifyStripeSignature } from "@/lib/integrations/stripe";
import { captureException } from "@/lib/observability/sentry";


type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : "";
  }
  return "";
}

function asMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") result[key] = entry;
  }
  return result;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const internalSecret = process.env.INTEGRATION_INTERNAL_SECRET?.trim();

  if (!webhookSecret || !internalSecret) {
    return NextResponse.json(
      { error: "Stripe webhook non configurato." },
      { status: 503 },
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: "Firma non valida." }, { status: 401 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Payload non valido." }, { status: 400 });
  }

  const eventId = event.id;
  const eventType = event.type;
  if (!eventId || !eventType) {
    return NextResponse.json({ error: "Evento incompleto." }, { status: 400 });
  }

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (eventType === "checkout.session.completed") {
      const session = event.data?.object ?? {};
      const metadata = asMetadata(session.metadata);
      const organizationId = metadata.organization_id;

      if (organizationId) {
        const { error } = await supabase.rpc(
          "process_stripe_subscription_event",
          {
            p_secret: internalSecret,
            p_event_id: eventId,
            p_event_type: eventType,
            p_organization_id: organizationId,
            p_customer_id: asString(session.customer),
            p_subscription_id: asString(session.subscription),
            p_status: "active",
            p_plan: metadata.plan || null,
            p_interval: metadata.interval || null,
          },
        );

        if (error) {
          await captureException(error, {
            route: "/api/stripe/webhook",
            eventType,
            eventId,
          });
          return NextResponse.json(
            { error: "Aggiornamento abbonamento non riuscito." },
            { status: 500 },
          );
        }
      }
    } else if (
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated" ||
      eventType === "customer.subscription.deleted"
    ) {
      const subscription = event.data?.object ?? {};
      const metadata = asMetadata(subscription.metadata);
      const organizationId = metadata.organization_id;

      if (organizationId) {
        const status =
          eventType === "customer.subscription.deleted"
            ? "canceled"
            : typeof subscription.status === "string"
              ? subscription.status
              : "active";

        const { error } = await supabase.rpc(
          "process_stripe_subscription_event",
          {
            p_secret: internalSecret,
            p_event_id: eventId,
            p_event_type: eventType,
            p_organization_id: organizationId,
            p_customer_id: asString(subscription.customer),
            p_subscription_id: asString(subscription),
            p_status: status,
            p_plan: metadata.plan || null,
            p_interval: metadata.interval || null,
          },
        );

        if (error) {
          await captureException(error, {
            route: "/api/stripe/webhook",
            eventType,
            eventId,
          });
          return NextResponse.json(
            { error: "Aggiornamento abbonamento non riuscito." },
            { status: 500 },
          );
        }
      }
    } else {
      await supabase.rpc("record_integration_event", {
        p_provider: "stripe",
        p_secret: internalSecret,
        p_event_id: eventId,
        p_event_type: eventType,
        p_payload: event,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await captureException(error, {
      route: "/api/stripe/webhook",
      eventType,
      eventId,
    });
    return NextResponse.json({ error: "Errore interno." }, { status: 500 });
  }
}

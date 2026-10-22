"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/plans";
import { getPublicSiteUrl } from "@/lib/integrations/config";
import {
  createBillingPortalSession,
  createCheckoutSession,
  getStripePriceId,
} from "@/lib/integrations/stripe";
import { getSessionContext } from "@/server/auth/session";
import type { BillingActionState } from "@/server/billing/types";

const checkoutSchema = z.object({
  plan: z.enum(["starter", "pro", "business", "enterprise"]),
  interval: z.enum(["month", "year"]),
});

export async function startPlanCheckoutAction(
  _prevState: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const parsed = checkoutSchema.safeParse({
    plan: formData.get("plan"),
    interval: formData.get("interval") || "month",
  });

  if (!parsed.success) {
    return { status: "error", message: "Piano non valido." };
  }

  if (parsed.data.plan === "enterprise") {
    return {
      status: "error",
      message: "Il piano Enterprise si attiva su preventivo: contatta il supporto.",
    };
  }

  const session = await getSessionContext();
  if (!session) {
    redirect(`/login?reason=session&next=${encodeURIComponent("/dashboard/abbonamento")}`);
  }

  const membership = session.activeMembership;
  if (!membership) {
    return { status: "error", message: "Nessuna organizzazione attiva." };
  }

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("auth_has_permission", {
    p_organization_id: membership.organizationId,
    p_permission: "organization.manage",
  });

  if (allowed !== true) {
    return {
      status: "error",
      message: "Solo il proprietario o un amministratore può attivare un piano.",
    };
  }

  const priceId = getStripePriceId(parsed.data.plan as PlanId, parsed.data.interval);
  if (!priceId) {
    return {
      status: "error",
      message:
        "Prezzo Stripe non configurato per questo piano. Aggiungi le variabili STRIPE_PRICE_* in produzione.",
    };
  }

  const plan = PLANS[parsed.data.plan as PlanId];
  const result = await createCheckoutSession({
    lineItems: [{ priceId, quantity: 1 }],
    mode: "subscription",
    successUrl: `${getPublicSiteUrl()}/dashboard/abbonamento?checkout=success`,
    cancelUrl: `${getPublicSiteUrl()}/dashboard/abbonamento?checkout=cancel`,
    customerEmail: session.user.email ?? undefined,
    clientReferenceId: membership.organizationId,
    metadata: {
      organization_id: membership.organizationId,
      plan: parsed.data.plan,
      interval: parsed.data.interval,
      plan_name: plan.name,
    },
    subscriptionMetadata: {
      organization_id: membership.organizationId,
      plan: parsed.data.plan,
      interval: parsed.data.interval,
    },
  });

  if (!result.ok) {
    return {
      status: "error",
      message: `Checkout Stripe non disponibile: ${result.error}`,
    };
  }

  redirect(result.data.url);
}

export async function openBillingPortalAction(): Promise<void> {
  const session = await getSessionContext();
  if (!session?.activeMembership) {
    redirect("/login?reason=session&next=/dashboard/abbonamento");
  }

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", session.activeMembership.organizationId)
    .maybeSingle();

  const customerId = organization?.stripe_customer_id as string | null;
  if (!customerId) {
    redirect("/dashboard/abbonamento?billing=missing_customer");
  }

  const result = await createBillingPortalSession({
    customerId,
    returnUrl: `${getPublicSiteUrl()}/dashboard/abbonamento`,
  });

  if (!result.ok) {
    redirect("/dashboard/abbonamento?billing=portal_error");
  }

  redirect(result.data.url);
}

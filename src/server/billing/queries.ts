import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type BillingOverview = {
  organizationId: string;
  organizationName: string;
  plan: string | null;
  planStatus: string;
  billingInterval: "month" | "year" | null;
  hasStripeCustomer: boolean;
  planActivatedAt: string | null;
  trialEndsAt: string | null;
};

export type InboundSettings = {
  inboundPhone: string;
  inboundEmail: string;
  receiptFooter: string;
};

export const getBillingOverview = cache(
  async (organizationId: string): Promise<BillingOverview | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select(
        "id, name, requested_plan, plan_status, billing_interval, stripe_customer_id, plan_activated_at, trial_ends_at",
      )
      .eq("id", organizationId)
      .maybeSingle();

    if (!data) return null;

    return {
      organizationId: data.id as string,
      organizationName: data.name as string,
      plan: (data.requested_plan as string | null) ?? null,
      planStatus: (data.plan_status as string) ?? "not_activated",
      billingInterval:
        (data.billing_interval as "month" | "year" | null) ?? null,
      hasStripeCustomer: Boolean(data.stripe_customer_id),
      planActivatedAt: (data.plan_activated_at as string | null) ?? null,
      trialEndsAt: (data.trial_ends_at as string | null) ?? null,
    };
  },
);

export async function getInboundSettings(
  restaurantId: string,
): Promise<InboundSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurant_settings")
    .select("inbound_phone, inbound_email, receipt_footer")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  return {
    inboundPhone: (data?.inbound_phone as string | null) ?? "",
    inboundEmail: (data?.inbound_email as string | null) ?? "",
    receiptFooter: (data?.receipt_footer as string | null) ?? "",
  };
}

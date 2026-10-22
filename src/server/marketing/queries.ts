import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasRestaurantPermission } from "@/server/auth/authorize";
import {
  getCustomerMessages,
  getCustomers,
} from "@/server/crm/queries";
import type {
  CampaignRow,
  MarketingData,
  SegmentCount,
} from "@/server/marketing/types";

export const canManageMarketing = cache(async (restaurantId: string) =>
  hasRestaurantPermission(restaurantId, "customers.manage"),
);

type CampaignDbRow = {
  id: string;
  name: string;
  channel: "email" | "sms";
  subject: string;
  body: string;
  segment: CampaignRow["segment"];
  status: CampaignRow["status"];
  scheduled_at: string | null;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

export async function getCampaigns(restaurantId: string): Promise<CampaignRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketing_campaigns")
    .select(
      "id, name, channel, subject, body, segment, status, scheduled_at, sent_count, failed_count, created_at",
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(80);

  return ((data ?? []) as CampaignDbRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    channel: row.channel,
    subject: row.subject,
    body: row.body,
    segment: row.segment,
    status: row.status,
    scheduledAt: row.scheduled_at,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    createdAt: row.created_at,
  }));
}

export async function getSegmentCounts(
  restaurantId: string,
): Promise<SegmentCount[]> {
  const customers = await getCustomers(restaurantId);
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const sixtyDays = 60 * 24 * 60 * 60 * 1000;

  const consenting = customers.filter(
    (customer) => customer.marketingEmail || customer.marketingSms,
  );

  return [
    { id: "all", label: "Tutti i contatti consensati", count: consenting.length },
    {
      id: "loyal",
      label: "Clienti fedeli (≥ 100 punti)",
      count: consenting.filter((customer) => customer.loyaltyPoints >= 100).length,
    },
    {
      id: "new",
      label: "Nuovi clienti (ultimi 30 giorni)",
      count: consenting.filter(
        (customer) => now - new Date(customer.createdAt).getTime() <= thirtyDays,
      ).length,
    },
    {
      id: "inactive",
      label: "Inattivi (oltre 60 giorni)",
      count: consenting.filter(
        (customer) =>
          !customer.lastVisitAt ||
          now - new Date(customer.lastVisitAt).getTime() > sixtyDays,
      ).length,
    },
    {
      id: "vip",
      label: "VIP (spesa ≥ 500 €)",
      count: consenting.filter((customer) => customer.totalSpentCents >= 50000)
        .length,
    },
  ];
}

export async function getMarketingData(
  restaurantId: string,
): Promise<MarketingData> {
  const [campaigns, segments, inbox, customers] = await Promise.all([
    getCampaigns(restaurantId),
    getSegmentCounts(restaurantId),
    getCustomerMessages(restaurantId),
    getCustomers(restaurantId),
  ]);

  return { campaigns, segments, inbox, customers };
}

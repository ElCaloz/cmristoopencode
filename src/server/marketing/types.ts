export type MarketingActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialMarketingActionState: MarketingActionState = { status: "idle" };

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "cancelled";

export type CampaignRow = {
  id: string;
  name: string;
  channel: "email" | "sms";
  subject: string;
  body: string;
  segment: "all" | "loyal" | "new" | "inactive" | "vip";
  status: CampaignStatus;
  scheduledAt: string | null;
  sentCount: number;
  failedCount: number;
  createdAt: string;
};

export type SegmentCount = {
  id: "all" | "loyal" | "new" | "inactive" | "vip";
  label: string;
  count: number;
};

export type MarketingData = {
  campaigns: CampaignRow[];
  segments: SegmentCount[];
  inbox: import("@/server/crm/types").CustomerMessageRow[];
  customers: import("@/server/crm/types").CustomerRow[];
};

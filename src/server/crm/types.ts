export type CrmActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialCrmActionState: CrmActionState = { status: "idle" };

export type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  tags: string[];
  allergies: string;
  notes: string;
  marketingEmail: boolean;
  marketingSms: boolean;
  visits: number;
  totalSpentCents: number;
  lastVisitAt: string | null;
  loyaltyPoints: number;
  createdAt: string;
};

export type LoyaltySettingsRow = {
  pointsPerEuro: number;
  pointValueCents: number;
  minRedeemPoints: number;
  isActive: boolean;
};

export type LoyaltyTransactionRow = {
  id: string;
  customerId: string;
  customerName: string;
  points: number;
  reason: string;
  createdAt: string;
};

export type CustomerMessageRow = {
  id: string;
  customerId: string | null;
  customerName: string | null;
  channel: "email" | "sms" | "whatsapp" | "internal";
  direction: "inbound" | "outbound";
  recipient: string;
  subject: string;
  body: string;
  status: "queued" | "sent" | "delivered" | "failed" | "received";
  error: string | null;
  createdAt: string;
  readAt: string | null;
};

export type CrmData = {
  customers: CustomerRow[];
  loyalty: LoyaltySettingsRow;
  transactions: LoyaltyTransactionRow[];
  messages: CustomerMessageRow[];
  summary: {
    customers: number;
    marketingConsents: number;
    loyaltyPoints: number;
    unreadMessages: number;
  };
};

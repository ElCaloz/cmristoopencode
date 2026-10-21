export type ReceptionistSettingsRow = {
  restaurantId: string;
  isEnabled: boolean;
  displayName: string | null;
  greeting: string | null;
  language: "it" | "en";
  voice: string;
  model: string;
  inboundPhoneNumber: string | null;
  transferPhone: string | null;
  maxCallSeconds: number;
  maxDailyCalls: number;
  monthlyBudgetCents: number;
  reservationDurationMinutes: number;
  maxPartySize: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
};

export type OpeningHourRow = {
  id: string;
  weekday: number;
  opensAt: string;
  closesAt: string;
  isActive: boolean;
};

export type ClosedDateRow = {
  id: string;
  closedOn: string;
  reason: string | null;
};

export type ReceptionistCallRow = {
  id: string;
  providerCallId: string;
  fromPhone: string | null;
  toPhone: string | null;
  status: "in_progress" | "completed" | "failed" | "transferred" | "abandoned";
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  summary: string | null;
  messageCount: number;
};

export type ReceptionistOverview = {
  settings: ReceptionistSettingsRow;
  openingHours: OpeningHourRow[];
  closedDates: ClosedDateRow[];
  calls: ReceptionistCallRow[];
};

export type ReceptionistActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialReceptionistActionState: ReceptionistActionState = {
  status: "idle",
};

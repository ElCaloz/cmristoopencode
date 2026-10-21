export const reservationStatuses = [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type ReservationStatus = (typeof reservationStatuses)[number];

export const reservationSources = [
  "dashboard",
  "phone_ai",
  "phone_manual",
  "web",
] as const;

export type ReservationSource = (typeof reservationSources)[number];

export type ReservationRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  partySize: number;
  date: string;
  time: string;
  durationMinutes: number;
  status: ReservationStatus;
  source: ReservationSource;
  notes: string | null;
  tableId: string | null;
  callId: string | null;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
};

export type ReservationActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialReservationActionState: ReservationActionState = {
  status: "idle",
};

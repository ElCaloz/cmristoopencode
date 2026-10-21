import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  ClosedDateRow,
  OpeningHourRow,
  ReceptionistCallRow,
  ReceptionistOverview,
  ReceptionistSettingsRow,
} from "@/server/receptionist/types";

const defaultSettings = (restaurantId: string): ReceptionistSettingsRow => ({
  restaurantId,
  isEnabled: false,
  displayName: null,
  greeting: null,
  language: "it",
  voice: "marin",
  model: "gpt-realtime-2.1",
  inboundPhoneNumber: null,
  transferPhone: null,
  maxCallSeconds: 300,
  maxDailyCalls: 100,
  monthlyBudgetCents: 0,
  reservationDurationMinutes: 90,
  maxPartySize: 8,
  minNoticeMinutes: 60,
  maxDaysAhead: 60,
});

export const canManageReceptionist = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: "receptionist.manage",
  });
  return data === true;
});

function mapSettings(
  restaurantId: string,
  row: {
    is_enabled: boolean;
    display_name: string | null;
    greeting: string | null;
    language: string;
    voice: string;
    model: string;
    inbound_phone_number: string | null;
    transfer_phone: string | null;
    max_call_seconds: number;
    max_daily_calls: number;
    monthly_budget_cents: number;
    reservation_duration_minutes: number;
    max_party_size: number;
    min_notice_minutes: number;
    max_days_ahead: number;
  } | null,
): ReceptionistSettingsRow {
  if (!row) return defaultSettings(restaurantId);

  return {
    restaurantId,
    isEnabled: row.is_enabled,
    displayName: row.display_name,
    greeting: row.greeting,
    language: row.language === "en" ? "en" : "it",
    voice: row.voice,
    model: row.model,
    inboundPhoneNumber: row.inbound_phone_number,
    transferPhone: row.transfer_phone,
    maxCallSeconds: row.max_call_seconds,
    maxDailyCalls: row.max_daily_calls,
    monthlyBudgetCents: Number(row.monthly_budget_cents),
    reservationDurationMinutes: row.reservation_duration_minutes,
    maxPartySize: row.max_party_size,
    minNoticeMinutes: row.min_notice_minutes,
    maxDaysAhead: row.max_days_ahead,
  };
}

export async function getReceptionistOverview(
  restaurantId: string,
): Promise<ReceptionistOverview> {
  const supabase = await createClient();

  const [settingsResult, hoursResult, closedDatesResult, callsResult] =
    await Promise.all([
      supabase
        .from("receptionist_settings")
        .select(
          "is_enabled, display_name, greeting, language, voice, model, inbound_phone_number, transfer_phone, max_call_seconds, max_daily_calls, monthly_budget_cents, reservation_duration_minutes, max_party_size, min_notice_minutes, max_days_ahead",
        )
        .eq("restaurant_id", restaurantId)
        .maybeSingle(),
      supabase
        .from("restaurant_opening_hours")
        .select("id, weekday, opens_at, closes_at, is_active")
        .eq("restaurant_id", restaurantId)
        .order("weekday", { ascending: true })
        .order("opens_at", { ascending: true }),
      supabase
        .from("restaurant_closed_dates")
        .select("id, closed_on, reason")
        .eq("restaurant_id", restaurantId)
        .order("closed_on", { ascending: true })
        .limit(50),
      supabase
        .from("receptionist_calls")
        .select(
          "id, provider_call_id, from_phone, to_phone, status, started_at, ended_at, duration_seconds, summary",
        )
        .eq("restaurant_id", restaurantId)
        .order("started_at", { ascending: false })
        .limit(20),
    ]);

  const calls = ((callsResult.data ?? []) as Array<{
    id: string;
    provider_call_id: string;
    from_phone: string | null;
    to_phone: string | null;
    status: string;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    summary: string | null;
  }>).map((row) => ({
    ...row,
    messageCount: 0,
  }));

  const callIds = calls.map((call) => call.id);
  const messageCounts = new Map<string, number>();

  if (callIds.length > 0) {
    const { data } = await supabase
      .from("receptionist_messages")
      .select("call_id")
      .in("call_id", callIds);

    for (const message of (data ?? []) as Array<{ call_id: string }>) {
      messageCounts.set(
        message.call_id,
        (messageCounts.get(message.call_id) ?? 0) + 1,
      );
    }
  }

  const mappedCalls: ReceptionistCallRow[] = calls.map((row) => ({
    id: row.id,
    providerCallId: row.provider_call_id,
    fromPhone: row.from_phone,
    toPhone: row.to_phone,
    status: (
      [
        "in_progress",
        "completed",
        "failed",
        "transferred",
        "abandoned",
      ] as const
    ).includes(row.status as ReceptionistCallRow["status"])
      ? (row.status as ReceptionistCallRow["status"])
      : "failed",
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    summary: row.summary,
    messageCount: messageCounts.get(row.id) ?? 0,
  }));

  const openingHours: OpeningHourRow[] = ((hoursResult.data ?? []) as Array<{
    id: string;
    weekday: number;
    opens_at: string;
    closes_at: string;
    is_active: boolean;
  }>).map((row) => ({
    id: row.id,
    weekday: row.weekday,
    opensAt: row.opens_at.slice(0, 5),
    closesAt: row.closes_at.slice(0, 5),
    isActive: row.is_active,
  }));

  const closedDates: ClosedDateRow[] = ((closedDatesResult.data ?? []) as Array<{
    id: string;
    closed_on: string;
    reason: string | null;
  }>).map((row) => ({
    id: row.id,
    closedOn: row.closed_on,
    reason: row.reason,
  }));

  return {
    settings: mapSettings(
      restaurantId,
      settingsResult.data as Parameters<typeof mapSettings>[1],
    ),
    openingHours,
    closedDates,
    calls: mappedCalls,
  };
}

export function isReceptionistApiConfigured() {
  return Boolean(
    process.env.RECEPTIONIST_INTERNAL_TOKEN?.trim() &&
      process.env.RECEPTIONIST_INTERNAL_SECRET?.trim(),
  );
}

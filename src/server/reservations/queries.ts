import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  reservationSources,
  reservationStatuses,
  type ReservationRow,
  type ReservationSource,
  type ReservationStatus,
} from "@/server/reservations/types";

function asStatus(value: string): ReservationStatus {
  return (reservationStatuses as readonly string[]).includes(value)
    ? (value as ReservationStatus)
    : "pending";
}

function asSource(value: string): ReservationSource {
  return (reservationSources as readonly string[]).includes(value)
    ? (value as ReservationSource)
    : "dashboard";
}

export const canManageReservations = cache(async (restaurantId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_has_permission_for_restaurant", {
    p_restaurant_id: restaurantId,
    p_permission: "reservations.manage",
  });
  return data === true;
});

export async function getReservations(
  restaurantId: string,
): Promise<ReservationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select(
      "id, customer_name, customer_phone, customer_email, party_size, reservation_date, reservation_time, duration_minutes, status, source, notes, table_id, call_id, created_at, confirmed_at, cancelled_at, cancellation_reason",
    )
    .eq("restaurant_id", restaurantId)
    .order("reservation_date", { ascending: false })
    .order("reservation_time", { ascending: false })
    .limit(500);

  return ((data ?? []) as Array<{
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string | null;
    party_size: number;
    reservation_date: string;
    reservation_time: string;
    duration_minutes: number;
    status: string;
    source: string;
    notes: string | null;
    table_id: string | null;
    call_id: string | null;
    created_at: string;
    confirmed_at: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
  }>).map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    partySize: row.party_size,
    date: row.reservation_date,
    time: row.reservation_time.slice(0, 5),
    durationMinutes: row.duration_minutes,
    status: asStatus(row.status),
    source: asSource(row.source),
    notes: row.notes,
    tableId: row.table_id,
    callId: row.call_id,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
  }));
}

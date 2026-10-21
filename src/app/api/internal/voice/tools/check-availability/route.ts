import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCall } from "@/server/receptionist/internal";
import { jsonError, rpcError } from "@/server/receptionist/http";


const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  partySize: z.coerce.number().int().min(1).max(50),
  durationMinutes: z.coerce.number().int().min(30).max(240).optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await authenticateCall(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "invalid_request", "Parametri di disponibilitÃ  non validi.");
  }

  const { data, error } = await auth.admin.rpc("check_reservation_availability", {
    p_restaurant_id: auth.claims.restaurantId,
    p_reservation_date: parsed.data.date,
    p_reservation_time: parsed.data.time,
    p_party_size: parsed.data.partySize,
    p_duration_minutes: parsed.data.durationMinutes ?? null,
  });

  if (error) return rpcError(error);

  const result = data as {
    available?: boolean;
    reason?: string | null;
    seats_left?: number;
  } | null;

  if (!result || typeof result.available !== "boolean") {
    return jsonError(500, "internal_error", "Impossibile verificare la disponibilitÃ .");
  }

  return NextResponse.json({
    available: result.available,
    reason: result.reason ?? null,
    seatsLeft: result.seats_left ?? 0,
  });
}

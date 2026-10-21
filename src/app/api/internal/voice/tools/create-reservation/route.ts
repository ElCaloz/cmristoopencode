import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCall } from "@/server/receptionist/internal";
import { jsonError, rpcError, unavailableReason } from "@/server/receptionist/http";


const bodySchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(5).max(30),
  customerEmail: z.string().trim().email().max(200).optional().nullable(),
  partySize: z.coerce.number().int().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.coerce.number().int().min(30).max(240).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(120),
});

export async function POST(request: Request) {
  const auth = await authenticateCall(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      400,
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Dati prenotazione non validi.",
    );
  }

  const { data, error } = await auth.admin.rpc("create_reservation", {
    p_restaurant_id: auth.claims.restaurantId,
    p_customer_name: parsed.data.customerName,
    p_customer_phone: parsed.data.customerPhone,
    p_customer_email: parsed.data.customerEmail ?? null,
    p_party_size: parsed.data.partySize,
    p_reservation_date: parsed.data.date,
    p_reservation_time: parsed.data.time,
    p_duration_minutes: parsed.data.durationMinutes ?? null,
    p_source: "phone_ai",
    p_notes: parsed.data.notes ?? null,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_call_id: auth.claims.callId,
    p_confirm: false,
  });

  if (error) {
    const reason = unavailableReason(error.message ?? "");

    if (reason) {
      return NextResponse.json(
        {
          error: {
            code: "reservation_unavailable",
            reason,
            message: "La fascia oraria richiesta non Ã¨ disponibile.",
          },
        },
        { status: 409 },
      );
    }

    return rpcError(error);
  }

  const result = data as {
    reservation_id?: string;
    status?: string;
    created?: boolean;
  } | null;

  if (!result?.reservation_id) {
    return jsonError(500, "internal_error", "Impossibile registrare la prenotazione.");
  }

  return NextResponse.json(
    {
      reservationId: result.reservation_id,
      status: result.status ?? "pending",
      created: result.created ?? false,
      message: result.created
        ? "Prenotazione registrata in attesa di conferma."
        : "Prenotazione giÃ  registrata.",
    },
    { status: result.created ? 201 : 200 },
  );
}

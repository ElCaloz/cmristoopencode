import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCall } from "@/server/receptionist/internal";
import { jsonError } from "@/server/receptionist/http";


const bodySchema = z.object({
  reason: z.string().trim().max(300).optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await authenticateCall(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "invalid_request", "Motivazione di trasferimento non valida.");
  }

  const { data, error } = await auth.admin
    .from("receptionist_settings")
    .select("transfer_phone, is_enabled")
    .eq("restaurant_id", auth.claims.restaurantId)
    .maybeSingle();

  if (error) {
    return jsonError(500, "internal_error", "Impossibile leggere la configurazione.");
  }

  if (!data?.is_enabled || !data.transfer_phone) {
    return NextResponse.json(
      {
        available: false,
        reason: "transfer_not_configured",
        message: "Nessun numero di trasferimento configurato: proponi di lasciare un messaggio.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    available: true,
    transferTo: data.transfer_phone,
    reason: parsed.data.reason ?? null,
    providerAction: "transfer",
    note: "Il trasferimento telefonico deve essere effettuato dal provider vocale.",
  });
}

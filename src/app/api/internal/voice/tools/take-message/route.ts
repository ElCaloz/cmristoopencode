import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCall } from "@/server/receptionist/internal";
import { jsonError, rpcError } from "@/server/receptionist/http";


const bodySchema = z.object({
  callerName: z.string().trim().max(120).optional().nullable(),
  callbackPhone: z.string().trim().min(5).max(30),
  message: z.string().trim().min(2).max(1000),
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
      parsed.error.issues[0]?.message ?? "Messaggio non valido.",
    );
  }

  const callerName = parsed.data.callerName?.trim() || null;
  const summary = [
    callerName ? `Richiesta richiamata da ${callerName}` : "Richiesta di richiamata",
    `Telefono: ${parsed.data.callbackPhone}`,
    parsed.data.message,
  ].join(" â€” ");

  const { data, error } = await auth.admin.rpc("add_receptionist_message", {
    p_provider_call_id: auth.claims.providerCallId,
    p_role: "system",
    p_content: summary,
    p_metadata: {
      type: "callback_request",
      callerName,
      callbackPhone: parsed.data.callbackPhone,
      message: parsed.data.message,
    },
  });

  if (error) return rpcError(error);

  const result = data as { messageId?: string; callId?: string } | null;

  if (!result?.messageId) {
    return jsonError(500, "internal_error", "Impossibile registrare il messaggio.");
  }

  return NextResponse.json(
    {
      messageId: result.messageId,
      callId: result.callId ?? auth.claims.callId,
      message: "Messaggio registrato: il ristorante richiamerÃ  il cliente.",
    },
    { status: 201 },
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCall } from "@/server/receptionist/internal";
import { jsonError, rpcError } from "@/server/receptionist/http";


const bodySchema = z.object({
  outcome: z.enum(["completed", "failed", "transferred", "abandoned"]).default("completed"),
  summary: z.string().trim().max(2000).optional().nullable(),
  durationSeconds: z.coerce.number().int().min(0).max(86400).optional().nullable(),
  errorCode: z.string().trim().max(120).optional().nullable(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCall(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  if (id !== auth.claims.callId) {
    return jsonError(403, "forbidden", "La chiamata non corrisponde al token fornito.");
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "invalid_request", "Dati di chiusura chiamata non validi.");
  }

  const { data, error } = await auth.admin.rpc("end_receptionist_call", {
    p_provider_call_id: auth.claims.providerCallId,
    p_status: parsed.data.outcome,
    p_summary: parsed.data.summary ?? null,
    p_duration_seconds: parsed.data.durationSeconds ?? null,
    p_error_code: parsed.data.errorCode ?? null,
  });

  if (error) return rpcError(error);

  const result = data as {
    callId?: string;
    status?: string;
    changed?: boolean;
  } | null;

  return NextResponse.json({
    callId: result?.callId ?? auth.claims.callId,
    status: result?.status ?? parsed.data.outcome,
    changed: result?.changed ?? false,
  });
}

import type { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/server/receptionist/http";
import {
  getBearerToken,
  getInternalVoiceConfig,
  verifyCallToken,
  type CallTokenClaims,
} from "@/server/receptionist/internal-auth";

export type AdminClient = ReturnType<typeof createAdminClient>;

export function getAdminOrResponse():
  | { ok: true; admin: AdminClient }
  | { ok: false; response: NextResponse } {
  try {
    return { ok: true, admin: createAdminClient() };
  } catch {
    return {
      ok: false,
      response: jsonError(
        503,
        "not_configured",
        "API interne non configurate: manca SUPABASE_SERVICE_ROLE_KEY lato server.",
      ),
    };
  }
}

export async function loadActiveCall(admin: AdminClient, claims: CallTokenClaims) {
  const { data, error } = await admin
    .from("receptionist_calls")
    .select("id, status, restaurant_id, organization_id, provider_call_id")
    .eq("id", claims.callId)
    .eq("restaurant_id", claims.restaurantId)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false as const,
      response: jsonError(404, "call_not_found", "Chiamata non trovata."),
    };
  }

  if (data.status !== "in_progress") {
    return {
      ok: false as const,
      response: jsonError(409, "call_closed", "La chiamata non è più attiva."),
    };
  }

  return { ok: true as const };
}

export async function authenticateCall(
  request: Request,
): Promise<
  | { ok: true; admin: AdminClient; claims: CallTokenClaims }
  | { ok: false; response: NextResponse }
> {
  const config = getInternalVoiceConfig();

  if (!config) {
    return {
      ok: false,
      response: jsonError(
        503,
        "not_configured",
        "API vocali non configurate: manca il token interno o il segreto.",
      ),
    };
  }

  const claims = verifyCallToken(getBearerToken(request), config.secret);

  if (!claims) {
    return {
      ok: false,
      response: jsonError(401, "unauthorized", "Token chiamata non valido o scaduto."),
    };
  }

  const adminResult = getAdminOrResponse();
  if (!adminResult.ok) return { ok: false, response: adminResult.response };

  const active = await loadActiveCall(adminResult.admin, claims);
  if (!active.ok) return { ok: false, response: active.response };

  return { ok: true, admin: adminResult.admin, claims };
}

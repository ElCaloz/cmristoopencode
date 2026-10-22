import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  createCallToken,
  getBearerToken,
  getInternalVoiceConfig,
  verifyBootstrapToken,
} from "@/server/receptionist/internal-auth";
import { getAdminOrResponse } from "@/server/receptionist/internal";
import { jsonError, rpcError } from "@/server/receptionist/http";

const RATE_LIMIT_MAX = 120;
const RATE_LIMIT_WINDOW_MS = 60_000;


const bodySchema = z.object({
  providerCallId: z.string().trim().min(1).max(200),
  toPhone: z.string().trim().min(5).max(30),
  fromPhone: z.string().trim().max(30).optional().nullable(),
  roomName: z.string().trim().max(200).optional().nullable(),
});

type TenantPayload = {
  found: boolean;
  reason?: string;
  restaurantId?: string;
  organizationId?: string;
  restaurantName?: string;
  timezone?: string;
  isEnabled?: boolean;
  displayName?: string | null;
  greeting?: string | null;
  language?: string;
  voice?: string;
  model?: string;
  transferPhone?: string | null;
  maxCallSeconds?: number;
  maxDailyCalls?: number;
  maxPartySize?: number;
  minNoticeMinutes?: number;
  maxDaysAhead?: number;
  reservationDurationMinutes?: number;
};

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  const rate = checkRateLimit(
    `voice-calls:${clientIp}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  );

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Troppe richieste: riprova tra qualche secondo.",
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  const config = getInternalVoiceConfig();

  if (!config) {
    return jsonError(
      503,
      "not_configured",
      "API vocali non configurate: imposta RECEPTIONIST_INTERNAL_TOKEN e RECEPTIONIST_INTERNAL_SECRET.",
    );
  }

  if (!verifyBootstrapToken(getBearerToken(request), config.bootstrapToken)) {
    return jsonError(401, "unauthorized", "Token di servizio non valido.");
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      400,
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Richiesta non valida.",
    );
  }

  const adminResult = getAdminOrResponse();
  if (!adminResult.ok) return adminResult.response;
  const { admin } = adminResult;

  const tenantResult = await admin.rpc("resolve_receptionist_tenant", {
    p_to_phone: parsed.data.toPhone,
  });

  if (tenantResult.error) return rpcError(tenantResult.error);

  const tenant = tenantResult.data as TenantPayload | null;

  if (!tenant?.found) {
    return jsonError(404, "tenant_not_found", "Numero chiamato non associato a un ristorante.");
  }

  if (!tenant.isEnabled) {
    return jsonError(409, "receptionist_disabled", "Receptionist non attivo per questo ristorante.");
  }

  const callResult = await admin.rpc("begin_receptionist_call", {
    p_provider_call_id: parsed.data.providerCallId,
    p_to_phone: parsed.data.toPhone,
    p_from_phone: parsed.data.fromPhone ?? null,
    p_room_name: parsed.data.roomName ?? null,
  });

  if (callResult.error) return rpcError(callResult.error);

  const call = callResult.data as {
    callId?: string;
    restaurantId?: string;
    organizationId?: string;
    status?: string;
    created?: boolean;
  } | null;

  if (!call?.callId || !call.restaurantId || !call.organizationId) {
    return jsonError(500, "internal_error", "Impossibile avviare la chiamata.");
  }

  const ttlSeconds = Math.min(
    Math.max((tenant.maxCallSeconds ?? 300) + 120, 180),
    3600,
  );
  const callToken = createCallToken(
    {
      callId: call.callId,
      restaurantId: call.restaurantId,
      organizationId: call.organizationId,
      providerCallId: parsed.data.providerCallId,
    },
    config.secret,
    ttlSeconds,
  );

  return NextResponse.json(
    {
      callId: call.callId,
      callToken,
      expiresAt: new Date((Math.floor(Date.now() / 1000) + ttlSeconds) * 1000).toISOString(),
      status: call.status ?? "in_progress",
      restaurant: {
        id: call.restaurantId,
        name: tenant.restaurantName ?? null,
        timezone: tenant.timezone ?? null,
      },
      receptionist: {
        displayName: tenant.displayName ?? null,
        greeting: tenant.greeting ?? null,
        language: tenant.language ?? "it",
        voice: tenant.voice ?? "marin",
        model: tenant.model ?? "gpt-realtime-2.1",
        transferPhone: tenant.transferPhone ?? null,
        maxCallSeconds: tenant.maxCallSeconds ?? 300,
        maxDailyCalls: tenant.maxDailyCalls ?? 100,
        maxPartySize: tenant.maxPartySize ?? 8,
        minNoticeMinutes: tenant.minNoticeMinutes ?? 60,
        maxDaysAhead: tenant.maxDaysAhead ?? 60,
        reservationDurationMinutes: tenant.reservationDurationMinutes ?? 90,
      },
    },
    { status: call.created === false ? 200 : 201 },
  );
}

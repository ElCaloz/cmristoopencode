import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export type CallTokenClaims = {
  callId: string;
  restaurantId: string;
  organizationId: string;
  providerCallId: string;
  exp: number;
};

export type InternalVoiceConfig = {
  bootstrapToken: string;
  secret: string;
};

const MIN_SECRET_LENGTH = 32;

export function getInternalVoiceConfig(): InternalVoiceConfig | null {
  const bootstrapToken = process.env.RECEPTIONIST_INTERNAL_TOKEN?.trim();
  const secret = process.env.RECEPTIONIST_INTERNAL_SECRET?.trim();

  if (
    !bootstrapToken ||
    !secret ||
    bootstrapToken.length < MIN_SECRET_LENGTH ||
    secret.length < MIN_SECRET_LENGTH
  ) {
    return null;
  }

  return { bootstrapToken, secret };
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token.trim() || null;
}

export function verifyBootstrapToken(token: string | null, expected: string) {
  if (!token) return false;
  return safeEqual(token, expected);
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createCallToken(
  claims: Omit<CallTokenClaims, "exp">,
  secret: string,
  ttlSeconds: number,
) {
  const payload = Buffer.from(
    JSON.stringify({
      ...claims,
      exp: Math.floor(Date.now() / 1000) + Math.max(60, Math.floor(ttlSeconds)),
    }),
  ).toString("base64url");

  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifyCallToken(
  token: string | null,
  secret: string,
): CallTokenClaims | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [payload, signature] = parts;
  const expected = signPayload(payload, secret);

  if (!safeEqual(signature, expected)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<CallTokenClaims>;

    if (
      typeof parsed.callId !== "string" ||
      typeof parsed.restaurantId !== "string" ||
      typeof parsed.organizationId !== "string" ||
      typeof parsed.providerCallId !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      callId: parsed.callId,
      restaurantId: parsed.restaurantId,
      organizationId: parsed.organizationId,
      providerCallId: parsed.providerCallId,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

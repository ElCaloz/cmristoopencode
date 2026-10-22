import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function verifySvixSignature(input: {
  payload: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
}): boolean {
  if (!input.id || !input.timestamp || !input.signature) return false;

  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const rawSecret = input.secret.startsWith("whsec_")
    ? input.secret.slice("whsec_".length)
    : input.secret;

  let secretBuffer: Buffer;
  try {
    secretBuffer = Buffer.from(rawSecret, "base64");
  } catch {
    return false;
  }

  const signedContent = `${input.id}.${input.timestamp}.${input.payload}`;
  const expected = createHmac("sha256", secretBuffer)
    .update(signedContent, "utf8")
    .digest("base64");

  return input.signature
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3))
    .some((signature) => safeEqual(signature, expected));
}

export function verifyTwilioSignature(input: {
  url: string;
  params: Record<string, string>;
  signature: string | null;
  authToken: string;
}): boolean {
  if (!input.signature) return false;

  const data = Object.keys(input.params)
    .sort()
    .map((key) => `${key}${input.params[key]}`)
    .join("");

  const expected = createHmac("sha1", input.authToken)
    .update(`${input.url}${data}`, "utf8")
    .digest("base64");

  return safeEqual(input.signature, expected);
}

import { NextResponse } from "next/server";
import { captureException } from "@/lib/observability/sentry";

const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_EVENTS = 20;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_EVENTS;
}

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Troppe segnalazioni." }, { status: 429 });
  }

  const raw = await request.text();
  if (raw.length > 20_000) {
    return NextResponse.json({ error: "Payload troppo grande." }, { status: 413 });
  }

  let payload: {
    message?: string;
    stack?: string;
    url?: string;
    context?: Record<string, unknown>;
  };

  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Payload non valido." }, { status: 400 });
  }

  const message =
    typeof payload.message === "string" && payload.message.trim().length > 0
      ? payload.message.trim().slice(0, 500)
      : "Errore client senza messaggio";

  const error = new Error(message);
  if (typeof payload.stack === "string") {
    error.stack = payload.stack.slice(0, 8000);
  }

  await captureException(error, {
    source: "client",
    url: typeof payload.url === "string" ? payload.url.slice(0, 500) : undefined,
    ...(payload.context ?? {}),
  });

  return new NextResponse(null, { status: 204 });
}

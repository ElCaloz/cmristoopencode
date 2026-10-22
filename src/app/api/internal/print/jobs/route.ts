import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { captureException } from "@/lib/observability/sentry";

function tokenMatches(expected: string, header: string | null): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length);
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(provided, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function serviceClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request) {
  const serviceToken = process.env.LOCAL_SERVICE_TOKEN?.trim();
  const internalSecret = process.env.INTEGRATION_INTERNAL_SECRET?.trim();

  if (!serviceToken || !internalSecret) {
    return NextResponse.json(
      { error: "Servizio di stampa non configurato." },
      { status: 503 },
    );
  }

  if (!tokenMatches(serviceToken, request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.rpc("claim_print_jobs", {
      p_secret: internalSecret,
      p_limit: 10,
    });

    if (error) throw error;
    return NextResponse.json({ jobs: data ?? [] }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    await captureException(error, { route: "GET /api/internal/print/jobs" });
    return NextResponse.json({ error: "Errore interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const serviceToken = process.env.LOCAL_SERVICE_TOKEN?.trim();
  const internalSecret = process.env.INTEGRATION_INTERNAL_SECRET?.trim();

  if (!serviceToken || !internalSecret) {
    return NextResponse.json(
      { error: "Servizio di stampa non configurato." },
      { status: 503 },
    );
  }

  if (!tokenMatches(serviceToken, request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  let payload: {
    jobId?: string;
    status?: string;
    error?: string | null;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Payload non valido." }, { status: 400 });
  }

  if (!payload.jobId || !payload.status) {
    return NextResponse.json({ error: "Dati mancanti." }, { status: 400 });
  }

  if (!["printed", "failed", "queued"].includes(payload.status)) {
    return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
  }

  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.rpc("complete_print_job", {
      p_secret: internalSecret,
      p_job_id: payload.jobId,
      p_status: payload.status,
      p_error: payload.error ?? null,
    });

    if (error) throw error;
    return NextResponse.json({ updated: data === true });
  } catch (error) {
    await captureException(error, { route: "POST /api/internal/print/jobs" });
    return NextResponse.json({ error: "Errore interno." }, { status: 500 });
  }
}

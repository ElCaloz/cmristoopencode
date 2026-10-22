import { connection, NextResponse } from "next/server";
import { getIntegrationStatuses } from "@/lib/integrations/config";

export async function GET() {
  // Cache Components: forza l'esecuzione a ogni richiesta, come
  // precedentemente ottenuto con `dynamic = "force-dynamic"`.
  await connection();

  const integrations = getIntegrationStatuses().map((integration) => ({
    kind: integration.kind,
    configured: integration.configured,
  }));

  return NextResponse.json(
    {
      status: "ok",
      service: "cm-risto",
      timestamp: new Date().toISOString(),
      checks: {
        supabase: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        ),
        integrations,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}

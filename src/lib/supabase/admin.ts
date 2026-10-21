import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Il client amministrativo Supabase non è disponibile nel browser.");
  }

  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error(
      "Supabase non configurato: imposta SUPABASE_SERVICE_ROLE_KEY solo lato server.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

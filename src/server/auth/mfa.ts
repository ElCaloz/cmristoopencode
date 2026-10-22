import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { MfaFactorRow, MfaOverview } from "@/server/auth/mfa-types";

export const getMfaOverview = cache(async (): Promise<MfaOverview | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [factorsResult, levelResult] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  const factors: MfaFactorRow[] = (factorsResult.data?.all ?? [])
    .filter((factor) => factor.factor_type === "totp")
    .map((factor) => ({
      id: factor.id,
      friendlyName: factor.friendly_name ?? null,
      status: factor.status === "verified" ? "verified" : "unverified",
      createdAt: factor.created_at,
      lastChallengedAt: factor.last_challenged_at ?? null,
    }));

  return {
    factors,
    currentLevel:
      (levelResult.data?.currentLevel as "aal1" | "aal2" | null) ?? null,
    nextLevel:
      (levelResult.data?.nextLevel as "aal1" | "aal2" | null) ?? null,
  };
});

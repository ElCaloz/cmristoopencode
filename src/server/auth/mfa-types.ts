export type MfaActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
  factorId?: string;
  qrCode?: string;
  secret?: string;
};

export const initialMfaActionState: MfaActionState = { status: "idle" };

export type MfaFactorRow = {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
  createdAt: string;
  lastChallengedAt: string | null;
};

export type MfaOverview = {
  factors: MfaFactorRow[];
  currentLevel: "aal1" | "aal2" | null;
  nextLevel: "aal1" | "aal2" | null;
};

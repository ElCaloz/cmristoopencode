export type AuthActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialAuthState: AuthActionState = { status: "idle" };

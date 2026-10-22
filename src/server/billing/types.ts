export type BillingActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
};

export const initialBillingActionState: BillingActionState = { status: "idle" };

export type IntegrationActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialIntegrationActionState: IntegrationActionState = {
  status: "idle",
};

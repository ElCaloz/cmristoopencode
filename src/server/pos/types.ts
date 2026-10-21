export type PosActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialPosActionState: PosActionState = { status: "idle" };

export type PosOrderItemRow = {
  id: string;
  menuItemId: string | null;
  name: string;
  unitPriceCents: number;
  quantity: number;
  note: string;
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  createdAt: string;
};

export type PosPaymentRow = {
  id: string;
  method: "cash" | "card" | "other";
  amountCents: number;
  tipCents: number;
  createdAt: string;
};

export type PosOrderRow = {
  id: string;
  tableId: string | null;
  guests: number | null;
  note: string;
  status: "open" | "paid" | "cancelled";
  openedAt: string;
  items: PosOrderItemRow[];
  payments: PosPaymentRow[];
};

export type PosData = {
  openOrders: PosOrderRow[];
};

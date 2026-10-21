export type KdsActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialKdsActionState: KdsActionState = { status: "idle" };

export type KitchenBoardItemStatus = "pending" | "preparing" | "ready";

export type KitchenBoardItem = {
  id: string;
  orderId: string;
  tableId: string | null;
  guests: number | null;
  openedAt: string;
  name: string;
  quantity: number;
  note: string;
  status: KitchenBoardItemStatus;
  createdAt: string;
};

export type KitchenBoard = {
  items: KitchenBoardItem[];
};

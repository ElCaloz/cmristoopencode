export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Bozza",
  ordered: "Ordinato",
  received: "Ricevuto",
  cancelled: "Annullato",
};

export function isPurchaseOrderStatus(value: string): value is PurchaseOrderStatus {
  return value in PURCHASE_ORDER_STATUS_LABELS;
}

export type PurchaseOrderLineRow = {
  id: string;
  inventoryItemId: string | null;
  itemName: string;
  unit: string;
  quantityMilli: number;
  receivedQuantityMilli: number;
  unitCostCents: number;
  totalCents: number;
  receivedTotalCents: number;
};

export type PurchaseOrderRow = {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  expectedOn: string | null;
  notes: string;
  receiptNote: string;
  orderedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  lines: PurchaseOrderLineRow[];
  totalCents: number;
  receivedTotalCents: number;
  discrepancyMilli: number;
  discrepancyCount: number;
};

export type PurchaseOrderActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialPurchaseOrderActionState: PurchaseOrderActionState = {
  status: "idle",
};

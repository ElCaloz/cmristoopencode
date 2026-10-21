export type InventoryMovementKind = "load" | "unload" | "waste" | "adjustment";

export const INVENTORY_MOVEMENT_LABELS: Record<InventoryMovementKind, string> = {
  load: "Carico",
  unload: "Scarico",
  waste: "Spreco",
  adjustment: "Rettifica",
};

export const WASTE_REASON_LABELS = {
  expiry: "Scadenza",
  error: "Errore",
  damage: "Danno",
  return: "Reso",
  overproduction: "Sovrapproduzione",
  other: "Altro",
} as const;

export type WasteReason = keyof typeof WASTE_REASON_LABELS;

export type InventorySupplierRow = {
  id: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  notes: string;
  isActive: boolean;
};

export type InventoryItemRow = {
  id: string;
  supplierId: string | null;
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantityMilli: number;
  minQuantityMilli: number;
  costPerUnitCents: number;
  lot: string;
  expiresOn: string | null;
  location: string;
  isActive: boolean;
};

export type InventoryMovementRow = {
  id: string;
  itemId: string;
  kind: InventoryMovementKind;
  quantityDeltaMilli: number;
  quantityAfterMilli: number;
  reason: string;
  note: string;
  createdAt: string;
};

export type InventoryData = {
  suppliers: InventorySupplierRow[];
  items: InventoryItemRow[];
  movements: InventoryMovementRow[];
};

export type InventoryActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialInventoryActionState: InventoryActionState = {
  status: "idle",
};

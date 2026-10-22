export type OnlineActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialOnlineActionState: OnlineActionState = { status: "idle" };

export type PublicLinkRow = {
  id: string;
  token: string;
  kind: "menu" | "table";
  label: string;
  tableId: string | null;
  tableName: string | null;
  allowOrdering: boolean;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export type OnlineOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type OnlineOrderItemRow = {
  id: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  note: string;
};

export type OnlineOrderRow = {
  id: string;
  publicLinkId: string | null;
  customerName: string;
  email: string;
  phone: string;
  fulfillment: "pickup" | "delivery" | "dine_in";
  tableId: string | null;
  tableName: string | null;
  status: OnlineOrderStatus;
  paymentStatus: "unpaid" | "paid" | "refunded";
  paymentMethod: "on_site" | "online";
  subtotalCents: number;
  totalCents: number;
  notes: string;
  orderId: string | null;
  items: OnlineOrderItemRow[];
  createdAt: string;
};

export type TableOption = {
  id: string;
  name: string;
  seats: number;
  areaName: string | null;
};

export type OnlineData = {
  links: PublicLinkRow[];
  orders: OnlineOrderRow[];
  tables: TableOption[];
};

export type PublicMenuItem = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  is_available: boolean;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  items: PublicMenuItem[];
};

export type PublicMenuData = {
  restaurant: {
    id: string;
    name: string;
    description: string;
    cuisine: string;
    phone: string | null;
    address: string | null;
    currency: string;
    timezone: string;
    public_note: string;
  };
  link: {
    kind: "menu" | "table";
    label: string;
    table_id: string | null;
    allow_ordering: boolean;
  };
  settings: {
    prices_include_tax: boolean;
    tax_rate_bps: number;
    service_charge_bps: number;
  };
  categories: PublicMenuCategory[];
};

export type PublicOrderState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
  orderNumber?: string;
  totalCents?: number;
  currency?: string;
  orderId?: string;
};

export const initialPublicOrderState: PublicOrderState = { status: "idle" };

export type SalesPaymentMethod = "cash" | "card" | "other";

export type SalesPaymentRow = {
  id: string;
  method: SalesPaymentMethod;
  amountCents: number;
  tipCents: number;
  createdAt: string;
};

export type SalesItemRow = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  status: string;
};

export type SalesOrderRow = {
  id: string;
  tableName: string | null;
  guests: number | null;
  openedAt: string;
  closedAt: string | null;
  paidAt: string;
  itemsCount: number;
  itemsSold: number;
  totalCents: number;
  paidCents: number;
  tipCents: number;
  methods: SalesPaymentMethod[];
  items: SalesItemRow[];
  payments: SalesPaymentRow[];
};

export type SalesTotals = {
  collectedCents: number;
  tipsCents: number;
  ordersCount: number;
  covers: number;
  itemsSold: number;
  averageTicketCents: number;
  byMethod: Record<SalesPaymentMethod, number>;
};

export type SalesDay = {
  day: string;
  orders: SalesOrderRow[];
  totals: SalesTotals;
};

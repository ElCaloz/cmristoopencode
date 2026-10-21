import type {
  DailySales,
  Order,
  OrderItem,
  OrderItemStatus,
  RestaurantStatus,
  TableStatus,
  OrderStatus,
  ReservationStatus,
  DeviceType,
  StaffRole,
  Station,
  PaymentMethod,
} from "./types";

export function itemTotalCents(item: OrderItem): number {
  return item.unitPriceCents * item.qty;
}

export function orderSubtotalCents(order: Order): number {
  return order.items.reduce((sum, item) => sum + itemTotalCents(item), 0);
}

export function orderTotalCents(order: Order): number {
  const subtotal = orderSubtotalCents(order);
  const discount = order.discountPct ?? 0;
  return Math.round(subtotal * (1 - discount / 100));
}

export function orderItemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.qty, 0);
}

export function isOrderActive(order: Order): boolean {
  return ["open", "preparing", "ready", "served"].includes(order.status);
}

export function paidOrders(orders: Order[], restaurantId?: string): Order[] {
  return orders.filter(
    (order) =>
      order.status === "paid" &&
      (restaurantId === undefined || order.restaurantId === restaurantId),
  );
}

export function sumRevenueCents(orders: Order[]): number {
  return orders.reduce(
    (sum, order) => sum + (order.totalPaidCents ?? orderTotalCents(order)),
    0,
  );
}

export function averageTicketCents(orders: Order[]): number {
  if (orders.length === 0) return 0;
  return Math.round(sumRevenueCents(orders) / orders.length);
}

export function topProducts(
  orders: Order[],
  limit = 5,
): Array<{ name: string; qty: number; revenueCents: number }> {
  const map = new Map<string, { name: string; qty: number; revenueCents: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const entry = map.get(item.name) ?? {
        name: item.name,
        qty: 0,
        revenueCents: 0,
      };
      entry.qty += item.qty;
      entry.revenueCents += itemTotalCents(item);
      map.set(item.name, entry);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, limit);
}

export function salesForRange(
  series: DailySales[],
  days: number,
): DailySales[] {
  return series.slice(Math.max(0, series.length - days));
}

export function revenueForRange(series: DailySales[], days: number): number {
  return salesForRange(series, days).reduce(
    (sum, day) => sum + day.revenueCents,
    0,
  );
}

export function paymentMix(
  orders: Order[],
): Array<{ method: PaymentMethod; count: number; revenueCents: number }> {
  const methods: PaymentMethod[] = ["carta", "contanti", "satispay", "buoni"];
  return methods
    .map((method) => {
      const matching = orders.filter((order) => order.paymentMethod === method);
      return {
        method,
        count: matching.length,
        revenueCents: sumRevenueCents(matching),
      };
    })
    .filter((entry) => entry.count > 0);
}

export function activeOrdersForTable(
  orders: Order[],
  tableId: string,
): Order | undefined {
  return orders.find(
    (order) =>
      order.tableId === tableId &&
      ["open", "preparing", "ready", "served"].includes(order.status),
  );
}

export function nextOrderNumber(orders: Order[], restaurantId: string): number {
  const numbers = orders
    .filter((order) => order.restaurantId === restaurantId)
    .map((order) => order.number);
  const max = numbers.length > 0 ? Math.max(...numbers) : 100;
  return max + 1;
}

export function itemsByStatus(
  order: Order,
  status: OrderItemStatus,
): OrderItem[] {
  return order.items.filter((item) => item.status === status);
}

export function nextItemStatus(status: OrderItemStatus): OrderItemStatus {
  switch (status) {
    case "pending":
      return "preparing";
    case "preparing":
      return "ready";
    case "ready":
      return "served";
    default:
      return "served";
  }
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  open: "Aperto",
  preparing: "In preparazione",
  ready: "Pronto",
  served: "Servito",
  paid: "Pagato",
  cancelled: "Annullato",
};

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: "Da preparare",
  preparing: "In preparazione",
  ready: "Pronto",
  served: "Servito",
};

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  free: "Libero",
  occupied: "Occupato",
  reserved: "Prenotato",
  to_clean: "Da riordinare",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "In attesa",
  confirmed: "Confermata",
  seated: "Accolto",
  cancelled: "Annullata",
  no_show: "No-show",
};

export const RESTAURANT_STATUS_LABELS: Record<RestaurantStatus, string> = {
  active: "Attivo",
  trial: "In prova",
  suspended: "Sospeso",
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Amministratore",
  cassiere: "Cassiere",
  cameriere: "Cameriere",
  cucina: "Cucina",
  magazziniere: "Magazziniere",
};

export const STATION_LABELS: Record<Station, string> = {
  cucina: "Cucina",
  pizzeria: "Pizzeria",
  bar: "Bar",
  dolci: "Dolci",
};

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  palmare: "Palmare",
  pos: "Cassa POS",
  kds: "Kitchen Display",
  stampante: "Stampante",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  contanti: "Contanti",
  carta: "Carta",
  satispay: "Satispay",
  buoni: "Buoni pasto",
};

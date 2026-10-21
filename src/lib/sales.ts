import type {
  SalesOrderRow,
  SalesPaymentMethod,
  SalesTotals,
} from "@/server/sales/types";

export const salesMethodLabels: Record<SalesPaymentMethod, string> = {
  cash: "Contanti",
  card: "Carta",
  other: "Altro",
};

export function summarizeSales(orders: SalesOrderRow[]): SalesTotals {
  const byMethod: Record<SalesPaymentMethod, number> = {
    cash: 0,
    card: 0,
    other: 0,
  };
  let collectedCents = 0;
  let tipsCents = 0;
  let covers = 0;
  let itemsSold = 0;

  for (const order of orders) {
    for (const payment of order.payments) {
      collectedCents += payment.amountCents;
      tipsCents += payment.tipCents;
      byMethod[payment.method] += payment.amountCents;
    }
    covers += order.guests ?? 0;
    itemsSold += order.itemsSold;
  }

  const ordersCount = orders.length;

  return {
    collectedCents,
    tipsCents,
    ordersCount,
    covers,
    itemsSold,
    averageTicketCents:
      ordersCount > 0 ? Math.round(collectedCents / ordersCount) : 0,
    byMethod,
  };
}

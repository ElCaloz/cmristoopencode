import { describe, expect, it } from "vitest";
import {
  activeOrdersForTable,
  averageTicketCents,
  itemTotalCents,
  nextItemStatus,
  nextOrderNumber,
  orderItemCount,
  orderSubtotalCents,
  orderTotalCents,
  paymentMix,
  revenueForRange,
  salesForRange,
  sumRevenueCents,
  topProducts,
} from "@/lib/demo/calc";
import type { Order, OrderItem } from "@/lib/demo/types";

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: "it-1",
    productId: "p-1",
    name: "Pappardelle",
    qty: 1,
    unitPriceCents: 1600,
    status: "pending",
    station: "cucina",
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    restaurantId: "r1",
    number: 101,
    type: "tavolo",
    tableId: "t-1",
    tableName: "T1",
    covers: 2,
    waiter: "Luca",
    status: "preparing",
    items: [makeItem()],
    createdAt: "2026-10-17T12:00:00.000Z",
    updatedAt: "2026-10-17T12:00:00.000Z",
    ...overrides,
  };
}

describe("totali ordine", () => {
  it("calcola totale riga, subtotale e totale con sconto", () => {
    const order = makeOrder({
      items: [
        makeItem({ id: "a", qty: 2, unitPriceCents: 1600 }),
        makeItem({ id: "b", name: "Acqua", qty: 1, unitPriceCents: 900 }),
      ],
      discountPct: 10,
    });

    expect(itemTotalCents(order.items[0])).toBe(3200);
    expect(orderSubtotalCents(order)).toBe(4100);
    expect(orderTotalCents(order)).toBe(3690);
    expect(orderItemCount(order)).toBe(3);
  });

  it("arrotonda il totale all'intero più vicino", () => {
    const order = makeOrder({
      items: [makeItem({ qty: 3, unitPriceCents: 333 })],
      discountPct: 10,
    });

    expect(orderTotalCents(order)).toBe(899);
  });

  it("usa totalPaidCents quando presente per i ricavi", () => {
    const paid = makeOrder({
      id: "paid-1",
      status: "paid",
      totalPaidCents: 3000,
    });
    const other = makeOrder({ id: "paid-2", status: "paid" });

    expect(sumRevenueCents([paid, other])).toBe(4600);
    expect(sumRevenueCents([])).toBe(0);
    expect(averageTicketCents([paid, other])).toBe(2300);
    expect(averageTicketCents([])).toBe(0);
  });
});

describe("aggregazioni", () => {
  it("ordina i prodotti per ricavo e applica il limite", () => {
    const orders = [
      makeOrder({
        id: "o1",
        items: [
          makeItem({ name: "Pappardelle", qty: 2, unitPriceCents: 1600 }),
          makeItem({ name: "Acqua", qty: 3, unitPriceCents: 300 }),
        ],
      }),
      makeOrder({
        id: "o2",
        items: [makeItem({ name: "Pappardelle", qty: 1, unitPriceCents: 1600 })],
      }),
    ];

    expect(topProducts(orders)).toEqual([
      { name: "Pappardelle", qty: 3, revenueCents: 4800 },
      { name: "Acqua", qty: 3, revenueCents: 900 },
    ]);
    expect(topProducts(orders, 1)).toHaveLength(1);
  });

  it("calcola il mix pagamenti solo per i metodi usati", () => {
    const orders = [
      makeOrder({ id: "o1", status: "paid", paymentMethod: "carta" }),
      makeOrder({
        id: "o2",
        status: "paid",
        paymentMethod: "carta",
        totalPaidCents: 2000,
      }),
      makeOrder({ id: "o3", status: "paid", paymentMethod: "contanti" }),
    ];

    expect(paymentMix(orders)).toEqual([
      { method: "carta", count: 2, revenueCents: 3600 },
      { method: "contanti", count: 1, revenueCents: 1600 },
    ]);
  });

  it("seleziona l'ultimo intervallo di vendite", () => {
    const series = [
      { date: "2026-10-14", revenueCents: 100, orders: 1, covers: 2 },
      { date: "2026-10-15", revenueCents: 200, orders: 2, covers: 4 },
      { date: "2026-10-16", revenueCents: 300, orders: 3, covers: 6 },
    ];

    expect(salesForRange(series, 2).map((day) => day.date)).toEqual([
      "2026-10-15",
      "2026-10-16",
    ]);
    expect(revenueForRange(series, 2)).toBe(500);
    expect(revenueForRange(series, 10)).toBe(600);
  });
});

describe("stati e numerazione", () => {
  it("trova il conto attivo di un tavolo ignorando i pagati", () => {
    const active = makeOrder({ id: "active", status: "open" });
    const paid = makeOrder({ id: "paid", status: "paid" });

    expect(activeOrdersForTable([paid, active], "t-1")?.id).toBe("active");
    expect(activeOrdersForTable([paid], "t-1")).toBeUndefined();
  });

  it("calcola il prossimo numero per ristorante", () => {
    const orders = [
      makeOrder({ id: "a", number: 126 }),
      makeOrder({ id: "b", number: 131 }),
      makeOrder({ id: "c", restaurantId: "r2", number: 200 }),
    ];

    expect(nextOrderNumber(orders, "r1")).toBe(132);
    expect(nextOrderNumber(orders, "r2")).toBe(201);
    expect(nextOrderNumber([], "r3")).toBe(101);
  });

  it("avanza lo stato delle righe fino a servito", () => {
    expect(nextItemStatus("pending")).toBe("preparing");
    expect(nextItemStatus("preparing")).toBe("ready");
    expect(nextItemStatus("ready")).toBe("served");
    expect(nextItemStatus("served")).toBe("served");
  });
});

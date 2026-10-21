import { describe, expect, it } from "vitest";
import { isOrderActive, paidOrders } from "@/lib/demo/calc";
import { buildSeedState } from "@/lib/demo/seed";

const seed = buildSeedState();

describe("seed demo", () => {
  it("parte dal locale e dal ruolo attesi", () => {
    expect(seed.activeRestaurantId).toBe("r1");
    expect(seed.activeRole).toBe("admin");
    expect(seed.restaurants.map((restaurant) => restaurant.id)).toEqual([
      "r1",
      "r2",
      "r3",
      "r4",
    ]);
  });

  it("mantiene coerenti i riferimenti tra entità", () => {
    const restaurantIds = new Set(seed.restaurants.map((entry) => entry.id));
    const tableIds = new Set(seed.tables.map((entry) => entry.id));

    for (const order of seed.orders) {
      expect(restaurantIds.has(order.restaurantId)).toBe(true);
      if (order.tableId) {
        expect(tableIds.has(order.tableId)).toBe(true);
      }
      expect(order.items.length).toBeGreaterThan(0);
      for (const item of order.items) {
        expect(item.qty).toBeGreaterThan(0);
        expect(item.unitPriceCents).toBeGreaterThanOrEqual(0);
      }
    }

    for (const product of seed.products) {
      expect(restaurantIds.has(product.restaurantId)).toBe(true);
    }
    for (const member of seed.staff) {
      expect(restaurantIds.has(member.restaurantId)).toBe(true);
    }
  });

  it("ha i conti pagati e attivi previsti", () => {
    expect(paidOrders(seed.orders)).toHaveLength(72);
    expect(paidOrders(seed.orders, "r1")).toHaveLength(26);
    expect(paidOrders(seed.orders, "r2")).toHaveLength(24);
    expect(paidOrders(seed.orders, "r3")).toHaveLength(14);
    expect(paidOrders(seed.orders, "r4")).toHaveLength(8);

    const active = seed.orders.filter(isOrderActive);
    expect(active).toHaveLength(11);
    expect(
      active
        .filter((order) => order.restaurantId === "r1")
        .map((order) => order.number)
        .sort((a, b) => a - b),
    ).toEqual([127, 128, 129, 130, 131]);

    for (const order of paidOrders(seed.orders)) {
      expect(order.totalPaidCents).toBeGreaterThan(0);
      expect(order.paymentMethod).toBeDefined();
    }
  });

  it("rispetta il limite di 4 palmari per locale", () => {
    for (const restaurant of seed.restaurants) {
      const handhelds = seed.devices.filter(
        (device) =>
          device.restaurantId === restaurant.id && device.type === "palmare",
      );
      expect(handhelds.length).toBeLessThanOrEqual(4);
    }
  });

  it("è deterministico tra build successivi", () => {
    expect(buildSeedState()).toEqual(seed);
  });
});

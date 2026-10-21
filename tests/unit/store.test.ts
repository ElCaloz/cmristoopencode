import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDemoStorage,
  DEMO_STORAGE_KEY,
  getDemoHydrationError,
  useDemoStore,
} from "@/lib/demo/store";
import type { NewOrderItem } from "@/lib/demo/types";
import { todayISODate } from "@/lib/utils";

const water: NewOrderItem = {
  productId: "r1-p-acqua",
  name: "Acqua naturale 1L",
  qty: 2,
  unitPriceCents: 300,
  station: "bar",
};

function openAsportoOrder() {
  return useDemoStore.getState().createOrder({
    restaurantId: "r1",
    type: "asporto",
    covers: 2,
    waiter: "Test E2E",
    items: [water],
  });
}

beforeEach(() => {
  useDemoStore.getState().resetDemo();
});

describe("store demo", () => {
  it("crea un conto con numero progressivo e attività", () => {
    const order = openAsportoOrder();
    const state = useDemoStore.getState();

    expect(order.number).toBe(132);
    expect(order.status).toBe("preparing");
    expect(state.orders.find((entry) => entry.id === order.id)).toBeDefined();
    expect(state.activity[0].action).toBe("Nuova comanda");
  });

  it("incassa applicando lo sconto e aggiorna le vendite del giorno", () => {
    const before = useDemoStore
      .getState()
      .sales.r1.find((day) => day.date === todayISODate());

    const order = openAsportoOrder();
    useDemoStore.getState().payOrder(order.id, "carta", 10);

    const paid = useDemoStore
      .getState()
      .orders.find((entry) => entry.id === order.id);

    expect(paid?.status).toBe("paid");
    expect(paid?.paymentMethod).toBe("carta");
    expect(paid?.discountPct).toBe(10);
    expect(paid?.totalPaidCents).toBe(540);

    const after = useDemoStore
      .getState()
      .sales.r1.find((day) => day.date === todayISODate());
    expect(after?.revenueCents).toBe((before?.revenueCents ?? 0) + 540);
    expect(after?.orders).toBe((before?.orders ?? 0) + 1);
    expect(after?.covers).toBe((before?.covers ?? 0) + 2);
  });

  it("segna il tavolo da riordinare al pagamento", () => {
    const tables = useDemoStore.getState().tables;
    const freeTable = tables.find(
      (table) => table.restaurantId === "r1" && table.status === "free",
    );
    expect(freeTable).toBeDefined();

    const order = useDemoStore.getState().createOrder({
      restaurantId: "r1",
      tableId: freeTable?.id,
      tableName: freeTable?.name,
      type: "tavolo",
      covers: 2,
      waiter: "Test E2E",
      items: [water],
    });

    expect(
      useDemoStore.getState().tables.find((entry) => entry.id === freeTable?.id)
        ?.status,
    ).toBe("occupied");

    useDemoStore.getState().payOrder(order.id, "contanti");

    expect(
      useDemoStore.getState().tables.find((entry) => entry.id === freeTable?.id)
        ?.status,
    ).toBe("to_clean");
  });

  it("blocca il quinto palmare e lo consente dopo una revoca", () => {
    const blocked = useDemoStore.getState().pairDevice({
      restaurantId: "r1",
      name: "Palmare extra",
      type: "palmare",
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toContain("4");

    for (let index = 0; index < 3; index += 1) {
      const result = useDemoStore.getState().pairDevice({
        restaurantId: "r3",
        name: `Palmare test ${index + 1}`,
        type: "palmare",
      });
      expect(result.ok).toBe(true);
    }

    const fifth = useDemoStore.getState().pairDevice({
      restaurantId: "r3",
      name: "Palmare test 5",
      type: "palmare",
    });
    expect(fifth.ok).toBe(false);

    const r3Handheld = useDemoStore
      .getState()
      .devices.find(
        (device) =>
          device.restaurantId === "r3" && device.type === "palmare",
      );
    expect(r3Handheld).toBeDefined();
    useDemoStore.getState().revokeDevice(r3Handheld?.id ?? "");

    const replacement = useDemoStore.getState().pairDevice({
      restaurantId: "r3",
      name: "Palmare sostitutivo",
      type: "palmare",
    });
    expect(replacement.ok).toBe(true);
  });

  it("ripristina i dati demo", () => {
    expect(useDemoStore.getState().orders).toHaveLength(83);
    openAsportoOrder();
    expect(useDemoStore.getState().orders).toHaveLength(84);

    useDemoStore.getState().resetDemo();
    expect(useDemoStore.getState().orders).toHaveLength(83);
  });

  it("segnala i dati salvati corrotti e recupera con il ripristino", async () => {
    localStorage.setItem(DEMO_STORAGE_KEY, "{dati-corrotti");
    await useDemoStore.persist.rehydrate();
    expect(getDemoHydrationError()).not.toBeNull();

    clearDemoStorage();
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull();

    await useDemoStore.persist.rehydrate();
    expect(getDemoHydrationError()).toBeNull();
    expect(useDemoStore.persist.hasHydrated()).toBe(true);
    expect(useDemoStore.getState().orders).toHaveLength(83);
  });
});

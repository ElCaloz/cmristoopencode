import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { makeId, todayISODate } from "@/lib/utils";
import type { Role } from "@/lib/roles";
import { orderTotalCents, nextOrderNumber } from "./calc";
import { buildSeedState, SEED_VERSION } from "./seed";
import { FLOOR_GRID_X, FLOOR_GRID_Y, FLOOR_OBJECT_KINDS } from "@/lib/floor-plan";
import type {
  Customer,
  DailySales,
  DemoSeedState,
  DeviceType,
  Device,
  FloorLayoutInput,
  FloorObject,
  InventoryItem,
  MenuProduct,
  NewOrderItem,
  Order,
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  Reservation,
  ReservationStatus,
  Restaurant,
  StaffMember,
  TableStatus,
} from "./types";

type NewOrderInput = {
  restaurantId: string;
  tableId?: string;
  tableName?: string;
  type: Order["type"];
  covers: number;
  waiter: string;
  items: NewOrderItem[];
};

type MutableItem = NewOrderItem & {
  id: string;
  status: OrderItemStatus;
};

type DemoActions = {
  setActiveRestaurant: (id: string) => void;
  setActiveRole: (role: Role) => void;
  resetDemo: () => void;
  createOrder: (input: NewOrderInput) => Order;
  addItemsToOrder: (orderId: string, items: NewOrderItem[]) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderItemStatus: (
    orderId: string,
    itemId: string,
    status: OrderItemStatus,
  ) => void;
  payOrder: (
    orderId: string,
    method: PaymentMethod,
    discountPct?: number,
  ) => void;
  cancelOrder: (orderId: string) => void;
  setTableStatus: (tableId: string, status: TableStatus) => void;
  saveFloorLayout: (input: FloorLayoutInput) => {
    ok: boolean;
    error?: string;
  };
  toggleProductAvailability: (productId: string) => void;
  saveProduct: (product: MenuProduct) => void;
  deleteProduct: (productId: string) => void;
  saveReservation: (reservation: Reservation) => void;
  setReservationStatus: (
    reservationId: string,
    status: ReservationStatus,
  ) => void;
  saveCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;
  saveStaffMember: (member: StaffMember) => void;
  setStaffActive: (memberId: string, active: boolean) => void;
  deleteStaffMember: (memberId: string) => void;
  pairDevice: (input: {
    restaurantId: string;
    name: string;
    type: DeviceType;
  }) => { ok: boolean; error?: string };
  revokeDevice: (deviceId: string) => void;
  saveInventoryItem: (item: InventoryItem) => void;
  adjustStock: (itemId: string, deltaQty: number) => void;
  updateRestaurant: (
    restaurantId: string,
    patch: Partial<Restaurant>,
  ) => void;
  suspendRestaurant: (restaurantId: string) => void;
  activateRestaurant: (restaurantId: string) => void;
  markAllNotificationsRead: () => void;
  logActivity: (entry: {
    restaurantId: string | null;
    actor: string;
    action: string;
    detail: string;
  }) => void;
};

export type DemoStore = DemoSeedState & DemoActions;

const MAX_HANDHELDS = 4;

export const DEMO_STORAGE_KEY = "cm-risto-demo-v1";

let demoHydrationError: string | null = null;
const demoHydrationErrorListeners = new Set<() => void>();

function notifyHydrationError(message: string | null) {
  if (demoHydrationError === message) return;
  demoHydrationError = message;
  for (const listener of demoHydrationErrorListeners) {
    listener();
  }
}

export function getDemoHydrationError(): string | null {
  return demoHydrationError;
}

export function subscribeDemoHydrationError(listener: () => void) {
  demoHydrationErrorListeners.add(listener);
  return () => {
    demoHydrationErrorListeners.delete(listener);
  };
}

export function clearDemoStorage() {
  notifyHydrationError(null);
  try {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  } catch {
    // Storage non disponibile: il prossimo rehydrate riparte dai dati seed.
  }
}

function bumpDailySales(
  sales: Record<string, DailySales[]>,
  restaurantId: string,
  revenueCents: number,
  orderCount: number,
  covers: number,
): Record<string, DailySales[]> {
  const series = sales[restaurantId] ?? [];
  const today = todayISODate();
  const last = series[series.length - 1];
  if (last && last.date === today) {
    return {
      ...sales,
      [restaurantId]: [
        ...series.slice(0, -1),
        {
          ...last,
          revenueCents: last.revenueCents + revenueCents,
          orders: last.orders + orderCount,
          covers: last.covers + covers,
        },
      ],
    };
  }
  return {
    ...sales,
    [restaurantId]: [
      ...series,
      {
        date: today,
        revenueCents,
        orders: orderCount,
        covers,
      },
    ],
  };
}

const seed = buildSeedState();

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...seed,

      setActiveRestaurant: (id) => set({ activeRestaurantId: id }),
      setActiveRole: (role) => set({ activeRole: role }),

      resetDemo: () => set(buildSeedState()),

      createOrder: (input) => {
        const existing = input.tableId
          ? get().orders.find(
              (order) =>
                order.tableId === input.tableId &&
                ["open", "preparing", "ready", "served"].includes(order.status),
            )
          : undefined;
        if (existing) {
          get().addItemsToOrder(existing.id, input.items);
          const updated = get().orders.find((order) => order.id === existing.id);
          if (updated) return updated;
        }

        const number = nextOrderNumber(get().orders, input.restaurantId);
        const id = makeId(`${input.restaurantId}-ord`);
        const nowIso = new Date().toISOString();
        const items: MutableItem[] = input.items.map((item, index) => ({
          ...item,
          id: `${id}-it${index + 1}`,
          status: "pending",
        }));
        const order: Order = {
          id,
          restaurantId: input.restaurantId,
          number,
          type: input.type,
          tableId: input.tableId,
          tableName: input.tableName,
          covers: input.covers,
          waiter: input.waiter,
          status: "preparing",
          items,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        set((state) => ({
          orders: [...state.orders, order],
          tables: input.tableId
            ? state.tables.map((entry) =>
                entry.id === input.tableId
                  ? {
                      ...entry,
                      status: "occupied",
                      currentOrderId: order.id,
                    }
                  : entry,
              )
            : state.tables,
          activity: [
            {
              id: makeId("act"),
              restaurantId: input.restaurantId,
              actor: input.waiter,
              action: "Nuova comanda",
              detail: `Ordine #${order.number} inviato in cucina (${items.length} righe)`,
              time: nowIso,
            },
            ...state.activity,
          ].slice(0, 80),
        }));
        return order;
      },

      addItemsToOrder: (orderId, items) => {
        const order = get().orders.find((entry) => entry.id === orderId);
        if (!order || order.status === "paid" || order.status === "cancelled") {
          return;
        }
        set((state) => ({
          orders: state.orders.map((entry) => {
            if (entry.id !== orderId) return entry;
            const offset = entry.items.length;
            const mapped: MutableItem[] = items.map((item, index) => ({
              ...item,
              id: `${orderId}-it${offset + index + 1}`,
              status: "pending",
            }));
            return {
              ...entry,
              items: [...entry.items, ...mapped],
              status: "preparing",
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      updateOrderStatus: (orderId, status) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          orders: state.orders.map((entry) => {
            if (entry.id !== orderId) return entry;
            const items =
              status === "served"
                ? entry.items.map((item) => ({ ...item, status: "served" as const }))
                : entry.items;
            return { ...entry, status, items, updatedAt: nowIso };
          }),
        }));
      },

      updateOrderItemStatus: (orderId, itemId, status) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          orders: state.orders.map((entry) =>
            entry.id === orderId
              ? {
                  ...entry,
                  updatedAt: nowIso,
                  items: entry.items.map((item) =>
                    item.id === itemId ? { ...item, status } : item,
                  ),
                }
              : entry,
          ),
        }));
      },

      payOrder: (orderId, method, discountPct) => {
        const order = get().orders.find((entry) => entry.id === orderId);
        if (!order || order.status === "paid" || order.status === "cancelled") {
          return;
        }
        const nowIso = new Date().toISOString();
        const discount = discountPct ?? order.discountPct ?? 0;
        const totalPaidCents = Math.round(
          order.items.reduce(
            (sum, item) => sum + item.unitPriceCents * item.qty,
            0,
          ) *
            (1 - discount / 100),
        );

        set((state) => {
          const orders = state.orders.map((entry) =>
            entry.id === orderId
              ? {
                  ...entry,
                  status: "paid" as const,
                  paymentMethod: method,
                  discountPct: discount === 0 ? undefined : discount,
                  totalPaidCents,
                  updatedAt: nowIso,
                }
              : entry,
          );
          const tables = order.tableId
            ? state.tables.map((entry) =>
                entry.id === order.tableId
                  ? { ...entry, status: "to_clean" as const, currentOrderId: undefined }
                  : entry,
              )
            : state.tables;
          return {
            orders,
            tables,
            sales: bumpDailySales(
              state.sales,
              order.restaurantId,
              totalPaidCents,
              1,
              order.covers,
            ),
            notifications: [
              {
                id: makeId("notif"),
                restaurantId: order.restaurantId,
                title: "Pagamento registrato",
                message: `Ordine #${order.number} incassato: ${(totalPaidCents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}.`,
                time: nowIso,
                kind: "success" as const,
                read: false,
              },
              ...state.notifications,
            ].slice(0, 40),
            activity: [
              {
                id: makeId("act"),
                restaurantId: order.restaurantId,
                actor: "Cassa demo",
                action: "Pagamento incassato",
                detail: `Ordine #${order.number} · ${method} · ${(totalPaidCents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`,
                time: nowIso,
              },
              ...state.activity,
            ].slice(0, 80),
          };
        });
      },

      cancelOrder: (orderId) => {
        const order = get().orders.find((entry) => entry.id === orderId);
        if (!order || order.status === "paid") return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          orders: state.orders.map((entry) =>
            entry.id === orderId
              ? { ...entry, status: "cancelled", updatedAt: nowIso }
              : entry,
          ),
          tables: state.tables.map((entry) =>
            entry.currentOrderId === orderId
              ? { ...entry, status: "free", currentOrderId: undefined }
              : entry,
          ),
          activity: [
            {
              id: makeId("act"),
              restaurantId: order.restaurantId,
              actor: "Staff demo",
              action: "Ordine annullato",
              detail: `Ordine #${order.number} annullato`,
              time: nowIso,
            },
            ...state.activity,
          ].slice(0, 80),
        }));
      },

      setTableStatus: (tableId, status) => {
        set((state) => ({
          tables: state.tables.map((entry) =>
            entry.id === tableId
              ? {
                  ...entry,
                  status,
                  currentOrderId:
                    status === "free" ? undefined : entry.currentOrderId,
                }
              : entry,
          ),
        }));
      },

      saveFloorLayout: (input) => {
        const state = get();
        const room = input.room.trim();
        if (!room) {
          return { ok: false, error: "Indica la sala da salvare." };
        }
        if (
          !state.restaurants.some(
            (restaurant) => restaurant.id === input.restaurantId,
          )
        ) {
          return { ok: false, error: "Ristorante demo non trovato." };
        }

        const existingTables = state.tables.filter(
          (table) => table.restaurantId === input.restaurantId,
        );
        const existingObjects = (state.floorObjects ?? []).filter(
          (object) => object.restaurantId === input.restaurantId,
        );
        const removeTableIds = new Set(input.removeTableIds);
        const removeObjectIds = new Set(input.removeObjectIds);

        const occupied = existingTables.find(
          (table) =>
            removeTableIds.has(table.id) &&
            (table.currentOrderId ||
              state.orders.some(
                (order) =>
                  order.tableId === table.id &&
                  ["open", "preparing", "ready", "served"].includes(
                    order.status,
                  ),
              )),
        );
        if (occupied) {
          return {
            ok: false,
            error: `Il tavolo ${occupied.name} ha un conto aperto e non può essere eliminato.`,
          };
        }

        const fits = (
          posX: number,
          posY: number,
          width: number,
          height: number,
        ) =>
          [posX, posY, width, height].every(Number.isInteger) &&
          posX >= 0 &&
          posY >= 0 &&
          width > 0 &&
          height > 0 &&
          posX + width <= FLOOR_GRID_X &&
          posY + height <= FLOOR_GRID_Y;

        const keptNames = existingTables
          .filter(
            (table) =>
              !removeTableIds.has(table.id) &&
              !input.tables.some((draft) => draft.id === table.id),
          )
          .map((table) => table.name.toLowerCase());
        const usedNames = new Set(keptNames);

        for (const draft of input.tables) {
          const name = draft.name.trim();
          if (!name) {
            return { ok: false, error: "Ogni tavolo deve avere un nome." };
          }
          if (name.length > 40) {
            return {
              ok: false,
              error: "Il nome del tavolo non può superare 40 caratteri.",
            };
          }
          if (usedNames.has(name.toLowerCase())) {
            return {
              ok: false,
              error: `Esiste già un tavolo chiamato ${name} in questa sala.`,
            };
          }
          usedNames.add(name.toLowerCase());

          if (
            !Number.isInteger(draft.seats) ||
            draft.seats < 1 ||
            draft.seats > 50
          ) {
            return {
              ok: false,
              error: `Posti non validi per il tavolo ${name}.`,
            };
          }
          if (
            !fits(draft.posX, draft.posY, draft.width, draft.height) ||
            draft.width < 2 ||
            draft.height < 2
          ) {
            return {
              ok: false,
              error: `La posizione del tavolo ${name} non è valida.`,
            };
          }
          if (draft.id && !existingTables.some((table) => table.id === draft.id)) {
            return { ok: false, error: "Tavolo demo non trovato." };
          }
        }

        for (const draft of input.objects) {
          if (!FLOOR_OBJECT_KINDS.some((entry) => entry.value === draft.kind)) {
            return { ok: false, error: "Tipo di arredo non valido." };
          }
          if (draft.label.trim().length > 40) {
            return {
              ok: false,
              error: "Il testo dell'arredo non può superare 40 caratteri.",
            };
          }
          if (
            !fits(draft.posX, draft.posY, draft.width, draft.height) ||
            draft.width < 1 ||
            draft.height < 1
          ) {
            return { ok: false, error: "La posizione di un arredo non è valida." };
          }
          if (
            draft.id &&
            !existingObjects.some((object) => object.id === draft.id)
          ) {
            return { ok: false, error: "Arredo demo non trovato." };
          }
        }

        const renamed = new Map<string, { from: string; to: string }>();
        const nextTables = state.tables
          .filter((table) => !removeTableIds.has(table.id))
          .map((table) => {
            const draft = input.tables.find(
              (entry) =>
                entry.id === table.id &&
                table.restaurantId === input.restaurantId,
            );
            if (!draft) return table;
            const name = draft.name.trim();
            if (name !== table.name) {
              renamed.set(table.id, { from: table.name, to: name });
            }
            return {
              ...table,
              name,
              seats: draft.seats,
              shape: draft.shape,
              room,
              posX: draft.posX,
              posY: draft.posY,
              width: draft.width,
              height: draft.height,
            };
          });
        const createdTables = input.tables
          .filter((draft) => draft.id === null)
          .map((draft) => ({
            id: makeId(`${input.restaurantId}-tbl`),
            restaurantId: input.restaurantId,
            name: draft.name.trim(),
            room,
            seats: draft.seats,
            status: "free" as const,
            shape: draft.shape,
            posX: draft.posX,
            posY: draft.posY,
            width: draft.width,
            height: draft.height,
          }));

        const nextObjects = (state.floorObjects ?? [])
          .filter((object) => !removeObjectIds.has(object.id))
          .map((object) => {
            const draft = input.objects.find(
              (entry) =>
                entry.id === object.id &&
                object.restaurantId === input.restaurantId,
            );
            if (!draft) return object;
            return {
              ...object,
              kind: draft.kind,
              label: draft.label.trim(),
              room,
              posX: draft.posX,
              posY: draft.posY,
              width: draft.width,
              height: draft.height,
            };
          });
        const createdObjects = input.objects
          .filter((draft) => draft.id === null)
          .map<FloorObject>((draft) => ({
            id: makeId(`${input.restaurantId}-obj`),
            restaurantId: input.restaurantId,
            room,
            kind: draft.kind,
            label: draft.label.trim(),
            posX: draft.posX,
            posY: draft.posY,
            width: draft.width,
            height: draft.height,
          }));

        const nowIso = new Date().toISOString();
        set((current) => ({
          tables: [...nextTables, ...createdTables],
          floorObjects: [...nextObjects, ...createdObjects],
          orders: current.orders.map((order) => {
            const change = order.tableId
              ? renamed.get(order.tableId)
              : undefined;
            return change ? { ...order, tableName: change.to } : order;
          }),
          reservations: current.reservations.map((reservation) => {
            const change = Array.from(renamed.values()).find(
              (entry) => entry.from === reservation.tableName,
            );
            return reservation.restaurantId === input.restaurantId && change
              ? { ...reservation, tableName: change.to }
              : reservation;
          }),
          activity: [
            {
              id: makeId("act"),
              restaurantId: input.restaurantId,
              actor: "Admin demo",
              action: "Piantina aggiornata",
              detail: `${room}: ${input.tables.length} tavoli e ${input.objects.length} arredi salvati`,
              time: nowIso,
            },
            ...current.activity,
          ].slice(0, 80),
        }));

        return { ok: true };
      },

      toggleProductAvailability: (productId) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? { ...product, available: !product.available }
              : product,
          ),
        }));
      },

      saveProduct: (product) => {
        set((state) => {
          const exists = state.products.some((entry) => entry.id === product.id);
          return {
            products: exists
              ? state.products.map((entry) =>
                  entry.id === product.id ? product : entry,
                )
              : [...state.products, product],
            activity: [
              {
                id: makeId("act"),
                restaurantId: product.restaurantId,
                actor: "Admin demo",
                action: exists ? "Prodotto aggiornato" : "Nuovo prodotto",
                detail: `«${product.name}» ${
                  exists ? "modificato" : "aggiunto al menu"
                }`,
                time: new Date().toISOString(),
              },
              ...state.activity,
            ].slice(0, 80),
          };
        });
      },

      deleteProduct: (productId) => {
        const product = get().products.find((entry) => entry.id === productId);
        set((state) => ({
          products: state.products.filter((entry) => entry.id !== productId),
          activity: product
            ? [
                {
                  id: makeId("act"),
                  restaurantId: product.restaurantId,
                  actor: "Admin demo",
                  action: "Prodotto eliminato",
                  detail: `«${product.name}» rimosso dal menu`,
                  time: new Date().toISOString(),
                },
                ...state.activity,
              ].slice(0, 80)
            : state.activity,
        }));
      },

      saveReservation: (reservation) => {
        set((state) => {
          const exists = state.reservations.some(
            (entry) => entry.id === reservation.id,
          );
          return {
            reservations: exists
              ? state.reservations.map((entry) =>
                  entry.id === reservation.id ? reservation : entry,
                )
              : [reservation, ...state.reservations],
          };
        });
      },

      setReservationStatus: (reservationId, status) => {
        set((state) => ({
          reservations: state.reservations.map((entry) =>
            entry.id === reservationId ? { ...entry, status } : entry,
          ),
        }));
      },

      saveCustomer: (customer) => {
        set((state) => {
          const exists = state.customers.some(
            (entry) => entry.id === customer.id,
          );
          return {
            customers: exists
              ? state.customers.map((entry) =>
                  entry.id === customer.id ? customer : entry,
                )
              : [customer, ...state.customers],
          };
        });
      },

      deleteCustomer: (customerId) => {
        set((state) => ({
          customers: state.customers.filter(
            (entry) => entry.id !== customerId,
          ),
        }));
      },

      saveStaffMember: (member) => {
        set((state) => {
          const exists = state.staff.some((entry) => entry.id === member.id);
          return {
            staff: exists
              ? state.staff.map((entry) =>
                  entry.id === member.id ? member : entry,
                )
              : [...state.staff, member],
          };
        });
      },

      setStaffActive: (memberId, active) => {
        set((state) => ({
          staff: state.staff.map((entry) =>
            entry.id === memberId ? { ...entry, active } : entry,
          ),
        }));
      },

      deleteStaffMember: (memberId) => {
        set((state) => ({
          staff: state.staff.filter((entry) => entry.id !== memberId),
        }));
      },

      pairDevice: (input) => {
        const handhelds = get().devices.filter(
          (device) =>
            device.restaurantId === input.restaurantId &&
            device.type === "palmare",
        );
        if (input.type === "palmare" && handhelds.length >= MAX_HANDHELDS) {
          return {
            ok: false,
            error: `Limite raggiunto: massimo ${MAX_HANDHELDS} palmari per locale. Revoca un dispositivo prima di associarne uno nuovo.`,
          };
        }
        const nowIso = new Date().toISOString();
        const device: Device = {
          id: makeId("dev"),
          restaurantId: input.restaurantId,
          name: input.name,
          type: input.type,
          status: "online",
          lastSeen: nowIso,
          pairedAt: nowIso,
        };
        set((state) => ({
          devices: [...state.devices, device],
          activity: [
            {
              id: makeId("act"),
              restaurantId: input.restaurantId,
              actor: "Admin demo",
              action: "Dispositivo associato",
              detail: `${device.name} (${device.type})`,
              time: nowIso,
            },
            ...state.activity,
          ].slice(0, 80),
        }));
        return { ok: true };
      },

      revokeDevice: (deviceId) => {
        const device = get().devices.find((entry) => entry.id === deviceId);
        set((state) => ({
          devices: state.devices.filter((entry) => entry.id !== deviceId),
          activity: device
            ? [
                {
                  id: makeId("act"),
                  restaurantId: device.restaurantId,
                  actor: "Admin demo",
                  action: "Dispositivo revocato",
                  detail: device.name,
                  time: new Date().toISOString(),
                },
                ...state.activity,
              ].slice(0, 80)
            : state.activity,
        }));
      },

      saveInventoryItem: (item) => {
        set((state) => {
          const exists = state.inventory.some((entry) => entry.id === item.id);
          return {
            inventory: exists
              ? state.inventory.map((entry) =>
                  entry.id === item.id ? item : entry,
                )
              : [...state.inventory, item],
          };
        });
      },

      adjustStock: (itemId, deltaQty) => {
        set((state) => ({
          inventory: state.inventory.map((entry) =>
            entry.id === itemId
              ? { ...entry, qty: Math.max(0, entry.qty + deltaQty) }
              : entry,
          ),
        }));
      },

      updateRestaurant: (restaurantId, patch) => {
        set((state) => ({
          restaurants: state.restaurants.map((entry) =>
            entry.id === restaurantId ? { ...entry, ...patch } : entry,
          ),
          activity: [
            {
              id: makeId("act"),
              restaurantId,
              actor: "Admin demo",
              action: "Impostazioni aggiornate",
              detail: "Dati del locale modificati",
              time: new Date().toISOString(),
            },
            ...state.activity,
          ].slice(0, 80),
        }));
      },

      suspendRestaurant: (restaurantId) => {
        const restaurant = get().restaurants.find(
          (entry) => entry.id === restaurantId,
        );
        if (!restaurant) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          restaurants: state.restaurants.map((entry) =>
            entry.id === restaurantId
              ? { ...entry, status: "suspended" }
              : entry,
          ),
          activity: [
            {
              id: makeId("act"),
              restaurantId,
              actor: "Super Admin",
              action: "Ristorante sospeso",
              detail: `${restaurant.name} sospeso dalla console piattaforma`,
              time: nowIso,
            },
            ...state.activity,
          ].slice(0, 80),
        }));
      },

      activateRestaurant: (restaurantId) => {
        const restaurant = get().restaurants.find(
          (entry) => entry.id === restaurantId,
        );
        if (!restaurant) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          restaurants: state.restaurants.map((entry) =>
            entry.id === restaurantId
              ? { ...entry, status: "active", trialEndsAt: undefined }
              : entry,
          ),
          activity: [
            {
              id: makeId("act"),
              restaurantId,
              actor: "Super Admin",
              action: "Ristorante riattivato",
              detail: `${restaurant.name} riattivato dalla console piattaforma`,
              time: nowIso,
            },
            ...state.activity,
          ].slice(0, 80),
        }));
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((entry) => ({
            ...entry,
            read: true,
          })),
        }));
      },

      logActivity: (entry) => {
        set((state) => ({
          activity: [
            {
              ...entry,
              id: makeId("act"),
              time: new Date().toISOString(),
            },
            ...state.activity,
          ].slice(0, 80),
        }));
      },
    }),
    {
      name: DEMO_STORAGE_KEY,
      version: SEED_VERSION,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      migrate: (persisted, version) => {
        if (version !== SEED_VERSION) return buildSeedState();
        const state = persisted as DemoStore;
        // La console di piattaforma non è mai disponibile nella demo: lo stato
        // salvato in precedenza con il ruolo Super Admin viene riportato ad admin.
        return state.activeRole === "super_admin"
          ? { ...state, activeRole: "admin" }
          : state;
      },
      onRehydrateStorage: () => (_state, error) => {
        notifyHydrationError(
          error
            ? "I dati demo salvati in questo browser non sono leggibili."
            : null,
        );
      },
    },
  ),
);

export function useActiveRestaurant() {
  return useDemoStore((state) =>
    state.restaurants.find(
      (restaurant) => restaurant.id === state.activeRestaurantId,
    ),
  );
}

export function useRestaurantOrders(restaurantId: string) {
  return useDemoStore((state) =>
    state.orders.filter((order) => order.restaurantId === restaurantId),
  );
}

export function useRestaurantProducts(restaurantId: string) {
  return useDemoStore((state) =>
    state.products.filter((product) => product.restaurantId === restaurantId),
  );
}

export function useRestaurantTables(restaurantId: string) {
  return useDemoStore((state) =>
    state.tables.filter((table) => table.restaurantId === restaurantId),
  );
}

export function restaurantOrderTotal(order: Order): number {
  return order.totalPaidCents ?? orderTotalCents(order);
}

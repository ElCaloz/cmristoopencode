import type { FloorObjectKind, FloorTableShape } from "@/lib/floor-plan";
import type { PlanId } from "@/lib/plans";
import type { Role } from "@/lib/roles";

export type RestaurantStatus = "active" | "trial" | "suspended";

export type Restaurant = {
  id: string;
  name: string;
  kind: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  vatNumber: string;
  planId: PlanId;
  status: RestaurantStatus;
  trialEndsAt?: string;
  createdAt: string;
  seats: number;
  ownerName: string;
  ownerEmail: string;
};

export type MenuCategory = {
  id: string;
  name: string;
};

export type Station = "cucina" | "pizzeria" | "bar" | "dolci";

export type ProductVariant = {
  name: string;
  priceDeltaCents: number;
};

export type MenuProduct = {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  foodCostCents: number;
  station: Station;
  allergens: string[];
  available: boolean;
  variants?: ProductVariant[];
};

export type TableStatus = "free" | "occupied" | "reserved" | "to_clean";

export type RestaurantTable = {
  id: string;
  restaurantId: string;
  name: string;
  room: string;
  seats: number;
  status: TableStatus;
  shape: FloorTableShape;
  posX: number;
  posY: number;
  width: number;
  height: number;
  currentOrderId?: string;
};

export type FloorObject = {
  id: string;
  restaurantId: string;
  room: string;
  kind: FloorObjectKind;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export type FloorLayoutTableInput = {
  id: string | null;
  name: string;
  seats: number;
  shape: FloorTableShape;
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export type FloorLayoutObjectInput = {
  id: string | null;
  kind: FloorObjectKind;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export type FloorLayoutInput = {
  restaurantId: string;
  room: string;
  tables: FloorLayoutTableInput[];
  objects: FloorLayoutObjectInput[];
  removeTableIds: string[];
  removeObjectIds: string[];
};

export type OrderStatus =
  | "open"
  | "preparing"
  | "ready"
  | "served"
  | "paid"
  | "cancelled";

export type OrderItemStatus = "pending" | "preparing" | "ready" | "served";

export type OrderCourse =
  | "antipasti"
  | "primi"
  | "secondi"
  | "pizze"
  | "dolci"
  | "bevande";

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  variant?: string;
  notes?: string;
  status: OrderItemStatus;
  station: Station;
  course?: OrderCourse;
};

export type OrderType = "tavolo" | "asporto" | "delivery";

export type PaymentMethod = "contanti" | "carta" | "satispay" | "buoni";

export type Order = {
  id: string;
  restaurantId: string;
  number: number;
  type: OrderType;
  tableId?: string;
  tableName?: string;
  covers: number;
  waiter: string;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  paymentMethod?: PaymentMethod;
  discountPct?: number;
  totalPaidCents?: number;
};

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "cancelled"
  | "no_show";

export type Reservation = {
  id: string;
  restaurantId: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  covers: number;
  tableName?: string;
  status: ReservationStatus;
  notes?: string;
};

export type Customer = {
  id: string;
  restaurantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  visits: number;
  totalSpentCents: number;
  lastVisit: string;
  tags: string[];
  allergies?: string;
};

export type StaffRole =
  | "admin"
  | "cassiere"
  | "cameriere"
  | "cucina"
  | "magazziniere";

export type StaffMember = {
  id: string;
  restaurantId: string;
  name: string;
  role: StaffRole;
  email: string;
  phone: string;
  active: boolean;
  hiredAt: string;
  hourlyRateCents: number;
};

export type DeviceType = "palmare" | "pos" | "kds" | "stampante";

export type Device = {
  id: string;
  restaurantId: string;
  name: string;
  type: DeviceType;
  status: "online" | "offline";
  lastSeen: string;
  pairedAt: string;
};

export type Supplier = {
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  email: string;
  phone: string;
};

export type InventoryItem = {
  id: string;
  restaurantId: string;
  name: string;
  unit: string;
  qty: number;
  minQty: number;
  costPerUnitCents: number;
  supplierId: string;
  category: string;
};

export type DailySales = {
  date: string;
  revenueCents: number;
  orders: number;
  covers: number;
};

export type NotificationKind = "info" | "success" | "warning" | "error";

export type AppNotification = {
  id: string;
  restaurantId: string | null;
  title: string;
  message: string;
  time: string;
  kind: NotificationKind;
  read: boolean;
};

export type ActivityEntry = {
  id: string;
  restaurantId: string | null;
  actor: string;
  action: string;
  detail: string;
  time: string;
};

export type NewOrderItem = {
  productId: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  variant?: string;
  notes?: string;
  station: Station;
  course?: OrderCourse;
};

export type DemoSeedState = {
  activeRestaurantId: string;
  activeRole: Role;
  restaurants: Restaurant[];
  categories: Record<string, MenuCategory[]>;
  products: MenuProduct[];
  tables: RestaurantTable[];
  floorObjects: FloorObject[];
  orders: Order[];
  reservations: Reservation[];
  customers: Customer[];
  staff: StaffMember[];
  devices: Device[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  sales: Record<string, DailySales[]>;
  notifications: AppNotification[];
  activity: ActivityEntry[];
};

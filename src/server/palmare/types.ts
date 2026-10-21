export const OPERATOR_COOKIE_NAME = "cm_risto_operator";

export type PalmareDevice = {
  id: string;
  name: string;
  type: string;
  restaurantId: string;
  restaurantName: string;
};

export type PalmareOperatorOption = {
  membershipId: string;
  fullName: string;
  roleKey: string;
  roleName: string;
  lockedUntil: string | null;
};

export type PalmareSessionContext = {
  membershipId: string;
  operatorFullName: string;
  roleKey: string;
  deviceId: string;
  deviceName: string;
  deviceStatus: string;
  restaurantId: string;
  restaurantName: string;
  issuedAt: string;
  expiresAt: string;
};

export type PalmareOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  status: "pending" | "preparing" | "ready" | "served" | string;
  note: string;
};

export type PalmareOrder = {
  id: string;
  guests: number | null;
  openedAt: string;
  totalCents: number;
  activeCount: number;
  readyCount: number;
  items: PalmareOrderItem[];
};

export type PalmareTable = {
  id: string;
  name: string;
  seats: number;
  order: PalmareOrder | null;
};

export type PalmareArea = {
  id: string;
  name: string;
  tables: PalmareTable[];
};

export type PalmareBoard = PalmareSessionContext & {
  areas: PalmareArea[];
  looseTables: PalmareTable[];
};

export type PalmareMenuItem = {
  id: string;
  name: string;
  priceCents: number;
};

export type PalmareMenuCategory = {
  id: string | null;
  name: string;
  items: PalmareMenuItem[];
};

export type PalmareOrderActionState = {
  status?: "idle" | "success" | "error";
  message?: string;
};

export const initialPalmareOrderActionState: PalmareOrderActionState = {
  status: "idle",
};

export type PalmareLoginState = {
  status?: "idle" | "error" | "success";
  message?: string;
};

export const initialPalmareLoginState: PalmareLoginState = { status: "idle" };

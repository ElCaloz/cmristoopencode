export const DEVICE_COOKIE_NAME = "cm_risto_device";

export type DeviceStatus =
  | "pending"
  | "authorized"
  | "active"
  | "offline"
  | "revoked"
  | "blocked";

export type DeviceType = "palmare" | "pos" | "kds" | "printer" | "other";

export type DeviceRow = {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  platform: string;
  lastSeenAt: string | null;
  pairingExpiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type DevicesOverview = {
  devices: DeviceRow[];
  palmariInUse: number;
  palmariLimit: number;
};

export type DevicePairing = {
  deviceId: string;
  deviceName: string;
  code: string;
  expiresAt: string;
};

export type DevicesActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
  pairing?: DevicePairing;
};

export const initialDevicesActionState: DevicesActionState = { status: "idle" };

export type DeviceClaimState = {
  status?: "idle" | "error" | "success";
  message?: string;
  deviceName?: string;
};

export const initialDeviceClaimState: DeviceClaimState = { status: "idle" };

export type OperatorPinRow = {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string | null;
  roleKey: string;
  roleName: string;
  status: string;
  hasPin: boolean;
  lockedUntil: string | null;
  pinUpdatedAt: string | null;
};

export type OperatorPinsActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
  membershipId?: string;
};

export const initialOperatorPinsActionState: OperatorPinsActionState = {
  status: "idle",
};

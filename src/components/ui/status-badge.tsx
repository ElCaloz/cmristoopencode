import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import {
  DEVICE_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  RESERVATION_STATUS_LABELS,
  RESTAURANT_STATUS_LABELS,
  STAFF_ROLE_LABELS,
  TABLE_STATUS_LABELS,
} from "@/lib/demo/labels";
import type {
  DeviceType,
  OrderStatus,
  PaymentMethod,
  ReservationStatus,
  RestaurantStatus,
  StaffRole,
  TableStatus,
} from "@/lib/demo/types";

type Tone = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const ORDER_TONES: Record<OrderStatus, Tone> = {
  open: "info",
  preparing: "warning",
  ready: "success",
  served: "secondary",
  paid: "default",
  cancelled: "danger",
};

const TABLE_TONES: Record<TableStatus, Tone> = {
  free: "success",
  occupied: "warning",
  reserved: "info",
  to_clean: "danger",
};

const RESERVATION_TONES: Record<ReservationStatus, Tone> = {
  pending: "warning",
  confirmed: "info",
  seated: "success",
  cancelled: "danger",
  no_show: "muted",
};

const RESTAURANT_TONES: Record<RestaurantStatus, Tone> = {
  active: "success",
  trial: "warning",
  suspended: "danger",
};

const STAFF_ROLE_TONES: Record<StaffRole, Tone> = {
  admin: "default",
  cassiere: "info",
  cameriere: "secondary",
  cucina: "warning",
  magazziniere: "outline",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={ORDER_TONES[status]} dot>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function TableStatusBadge({ status }: { status: TableStatus }) {
  return (
    <Badge variant={TABLE_TONES[status]} dot>
      {TABLE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ReservationStatusBadge({
  status,
}: {
  status: ReservationStatus;
}) {
  return (
    <Badge variant={RESERVATION_TONES[status]} dot>
      {RESERVATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function RestaurantStatusBadge({
  status,
}: {
  status: RestaurantStatus;
}) {
  return (
    <Badge variant={RESTAURANT_TONES[status]} dot>
      {RESTAURANT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function DeviceStatusBadge({
  status,
}: {
  status: "online" | "offline";
}) {
  return (
    <Badge variant={status === "online" ? "success" : "danger"} dot>
      {status === "online" ? "Online" : "Offline"}
    </Badge>
  );
}

export function DeviceTypeBadge({ type }: { type: DeviceType }) {
  return <Badge variant="secondary">{DEVICE_TYPE_LABELS[type]}</Badge>;
}

export function StaffRoleBadge({ role }: { role: StaffRole }) {
  return <Badge variant={STAFF_ROLE_TONES[role]}>{STAFF_ROLE_LABELS[role]}</Badge>;
}

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge variant="outline">{PAYMENT_METHOD_LABELS[method]}</Badge>;
}

export function StockBadge({ low }: { low: boolean }) {
  return (
    <Badge variant={low ? "danger" : "success"} dot>
      {low ? "Sotto scorta" : "Disponibile"}
    </Badge>
  );
}

export type JobType = "print_ticket" | "sync_event";

export type JobStatus = "pending" | "processing" | "done" | "failed";

export type TicketItem = {
  name: string;
  quantity: number;
  notes?: string;
};

/** Payload storico dei ticket cucina (mantenuto per compatibilità). */
export type PrintTicketPayload = {
  restaurantName: string;
  orderNumber: string;
  tableName?: string;
  createdAt: string;
  items: TicketItem[];
  notes?: string;
};

export type PrintTarget = {
  connection?: "network" | "file";
  host?: string | null;
  port?: number | null;
  paperWidth?: 58 | 80;
};

export type ReceiptItemPayload = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  note?: string;
};

/** Scontrino fiscale/commerciale in formato 58/80 mm. */
export type ReceiptPayload = {
  kind: "receipt";
  restaurantName: string;
  address?: string;
  phone?: string;
  orderNumber: string;
  tableName?: string | null;
  createdAt: string;
  items: ReceiptItemPayload[];
  subtotalCents: number;
  taxCents: number;
  serviceChargeCents: number;
  totalCents: number;
  tipCents: number;
  paymentMethod: string;
  footer: string;
  paperWidth: 58 | 80;
  printer?: PrintTarget;
};

/** Comanda cucina in formato 58/80 mm. */
export type KitchenPayload = {
  kind: "kitchen";
  restaurantName: string;
  orderNumber: string;
  tableName?: string | null;
  createdAt: string;
  items: Array<{ name: string; quantity: number; note?: string }>;
  notes?: string;
  paperWidth: 58 | 80;
  printer?: PrintTarget;
};

export type PrintPayload = PrintTicketPayload | ReceiptPayload | KitchenPayload;

export type SyncEventPayload = {
  event: string;
  entityId: string;
  occurredAt: string;
  data: Record<string, unknown>;
};

export type Job = {
  id: string;
  idempotencyKey: string;
  type: JobType;
  payload: unknown;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type EnqueueInput = {
  idempotencyKey: string;
  type: JobType;
  payload: unknown;
  maxAttempts?: number;
};

export type EnqueueResult = {
  job: Job;
  created: boolean;
};

export type QueueStats = {
  pending: number;
  processing: number;
  done: number;
  failed: number;
};

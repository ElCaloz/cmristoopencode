export type JobType = "print_ticket" | "sync_event";

export type JobStatus = "pending" | "processing" | "done" | "failed";

export type TicketItem = {
  name: string;
  quantity: number;
  notes?: string;
};

export type PrintTicketPayload = {
  restaurantName: string;
  orderNumber: string;
  tableName?: string;
  createdAt: string;
  items: TicketItem[];
  notes?: string;
};

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

export type QueueStats = Record<JobStatus, number>;

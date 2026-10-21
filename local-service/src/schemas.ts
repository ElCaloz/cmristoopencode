import { z } from "zod";

const ticketItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().trim().max(240).optional(),
});

export const printTicketSchema = z.object({
  restaurantName: z.string().trim().min(1).max(120),
  orderNumber: z.string().trim().min(1).max(40),
  tableName: z.string().trim().max(60).optional(),
  createdAt: z.string().min(1),
  items: z.array(ticketItemSchema).min(1).max(100),
  notes: z.string().trim().max(500).optional(),
});

export const syncEventSchema = z.object({
  event: z.string().trim().min(1).max(80),
  entityId: z.string().trim().min(1).max(120),
  occurredAt: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

const baseJobSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  maxAttempts: z.number().int().min(1).max(20).optional(),
});

export const enqueueSchema = z.discriminatedUnion("type", [
  baseJobSchema.extend({
    type: z.literal("print_ticket"),
    payload: printTicketSchema,
  }),
  baseJobSchema.extend({
    type: z.literal("sync_event"),
    payload: syncEventSchema,
  }),
]);

export const workerRunSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

export type EnqueueRequest = z.infer<typeof enqueueSchema>;
export type PrintTicket = z.infer<typeof printTicketSchema>;

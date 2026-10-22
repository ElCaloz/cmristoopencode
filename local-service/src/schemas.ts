import { z } from "zod";

const ticketItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().trim().max(240).optional(),
});

/** Formato storico dei ticket cucina. */
export const printTicketSchema = z.object({
  restaurantName: z.string().trim().min(1).max(120),
  orderNumber: z.string().trim().min(1).max(40),
  tableName: z.string().trim().max(60).optional(),
  createdAt: z.string().min(1),
  items: z.array(ticketItemSchema).min(1).max(100),
  notes: z.string().trim().max(500).optional(),
});

const printTargetSchema = z
  .object({
    connection: z.enum(["network", "file"]).optional(),
    host: z.string().trim().max(120).nullable().optional(),
    port: z.number().int().min(1).max(65535).nullable().optional(),
    paperWidth: z.union([z.literal(58), z.literal(80)]).optional(),
  })
  .optional();

const paperWidthSchema = z.union([z.literal(58), z.literal(80)]);

export const receiptPayloadSchema = z.object({
  kind: z.literal("receipt"),
  restaurantName: z.string().trim().min(1).max(120),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  orderNumber: z.string().trim().min(1).max(40),
  tableName: z.string().trim().max(60).nullable().optional(),
  createdAt: z.string().min(1),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(1).max(99),
        unitPriceCents: z.number().int().min(0).max(100_000_000),
        lineTotalCents: z.number().int().min(0).max(10_000_000_000),
        note: z.string().trim().max(200).optional(),
      }),
    )
    .min(1)
    .max(100),
  subtotalCents: z.number().int().min(0).max(10_000_000_000),
  taxCents: z.number().int().min(0).max(10_000_000_000),
  serviceChargeCents: z.number().int().min(0).max(10_000_000_000),
  totalCents: z.number().int().min(0).max(10_000_000_000),
  tipCents: z.number().int().min(0).max(10_000_000_000),
  paymentMethod: z.string().trim().min(1).max(60),
  footer: z.string().trim().max(300),
  paperWidth: paperWidthSchema,
  printer: printTargetSchema,
});

export const kitchenPayloadSchema = z.object({
  kind: z.literal("kitchen"),
  restaurantName: z.string().trim().min(1).max(120),
  orderNumber: z.string().trim().min(1).max(40),
  tableName: z.string().trim().max(60).nullable().optional(),
  createdAt: z.string().min(1),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(1).max(99),
        note: z.string().trim().max(240).optional(),
      }),
    )
    .min(1)
    .max(100),
  notes: z.string().trim().max(500).optional(),
  paperWidth: paperWidthSchema,
  printer: printTargetSchema,
});

export const printPayloadSchema = z.union([
  receiptPayloadSchema,
  kitchenPayloadSchema,
  printTicketSchema,
]);

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
    payload: printPayloadSchema,
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
export type PrintPayloadParsed = z.infer<typeof printPayloadSchema>;

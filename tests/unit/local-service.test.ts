import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { formatTicket } from "../../local-service/src/escpos.js";
import { FilePrinter } from "../../local-service/src/printer.js";
import { JobQueue } from "../../local-service/src/queue.js";
import { createServiceServer } from "../../local-service/src/server.js";
import { FileSyncTransport } from "../../local-service/src/sync.js";
import { JobWorker } from "../../local-service/src/worker.js";

const cleanup: string[] = [];
const logger = { info: () => undefined, error: () => undefined };

function tempDir(): string {
  const path = mkdtempSync(join(tmpdir(), "cm-risto-local-service-"));
  cleanup.push(path);
  return path;
}

afterEach(() => {
  while (cleanup.length > 0) {
    const path = cleanup.pop();
    if (path) rmSync(path, { recursive: true, force: true });
  }
});

describe("local-service queue", () => {
  it("deduplica i job per idempotency key", () => {
    const queue = new JobQueue(join(tempDir(), "queue.db"));
    const input = {
      idempotencyKey: "order-42-print",
      type: "print_ticket" as const,
      payload: { orderNumber: "42" },
    };

    const first = queue.enqueue(input);
    const second = queue.enqueue(input);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.job.id).toBe(first.job.id);
    expect(queue.stats().pending).toBe(1);
    queue.close();
  });

  it("recupera i job rimasti in processing dopo un riavvio", () => {
    const queue = new JobQueue(join(tempDir(), "queue.db"));
    queue.enqueue({
      idempotencyKey: "recover-1",
      type: "sync_event",
      payload: { event: "test" },
    });
    const claimed = queue.claimNext();
    expect(claimed?.status).toBe("processing");

    expect(queue.recoverProcessing()).toBe(1);
    const recovered = queue.claimNext();
    expect(recovered?.id).toBe(claimed?.id);
    expect(recovered?.attempts).toBe(2);
    queue.close();
  });
});

describe("ESC/POS", () => {
  it("genera una comanda con inizializzazione, righe e taglio", () => {
    const ticket = formatTicket({
      restaurantName: "Osteria del Borgo",
      orderNumber: "A-42",
      tableName: "Tavolo 7",
      createdAt: "2026-10-21T12:00:00.000Z",
      items: [
        { name: "Tagliere toscano", quantity: 2 },
        { name: "Peposo", quantity: 1, notes: "Senza pepe" },
      ],
      notes: "Servizio veloce",
    });
    const text = ticket.toString("latin1");

    expect(text.startsWith("\x1b@")).toBe(true);
    expect(text).toContain("COMANDA");
    expect(text).toContain("2 x Tagliere toscano");
    expect(text).toContain("Senza pepe");
    expect(text.endsWith("\x1dV0")).toBe(true);
  });
});

describe("local-service API", () => {
  it("protegge le API e processa un job di stampa in modalità file", async () => {
    const root = tempDir();
    const queue = new JobQueue(join(root, "queue.db"));
    const worker = new JobWorker(
      queue,
      new FilePrinter(join(root, "spool")),
      new FileSyncTransport(join(root, "spool")),
      logger,
    );
    const server = createServiceServer({ queue, worker, token: "test-token-with-at-least-32-characters" });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;

    const health = await fetch(`${base}/health`);
    expect(health.status).toBe(200);

    const unauthorized = await fetch(`${base}/jobs/stats`);
    expect(unauthorized.status).toBe(401);

    const headers = {
      authorization: "Bearer test-token-with-at-least-32-characters",
      "content-type": "application/json",
    };
    const body = JSON.stringify({
      idempotencyKey: "print-order-42",
      type: "print_ticket",
      payload: {
        restaurantName: "Osteria del Borgo",
        orderNumber: "42",
        createdAt: "2026-10-21T12:00:00.000Z",
        items: [{ name: "Pizzetta", quantity: 1 }],
      },
    });
    const created = await fetch(`${base}/jobs`, { method: "POST", headers, body });
    expect(created.status).toBe(201);
    const duplicate = await fetch(`${base}/jobs`, { method: "POST", headers, body });
    expect(duplicate.status).toBe(200);

    const run = await fetch(`${base}/worker/run`, {
      method: "POST",
      headers,
      body: JSON.stringify({ limit: 5 }),
    });
    const result = (await run.json()) as { result: { processed: number; failed: number } };
    expect(result.result.processed).toBe(1);
    expect(result.result.failed).toBe(0);

    const stats = await fetch(`${base}/jobs/stats`, { headers });
    const payload = (await stats.json()) as { stats: { done: number } };
    expect(payload.stats.done).toBe(1);

    await new Promise<void>((resolve) => server.close(() => resolve()));
    queue.close();
  });
});

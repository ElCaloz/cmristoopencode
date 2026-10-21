import type { PrinterAdapter } from "./printer.js";
import type { JobQueue } from "./queue.js";
import { printTicketSchema } from "./schemas.js";
import type { SyncTransport } from "./sync.js";
import type { Job } from "./types.js";

type Logger = {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export type RunResult = {
  processed: number;
  failed: number;
};

export class JobWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly queue: JobQueue,
    private readonly printer: PrinterAdapter,
    private readonly sync: SyncTransport,
    private readonly logger: Logger,
  ) {}

  async runOnce(limit = 10): Promise<RunResult> {
    const result: RunResult = { processed: 0, failed: 0 };
    for (let index = 0; index < limit; index += 1) {
      const job = this.queue.claimNext();
      if (!job) break;

      try {
        const target = await this.process(job);
        this.queue.complete(job.id);
        result.processed += 1;
        this.logger.info("job_completed", {
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
          target,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "job_failed";
        const updated = this.queue.fail(job.id, message);
        result.failed += 1;
        this.logger.error("job_failed", {
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
          status: updated.status,
          error: message,
        });
      }
    }
    return result;
  }

  start(intervalMs: number): void {
    if (this.timer) return;
    const tick = () => {
      if (this.running) return;
      this.running = true;
      this.runOnce()
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "worker_failed";
          this.logger.error("worker_failed", { error: message });
        })
        .finally(() => {
          this.running = false;
        });
    };
    this.timer = setInterval(tick, intervalMs);
    this.timer.unref();
    tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async process(job: Job): Promise<string> {
    if (job.type === "print_ticket") {
      const ticket = printTicketSchema.parse(job.payload);
      return this.printer.print(ticket, job);
    }
    return this.sync.send(job);
  }
}

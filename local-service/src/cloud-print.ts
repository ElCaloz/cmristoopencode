import type { ServiceConfig } from "./config.js";
import type { PrinterAdapter } from "./printer.js";
import { printPayloadSchema } from "./schemas.js";

type Logger = {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

type CloudPrinter = {
  connection?: "network" | "file";
  host?: string | null;
  port?: number | null;
  paper_width?: 58 | 80;
};

type CloudJob = {
  id: string;
  job_type: "receipt" | "kitchen";
  payload: Record<string, unknown>;
  attempts: number;
  printer?: CloudPrinter | null;
};

export class CloudPrintPoller {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly config: ServiceConfig["printPoll"],
    private readonly printer: PrinterAdapter,
    private readonly logger: Logger,
  ) {}

  async runOnce(): Promise<{ processed: number; failed: number }> {
    if (!this.config.url || !this.config.token) {
      return { processed: 0, failed: 0 };
    }

    const response = await fetch(this.config.url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${this.config.token}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`print_poll_http_${response.status}`);
    }

    const body = (await response.json()) as { jobs?: CloudJob[] };
    const jobs = Array.isArray(body.jobs) ? body.jobs : [];
    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        const printer = job.printer ?? undefined;
        const payload = printPayloadSchema.parse({
          ...job.payload,
          paperWidth:
            printer?.paper_width ??
            (job.payload.paperWidth as 58 | 80 | undefined) ??
            80,
          ...(printer
            ? {
                printer: {
                  connection: printer.connection,
                  host: printer.host,
                  port: printer.port,
                  paperWidth: printer.paper_width,
                },
              }
            : {}),
        });

        const target = await this.printer.print(payload, `cloud-${job.id}`);
        await this.report(job.id, "printed", null);
        processed += 1;
        this.logger.info("cloud_print_completed", {
          jobId: job.id,
          target,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "cloud_print_failed";
        const retry = job.attempts < 3;
        await this.report(job.id, retry ? "queued" : "failed", message);
        failed += 1;
        this.logger.error("cloud_print_failed", {
          jobId: job.id,
          attempts: job.attempts,
          retry,
          error: message,
        });
      }
    }

    return { processed, failed };
  }

  private async report(
    jobId: string,
    status: "printed" | "failed" | "queued",
    error: string | null,
  ): Promise<void> {
    if (!this.config.url || !this.config.token) return;

    const response = await fetch(this.config.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ jobId, status, error }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`print_report_http_${response.status}`);
    }
  }

  start(): void {
    if (this.timer || !this.config.url) return;

    const tick = () => {
      if (this.running) return;
      this.running = true;
      this.runOnce()
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "print_poll_failed";
          this.logger.error("print_poll_failed", { error: message });
        })
        .finally(() => {
          this.running = false;
        });
    };

    this.timer = setInterval(tick, this.config.intervalMs);
    this.timer.unref();
    tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

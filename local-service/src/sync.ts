import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ServiceConfig } from "./config.js";
import type { Job } from "./types.js";

export interface SyncTransport {
  send(job: Job): Promise<string>;
}

export class HttpSyncTransport implements SyncTransport {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly timeoutMs = 10000,
  ) {}

  async send(job: Job): Promise<string> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.token}`,
        "idempotency-key": job.idempotencyKey,
      },
      body: JSON.stringify({
        id: job.id,
        type: job.type,
        payload: job.payload,
        createdAt: job.createdAt,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`sync_http_${response.status}`);
    }
    return this.url;
  }
}

export class FileSyncTransport implements SyncTransport {
  constructor(private readonly spoolDir: string) {}

  async send(job: Job): Promise<string> {
    await mkdir(this.spoolDir, { recursive: true });
    const path = join(this.spoolDir, `sync-${job.id}.json`);
    await writeFile(
      path,
      JSON.stringify(
        {
          id: job.id,
          idempotencyKey: job.idempotencyKey,
          type: job.type,
          payload: job.payload,
          createdAt: job.createdAt,
        },
        null,
        2,
      ),
    );
    return path;
  }
}

export class UnconfiguredSyncTransport implements SyncTransport {
  send(): Promise<string> {
    return Promise.reject(new Error("sync_transport_not_configured"));
  }
}

export function createSyncTransport(config: ServiceConfig): SyncTransport {
  if (config.sync.testMode) return new FileSyncTransport(config.spoolDir);
  if (config.sync.url && config.sync.token) {
    return new HttpSyncTransport(config.sync.url, config.sync.token);
  }
  return new UnconfiguredSyncTransport();
}

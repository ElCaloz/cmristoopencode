import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  EnqueueInput,
  EnqueueResult,
  Job,
  JobStatus,
  JobType,
  QueueStats,
} from "./types.js";

type JobRow = {
  id: string;
  idempotency_key: string;
  type: JobType;
  payload: string;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  available_at: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('print_ticket', 'sync_event')),
    payload TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    available_at TEXT NOT NULL,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS jobs_pending_idx ON jobs (status, available_at);
`;

function mapRow(row: JobRow): Job {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    type: row.type,
    payload: JSON.parse(row.payload) as unknown,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export class JobQueue {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
    this.db.exec(SCHEMA);
  }

  enqueue(input: EnqueueInput, now = new Date()): EnqueueResult {
    const timestamp = now.toISOString();
    const id = randomUUID();
    const maxAttempts = input.maxAttempts ?? 5;
    const result = this.db
      .prepare(
        `INSERT INTO jobs (
          id, idempotency_key, type, payload, status, attempts, max_attempts,
          available_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?)
        ON CONFLICT (idempotency_key) DO NOTHING`,
      )
      .run(
        id,
        input.idempotencyKey,
        input.type,
        JSON.stringify(input.payload),
        maxAttempts,
        timestamp,
        timestamp,
        timestamp,
      );

    const created = Number(result.changes) > 0;
    const job = created
      ? this.requireById(id)
      : this.requireByIdempotencyKey(input.idempotencyKey);
    return { job, created };
  }

  claimNext(now = new Date()): Job | null {
    const timestamp = now.toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db
        .prepare(
          `SELECT * FROM jobs
           WHERE status = 'pending' AND available_at <= ?
           ORDER BY created_at ASC
           LIMIT 1`,
        )
        .get(timestamp) as JobRow | undefined;

      if (!row) {
        this.db.exec("COMMIT");
        return null;
      }

      this.db
        .prepare(
          `UPDATE jobs
           SET status = 'processing', attempts = attempts + 1, updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, row.id);
      this.db.exec("COMMIT");

      return this.requireById(row.id);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  complete(id: string, now = new Date()): void {
    const timestamp = now.toISOString();
    this.db
      .prepare(
        `UPDATE jobs
         SET status = 'done', last_error = NULL, completed_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(timestamp, timestamp, id);
  }

  fail(id: string, error: string, now = new Date()): Job {
    const job = this.requireById(id);
    const timestamp = now.toISOString();
    const finalAttempt = job.attempts >= job.maxAttempts;
    const retryDelay = Math.min(60_000, 1_000 * 2 ** Math.max(0, job.attempts - 1));
    const availableAt = new Date(now.getTime() + retryDelay).toISOString();

    this.db
      .prepare(
        `UPDATE jobs
         SET status = ?, available_at = ?, last_error = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        finalAttempt ? "failed" : "pending",
        finalAttempt ? job.availableAt : availableAt,
        error.slice(0, 500),
        timestamp,
        id,
      );

    return this.requireById(id);
  }

  recoverProcessing(now = new Date()): number {
    const result = this.db
      .prepare(
        `UPDATE jobs
         SET status = 'pending', available_at = ?, updated_at = ?
         WHERE status = 'processing'`,
      )
      .run(now.toISOString(), now.toISOString());
    return Number(result.changes);
  }

  stats(): QueueStats {
    const stats: QueueStats = { pending: 0, processing: 0, done: 0, failed: 0 };
    const rows = this.db
      .prepare("SELECT status, COUNT(*) AS total FROM jobs GROUP BY status")
      .all() as Array<{ status: JobStatus; total: number }>;
    for (const row of rows) stats[row.status] = Number(row.total);
    return stats;
  }

  close(): void {
    this.db.close();
  }

  private requireById(id: string): Job {
    const row = this.db
      .prepare("SELECT * FROM jobs WHERE id = ?")
      .get(id) as JobRow | undefined;
    if (!row) throw new Error("job_not_found");
    return mapRow(row);
  }

  private requireByIdempotencyKey(key: string): Job {
    const row = this.db
      .prepare("SELECT * FROM jobs WHERE idempotency_key = ?")
      .get(key) as JobRow | undefined;
    if (!row) throw new Error("job_not_found");
    return mapRow(row);
  }
}

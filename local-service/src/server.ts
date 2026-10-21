import { timingSafeEqual } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { ZodError } from "zod";
import type { JobQueue } from "./queue.js";
import { enqueueSchema, workerRunSchema } from "./schemas.js";
import type { JobWorker } from "./worker.js";

const MAX_BODY_BYTES = 64 * 1024;

function tokenMatches(expected: string, header: string | undefined): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length);
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(payload);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("body_too_large");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

export function createServiceServer(options: {
  queue: JobQueue;
  worker: JobWorker;
  token: string;
}): Server {
  const { queue, worker, token } = options;

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://local-service");

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (!tokenMatches(token, request.headers.authorization)) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      if (request.method === "GET" && url.pathname === "/jobs/stats") {
        sendJson(response, 200, { stats: queue.stats() });
        return;
      }

      if (request.method === "POST" && url.pathname === "/jobs") {
        const body = enqueueSchema.parse(await readJson(request));
        const result = queue.enqueue(body);
        sendJson(response, result.created ? 201 : 200, {
          created: result.created,
          job: result.job,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/worker/run") {
        const body = workerRunSchema.parse(await readJson(request));
        const result = await worker.runOnce(body.limit);
        sendJson(response, 200, { result, stats: queue.stats() });
        return;
      }

      sendJson(response, 404, { error: "not_found" });
    } catch (error) {
      if (error instanceof SyntaxError) {
        sendJson(response, 400, { error: "invalid_json" });
        return;
      }
      if (error instanceof Error && error.message === "body_too_large") {
        sendJson(response, 413, { error: "body_too_large" });
        return;
      }
      if (error instanceof ZodError) {
        sendJson(response, 422, { error: "invalid_payload" });
        return;
      }
      sendJson(response, 500, { error: "internal_error" });
    }
  });
}

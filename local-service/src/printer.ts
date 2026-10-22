import { mkdir, writeFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { join } from "node:path";
import type { ServiceConfig } from "./config.js";
import { formatPrintPayload } from "./escpos.js";
import type { PrintPayload } from "./types.js";

export interface PrinterAdapter {
  print(payload: PrintPayload, jobId: string): Promise<string>;
}

type Target = {
  connection: "network" | "file";
  host: string;
  port: number;
};

function resolveTarget(payload: PrintPayload, config: ServiceConfig): Target {
  const printTarget =
    "printer" in payload && payload.printer ? payload.printer : undefined;

  return {
    connection: printTarget?.connection ?? config.printer.mode,
    host: printTarget?.host?.trim() || config.printer.host,
    port: printTarget?.port ?? config.printer.port,
  };
}

function writeSpool(
  spoolDir: string,
  jobId: string,
  data: Buffer,
): Promise<string> {
  return mkdir(spoolDir, { recursive: true }).then(async () => {
    const path = join(spoolDir, `${jobId}.escpos`);
    await writeFile(path, data);
    return path;
  });
}

function sendNetwork(
  host: string,
  port: number,
  data: Buffer,
  timeoutMs = 5000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(`${host}:${port}`);
    };

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => finish(new Error("printer_timeout")));
    socket.once("error", (error) => finish(error));
    socket.once("connect", () => {
      socket.write(data, (error) => {
        if (error) finish(error);
        else finish();
      });
    });
  });
}

export class FilePrinter implements PrinterAdapter {
  constructor(private readonly spoolDir: string) {}

  async print(payload: PrintPayload, jobId: string): Promise<string> {
    return writeSpool(this.spoolDir, jobId, formatPrintPayload(payload));
  }
}

export class PrinterRouter implements PrinterAdapter {
  constructor(private readonly config: ServiceConfig) {}

  async print(payload: PrintPayload, jobId: string): Promise<string> {
    const data = formatPrintPayload(payload);
    const target = resolveTarget(payload, this.config);

    if (target.connection === "file") {
      return writeSpool(this.config.spoolDir, jobId, data);
    }

    return sendNetwork(target.host, target.port, data);
  }
}

export function createPrinter(config: ServiceConfig): PrinterAdapter {
  return new PrinterRouter(config);
}

import { mkdir, writeFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { join } from "node:path";
import type { ServiceConfig } from "./config.js";
import { formatTicket } from "./escpos.js";
import type { Job, PrintTicketPayload } from "./types.js";

export interface PrinterAdapter {
  print(ticket: PrintTicketPayload, job: Job): Promise<string>;
}

export class FilePrinter implements PrinterAdapter {
  constructor(private readonly spoolDir: string) {}

  async print(ticket: PrintTicketPayload, job: Job): Promise<string> {
    await mkdir(this.spoolDir, { recursive: true });
    const path = join(this.spoolDir, `${job.id}.escpos`);
    await writeFile(path, formatTicket(ticket));
    return path;
  }
}

export class NetworkPrinter implements PrinterAdapter {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly timeoutMs = 5000,
  ) {}

  print(ticket: PrintTicketPayload): Promise<string> {
    const data = formatTicket(ticket);
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host: this.host, port: this.port });
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (error) reject(error);
        else resolve(`${this.host}:${this.port}`);
      };

      socket.setTimeout(this.timeoutMs);
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
}

export function createPrinter(config: ServiceConfig): PrinterAdapter {
  if (config.printer.mode === "network") {
    return new NetworkPrinter(config.printer.host, config.printer.port);
  }
  return new FilePrinter(config.spoolDir);
}

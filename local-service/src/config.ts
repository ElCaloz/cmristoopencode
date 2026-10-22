import { resolve } from "node:path";

export type PrinterMode = "file" | "network";

export type ServiceConfig = {
  host: string;
  port: number;
  token: string;
  databasePath: string;
  spoolDir: string;
  printer: {
    mode: PrinterMode;
    host: string;
    port: number;
  };
  sync: {
    url: string | null;
    token: string | null;
    testMode: boolean;
  };
  printPoll: {
    url: string | null;
    token: string | null;
    intervalMs: number;
  };
  worker: {
    disabled: boolean;
    intervalMs: number;
    batchSize: number;
  };
};

function required(value: string | undefined, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} è obbligatorio`);
  }
  return value.trim();
}

function integer(value: string | undefined, fallback: number, name: string): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} deve essere un intero positivo`);
  }
  return parsed;
}

function boolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServiceConfig {
  const token = required(env.LOCAL_SERVICE_TOKEN, "LOCAL_SERVICE_TOKEN");
  if (token.length < 32) {
    throw new Error("LOCAL_SERVICE_TOKEN deve avere almeno 32 caratteri");
  }

  const printerMode = (env.PRINTER_MODE ?? "file") as PrinterMode;
  if (printerMode !== "file" && printerMode !== "network") {
    throw new Error("PRINTER_MODE deve essere file o network");
  }

  const printerHost = printerMode === "network"
    ? required(env.PRINTER_HOST, "PRINTER_HOST")
    : (env.PRINTER_HOST ?? "127.0.0.1");
  const printerPort = printerMode === "network"
    ? integer(env.PRINTER_PORT, 9100, "PRINTER_PORT")
    : integer(env.PRINTER_PORT, 9100, "PRINTER_PORT");

  const syncUrl = env.CLOUD_SYNC_URL?.trim() || null;
  const syncToken = env.CLOUD_SYNC_TOKEN?.trim() || null;
  const testMode = boolean(env.LOCAL_SERVICE_TEST_MODE, false);
  if (syncUrl && !syncToken) {
    throw new Error("CLOUD_SYNC_TOKEN è obbligatorio quando CLOUD_SYNC_URL è impostato");
  }

  const printPollUrl = env.PRINT_POLL_URL?.trim() || null;
  const printPollToken = env.PRINT_POLL_TOKEN?.trim() || token;

  const root = resolve(env.LOCAL_SERVICE_DATA_DIR ?? ".local-service");

  return {
    host: env.LOCAL_SERVICE_HOST ?? "127.0.0.1",
    port: integer(env.LOCAL_SERVICE_PORT, 4100, "LOCAL_SERVICE_PORT"),
    token,
    databasePath: resolve(root, "queue.db"),
    spoolDir: resolve(root, "spool"),
    printer: { mode: printerMode, host: printerHost, port: printerPort },
    sync: { url: syncUrl, token: syncToken, testMode },
    printPoll: {
      url: printPollUrl,
      token: printPollToken,
      intervalMs: integer(
        env.PRINT_POLL_INTERVAL_MS,
        3000,
        "PRINT_POLL_INTERVAL_MS",
      ),
    },
    worker: {
      disabled: boolean(env.LOCAL_SERVICE_WORKER_DISABLED, false),
      intervalMs: integer(env.LOCAL_SERVICE_POLL_MS, 2000, "LOCAL_SERVICE_POLL_MS"),
      batchSize: integer(env.LOCAL_SERVICE_BATCH_SIZE, 10, "LOCAL_SERVICE_BATCH_SIZE"),
    },
  };
}

import { CloudPrintPoller } from "./cloud-print.js";
import { loadConfig } from "./config.js";
import { createPrinter } from "./printer.js";
import { JobQueue } from "./queue.js";
import { createServiceServer } from "./server.js";
import { createSyncTransport } from "./sync.js";
import { JobWorker } from "./worker.js";

const config = loadConfig();
const logger = {
  info(message: string, meta: Record<string, unknown> = {}) {
    console.log(JSON.stringify({ level: "info", message, time: new Date().toISOString(), ...meta }));
  },
  error(message: string, meta: Record<string, unknown> = {}) {
    console.error(JSON.stringify({ level: "error", message, time: new Date().toISOString(), ...meta }));
  },
};

const queue = new JobQueue(config.databasePath);
const recovered = queue.recoverProcessing();
if (recovered > 0) logger.info("jobs_recovered", { count: recovered });

const printer = createPrinter(config);
const sync = createSyncTransport(config);
const worker = new JobWorker(queue, printer, sync, logger);
const cloudPrint = new CloudPrintPoller(config.printPoll, printer, logger);
const server = createServiceServer({ queue, worker, token: config.token });

server.listen(config.port, config.host, () => {
  logger.info("local_service_started", {
    host: config.host,
    port: config.port,
    printerMode: config.printer.mode,
    syncMode: config.sync.testMode ? "file" : config.sync.url ? "http" : "unconfigured",
    printPoll: config.printPoll.url ? "enabled" : "disabled",
  });
  if (!config.worker.disabled) worker.start(config.worker.intervalMs);
  cloudPrint.start();
});

let closing = false;
function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  logger.info("local_service_stopping", { signal });
  worker.stop();
  cloudPrint.stop();
  server.close(() => {
    queue.close();
    process.exit(0);
  });
  setTimeout(() => {
    queue.close();
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

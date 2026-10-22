export type PrinterActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialPrinterActionState: PrinterActionState = { status: "idle" };

export type PrinterRow = {
  id: string;
  name: string;
  station: "receipt" | "kitchen" | "bar";
  connection: "network" | "file";
  host: string | null;
  port: number | null;
  paperWidth: 58 | 80;
  isActive: boolean;
};

export type PrintJobRow = {
  id: string;
  printerName: string | null;
  jobType: "receipt" | "kitchen";
  status: "queued" | "printing" | "printed" | "failed";
  attempts: number;
  error: string | null;
  createdAt: string;
};

export type PrinterData = {
  printers: PrinterRow[];
  jobs: PrintJobRow[];
};

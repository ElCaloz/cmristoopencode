import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasRestaurantPermission } from "@/server/auth/authorize";
import type {
  PrintJobRow,
  PrinterData,
  PrinterRow,
} from "@/server/printers/types";

export const canManagePrinters = cache(async (restaurantId: string) =>
  hasRestaurantPermission(restaurantId, "settings.manage"),
);

type PrinterDbRow = {
  id: string;
  name: string;
  station: PrinterRow["station"];
  connection: PrinterRow["connection"];
  host: string | null;
  port: number | null;
  paper_width: 58 | 80;
  is_active: boolean;
};

export async function getPrinterData(restaurantId: string): Promise<PrinterData> {
  const supabase = await createClient();

  const [printersResult, jobsResult] = await Promise.all([
    supabase
      .from("printer_profiles")
      .select("id, name, station, connection, host, port, paper_width, is_active")
      .eq("restaurant_id", restaurantId)
      .order("station", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("print_jobs")
      .select(
        "id, job_type, status, attempts, error, created_at, printer_profiles(name)",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const printers = ((printersResult.data ?? []) as PrinterDbRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    station: row.station,
    connection: row.connection,
    host: row.host,
    port: row.port,
    paperWidth: row.paper_width,
    isActive: row.is_active,
  }));

  const jobs = ((jobsResult.data ?? []) as unknown as Array<{
    id: string;
    job_type: PrintJobRow["jobType"];
    status: PrintJobRow["status"];
    attempts: number;
    error: string | null;
    created_at: string;
    printer_profiles: { name: string } | Array<{ name: string }> | null;
  }>).map((row) => {
    const printer = Array.isArray(row.printer_profiles)
      ? row.printer_profiles[0]
      : row.printer_profiles;
    return {
      id: row.id,
      printerName: printer?.name ?? null,
      jobType: row.job_type,
      status: row.status,
      attempts: row.attempts,
      error: row.error,
      createdAt: row.created_at,
    };
  });

  return { printers, jobs };
}

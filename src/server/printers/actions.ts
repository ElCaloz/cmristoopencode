"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsFromZod,
  formCheckbox,
  formString,
} from "@/lib/forms";
import { authorizeRestaurant } from "@/server/auth/authorize";
import type { PrinterActionState } from "@/server/printers/types";

const printerSchema = z
  .object({
    printerId: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Inserisci un nome.").max(80),
    station: z.enum(["receipt", "kitchen", "bar"]),
    connection: z.enum(["network", "file"]),
    host: z.string().trim().max(120, "Host troppo lungo."),
    port: z.string().trim(),
    paperWidth: z.enum(["58", "80"]),
    isActive: z.boolean(),
  })
  .refine(
    (data) => data.connection !== "network" || data.host.length > 0,
    { message: "Inserisci l'indirizzo IP della stampante.", path: ["host"] },
  )
  .refine(
    (data) =>
      data.port === "" ||
      (/^\d{1,5}$/.test(data.port) &&
        Number(data.port) >= 1 &&
        Number(data.port) <= 65535),
    { message: "Porta non valida.", path: ["port"] },
  );

export async function savePrinterAction(
  _prevState: PrinterActionState,
  formData: FormData,
): Promise<PrinterActionState> {
  const rawId = formString(formData, "printerId");
  const parsed = printerSchema.safeParse({
    printerId: rawId === "" ? undefined : rawId,
    name: formString(formData, "name"),
    station: formString(formData, "station") || "receipt",
    connection: formString(formData, "connection") || "network",
    host: formString(formData, "host"),
    port: formString(formData, "port"),
    paperWidth: formString(formData, "paperWidth") || "80",
    isActive: formCheckbox(formData, "isActive"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "settings.manage",
    "/dashboard/integrazioni",
    "Il tuo ruolo non consente di configurare le stampanti.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  const supabase = await createClient();
  const payload = {
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    name: parsed.data.name,
    station: parsed.data.station,
    connection: parsed.data.connection,
    host: parsed.data.connection === "network" ? parsed.data.host : null,
    port:
      parsed.data.connection === "network"
        ? Number(parsed.data.port || "9100")
        : null,
    paper_width: Number(parsed.data.paperWidth),
    is_active: parsed.data.isActive,
  };

  const query = parsed.data.printerId
    ? supabase
        .from("printer_profiles")
        .update(payload)
        .eq("id", parsed.data.printerId)
        .eq("restaurant_id", restaurant.id)
        .select("id")
        .single()
    : supabase.from("printer_profiles").insert(payload).select("id").single();

  const { data, error } = await query;

  if (error || !data) {
    return { status: "error", message: "Salvataggio della stampante non riuscito." };
  }

  await supabase.from("audit_logs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    actor_user_id: session.user.id,
    action: parsed.data.printerId
      ? "printer.updated"
      : "printer.created",
    entity_type: "printer_profile",
    entity_id: data.id,
    metadata: {
      station: parsed.data.station,
      paper_width: Number(parsed.data.paperWidth),
    },
  });

  revalidatePath("/dashboard/integrazioni");
  return {
    status: "success",
    message: parsed.data.printerId
      ? "Stampante aggiornata."
      : "Stampante aggiunta alla coda locale.",
  };
}

export async function testPrintAction(
  _prevState: PrinterActionState,
  formData: FormData,
): Promise<PrinterActionState> {
  const parsed = z
    .string()
    .uuid("Stampante non valida.")
    .safeParse(formString(formData, "printerId"));

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const auth = await authorizeRestaurant(
    "settings.manage",
    "/dashboard/integrazioni",
    "Il tuo ruolo non consente di inviare stampe di prova.",
  );
  if (!auth.ok) return { status: "error", message: auth.message };
  const { session, restaurant } = auth.context;

  const supabase = await createClient();
  const { data: printer } = await supabase
    .from("printer_profiles")
    .select("id, name, station, paper_width")
    .eq("id", parsed.data)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  if (!printer) {
    return { status: "error", message: "Stampante non trovata nella sede attiva." };
  }

  const isReceipt = printer.station === "receipt";
  const payload = isReceipt
    ? {
        kind: "receipt",
        restaurantName: restaurant.name,
        address: "",
        phone: "",
        orderNumber: "PROVA",
        tableName: null,
        createdAt: new Date().toISOString(),
        items: [
          {
            name: "Stampa di prova",
            quantity: 1,
            unitPriceCents: 0,
            lineTotalCents: 0,
            note: "Formato scontrino",
          },
        ],
        subtotalCents: 0,
        taxCents: 0,
        serviceChargeCents: 0,
        totalCents: 0,
        tipCents: 0,
        paymentMethod: "Test",
        footer: "CM Risto · servizio locale collegato",
        paperWidth: printer.paper_width,
      }
    : {
        kind: "kitchen",
        restaurantName: restaurant.name,
        orderNumber: "PROVA",
        tableName: null,
        createdAt: new Date().toISOString(),
        items: [{ name: "Stampa di prova cucina", quantity: 1, note: "" }],
        notes: "Verifica collegamento stampante",
        paperWidth: printer.paper_width,
      };

  const { error } = await supabase.from("print_jobs").insert({
    organization_id: restaurant.organizationId,
    restaurant_id: restaurant.id,
    printer_id: printer.id,
    job_type: isReceipt ? "receipt" : "kitchen",
    payload,
    status: "queued",
    idempotency_key: `test:${crypto.randomUUID()}`,
    created_by: session.user.id,
  });

  if (error) {
    return { status: "error", message: "Accodamento della stampa non riuscito." };
  }

  revalidatePath("/dashboard/integrazioni");
  return {
    status: "success",
    message:
      "Stampa di prova accodata. Il servizio locale la preleverà al prossimo ciclo.",
  };
}

export async function togglePrinterAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formString(formData, "printerId"));
  const next = formString(formData, "isActive") === "true";
  if (!id.success) return;

  const auth = await authorizeRestaurant(
    "settings.manage",
    "/dashboard/integrazioni",
    "Permesso insufficiente.",
  );
  if (!auth.ok) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("printer_profiles")
    .update({ is_active: next })
    .eq("id", id.data)
    .eq("restaurant_id", auth.context.restaurant.id);

  if (error) return;

  revalidatePath("/dashboard/integrazioni");
}

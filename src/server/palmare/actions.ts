"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DEVICE_COOKIE_NAME } from "@/server/devices/types";
import {
  OPERATOR_COOKIE_NAME,
  type PalmareLoginState,
  type PalmareOrderActionState,
} from "@/server/palmare/types";

const loginSchema = z.object({
  membershipId: z.string().uuid("Seleziona un operatore."),
  pin: z
    .string()
    .regex(/^[0-9]{4,6}$/, "Inserisci il PIN di 4-6 cifre."),
});

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function databaseMessage(error: { code?: string; message?: string }): string {
  const message = error.message?.trim() ?? "";

  if (error.code === "23514") {
    return message && !/violates|constraint/i.test(message)
      ? message
      : "Dispositivo non attivo: ripeti l'attivazione.";
  }

  if (error.code === "28000") {
    if (message.includes("bloccato")) {
      return "PIN bloccato per troppi tentativi: riprova tra 5 minuti.";
    }

    if (message.includes("Non riconosciuto")) {
      return "Dispositivo non riconosciuto: ripeti l'attivazione.";
    }

    if (message.includes("abilitato")) {
      return "Operatore non abilitato su questo dispositivo.";
    }

    if (message.includes("impostato")) {
      return "Questo operatore non ha un PIN attivo: chiedi al responsabile.";
    }

    return "Accesso non riuscito. Riprova.";
  }

  return "Accesso non riuscito. Riprova tra poco.";
}

export async function palmareLoginAction(
  _prevState: PalmareLoginState,
  formData: FormData,
): Promise<PalmareLoginState> {
  const parsed = loginSchema.safeParse({
    membershipId: formData.get("membershipId"),
    pin: formData.get("pin"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dati non validi.",
    };
  }

  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_COOKIE_NAME)?.value;

  if (!deviceToken) {
    return {
      status: "error",
      message: "Dispositivo non attivato: ricarica la pagina.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_operator_pin", {
    p_device_token: deviceToken,
    p_membership_id: parsed.data.membershipId,
    p_pin: parsed.data.pin,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error) };
  }

  const result = data as {
    status?: string;
    session_token?: string;
    operator_full_name?: string;
    locked?: boolean;
  } | null;

  if (result?.status === "invalid_pin") {
    return {
      status: "error",
      message: result.locked
        ? "PIN bloccato per troppi tentativi: riprova tra 5 minuti."
        : "PIN non valido.",
    };
  }

  if (!result?.session_token) {
    return { status: "error", message: "Accesso non riuscito. Riprova." };
  }

  cookieStore.set(OPERATOR_COOKIE_NAME, result.session_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect("/palmare");
}

export async function palmareLogoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(OPERATOR_COOKIE_NAME)?.value;

  if (sessionToken) {
    const supabase = await createClient();
    await supabase.rpc("operator_logout", {
      p_session_token: sessionToken,
    });
  }

  cookieStore.delete(OPERATOR_COOKIE_NAME);
  redirect("/palmare");
}

async function readOperatorSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(OPERATOR_COOKIE_NAME)?.value ?? null;
}

function orderErrorMessage(error: { code?: string; message?: string }): string {
  const message = error.message?.trim() ?? "";

  if (error.code === "28000") {
    if (message.includes("inattività")) {
      return "Sessione scaduta per inattività: reinserisci il PIN.";
    }

    if (message.includes("Sessione scaduta")) {
      return "Sessione scaduta: reinserisci il PIN.";
    }

    if (message.includes("Sessione non valida")) {
      return "Sessione non valida: reinserisci il PIN.";
    }

    if (message.includes("Dispositivo non attivo")) {
      return "Dispositivo non attivo: sessione chiusa.";
    }

    if (message.includes("Dispositivo non riconosciuto")) {
      return "Dispositivo non riconosciuto: ripeti l'attivazione.";
    }

    return "Operatore non abilitato a inviare comande.";
  }

  if (
    (error.code === "23514" || error.code === "23503" || error.code === "P0002") &&
    message
  ) {
    return message;
  }

  return "Operazione non riuscita. Riprova tra poco.";
}

const openOrderSchema = z.object({
  tableId: z.string().uuid("Tavolo non valido."),
  guests: z.coerce
    .number({ error: "Indica i coperti del tavolo." })
    .int("Indica i coperti del tavolo.")
    .min(1, "I coperti devono essere almeno 1.")
    .max(50, "I coperti non possono superare 50."),
});

export async function palmareOpenOrderAction(
  _prevState: PalmareOrderActionState,
  formData: FormData,
): Promise<PalmareOrderActionState> {
  const parsed = openOrderSchema.safeParse({
    tableId: formData.get("tableId"),
    guests: formData.get("guests"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dati non validi.",
    };
  }

  const sessionToken = await readOperatorSession();

  if (!sessionToken) {
    return {
      status: "error",
      message: "Sessione non valida: reinserisci il PIN.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("palamare_open_order", {
    p_session_token: sessionToken,
    p_table_id: parsed.data.tableId,
    p_guests: parsed.data.guests,
  });

  if (error) {
    return { status: "error", message: orderErrorMessage(error) };
  }

  const result = data as { table_name?: string } | null;
  revalidatePath("/palmare");

  return {
    status: "success",
    message: `Conto aperto: ${result?.table_name ?? "tavolo"}.`,
  };
}

const addItemsSchema = z.object({
  orderId: z.string().uuid("Conto non valido."),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid("Prodotto non valido."),
        quantity: z
          .number()
          .int()
          .min(1, "Quantità non valida.")
          .max(99, "Quantità non valida."),
      }),
    )
    .min(1, "Seleziona almeno un prodotto.")
    .max(50, "Troppe righe in una sola comanda."),
});

export async function palmareAddItemsAction(
  _prevState: PalmareOrderActionState,
  formData: FormData,
): Promise<PalmareOrderActionState> {
  let items: unknown = [];

  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { status: "error", message: "Selezione non valida." };
  }

  const parsed = addItemsSchema.safeParse({
    orderId: formData.get("orderId"),
    items,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dati non validi.",
    };
  }

  const sessionToken = await readOperatorSession();

  if (!sessionToken) {
    return {
      status: "error",
      message: "Sessione non valida: reinserisci il PIN.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("palamare_add_order_items", {
    p_session_token: sessionToken,
    p_order_id: parsed.data.orderId,
    p_items: parsed.data.items.map((item) => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
    })),
  });

  if (error) {
    return { status: "error", message: orderErrorMessage(error) };
  }

  const result = data as { count?: number } | null;
  const count = result?.count ?? 0;
  revalidatePath("/palmare");

  return {
    status: "success",
    message:
      count > 1
        ? `Comanda inviata: ${count} prodotti.`
        : "Comanda inviata alla cucina.",
  };
}

"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  DEVICE_COOKIE_NAME,
  type DeviceClaimState,
} from "@/server/devices/types";

const claimSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Inserisci il codice di attivazione.")
    .max(20, "Il codice non può superare 20 caratteri."),
});

export async function claimDeviceAction(
  _prevState: DeviceClaimState,
  formData: FormData,
): Promise<DeviceClaimState> {
  const parsed = claimSchema.safeParse({ code: formData.get("code") });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Codice non valido.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_device_pairing", {
    p_code: parsed.data.code,
    p_platform: "web",
  });

  if (error) {
    if (error.code === "28000") {
      return {
        status: "error",
        message: "Codice non valido, scaduto o già utilizzato.",
      };
    }

    if (error.code === "23514") {
      return {
        status: "error",
        message: error.message?.trim() || "Dispositivo non disponibile.",
      };
    }

    return {
      status: "error",
      message: "Attivazione non riuscita. Riprova tra poco.",
    };
  }

  const result = data as { name?: string; token?: string } | null;
  const token = result?.token ?? "";

  if (!token) {
    return {
      status: "error",
      message: "Attivazione non riuscita: risposta incompleta.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    status: "success",
    message: "Dispositivo attivato",
    deviceName: result?.name ?? "",
  };
}

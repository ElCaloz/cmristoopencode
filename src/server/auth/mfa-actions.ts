"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFromZod, formString } from "@/lib/forms";
import type { MfaActionState } from "@/server/auth/mfa-types";

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Inserisci il codice a 6 cifre dell'app di autenticazione."),
});

export async function startMfaEnrollAction(
  _prevState: MfaActionState,
  formData: FormData,
): Promise<MfaActionState> {
  const friendlyName = formString(formData, "friendlyName").slice(0, 60).trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Sessione non valida: accedi di nuovo." };
  }

  // Rimuove eventuali fattori TOTP non verificati rimasti in sospeso, così il
  // nuovo QR code è sempre valido e coerente.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status !== "verified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName:
      friendlyName ||
      `App autenticazione ${new Date().toISOString().slice(0, 10)}`,
  });

  if (error || !data) {
    return {
      status: "error",
      message: "Attivazione della verifica in due passaggi non riuscita.",
    };
  }

  const totp = "totp" in data ? data.totp : null;

  return {
    status: "success",
    message:
      "Scansiona il QR code con l'app di autenticazione, poi conferma il codice generato.",
    factorId: data.id,
    qrCode: totp?.qr_code,
    secret: totp?.secret,
  };
}

export async function verifyMfaAction(
  _prevState: MfaActionState,
  formData: FormData,
): Promise<MfaActionState> {
  const parsed = codeSchema.safeParse({ code: formString(formData, "code") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Sessione non valida: accedi di nuovo." };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totpFactors = (factors?.all ?? []).filter(
    (entry) => entry.factor_type === "totp",
  );
  const factor =
    totpFactors.find((entry) => entry.status === "unverified") ??
    totpFactors[0];

  if (!factor) {
    return {
      status: "error",
      message: "Nessun fattore da verificare: avvia prima la configurazione.",
    };
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: factor.id });

  if (challengeError || !challenge) {
    return {
      status: "error",
      message: "Generazione della verifica non riuscita. Riprova.",
    };
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (error) {
    return {
      status: "error",
      message: "Codice non valido o scaduto. Attendi il codice successivo e riprova.",
    };
  }

  revalidatePath("/dashboard/sicurezza");
  return {
    status: "success",
    message:
      "Verifica in due passaggi attiva. Da ora ti verrà chiesto il codice a ogni nuovo accesso.",
  };
}

export async function disableMfaAction(formData: FormData): Promise<void> {
  const parsed = z
    .string()
    .uuid("Fattore non valido.")
    .safeParse(formString(formData, "factorId"));

  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = (factors?.all ?? []).find(
    (entry) => entry.factor_type === "totp" && entry.id === parsed.data,
  );
  if (!factor) return;

  await supabase.auth.mfa.unenroll({ factorId: factor.id });
  revalidatePath("/dashboard/sicurezza");
}

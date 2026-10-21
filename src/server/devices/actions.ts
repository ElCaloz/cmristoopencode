"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, type SessionContext } from "@/server/auth/session";
import { canManageDevices } from "@/server/devices/queries";
import type {
  DevicePairing,
  DevicesActionState,
  OperatorPinsActionState,
} from "@/server/devices/types";
import {
  getActiveRestaurant,
  type ActiveRestaurant,
} from "@/server/restaurant/active";

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Inserisci un nome per il dispositivo.")
    .max(80, "Il nome può avere al massimo 80 caratteri."),
  type: z.enum(["palmare", "pos", "kds", "printer", "other"], {
    message: "Tipo di dispositivo non valido.",
  }),
});

const deviceIdSchema = z.object({
  deviceId: z.string().uuid("Dispositivo non valido."),
});

function fieldErrors(error: z.ZodError): DevicesActionState {
  const result: Record<string, string | undefined> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }

  return { status: "error", fieldErrors: result };
}

function databaseMessage(error: { code?: string; message?: string }): string {
  const message = error.message?.trim() ?? "";

  switch (error.code) {
    case "23514":
    case "23503":
    case "22023":
      if (message && !/violates|constraint/i.test(message)) {
        return message;
      }
      return "Operazione non consentita.";
    case "P0002":
      return "Dispositivo non trovato: aggiorna la pagina e riprova.";
    case "42501":
      return "Non hai i permessi per gestire i dispositivi.";
    case "28000":
      return "Codice non valido o scaduto.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

type Authorized = {
  session: SessionContext;
  restaurant: ActiveRestaurant;
};

async function authorize(): Promise<
  { ok: true; context: Authorized } | { ok: false; state: DevicesActionState }
> {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/dispositivi");
  }

  const restaurant = await getActiveRestaurant();

  if (!restaurant) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Nessun ristorante associato a questo account.",
      },
    };
  }

  const allowed = await canManageDevices(restaurant.id);

  if (!allowed) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Il tuo ruolo non consente di gestire i dispositivi.",
      },
    };
  }

  return { ok: true, context: { session, restaurant } };
}

async function writeAudit(
  context: Authorized,
  action: string,
  entityId: string,
  metadata: Record<string, unknown>,
  entityType = "device",
) {
  const supabase = await createClient();

  await supabase.from("audit_logs").insert({
    organization_id: context.restaurant.organizationId,
    restaurant_id: context.restaurant.id,
    actor_user_id: context.session.user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

const statusMessages: Record<string, string> = {
  block: "Dispositivo bloccato: nessuna sessione potrà essere avviata.",
  unblock: "Dispositivo sbloccato: puoi generare un nuovo codice.",
  revoke: "Dispositivo revocato: lo slot è di nuovo disponibile.",
};

export async function deviceAction(
  _prevState: DevicesActionState,
  formData: FormData,
): Promise<DevicesActionState> {
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create") {
    const parsed = createSchema.safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const auth = await authorize();
    if (!auth.ok) return auth.state;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_device", {
      p_restaurant_id: auth.context.restaurant.id,
      p_name: parsed.data.name,
      p_device_type: parsed.data.type,
      p_platform: "",
    });

    if (error) {
      return { status: "error", message: databaseMessage(error) };
    }

    const result = data as {
      device_id?: string;
      name?: string;
      pairing_code?: string;
      pairing_expires_at?: string;
    } | null;

    const deviceId = result?.device_id ?? "";
    const pairing: DevicePairing = {
      deviceId,
      deviceName: result?.name ?? parsed.data.name,
      code: result?.pairing_code ?? "",
      expiresAt: result?.pairing_expires_at ?? "",
    };

    await writeAudit(auth.context, "device.created", deviceId, {
      name: pairing.deviceName,
      type: parsed.data.type,
    });

    revalidatePath("/dashboard/dispositivi");

    return {
      status: "success",
      message: "Dispositivo creato: consegna il codice per l'attivazione.",
      pairing,
    };
  }

  if (intent === "reissue") {
    const parsed = deviceIdSchema.safeParse({
      deviceId: formData.get("deviceId"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const auth = await authorize();
    if (!auth.ok) return auth.state;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("reissue_device_pairing", {
      p_device_id: parsed.data.deviceId,
    });

    if (error) {
      return { status: "error", message: databaseMessage(error) };
    }

    const result = data as {
      device_id?: string;
      pairing_code?: string;
      pairing_expires_at?: string;
    } | null;

    const pairing: DevicePairing = {
      deviceId: result?.device_id ?? parsed.data.deviceId,
      deviceName: String(formData.get("deviceName") ?? ""),
      code: result?.pairing_code ?? "",
      expiresAt: result?.pairing_expires_at ?? "",
    };

    await writeAudit(auth.context, "device.pairing_reissued", pairing.deviceId, {
      name: pairing.deviceName,
    });

    revalidatePath("/dashboard/dispositivi");

    return {
      status: "success",
      message: "Nuovo codice generato: il precedente non è più valido.",
      pairing,
    };
  }

  if (intent === "block" || intent === "unblock" || intent === "revoke") {
    const parsed = deviceIdSchema.safeParse({
      deviceId: formData.get("deviceId"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const auth = await authorize();
    if (!auth.ok) return auth.state;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_device_status", {
      p_device_id: parsed.data.deviceId,
      p_action: intent,
    });

    if (error) {
      return { status: "error", message: databaseMessage(error) };
    }

    const result = data as {
      previous_status?: string;
      status?: string;
      changed?: boolean;
    } | null;

    await writeAudit(auth.context, "device.status_changed", parsed.data.deviceId, {
      action: intent,
      previous_status: result?.previous_status ?? null,
      status: result?.status ?? null,
      changed: result?.changed ?? null,
    });

    revalidatePath("/dashboard/dispositivi");

    if (result?.changed === false) {
      return { status: "success", message: "Stato già aggiornato." };
    }

    return { status: "success", message: statusMessages[intent] };
  }

  return { status: "error", message: "Azione non riconosciuta." };
}

const pinSchema = z
  .object({
    membershipId: z.string().uuid("Membro non valido."),
    pin: z
      .string()
      .regex(/^[0-9]{4,6}$/, "Il PIN deve avere da 4 a 6 cifre."),
    pinConfirm: z.string(),
  })
  .refine((value) => value.pin === value.pinConfirm, {
    message: "I due PIN non coincidono.",
    path: ["pinConfirm"],
  });

function pinFieldErrors(
  error: z.ZodError,
  membershipId?: string,
): OperatorPinsActionState {
  const result: Record<string, string | undefined> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }

  return { status: "error", fieldErrors: result, membershipId };
}

export async function operatorPinAction(
  _prevState: OperatorPinsActionState,
  formData: FormData,
): Promise<OperatorPinsActionState> {
  const intent = String(formData.get("intent") ?? "");

  const auth = await authorize();
  if (!auth.ok) {
    return { status: "error", message: auth.state.message };
  }

  const supabase = await createClient();

  if (intent === "set") {
    const parsed = pinSchema.safeParse({
      membershipId: formData.get("membershipId"),
      pin: formData.get("pin"),
      pinConfirm: formData.get("pinConfirm"),
    });
    if (!parsed.success) {
      return pinFieldErrors(
        parsed.error,
        String(formData.get("membershipId") ?? ""),
      );
    }

    const { error } = await supabase.rpc("set_operator_pin", {
      p_membership_id: parsed.data.membershipId,
      p_pin: parsed.data.pin,
    });

    if (error) {
      return {
        status: "error",
        membershipId: parsed.data.membershipId,
        message:
          error.code === "P0002"
            ? "Membro non trovato: aggiorna la pagina e riprova."
            : error.code === "42501"
              ? "Il tuo ruolo non consente di gestire i PIN operatore."
              : "Salvataggio del PIN non riuscito. Riprova tra poco.",
      };
    }

    await writeAudit(auth.context, "device.operator_pin_set", parsed.data.membershipId, {
      membership_id: parsed.data.membershipId,
    }, "membership");

    revalidatePath("/dashboard/dispositivi");

    return {
      status: "success",
      membershipId: parsed.data.membershipId,
      message: "PIN aggiornato: l'operatore può accedere dal palmare.",
    };
  }

  if (intent === "clear") {
    const membershipId = String(formData.get("membershipId") ?? "");

    if (!z.string().uuid().safeParse(membershipId).success) {
      return { status: "error", message: "Membro non valido." };
    }

    const { data, error } = await supabase.rpc("clear_operator_pin", {
      p_membership_id: membershipId,
    });

    if (error) {
      return {
        status: "error",
        message:
          error.code === "P0002"
            ? "Membro non trovato: aggiorna la pagina e riprova."
            : error.code === "42501"
              ? "Il tuo ruolo non consente di gestire i PIN operatore."
              : "Rimozione del PIN non riuscita. Riprova tra poco.",
      };
    }

    await writeAudit(auth.context, "device.operator_pin_cleared", membershipId, {
      membership_id: membershipId,
      removed: data === true,
    }, "membership");

    revalidatePath("/dashboard/dispositivi");

    return {
      status: "success",
      message:
        data === true
          ? "PIN rimosso: le sessioni aperte sono state chiuse."
          : "Il membro non aveva un PIN attivo.",
    };
  }

  return { status: "error", message: "Azione non riconosciuta." };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, type SessionContext } from "@/server/auth/session";
import { canOperateKitchen } from "@/server/kds/queries";
import type { KdsActionState } from "@/server/kds/types";
import {
  getActiveRestaurant,
  type ActiveRestaurant,
} from "@/server/restaurant/active";

const advanceSchema = z.object({
  itemId: z.string().uuid("Elemento non valido."),
  status: z.enum(["preparing", "ready", "served"], {
    message: "Stato non valido.",
  }),
});

function fieldErrors(error: z.ZodError): KdsActionState {
  const result: Record<string, string | undefined> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }

  return { status: "error", fieldErrors: result };
}

function databaseMessage(code: string | undefined): string {
  switch (code) {
    case "23514":
      return "Transizione non consentita nello stato attuale della riga.";
    case "P0002":
      return "Riga non trovata: aggiorna la pagina e riprova.";
    case "22023":
      return "Stato richiesto non valido.";
    case "42501":
      return "Non hai i permessi per operare sulla cucina.";
    default:
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

type Authorized = {
  session: SessionContext;
  restaurant: ActiveRestaurant;
};

async function authorize(): Promise<
  { ok: true; context: Authorized } | { ok: false; state: KdsActionState }
> {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/cucina");
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

  const allowed = await canOperateKitchen(restaurant.id);

  if (!allowed) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Il tuo ruolo non consente di operare sulla cucina.",
      },
    };
  }

  return { ok: true, context: { session, restaurant } };
}

const successMessages: Record<"preparing" | "ready" | "served", string> = {
  preparing: "Preparazione avviata.",
  ready: "Riga pronta al pass.",
  served: "Riga servita.",
};

export async function advanceItemAction(
  _prevState: KdsActionState,
  formData: FormData,
): Promise<KdsActionState> {
  const parsed = advanceSchema.safeParse({
    itemId: formData.get("itemId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const auth = await authorize();
  if (!auth.ok) return auth.state;
  const { context } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_order_item_status", {
    p_item_id: parsed.data.itemId,
    p_status: parsed.data.status,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error.code) };
  }

  const result = data as {
    previous_status?: string;
    status?: string;
    changed?: boolean;
  } | null;

  await supabase.from("audit_logs").insert({
    organization_id: context.restaurant.organizationId,
    restaurant_id: context.restaurant.id,
    actor_user_id: context.session.user.id,
    action: "kds.item_status_changed",
    entity_type: "order_item",
    entity_id: parsed.data.itemId,
    metadata: {
      previous_status: result?.previous_status ?? null,
      status: result?.status ?? parsed.data.status,
      changed: result?.changed ?? null,
    },
  });

  revalidatePath("/dashboard/cucina");
  revalidatePath("/dashboard/pos");

  if (result?.changed === false) {
    return { status: "success", message: "Riga già aggiornata." };
  }

  return { status: "success", message: successMessages[parsed.data.status] };
}

import { NextResponse } from "next/server";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function rpcError(error: { message?: string | null } | null) {
  const message = error?.message ?? "";

  if (message.includes("tenant_not_found")) {
    return jsonError(404, "tenant_not_found", "Numero chiamato non associato a un ristorante.");
  }

  if (message.includes("receptionist_disabled")) {
    return jsonError(409, "receptionist_disabled", "Receptionist non attivo per questo ristorante.");
  }

  if (message.includes("daily_call_limit_reached")) {
    return jsonError(429, "daily_call_limit_reached", "Limite giornaliero di chiamate raggiunto.");
  }

  if (message.includes("call_not_found")) {
    return jsonError(404, "call_not_found", "Chiamata non trovata.");
  }

  if (message.includes("forbidden")) {
    return jsonError(403, "forbidden", "Operazione non autorizzata.");
  }

  return jsonError(500, "internal_error", "Errore interno durante l'operazione.");
}

export function unavailableReason(message: string) {
  const prefix = "reservation_unavailable:";
  const index = message.indexOf(prefix);
  if (index < 0) return null;
  return message.slice(index + prefix.length).trim() || "unknown";
}

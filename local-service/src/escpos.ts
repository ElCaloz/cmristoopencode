import type { PrintTicketPayload } from "./types.js";

const ESC = "\x1b";
const GS = "\x1d";

function ascii(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e\n]/g, "?");
}

function wrap(value: string, width: number): string[] {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word.slice(0, width);
      continue;
    }
    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word.slice(0, width);
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function separator(width = 32): string {
  return "-".repeat(width);
}

export function formatTicket(payload: PrintTicketPayload): Buffer {
  const width = 32;
  const parts: string[] = [];
  parts.push(`${ESC}@`);
  parts.push(`${ESC}a1`);
  parts.push(`${ESC}E1`);
  parts.push(`${ascii(payload.restaurantName).slice(0, width)}\n`);
  parts.push(`${ESC}E0`);
  parts.push("COMANDA\n");
  parts.push(`${separator(width)}\n`);
  parts.push(`${ESC}a0`);
  parts.push(`Ordine: ${ascii(payload.orderNumber)}\n`);
  if (payload.tableName) parts.push(`Tavolo: ${ascii(payload.tableName)}\n`);
  parts.push(`Ora: ${new Date(payload.createdAt).toLocaleString("it-IT")}\n`);
  parts.push(`${separator(width)}\n`);

  for (const item of payload.items) {
    const prefix = `${item.quantity} x `;
    const lines = wrap(item.name, width - prefix.length);
    parts.push(`${prefix}${lines[0]}\n`);
    for (const line of lines.slice(1)) parts.push(`${" ".repeat(prefix.length)}${line}\n`);
    if (item.notes) {
      for (const line of wrap(item.notes, width - 4)) parts.push(`    ${line}\n`);
    }
  }

  if (payload.notes) {
    parts.push(`${separator(width)}\n`);
    parts.push("Note:\n");
    for (const line of wrap(payload.notes, width)) parts.push(`${line}\n`);
  }

  parts.push(`${separator(width)}\n`);
  parts.push(`${ESC}a1`);
  parts.push("Dati dimostrativi\n");
  parts.push("\n\n\n");
  parts.push(`${GS}V0`);

  return Buffer.from(parts.join(""), "latin1");
}

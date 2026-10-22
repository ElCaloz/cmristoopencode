import type {
  KitchenPayload,
  PrintPayload,
  PrintTicketPayload,
  ReceiptPayload,
} from "./types.js";

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

function formatMoney(cents: number): string {
  const value = Math.max(0, Math.round(cents));
  const euros = Math.trunc(value / 100);
  const remainder = String(value % 100).padStart(2, "0");
  return `${euros},${remainder}`;
}

function lineLeftRight(left: string, right: string, width: number): string {
  const cleanRight = ascii(right);
  const available = Math.max(1, width - cleanRight.length - 1);
  const cleanLeft = ascii(left).slice(0, available);
  return `${cleanLeft}${" ".repeat(Math.max(1, width - cleanLeft.length - cleanRight.length))}${cleanRight}`;
}

function formatReceiptDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatReceipt(payload: ReceiptPayload): Buffer {
  const width = payload.paperWidth === 58 ? 32 : 48;
  const parts: string[] = [];

  parts.push(`${ESC}@`);
  parts.push(`${ESC}a1`);
  parts.push(`${ESC}E1`);
  for (const line of wrap(payload.restaurantName, width)) {
    parts.push(`${line}\n`);
  }
  parts.push(`${ESC}E0`);
  if (payload.address) {
    for (const line of wrap(payload.address, width)) parts.push(`${line}\n`);
  }
  if (payload.phone) parts.push(`Tel. ${ascii(payload.phone)}\n`);
  parts.push(`${separator(width)}\n`);
  parts.push(`${ESC}a0`);
  parts.push(`Ordine: ${ascii(payload.orderNumber)}\n`);
  if (payload.tableName) parts.push(`Tavolo: ${ascii(payload.tableName)}\n`);
  parts.push(`Data: ${formatReceiptDate(payload.createdAt)}\n`);
  parts.push(`${separator(width)}\n`);

  for (const item of payload.items) {
    const prefix = `${item.quantity}x `;
    const nameLines = wrap(item.name, Math.max(8, width - prefix.length - 9));
    const price = formatMoney(item.lineTotalCents);
    parts.push(`${lineLeftRight(`${prefix}${nameLines[0]}`, price, width)}\n`);
    for (const line of nameLines.slice(1)) {
      parts.push(`${" ".repeat(prefix.length)}${line}\n`);
    }
    if (item.note) {
      for (const line of wrap(item.note, width - 4)) {
        parts.push(`    ${line}\n`);
      }
    }
  }

  parts.push(`${separator(width)}\n`);
  parts.push(`${lineLeftRight("Subtotale", formatMoney(payload.subtotalCents), width)}\n`);
  parts.push(`${lineLeftRight("IVA inclusa", formatMoney(payload.taxCents), width)}\n`);
  if (payload.serviceChargeCents > 0) {
    parts.push(
      `${lineLeftRight("Servizio", formatMoney(payload.serviceChargeCents), width)}\n`,
    );
  }
  if (payload.tipCents > 0) {
    parts.push(`${lineLeftRight("Mancia", formatMoney(payload.tipCents), width)}\n`);
  }
  parts.push(`${ESC}E1`);
  parts.push(`${lineLeftRight("TOTALE EUR", formatMoney(payload.totalCents), width)}\n`);
  parts.push(`${ESC}E0`);
  parts.push(`Pagamento: ${ascii(payload.paymentMethod)}\n`);
  parts.push(`${separator(width)}\n`);
  parts.push(`${ESC}a1`);
  if (payload.footer) {
    for (const line of wrap(payload.footer, width)) parts.push(`${line}\n`);
  }
  parts.push(`${ESC}a0`);
  parts.push("\n\n\n");
  parts.push(`${GS}V0`);

  return Buffer.from(parts.join(""), "latin1");
}

export function formatKitchen(payload: KitchenPayload): Buffer {
  const width = payload.paperWidth === 58 ? 32 : 48;
  const parts: string[] = [];

  parts.push(`${ESC}@`);
  parts.push(`${ESC}a1`);
  parts.push(`${ESC}E1`);
  parts.push("CUCINA\n");
  parts.push(`${ascii(payload.restaurantName).slice(0, width)}\n`);
  parts.push(`${ESC}E0`);
  parts.push(`${separator(width)}\n`);
  parts.push(`${ESC}a0`);
  parts.push(`Ordine: ${ascii(payload.orderNumber)}\n`);
  if (payload.tableName) parts.push(`Tavolo: ${ascii(payload.tableName)}\n`);
  parts.push(`Ora: ${formatReceiptDate(payload.createdAt)}\n`);
  parts.push(`${separator(width)}\n`);

  for (const item of payload.items) {
    const prefix = `${item.quantity}x `;
    const lines = wrap(item.name, width - prefix.length);
    parts.push(`${ESC}E1`);
    parts.push(`${prefix}${lines[0]}\n`);
    parts.push(`${ESC}E0`);
    for (const line of lines.slice(1)) {
      parts.push(`${" ".repeat(prefix.length)}${line}\n`);
    }
    if (item.note) {
      for (const line of wrap(item.note, width - 4)) parts.push(`    ${line}\n`);
    }
  }

  if (payload.notes) {
    parts.push(`${separator(width)}\n`);
    parts.push("Note:\n");
    for (const line of wrap(payload.notes, width)) parts.push(`${line}\n`);
  }

  parts.push(`${separator(width)}\n`);
  parts.push(`${ESC}a1`);
  parts.push("\n\n\n");
  parts.push(`${GS}V0`);

  return Buffer.from(parts.join(""), "latin1");
}

export function formatPrintPayload(payload: PrintPayload): Buffer {
  if ("kind" in payload && payload.kind === "receipt") {
    return formatReceipt(payload);
  }
  if ("kind" in payload && payload.kind === "kitchen") {
    return formatKitchen(payload);
  }
  return formatTicket(payload);
}

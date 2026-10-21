export const MAX_QUANTITY_MILLI = 1_000_000_000_000;

export function parseQuantityToMilli(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^-?\d{1,9}(\.\d{1,3})?$/.test(normalized)) return null;

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const milli = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));

  if (!Number.isSafeInteger(milli) || milli > MAX_QUANTITY_MILLI) return null;
  return negative ? -milli : milli;
}

export function formatQuantityMilli(milli: number): string {
  const safe = Number.isFinite(milli) ? Math.trunc(milli) : 0;
  const sign = safe < 0 ? "-" : "";
  const absolute = Math.abs(safe);
  const whole = Math.floor(absolute / 1000);
  const fraction = absolute % 1000;

  if (fraction === 0) return `${sign}${whole}`;

  const decimals = String(fraction)
    .padStart(3, "0")
    .replace(/0+$/, "");
  return `${sign}${whole},${decimals}`;
}

export function inventoryValueCents(
  quantityMilli: number,
  costPerUnitCents: number,
): number {
  const product = BigInt(quantityMilli) * BigInt(costPerUnitCents);
  return Number((product + BigInt(500)) / BigInt(1000));
}

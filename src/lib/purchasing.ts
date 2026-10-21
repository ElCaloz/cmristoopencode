import { inventoryValueCents } from "@/lib/inventory";

export type PurchasingLineAmount = {
  quantityMilli: number;
  receivedQuantityMilli: number;
  unitCostCents: number;
};

export function purchaseOrderLineTotalCents(
  quantityMilli: number,
  unitCostCents: number,
): number {
  return inventoryValueCents(quantityMilli, unitCostCents);
}

export function purchaseOrderTotalCents(
  lines: Array<Pick<PurchasingLineAmount, "quantityMilli" | "unitCostCents">>,
): number {
  return lines.reduce(
    (total, line) =>
      total + purchaseOrderLineTotalCents(line.quantityMilli, line.unitCostCents),
    0,
  );
}

export function purchaseOrderReceivedTotalCents(
  lines: Array<
    Pick<
      PurchasingLineAmount,
      "receivedQuantityMilli" | "unitCostCents"
    >
  >,
): number {
  return lines.reduce(
    (total, line) =>
      total +
      purchaseOrderLineTotalCents(
        line.receivedQuantityMilli,
        line.unitCostCents,
      ),
    0,
  );
}

export function purchaseOrderDiscrepancyMilli(
  lines: Array<Pick<PurchasingLineAmount, "quantityMilli" | "receivedQuantityMilli">>,
): number {
  return lines.reduce(
    (total, line) =>
      total + Math.max(0, line.quantityMilli - line.receivedQuantityMilli),
    0,
  );
}

export function purchaseOrderDiscrepancyCount(
  lines: Array<Pick<PurchasingLineAmount, "quantityMilli" | "receivedQuantityMilli">>,
): number {
  return lines.filter(
    (line) => line.receivedQuantityMilli < line.quantityMilli,
  ).length;
}

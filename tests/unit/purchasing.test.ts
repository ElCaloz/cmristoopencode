import { describe, expect, it } from "vitest";
import {
  purchaseOrderDiscrepancyCount,
  purchaseOrderDiscrepancyMilli,
  purchaseOrderLineTotalCents,
  purchaseOrderReceivedTotalCents,
  purchaseOrderTotalCents,
} from "@/lib/purchasing";

describe("purchaseOrderLineTotalCents", () => {
  it("computes integer line totals", () => {
    expect(purchaseOrderLineTotalCents(8000, 300)).toBe(2400);
    expect(purchaseOrderLineTotalCents(12500, 250)).toBe(3125);
  });

  it("rounds half-up to the nearest cent", () => {
    expect(purchaseOrderLineTotalCents(500, 1)).toBe(1);
    expect(purchaseOrderLineTotalCents(499, 1)).toBe(0);
  });
});

describe("purchase order totals", () => {
  it("sums ordered lines", () => {
    expect(
      purchaseOrderTotalCents([
        { quantityMilli: 8000, unitCostCents: 300 },
        { quantityMilli: 2000, unitCostCents: 100 },
      ]),
    ).toBe(2600);
    expect(purchaseOrderTotalCents([])).toBe(0);
  });

  it("sums received quantities at the ordered cost", () => {
    expect(
      purchaseOrderReceivedTotalCents([
        { receivedQuantityMilli: 6000, unitCostCents: 300 },
        { receivedQuantityMilli: 2000, unitCostCents: 100 },
      ]),
    ).toBe(2000);
  });
});

describe("purchase order discrepancies", () => {
  it("computes missing quantities in thousandths", () => {
    expect(
      purchaseOrderDiscrepancyMilli([
        { quantityMilli: 8000, receivedQuantityMilli: 6000 },
        { quantityMilli: 2000, receivedQuantityMilli: 2000 },
      ]),
    ).toBe(2000);
  });

  it("counts only short lines", () => {
    expect(
      purchaseOrderDiscrepancyCount([
        { quantityMilli: 8000, receivedQuantityMilli: 6000 },
        { quantityMilli: 2000, receivedQuantityMilli: 2000 },
      ]),
    ).toBe(1);
    expect(
      purchaseOrderDiscrepancyCount([
        { quantityMilli: 8000, receivedQuantityMilli: 8000 },
      ]),
    ).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  formatQuantityMilli,
  inventoryValueCents,
  parseQuantityToMilli,
} from "@/lib/inventory";

describe("parseQuantityToMilli", () => {
  it("parses integers and decimals into thousandths", () => {
    expect(parseQuantityToMilli("12")).toBe(12000);
    expect(parseQuantityToMilli("12,5")).toBe(12500);
    expect(parseQuantityToMilli("12.5")).toBe(12500);
    expect(parseQuantityToMilli("0,001")).toBe(1);
  });

  it("supports negative adjustments", () => {
    expect(parseQuantityToMilli("-2,25")).toBe(-2250);
    expect(parseQuantityToMilli("-0,5")).toBe(-500);
  });

  it("rejects invalid or over-precise quantities", () => {
    expect(parseQuantityToMilli("")).toBeNull();
    expect(parseQuantityToMilli("abc")).toBeNull();
    expect(parseQuantityToMilli("1,2345")).toBeNull();
    expect(parseQuantityToMilli("1.234.567")).toBeNull();
  });
});

describe("formatQuantityMilli", () => {
  it("formats thousandths without trailing zeroes", () => {
    expect(formatQuantityMilli(1000)).toBe("1");
    expect(formatQuantityMilli(12500)).toBe("12,5");
    expect(formatQuantityMilli(1)).toBe("0,001");
    expect(formatQuantityMilli(-2250)).toBe("-2,25");
  });
});

describe("inventoryValueCents", () => {
  it("computes integer inventory value", () => {
    expect(inventoryValueCents(12500, 890)).toBe(11125);
    expect(inventoryValueCents(1500, 200)).toBe(300);
  });

  it("rounds sub-cent values", () => {
    expect(inventoryValueCents(500, 1)).toBe(1);
    expect(inventoryValueCents(0, 500)).toBe(0);
  });
});

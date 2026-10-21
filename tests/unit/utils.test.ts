import { describe, expect, it } from "vitest";
import { csvEscape, formatCents, parseEuroToCents } from "@/lib/utils";

describe("parseEuroToCents", () => {
  it("converts Italian euro strings to integer cents", () => {
    expect(parseEuroToCents("12,50")).toBe(1250);
    expect(parseEuroToCents("6")).toBe(600);
    expect(parseEuroToCents("0,99")).toBe(99);
    expect(parseEuroToCents("1.234,56")).toBe(123456);
  });

  it("rounds to the nearest cent", () => {
    expect(parseEuroToCents("12,555")).toBe(1256);
  });

  it("returns 0 for invalid input", () => {
    expect(parseEuroToCents("")).toBe(0);
    expect(parseEuroToCents("abc")).toBe(0);
  });

  it("round-trips with formatCents", () => {
    expect(parseEuroToCents("1234,56")).toBe(123456);
    expect(formatCents(123456).replace(/\u00a0/g, " ")).toBe("1234,56 €");
    expect(formatCents(parseEuroToCents("6,50"))).toContain("6,50");
  });
});

describe("csvEscape", () => {
  it("escapes separators and quotes", () => {
    expect(csvEscape('Nome; "speciale"')).toBe('"Nome; ""speciale"""');
    expect(csvEscape("riga 1\nriga 2")).toBe('"riga 1\nriga 2"');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(csvEscape("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvEscape("+39 333 1234567")).toBe("'+39 333 1234567");
    expect(csvEscape("-1+1")).toBe("'-1+1");
    expect(csvEscape("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvEscape("\tcmd")).toBe("'\tcmd");
  });

  it("does not alter numeric values", () => {
    expect(csvEscape(-42)).toBe("-42");
    expect(csvEscape(1234)).toBe("1234");
  });
});

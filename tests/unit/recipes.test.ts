import { describe, expect, it } from "vitest";
import {
  foodCostBasisPoints,
  formatWastePercent,
  marginBasisPoints,
  parseWastePercentToBp,
  recipeFoodCostCents,
  recipeIngredientCostCents,
} from "@/lib/recipes";

describe("parseWastePercentToBp", () => {
  it("parses percentages into basis points", () => {
    expect(parseWastePercentToBp("10")).toBe(1000);
    expect(parseWastePercentToBp("10,5")).toBe(1050);
    expect(parseWastePercentToBp("0,25")).toBe(25);
    expect(parseWastePercentToBp("")).toBe(0);
  });

  it("rejects invalid percentages", () => {
    expect(parseWastePercentToBp("101")).toBeNull();
    expect(parseWastePercentToBp("-1")).toBeNull();
    expect(parseWastePercentToBp("abc")).toBeNull();
    expect(parseWastePercentToBp("10,555")).toBeNull();
  });
});

describe("formatWastePercent", () => {
  it("formats basis points as percentages", () => {
    expect(formatWastePercent(1000)).toBe("10");
    expect(formatWastePercent(1050)).toBe("10,5");
    expect(formatWastePercent(25)).toBe("0,25");
  });
});

describe("recipeIngredientCostCents", () => {
  it("applies quantity, cost and waste with rounding", () => {
    expect(recipeIngredientCostCents(250, 250, 1000)).toBe(69);
    expect(recipeIngredientCostCents(1000, 250, 0)).toBe(250);
  });

  it("handles zero values", () => {
    expect(recipeIngredientCostCents(0, 500, 0)).toBe(0);
    expect(recipeIngredientCostCents(1000, 0, 0)).toBe(0);
  });
});

describe("recipeFoodCostCents", () => {
  it("sums ingredients before dividing by portions", () => {
    const ingredients = [
      { quantityMilli: 500, wasteBp: 1000, costPerUnitCents: 250 },
      { quantityMilli: 100, wasteBp: 0, costPerUnitCents: 100 },
    ];

    expect(recipeFoodCostCents(ingredients, 2)).toBe(74);
    expect(recipeFoodCostCents(ingredients, 1)).toBe(148);
  });

  it("returns zero without ingredients or portions", () => {
    expect(recipeFoodCostCents([], 1)).toBe(0);
    expect(
      recipeFoodCostCents(
        [{ quantityMilli: 1000, wasteBp: 0, costPerUnitCents: 250 }],
        0,
      ),
    ).toBe(0);
  });
});

describe("food cost and margin percentages", () => {
  it("computes basis points against the selling price", () => {
    expect(foodCostBasisPoints(550, 1200)).toBe(4583);
    expect(marginBasisPoints(550, 1200)).toBe(5417);
  });

  it("returns null when the price is zero", () => {
    expect(foodCostBasisPoints(100, 0)).toBeNull();
    expect(marginBasisPoints(100, 0)).toBeNull();
  });
});

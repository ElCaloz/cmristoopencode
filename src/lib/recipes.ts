export const MAX_RECIPE_INGREDIENTS = 50;
export const MAX_RECIPE_PORTIONS = 1000;
export const MAX_WASTE_BP = 10000;

export type RecipeCostIngredient = {
  quantityMilli: number;
  wasteBp: number;
  costPerUnitCents: number;
};

export function parseWastePercentToBp(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return 0;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const basisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  if (!Number.isSafeInteger(basisPoints) || basisPoints > MAX_WASTE_BP) {
    return null;
  }

  return basisPoints;
}

export function formatWastePercent(bp: number): string {
  const safe = Number.isFinite(bp) ? Math.trunc(bp) : 0;
  if (safe % 100 === 0) return String(safe / 100);
  return (safe / 100).toFixed(2).replace(/0+$/, "").replace(".", ",");
}

export function recipeIngredientCostCents(
  quantityMilli: number,
  costPerUnitCents: number,
  wasteBp = 0,
): number {
  const numerator =
    BigInt(quantityMilli) * BigInt(costPerUnitCents) * BigInt(10000 + wasteBp);
  const denominator = BigInt(1000) * BigInt(10000);
  return Number(
    (numerator + denominator / BigInt(2)) / denominator,
  );
}

export function recipeFoodCostCents(
  ingredients: RecipeCostIngredient[],
  yieldPortions: number,
): number {
  if (ingredients.length === 0 || yieldPortions < 1) return 0;

  let numerator = BigInt(0);

  for (const ingredient of ingredients) {
    numerator +=
      BigInt(ingredient.quantityMilli) *
      BigInt(ingredient.costPerUnitCents) *
      BigInt(10000 + ingredient.wasteBp);
  }

  const denominator =
    BigInt(1000) * BigInt(10000) * BigInt(yieldPortions);

  return Number((numerator + denominator / BigInt(2)) / denominator);
}

export function foodCostBasisPoints(
  foodCostCents: number,
  priceCents: number,
): number | null {
  if (priceCents <= 0) return null;
  const numerator = BigInt(foodCostCents) * BigInt(10000);
  return Number(
    (numerator + BigInt(priceCents) / BigInt(2)) / BigInt(priceCents),
  );
}

export function marginBasisPoints(
  foodCostCents: number,
  priceCents: number,
): number | null {
  const foodCostBp = foodCostBasisPoints(foodCostCents, priceCents);
  if (foodCostBp === null) return null;
  return 10000 - foodCostBp;
}

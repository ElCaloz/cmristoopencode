"use client";

import {
  Calculator,
  ChefHat,
  Pencil,
  Percent,
  Plus,
  Trash2,
  TriangleAlert,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { RowMenu } from "@/components/ui/row-menu";
import { formatQuantityMilli, parseQuantityToMilli } from "@/lib/inventory";
import {
  MAX_RECIPE_INGREDIENTS,
  foodCostBasisPoints,
  formatWastePercent,
  parseWastePercentToBp,
  recipeFoodCostCents,
} from "@/lib/recipes";
import { formatCents, formatPercent, makeId } from "@/lib/utils";
import {
  deleteRecipeAction,
  saveRecipeAction,
} from "@/server/recipes/actions";
import {
  initialRecipeActionState,
  type RecipeMenuItemRow,
} from "@/server/recipes/types";
import type { InventoryItemRow } from "@/server/inventory/types";

const HIGH_FOOD_COST_BP = 3500;

type IngredientDraft = {
  key: string;
  inventoryItemId: string;
  quantity: string;
  wastePercent: string;
};

type Props = {
  menuItems: RecipeMenuItemRow[];
  inventoryItems: InventoryItemRow[];
};

function statusFor(row: RecipeMenuItemRow): {
  label: string;
  variant: "success" | "warning" | "danger" | "secondary";
} {
  if (!row.recipe) return { label: "Senza ricetta", variant: "secondary" };
  if (row.missingCost) return { label: "Costo incompleto", variant: "warning" };
  if (row.foodCostBp !== null && row.foodCostBp > HIGH_FOOD_COST_BP) {
    return { label: "Food cost alto", variant: "danger" };
  }
  return { label: "Sotto controllo", variant: "success" };
}

export function RecipeManager({ menuItems, inventoryItems }: Props) {
  const [target, setTarget] = useState<RecipeMenuItemRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecipeMenuItemRow | null>(
    null,
  );
  const [filter, setFilter] = useState("all");
  const [, startTransition] = useTransition();

  const activeInventory = inventoryItems.filter((item) => item.isActive);
  const withRecipe = menuItems.filter((item) => item.recipe);
  const highCost = withRecipe.filter(
    (item) =>
      item.foodCostBp !== null && item.foodCostBp > HIGH_FOOD_COST_BP,
  );
  const incomplete = withRecipe.filter((item) => item.missingCost);
  const pricedRecipes = withRecipe.filter(
    (item) => item.foodCostBp !== null,
  );
  const averageFoodCostBp =
    pricedRecipes.length > 0
      ? Math.round(
          pricedRecipes.reduce(
            (sum, item) => sum + (item.foodCostBp ?? 0),
            0,
          ) / pricedRecipes.length,
        )
      : null;

  const filteredItems = menuItems.filter((item) => {
    if (filter === "missing") return item.recipe === null;
    if (filter === "high") {
      return (
        item.foodCostBp !== null && item.foodCostBp > HIGH_FOOD_COST_BP
      );
    }
    if (filter === "incomplete") return item.recipe !== null && item.missingCost;
    return true;
  });

  const runDelete = (row: RecipeMenuItemRow) => {
    if (!row.recipe) return;
    const recipeId = row.recipe.id;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("recipeId", recipeId);
      const result = await deleteRecipeAction(
        initialRecipeActionState,
        formData,
      );

      if (result.status === "success") {
        toast.success(result.message ?? "Ricetta eliminata.");
      } else {
        toast.error(result.message ?? "Operazione non riuscita.");
      }
    });
  };

  const columns: DataTableColumn<RecipeMenuItemRow>[] = [
    {
      id: "dish",
      header: "Piatto",
      sortValue: (item) => item.name,
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {item.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {item.categoryName}
            </span>
            {!item.isAvailable ? (
              <Badge variant="warning">Non disponibile</Badge>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      id: "price",
      header: "Prezzo",
      sortValue: (item) => item.priceCents,
      cell: (item) =>
        item.priceCents > 0 ? (
          <span className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
            {formatCents(item.priceCents)}
          </span>
        ) : (
          <Badge variant="warning">Prezzo da definire</Badge>
        ),
    },
    {
      id: "recipe",
      header: "Ricetta",
      sortValue: (item) => item.recipe?.ingredients.length ?? 0,
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell",
      cell: (item) =>
        item.recipe ? (
          <div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              {item.recipe.ingredients.length}{" "}
              {item.recipe.ingredients.length === 1
                ? "ingrediente"
                : "ingredienti"}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Resa {item.recipe.yieldPortions}{" "}
              {item.recipe.yieldPortions === 1 ? "porzione" : "porzioni"}
            </p>
          </div>
        ) : (
          <span className="text-xs text-zinc-400">Nessuna ricetta</span>
        ),
    },
    {
      id: "foodCost",
      header: "Food cost",
      sortValue: (item) => item.foodCostBp ?? -1,
      cell: (item) =>
        item.recipe && item.foodCostCents !== null ? (
          <div>
            <p className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
              {formatCents(item.foodCostCents)}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {item.foodCostBp === null
                ? "Prezzo da definire"
                : formatPercent(item.foodCostBp / 100, 0)}
            </p>
          </div>
        ) : (
          <span className="text-xs text-zinc-400">-</span>
        ),
    },
    {
      id: "margin",
      header: "Margine",
      sortValue: (item) => item.marginBp ?? -1,
      headerClassName: "hidden lg:table-cell",
      className: "hidden lg:table-cell",
      cell: (item) =>
        item.marginCents !== null && item.marginBp !== null ? (
          <div>
            <p className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
              {formatCents(item.marginCents)}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {formatPercent(item.marginBp / 100, 0)}
            </p>
          </div>
        ) : (
          <span className="text-xs text-zinc-400">-</span>
        ),
    },
    {
      id: "status",
      header: "Stato",
      sortValue: (item) => statusFor(item).label,
      headerClassName: "hidden sm:table-cell",
      className: "hidden sm:table-cell",
      cell: (item) => {
        const status = statusFor(item);
        return (
          <Badge variant={status.variant} dot>
            {status.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={UtensilsCrossed}
          label="Piatti in menu"
          value={String(menuItems.length)}
          detail={`${withRecipe.length} con ricetta`}
        />
        <StatCard
          icon={ChefHat}
          label="Copertura ricette"
          value={
            menuItems.length > 0
              ? formatPercent((withRecipe.length / menuItems.length) * 100, 0)
              : "-"
          }
          detail={`${incomplete.length} costi da completare`}
        />
        <StatCard
          icon={Calculator}
          label="Food cost medio"
          value={
            averageFoodCostBp === null
              ? "-"
              : formatPercent(averageFoodCostBp / 100, 0)
          }
          detail={`Su ${pricedRecipes.length} ricette prezzate`}
        />
        <StatCard
          icon={TriangleAlert}
          label="Food cost alto"
          value={String(highCost.length)}
          detail="Oltre il 35% del prezzo"
          tone={highCost.length > 0 ? "warning" : "neutral"}
        />
      </section>

      <DataTable
        data={filteredItems}
        columns={columns}
        getRowId={(item) => item.id}
        searchText={(item) =>
          [
            item.name,
            item.categoryName,
            item.recipe?.notes ?? "",
            item.recipe?.ingredients.length.toString() ?? "",
          ].join(" ")
        }
        searchPlaceholder="Cerca piatto o categoria..."
        onRowClick={(item) => setTarget(item)}
        pageSize={10}
        toolbar={
          <>
            <Select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-8 w-44 text-xs"
              aria-label="Filtra ricette"
            >
              <option value="all">Tutti i piatti</option>
              <option value="missing">Senza ricetta</option>
              <option value="high">Food cost alto</option>
              <option value="incomplete">Costo incompleto</option>
            </Select>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/menu">
                <UtensilsCrossed />
                Apri il menu
              </Link>
            </Button>
          </>
        }
        rowActions={(item) => (
          <RowMenu
            items={[
              {
                label: item.recipe ? "Modifica ricetta" : "Crea ricetta",
                icon: item.recipe ? Pencil : Plus,
                onSelect: () => setTarget(item),
              },
              ...(item.recipe
                ? [
                    {
                      label: "Elimina ricetta",
                      icon: Trash2,
                      destructive: true,
                      separatorBefore: true,
                      onSelect: () => setDeleteTarget(item),
                    },
                  ]
                : []),
            ]}
          />
        )}
        emptyTitle="Nessun piatto"
        emptyDescription={
          menuItems.length === 0
            ? "Crea almeno un prodotto nel menu per collegargli una ricetta."
            : "Prova a modificare la ricerca o il filtro applicato."
        }
        emptyAction={
          menuItems.length === 0 ? (
            <Button size="sm" asChild>
              <Link href="/dashboard/menu">
                <UtensilsCrossed />
                Vai al menu
              </Link>
            </Button>
          ) : undefined
        }
      />

      {target ? (
        <RecipeDialog
          key={`${target.id}-${target.recipe?.id ?? "new"}`}
          row={target}
          inventoryItems={activeInventory}
          onClose={() => setTarget(null)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminare la ricetta?"
        description={
          deleteTarget
            ? `La ricetta di "${deleteTarget.name}" verra rimossa. Il piatto resta nel menu.`
            : ""
        }
        confirmLabel="Elimina ricetta"
        onConfirm={() => {
          if (deleteTarget) runDelete(deleteTarget);
        }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <Icon
          className={
            tone === "warning"
              ? "size-4 text-amber-600 dark:text-amber-400"
              : "size-4 text-brand-700 dark:text-brand-400"
          }
        />
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
        {detail}
      </p>
    </div>
  );
}

function RecipeDialog({
  row,
  inventoryItems,
  onClose,
}: {
  row: RecipeMenuItemRow;
  inventoryItems: InventoryItemRow[];
  onClose: () => void;
}) {
  const recipe = row.recipe;
  const [rows, setRows] = useState<IngredientDraft[]>(() =>
    recipe && recipe.ingredients.length > 0
      ? recipe.ingredients.map((ingredient) => ({
          key: makeId("ing"),
          inventoryItemId: ingredient.inventoryItemId,
          quantity: formatQuantityMilli(ingredient.quantityMilli),
          wastePercent: formatWastePercent(ingredient.wasteBp),
        }))
      : [
          {
            key: makeId("ing"),
            inventoryItemId: "",
            quantity: "",
            wastePercent: "0",
          },
        ],
  );
  const [yieldPortions, setYieldPortions] = useState(
    String(recipe?.yieldPortions ?? 1),
  );
  const [state, formAction, pending] = useActionState(
    saveRecipeAction,
    initialRecipeActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Ricetta salvata.");
      onClose();
    }
  }, [state, onClose]);

  const inventoryById = new Map(
    inventoryItems.map((item) => [item.id, item]),
  );
  const parsedYield = /^\d{1,4}$/.test(yieldPortions.trim())
    ? Number(yieldPortions)
    : 0;

  const previewIngredients = rows.map((rowItem) => {
    const inventoryItem = inventoryById.get(rowItem.inventoryItemId);
    const quantityMilli = parseQuantityToMilli(rowItem.quantity) ?? 0;
    const wasteBp = parseWastePercentToBp(rowItem.wastePercent) ?? 0;

    return {
      quantityMilli: Math.max(0, quantityMilli),
      wasteBp,
      costPerUnitCents: inventoryItem?.costPerUnitCents ?? 0,
    };
  });

  const foodCostCents = recipeFoodCostCents(
    previewIngredients,
    parsedYield,
  );
  const foodCostBp = foodCostBasisPoints(foodCostCents, row.priceCents);
  const missingCost = rows.some((rowItem) => {
    const inventoryItem = inventoryById.get(rowItem.inventoryItemId);
    return !inventoryItem || inventoryItem.costPerUnitCents <= 0;
  });

  const ingredientsJson = JSON.stringify(
    rows.map((rowItem) => ({
      inventoryItemId: rowItem.inventoryItemId,
      quantity: rowItem.quantity,
      wastePercent: rowItem.wastePercent,
    })),
  );

  const updateRow = (key: string, patch: Partial<IngredientDraft>) => {
    setRows((current) =>
      current.map((rowItem) =>
        rowItem.key === key ? { ...rowItem, ...patch } : rowItem,
      ),
    );
  };

  const usedItems = new Set(
    rows
      .map((rowItem) => rowItem.inventoryItemId)
      .filter((value) => value.length > 0),
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {recipe ? `Ricetta: ${row.name}` : `Nuova ricetta: ${row.name}`}
          </DialogTitle>
          <DialogDescription>
            Ingredienti, sfrido e porzioni prodotte. Il food cost usa i costi
            correnti del magazzino e non scala le giacenze.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="menuItemId" value={row.id} />
          <input type="hidden" name="ingredients" value={ingredientsJson} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Porzioni prodotte"
              htmlFor="recipe-yield"
              error={state.fieldErrors?.yieldPortions}
              hint="La ricetta viene divisa per questo numero di porzioni."
            >
              <Input
                id="recipe-yield"
                name="yieldPortions"
                value={yieldPortions}
                onChange={(event) => setYieldPortions(event.target.value)}
                inputMode="numeric"
                required
              />
            </Field>
            <Field
              label="Note"
              htmlFor="recipe-notes"
              error={state.fieldErrors?.notes}
            >
              <Textarea
                id="recipe-notes"
                name="notes"
                defaultValue={recipe?.notes ?? ""}
                maxLength={500}
                className="min-h-9"
                placeholder="Preparazione, resa o annotazioni..."
              />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Ingredienti
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Quantita e sfrido sono riferiti all&apos;unita di misura
                  dell&apos;articolo.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  rows.length >= MAX_RECIPE_INGREDIENTS ||
                  rows.length >= inventoryItems.length
                }
                onClick={() =>
                  setRows((current) => [
                    ...current,
                    {
                      key: makeId("ing"),
                      inventoryItemId: "",
                      quantity: "",
                      wastePercent: "0",
                    },
                  ])
                }
              >
                <Plus />
                Aggiungi ingrediente
              </Button>
            </div>

            {inventoryItems.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                Nessun articolo attivo in magazzino. Creane almeno uno prima di
                costruire la ricetta.
                <Button className="mt-2" size="sm" variant="outline" asChild>
                  <Link href="/dashboard/magazzino">Apri il magazzino</Link>
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              {rows.map((rowItem, index) => {
                const selectedItem = inventoryById.get(
                  rowItem.inventoryItemId,
                );
                const quantityMilli =
                  parseQuantityToMilli(rowItem.quantity) ?? 0;
                const wasteBp =
                  parseWastePercentToBp(rowItem.wastePercent) ?? 0;
                const lineCost = recipeFoodCostCents(
                  [
                    {
                      quantityMilli: Math.max(0, quantityMilli),
                      wasteBp,
                      costPerUnitCents:
                        selectedItem?.costPerUnitCents ?? 0,
                    },
                  ],
                  1,
                );

                return (
                  <div
                    key={rowItem.key}
                    className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="grid gap-2 sm:grid-cols-[1fr_120px_100px_36px]">
                      <Field
                        label={`Ingrediente ${index + 1}`}
                        htmlFor={`recipe-ingredient-${index}`}
                      >
                        <Select
                          id={`recipe-ingredient-${index}`}
                          value={rowItem.inventoryItemId}
                          onChange={(event) =>
                            updateRow(rowItem.key, {
                              inventoryItemId: event.target.value,
                            })
                          }
                        >
                          <option value="">Scegli un articolo</option>
                          {inventoryItems.map((item) => {
                            const usedElsewhere =
                              usedItems.has(item.id) &&
                              rowItem.inventoryItemId !== item.id;
                            return (
                              <option
                                key={item.id}
                                value={item.id}
                                disabled={usedElsewhere}
                              >
                                {item.name} - {item.unit} -{" "}
                                {formatCents(item.costPerUnitCents)}
                              </option>
                            );
                          })}
                        </Select>
                      </Field>
                      <Field
                        label={`Quantita ${index + 1}${selectedItem ? ` (${selectedItem.unit})` : ""}`}
                        htmlFor={`recipe-quantity-${index}`}
                      >
                        <Input
                          id={`recipe-quantity-${index}`}
                          value={rowItem.quantity}
                          onChange={(event) =>
                            updateRow(rowItem.key, {
                              quantity: event.target.value,
                            })
                          }
                          inputMode="decimal"
                          placeholder="0,5"
                          required
                        />
                      </Field>
                      <Field
                        label={`Sfrido ${index + 1} (%)`}
                        htmlFor={`recipe-waste-${index}`}
                      >
                        <Input
                          id={`recipe-waste-${index}`}
                          value={rowItem.wastePercent}
                          onChange={(event) =>
                            updateRow(rowItem.key, {
                              wastePercent: event.target.value,
                            })
                          }
                          inputMode="decimal"
                          placeholder="0"
                          required
                        />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                          aria-label={`Rimuovi ingrediente ${index + 1}`}
                          disabled={rows.length === 1}
                          onClick={() =>
                            setRows((current) =>
                              current.filter(
                                (entry) => entry.key !== rowItem.key,
                              ),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Costo riga: {formatCents(lineCost)}
                      {selectedItem
                        ? ` - ${formatQuantityMilli(selectedItem.quantityMilli)} ${selectedItem.unit} disponibili`
                        : ""}
                    </p>
                  </div>
                );
              })}
            </div>
            {state.fieldErrors?.ingredients ? (
              <p role="alert" className="text-xs text-red-600">
                {state.fieldErrors.ingredients}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <Percent className="size-3.5" />
                  Anteprima food cost
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                  {formatCents(foodCostCents)}{" "}
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    per porzione
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Incidenza sul prezzo
                </p>
                <p className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                  {foodCostBp === null
                    ? "Prezzo da definire"
                    : formatPercent(foodCostBp / 100, 0)}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Prezzo {formatCents(row.priceCents)}
                </p>
              </div>
            </div>
            {missingCost ? (
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                Uno o piu ingredienti non hanno un costo di acquisto: il food
                cost e incompleto.
              </p>
            ) : null}
          </div>

          {state.status === "error" && state.message ? (
            <p role="alert" className="text-xs text-red-600">
              {state.message}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending || inventoryItems.length === 0}>
              Salva ricetta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import {
  BookOpen,
  CircleDollarSign,
  Pencil,
  Percent,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
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
import { PageHeader } from "@/components/ui/page-header";
import { RowMenu } from "@/components/ui/row-menu";
import { StatCard } from "@/components/ui/stat-card";
import { Switch } from "@/components/ui/switch";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import { STATION_LABELS } from "@/lib/demo/calc";
import type { MenuProduct, Station } from "@/lib/demo/types";
import {
  formatCents,
  formatPercent,
  makeId,
  parseEuroToCents,
} from "@/lib/utils";

function toEuroInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function marginPct(product: MenuProduct) {
  if (product.priceCents <= 0) return 0;
  return ((product.priceCents - product.foodCostCents) / product.priceCents) * 100;
}

type ProductForm = {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  foodCost: string;
  station: Station;
  allergens: string;
  available: boolean;
};

export default function MenuPage() {
  const restaurant = useActiveRestaurant();
  const products = useDemoStore((state) => state.products);
  const categories = useDemoStore((state) => state.categories);
  const saveProduct = useDemoStore((state) => state.saveProduct);
  const deleteProduct = useDemoStore((state) => state.deleteProduct);
  const toggleProductAvailability = useDemoStore(
    (state) => state.toggleProductAvailability,
  );

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editing, setEditing] = useState<MenuProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuProduct | null>(null);
  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    categoryId: "",
    price: "",
    foodCost: "",
    station: "cucina",
    allergens: "",
    available: true,
  });

  if (!restaurant) return null;

  const restaurantProducts = products.filter(
    (product) => product.restaurantId === restaurant.id,
  );
  const restaurantCategories = categories[restaurant.id] ?? [];
  const categoryName = (id: string) =>
    restaurantCategories.find((category) => category.id === id)?.name ??
    "Senza categoria";
  const filteredProducts = restaurantProducts.filter(
    (product) =>
      categoryFilter === "all" || product.categoryId === categoryFilter,
  );
  const availableCount = restaurantProducts.filter(
    (product) => product.available,
  ).length;
  const avgMargin =
    restaurantProducts.length > 0
      ? restaurantProducts.reduce(
          (sum, product) => sum + marginPct(product),
          0,
        ) / restaurantProducts.length
      : 0;
  const avgFoodCost =
    restaurantProducts.length > 0
      ? restaurantProducts.reduce(
          (sum, product) =>
            sum +
            Math.round(product.foodCostCents / Math.max(1, product.priceCents) * 100),
          0,
        ) / restaurantProducts.length
      : 0;

  const openNew = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      categoryId: restaurantCategories[0]?.id ?? "",
      price: "",
      foodCost: "",
      station: "cucina",
      allergens: "",
      available: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (product: MenuProduct) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      price: toEuroInput(product.priceCents),
      foodCost: toEuroInput(product.foodCostCents),
      station: product.station,
      allergens: product.allergens.join(", "),
      available: product.available,
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Il nome del prodotto è obbligatorio.");
      return;
    }
    if (!form.categoryId) {
      toast.error("Seleziona una categoria.");
      return;
    }
    const priceCents = parseEuroToCents(form.price);
    if (priceCents <= 0) {
      toast.error("Inserisci un prezzo valido.");
      return;
    }
    const product: MenuProduct = {
      id: editing?.id ?? makeId(`${restaurant.id}-p`),
      restaurantId: restaurant.id,
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description.trim(),
      priceCents,
      foodCostCents: parseEuroToCents(form.foodCost),
      station: form.station,
      allergens: form.allergens
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
      available: form.available,
      variants: editing?.variants,
    };
    saveProduct(product);
    setDialogOpen(false);
    toast.success(editing ? "Prodotto aggiornato" : "Prodotto aggiunto", {
      description: `«${product.name}» salvato nella demo.`,
    });
  };

  const columns: DataTableColumn<MenuProduct>[] = [
    {
      id: "name",
      header: "Prodotto",
      sortValue: (product) => product.name,
      cell: (product) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {product.name}
          </p>
          <p className="line-clamp-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            {product.description || "Nessuna descrizione"}
          </p>
          {product.allergens.length > 0 ? (
            <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
              Allergeni: {product.allergens.join(", ")}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "category",
      header: "Categoria",
      sortValue: (product) => categoryName(product.categoryId),
      cell: (product) => (
        <Badge variant="secondary">{categoryName(product.categoryId)}</Badge>
      ),
    },
    {
      id: "price",
      header: "Prezzo",
      sortValue: (product) => product.priceCents,
      cell: (product) => (
        <span className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
          {formatCents(product.priceCents)}
        </span>
      ),
    },
    {
      id: "foodCost",
      header: "Food cost",
      sortValue: (product) => product.foodCostCents,
      cell: (product) => (
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatCents(product.foodCostCents)}
        </span>
      ),
    },
    {
      id: "margin",
      header: "Margine",
      sortValue: (product) => marginPct(product),
      cell: (product) => {
        const value = marginPct(product);
        return (
          <Badge variant={value >= 60 ? "success" : value >= 45 ? "info" : "warning"}>
            {formatPercent(value)}
          </Badge>
        );
      },
    },
    {
      id: "station",
      header: "Postazione",
      sortValue: (product) => STATION_LABELS[product.station],
      cell: (product) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {STATION_LABELS[product.station]}
        </span>
      ),
    },
    {
      id: "available",
      header: "Disponibile",
      cell: (product) => (
        <div onClick={(event) => event.stopPropagation()}>
          <Switch
            checked={product.available}
            onCheckedChange={() => {
              toggleProductAvailability(product.id);
              toast.success(
                product.available
                  ? `«${product.name}» segnato come esaurito`
                  : `«${product.name}» di nuovo disponibile`,
                { description: "Disponibilità aggiornata in POS e menu demo." },
              );
            }}
            aria-label={`Disponibilità ${product.name}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Catalogo e marginalità"
        title="Menu e prodotti"
        description="Prezzi, food cost, margini e disponibilità. Le modifiche si riflettono subito su POS e comande demo."
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button onClick={openNew}>
            <Plus />
            Nuovo prodotto
          </Button>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Prodotti in menu"
          value={String(restaurantProducts.length)}
          icon={BookOpen}
          hint={`${restaurantCategories.length} categorie`}
        />
        <StatCard
          label="Disponibili oggi"
          value={`${availableCount}/${restaurantProducts.length}`}
          icon={UtensilsCrossed}
          hint={`${restaurantProducts.length - availableCount} esauriti`}
        />
        <StatCard
          label="Food cost medio"
          value={formatPercent(avgFoodCost)}
          icon={CircleDollarSign}
          hint="sul prezzo di vendita"
        />
        <StatCard
          label="Margine medio"
          value={formatPercent(avgMargin)}
          icon={Percent}
          hint="prima dei costi fissi"
        />
      </div>

      <div className="mt-4">
        <DataTable
          data={filteredProducts}
          columns={columns}
          getRowId={(product) => product.id}
          searchText={(product) =>
            `${product.name} ${product.description} ${categoryName(product.categoryId)}`
          }
          searchPlaceholder="Cerca prodotto…"
          onRowClick={openEdit}
          pageSize={10}
          toolbar={
            <>
              <Select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-8 w-44 text-xs"
                aria-label="Filtra per categoria"
              >
                <option value="all">Tutte le categorie</option>
                {restaurantCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Button size="sm" onClick={openNew}>
                <Plus />
                Nuovo
              </Button>
            </>
          }
          rowActions={(product) => (
            <RowMenu
              items={[
                {
                  label: "Modifica",
                  icon: Pencil,
                  onSelect: () => openEdit(product),
                },
                {
                  label: product.available
                    ? "Segna esaurito"
                    : "Rendi disponibile",
                  icon: UtensilsCrossed,
                  onSelect: () => {
                    toggleProductAvailability(product.id);
                    toast.success("Disponibilità aggiornata");
                  },
                },
                {
                  label: "Elimina",
                  icon: Trash2,
                  destructive: true,
                  separatorBefore: true,
                  onSelect: () => setDeleteTarget(product),
                },
              ]}
            />
          )}
          emptyTitle="Nessun prodotto"
          emptyDescription="Aggiungi il primo prodotto al menu del locale."
          emptyAction={
            <Button size="sm" onClick={openNew}>
              <Plus />
              Nuovo prodotto
            </Button>
          }
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica prodotto" : "Nuovo prodotto"}
            </DialogTitle>
            <DialogDescription>
              Prezzi in euro IVA inclusa come da prassi del menu. I dati sono
              dimostrativi e restano nel browser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Nome" htmlFor="product-name">
              <Input
                id="product-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Es. Pappardelle al ragù"
              />
            </Field>
            <Field label="Descrizione" htmlFor="product-description">
              <Textarea
                id="product-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Ingredienti principali, indicazioni utili…"
                className="min-h-16"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Categoria" htmlFor="product-category">
                <Select
                  id="product-category"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  {restaurantCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Postazione" htmlFor="product-station">
                <Select
                  id="product-station"
                  value={form.station}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      station: event.target.value as Station,
                    }))
                  }
                >
                  {(
                    Object.keys(STATION_LABELS) as Station[]
                  ).map((station) => (
                    <option key={station} value={station}>
                      {STATION_LABELS[station]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Prezzo di vendita (€)" htmlFor="product-price">
                <Input
                  id="product-price"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  placeholder="12,00"
                  inputMode="decimal"
                />
              </Field>
              <Field
                label="Food cost (€)"
                htmlFor="product-foodcost"
                hint="Costo materie prime per porzione."
              >
                <Input
                  id="product-foodcost"
                  value={form.foodCost}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      foodCost: event.target.value,
                    }))
                  }
                  placeholder="4,20"
                  inputMode="decimal"
                />
              </Field>
            </div>
            <Field
              label="Allergeni"
              htmlFor="product-allergens"
              hint="Separati da virgola (es. glutine, latte, uova)."
            >
              <Input
                id="product-allergens"
                value={form.allergens}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    allergens: event.target.value,
                  }))
                }
                placeholder="glutine, latte"
              />
            </Field>
            <label className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2.5">
              <span>
                <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Disponibile
                </span>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
                  Se disattivato non è ordinabile dal POS.
                </span>
              </span>
              <Switch
                checked={form.available}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, available: checked }))
                }
              />
            </label>
            {editing?.variants && editing.variants.length > 0 ? (
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Le varianti esistenti ({editing.variants.map((variant) => variant.name).join(", ")})
                vengono mantenute.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={submit}>
              {editing ? "Salva modifiche" : "Aggiungi prodotto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminare il prodotto?"
        description={
          deleteTarget
            ? `«${deleteTarget.name}» verrà rimosso dal menu demo. Le comande già inviate non vengono modificate.`
            : ""
        }
        confirmLabel="Elimina"
        onConfirm={() => {
          if (deleteTarget) {
            deleteProduct(deleteTarget.id);
            toast.success(`«${deleteTarget.name}» eliminato dal menu`);
          }
        }}
      />
    </div>
  );
}

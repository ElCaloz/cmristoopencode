"use client";

import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { formatCents } from "@/lib/utils";
import {
  createCategoryAction,
  createItemAction,
  deleteCategoryAction,
  deleteItemAction,
  renameCategoryAction,
  toggleItemAvailabilityAction,
  updateItemAction,
} from "@/server/menu/actions";
import {
  initialMenuActionState,
  type MenuActionState,
  type MenuCategoryRow,
  type MenuItemRow,
} from "@/server/menu/types";

function toEuroInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

type ItemTarget =
  | { mode: "create"; categoryId: string | null }
  | { mode: "edit"; item: MenuItemRow };

type Props = {
  categories: MenuCategoryRow[];
  items: MenuItemRow[];
  canManage: boolean;
};

export function MenuManager({ categories, items, canManage }: Props) {
  const [categoryState, categoryFormAction, categoryPending] = useActionState(
    createCategoryAction,
    initialMenuActionState,
  );
  const categoryFormRef = useRef<HTMLFormElement>(null);
  const [itemTarget, setItemTarget] = useState<ItemTarget | null>(null);
  const [renameTarget, setRenameTarget] = useState<MenuCategoryRow | null>(
    null,
  );
  const [deleteItemTarget, setDeleteItemTarget] = useState<MenuItemRow | null>(
    null,
  );
  const [deleteCategoryTarget, setDeleteCategoryTarget] =
    useState<MenuCategoryRow | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (categoryState.status === "success") {
      categoryFormRef.current?.reset();
      toast.success(categoryState.message ?? "Categoria creata.");
    } else if (
      categoryState.status === "error" &&
      categoryState.message &&
      !categoryState.fieldErrors
    ) {
      toast.error(categoryState.message);
    }
  }, [categoryState]);

  const categoryName = (categoryId: string | null) =>
    categories.find((category) => category.id === categoryId)?.name ?? null;

  const itemsInCategory = (categoryId: string | null) =>
    items.filter((item) => item.categoryId === categoryId).length;

  const filteredItems = items.filter((item) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "none") return item.categoryId === null;
    return item.categoryId === categoryFilter;
  });

  const runAction = (
    action: (state: MenuActionState, formData: FormData) => Promise<MenuActionState>,
    entries: Record<string, string>,
  ) => {
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(entries)) {
        formData.set(key, value);
      }
      const result = await action(initialMenuActionState, formData);
      if (result.status === "success") {
        toast.success(result.message ?? "Operazione completata.");
      } else {
        toast.error(result.message ?? "Operazione non riuscita.");
      }
    });
  };

  const columns: DataTableColumn<MenuItemRow>[] = [
    {
      id: "name",
      header: "Prodotto",
      sortValue: (item) => item.name,
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {item.name}
          </p>
          <p className="line-clamp-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            {item.description || "Nessuna descrizione"}
          </p>
        </div>
      ),
    },
    {
      id: "category",
      header: "Categoria",
      sortValue: (item) => categoryName(item.categoryId) ?? "",
      cell: (item) => (
        <Badge variant="secondary">
          {categoryName(item.categoryId) ?? "Senza categoria"}
        </Badge>
      ),
    },
    {
      id: "price",
      header: "Prezzo",
      sortValue: (item) => item.priceCents,
      cell: (item) => (
        <span className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
          {formatCents(item.priceCents)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Stato",
      cell: (item) =>
        item.isAvailable ? (
          <Badge variant="success" dot>
            Disponibile
          </Badge>
        ) : (
          <Badge variant="warning" dot>
            Esaurito
          </Badge>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-brand-700" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Categorie
          </h2>
          <Badge variant="secondary">{categories.length}</Badge>
        </div>

        {categories.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessuna categoria: crea la prima per organizzare il menu.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {category.name}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {itemsInCategory(category.id)}{" "}
                    {itemsInCategory(category.id) === 1 ? "prodotto" : "prodotti"}
                  </span>
                </div>
                {canManage ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Rinomina ${category.name}`}
                      onClick={() => setRenameTarget(category)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                      aria-label={`Elimina ${category.name}`}
                      onClick={() => setDeleteCategoryTarget(category)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <form
            ref={categoryFormRef}
            action={categoryFormAction}
            className="mt-4 flex flex-wrap items-start gap-2"
          >
            <div className="w-full max-w-xs">
              <Input
                name="name"
                placeholder="Nuova categoria (es. Antipasti)"
                aria-label="Nome nuova categoria"
                maxLength={80}
                required
              />
              {categoryState.fieldErrors?.name ? (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {categoryState.fieldErrors.name}
                </p>
              ) : null}
            </div>
            <Button type="submit" size="sm" disabled={categoryPending}>
              <Plus />
              Aggiungi categoria
            </Button>
          </form>
        ) : null}
      </section>

      <DataTable
        data={filteredItems}
        columns={columns}
        getRowId={(item) => item.id}
        searchText={(item) =>
          `${item.name} ${item.description} ${categoryName(item.categoryId) ?? ""}`
        }
        searchPlaceholder="Cerca prodotto…"
        onRowClick={
          canManage
            ? (item) => setItemTarget({ mode: "edit", item })
            : undefined
        }
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
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              <option value="none">Senza categoria</option>
            </Select>
            {canManage ? (
              <Button
                size="sm"
                onClick={() => setItemTarget({ mode: "create", categoryId: null })}
              >
                <Plus />
                Nuovo prodotto
              </Button>
            ) : null}
          </>
        }
        rowActions={
          canManage
            ? (item) => (
                <RowMenu
                  items={[
                    {
                      label: "Modifica",
                      icon: Pencil,
                      onSelect: () => setItemTarget({ mode: "edit", item }),
                    },
                    {
                      label: item.isAvailable
                        ? "Segna esaurito"
                        : "Rendi disponibile",
                      onSelect: () =>
                        runAction(toggleItemAvailabilityAction, {
                          itemId: item.id,
                          available: item.isAvailable ? "false" : "true",
                        }),
                    },
                    {
                      label: "Elimina",
                      icon: Trash2,
                      destructive: true,
                      separatorBefore: true,
                      onSelect: () => setDeleteItemTarget(item),
                    },
                  ]}
                />
              )
            : undefined
        }
        emptyTitle="Nessun prodotto"
        emptyDescription={
          categories.length === 0
            ? "Crea prima una categoria, poi aggiungi i prodotti del menu."
            : "Aggiungi il primo prodotto al menu del ristorante."
        }
        emptyAction={
          canManage ? (
            <Button
              size="sm"
              onClick={() => setItemTarget({ mode: "create", categoryId: null })}
            >
              <Plus />
              Nuovo prodotto
            </Button>
          ) : undefined
        }
      />

      {itemTarget ? (
        <ItemFormDialog
          key={
            itemTarget.mode === "edit"
              ? `edit-${itemTarget.item.id}`
              : `create-${itemTarget.categoryId ?? "none"}`
          }
          target={itemTarget}
          categories={categories}
          onClose={() => setItemTarget(null)}
        />
      ) : null}

      {renameTarget ? (
        <RenameCategoryDialog
          key={`rename-${renameTarget.id}`}
          category={renameTarget}
          onClose={() => setRenameTarget(null)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteItemTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItemTarget(null);
        }}
        title="Eliminare il prodotto?"
        description={
          deleteItemTarget
            ? `«${deleteItemTarget.name}» verrà rimosso dal menu. Le comande e le vendite già registrate non vengono modificate.`
            : ""
        }
        confirmLabel="Elimina"
        onConfirm={() => {
          if (deleteItemTarget) {
            runAction(deleteItemAction, { itemId: deleteItemTarget.id });
          }
        }}
      />

      <ConfirmDialog
        open={deleteCategoryTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCategoryTarget(null);
        }}
        title="Eliminare la categoria?"
        description={
          deleteCategoryTarget
            ? `«${deleteCategoryTarget.name}» verrà eliminata. I prodotti restano nel menu come “Senza categoria”.`
            : ""
        }
        confirmLabel="Elimina"
        onConfirm={() => {
          if (deleteCategoryTarget) {
            runAction(deleteCategoryAction, {
              categoryId: deleteCategoryTarget.id,
            });
          }
        }}
      />
    </div>
  );
}

function ItemFormDialog({
  target,
  categories,
  onClose,
}: {
  target: ItemTarget;
  categories: MenuCategoryRow[];
  onClose: () => void;
}) {
  const action =
    target.mode === "create" ? createItemAction : updateItemAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialMenuActionState,
  );
  const item = target.mode === "edit" ? target.item : null;
  const initialCategory =
    target.mode === "edit"
      ? (target.item.categoryId ?? "")
      : (target.categoryId ?? "");

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Prodotto salvato.");
      onClose();
    }
  }, [state, onClose]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? "Modifica prodotto" : "Nuovo prodotto"}
          </DialogTitle>
          <DialogDescription>
            Prezzo in euro, come esposto al cliente. Il prodotto è disponibile
            subito dopo il salvataggio.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {item ? <input type="hidden" name="itemId" value={item.id} /> : null}
          <Field label="Nome" htmlFor="menu-item-name" error={state.fieldErrors?.name}>
            <Input
              id="menu-item-name"
              name="name"
              defaultValue={item?.name ?? ""}
              placeholder="Es. Bruschetta al pomodoro"
              maxLength={120}
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Prezzo (€)"
              htmlFor="menu-item-price"
              error={state.fieldErrors?.price}
            >
              <Input
                id="menu-item-price"
                name="price"
                defaultValue={item ? toEuroInput(item.priceCents) : ""}
                placeholder="6,50"
                inputMode="decimal"
                required
              />
            </Field>
            <Field
              label="Categoria"
              htmlFor="menu-item-category"
              error={state.fieldErrors?.categoryId}
            >
              <Select
                id="menu-item-category"
                name="categoryId"
                defaultValue={initialCategory}
              >
                <option value="">Senza categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Descrizione"
            htmlFor="menu-item-description"
            error={state.fieldErrors?.description}
          >
            <Textarea
              id="menu-item-description"
              name="description"
              defaultValue={item?.description ?? ""}
              maxLength={500}
              className="min-h-16"
              placeholder="Ingredienti principali, indicazioni utili…"
            />
          </Field>
          {state.status === "error" && state.message ? (
            <p role="alert" className="text-xs text-red-600">
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              {item ? "Salva modifiche" : "Aggiungi prodotto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameCategoryDialog({
  category,
  onClose,
}: {
  category: MenuCategoryRow;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    renameCategoryAction,
    initialMenuActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Categoria aggiornata.");
      onClose();
    }
  }, [state, onClose]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rinomina categoria</DialogTitle>
          <DialogDescription>
            Il nuovo nome è visibile subito nell&apos;area reale.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="categoryId" value={category.id} />
          <Field
            label="Nome"
            htmlFor="category-rename-name"
            error={state.fieldErrors?.name}
          >
            <Input
              id="category-rename-name"
              name="name"
              defaultValue={category.name}
              maxLength={80}
              required
            />
          </Field>
          {state.status === "error" && state.message ? (
            <p role="alert" className="text-xs text-red-600">
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              Salva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

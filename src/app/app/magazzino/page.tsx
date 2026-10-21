"use client";

import {
  Mail,
  Minus,
  Package,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  Truck,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RowMenu } from "@/components/ui/row-menu";
import { StatCard } from "@/components/ui/stat-card";
import { StockBadge } from "@/components/ui/status-badge";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import type { InventoryItem } from "@/lib/demo/types";
import {
  formatCents,
  makeId,
  parseEuroToCents,
} from "@/lib/utils";

type ItemForm = {
  name: string;
  category: string;
  unit: string;
  qty: string;
  minQty: string;
  cost: string;
  supplierId: string;
};

const emptyForm: ItemForm = {
  name: "",
  category: "",
  unit: "kg",
  qty: "0",
  minQty: "0",
  cost: "0,00",
  supplierId: "",
};

export default function MagazzinoPage() {
  const restaurant = useActiveRestaurant();
  const inventory = useDemoStore((state) => state.inventory);
  const suppliers = useDemoStore((state) => state.suppliers);
  const adjustStock = useDemoStore((state) => state.adjustStock);
  const saveInventoryItem = useDemoStore((state) => state.saveInventoryItem);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);

  if (!restaurant) return null;

  const restaurantItems = inventory.filter(
    (item) => item.restaurantId === restaurant.id,
  );
  const restaurantSuppliers = suppliers.filter(
    (supplier) => supplier.restaurantId === restaurant.id,
  );
  const lowStock = restaurantItems.filter((item) => item.qty <= item.minQty);
  const inventoryValue = restaurantItems.reduce(
    (sum, item) => sum + item.qty * item.costPerUnitCents,
    0,
  );
  const supplierName = (id: string) =>
    restaurantSuppliers.find((supplier) => supplier.id === id)?.name ??
    "Fornitore non assegnato";

  const openNew = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      supplierId: restaurantSuppliers[0]?.id ?? "",
    });
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      qty: String(item.qty),
      minQty: String(item.minQty),
      cost: (item.costPerUnitCents / 100).toFixed(2).replace(".", ","),
      supplierId: item.supplierId,
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Inserisci il nome dell'articolo.");
      return;
    }
    const qty = Number(form.qty);
    const minQty = Number(form.minQty);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("La giacenza deve essere un numero non negativo.");
      return;
    }
    if (!Number.isFinite(minQty) || minQty < 0) {
      toast.error("La soglia minima deve essere un numero non negativo.");
      return;
    }
    const item: InventoryItem = {
      id: editing?.id ?? makeId("inv"),
      restaurantId: restaurant.id,
      name: form.name.trim(),
      category: form.category.trim() || "Generale",
      unit: form.unit.trim() || "pz",
      qty,
      minQty,
      costPerUnitCents: parseEuroToCents(form.cost),
      supplierId: form.supplierId,
    };
    saveInventoryItem(item);
    setDialogOpen(false);
    toast.success(editing ? "Articolo aggiornato" : "Articolo aggiunto", {
      description: `«${item.name}» salvato nel magazzino demo.`,
    });
  };

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      id: "name",
      header: "Articolo",
      sortValue: (item) => item.name,
      cell: (item) => (
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{item.name}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{item.category}</p>
        </div>
      ),
    },
    {
      id: "supplier",
      header: "Fornitore",
      sortValue: (item) => supplierName(item.supplierId),
      cell: (item) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {supplierName(item.supplierId)}
        </span>
      ),
    },
    {
      id: "qty",
      header: "Giacenza",
      sortValue: (item) => item.qty,
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              adjustStock(item.id, -1);
            }}
            className="flex size-6 items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={`Scarica un ${item.unit} di ${item.name}`}
          >
            <Minus className="size-3" />
          </button>
          <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
            {item.qty} {item.unit}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              adjustStock(item.id, 1);
            }}
            className="flex size-6 items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={`Carica un ${item.unit} di ${item.name}`}
          >
            <Plus className="size-3" />
          </button>
        </div>
      ),
    },
    {
      id: "min",
      header: "Soglia",
      sortValue: (item) => item.minQty,
      cell: (item) => (
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {item.minQty} {item.unit}
        </span>
      ),
    },
    {
      id: "cost",
      header: "Costo unitario",
      sortValue: (item) => item.costPerUnitCents,
      cell: (item) => (
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatCents(item.costPerUnitCents)}
        </span>
      ),
    },
    {
      id: "value",
      header: "Valore",
      sortValue: (item) => item.qty * item.costPerUnitCents,
      cell: (item) => (
        <span className="text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
          {formatCents(item.qty * item.costPerUnitCents)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Stato",
      cell: (item) => <StockBadge low={item.qty <= item.minQty} />,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Scorte e fornitori"
        title="Magazzino"
        description="Scorte, soglie minime, fornitori e valore di magazzino. Carichi e scarichi aggiornano subito la demo."
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button onClick={openNew}>
            <Plus />
            Nuovo articolo
          </Button>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Articoli monitorati"
          value={String(restaurantItems.length)}
          icon={Package}
          hint={`${restaurantSuppliers.length} fornitori`}
        />
        <StatCard
          label="Sotto scorta"
          value={String(lowStock.length)}
          icon={PackagePlus}
          hint={
            lowStock.length > 0
              ? `da riordinare: ${lowStock
                  .slice(0, 2)
                  .map((item) => item.name)
                  .join(", ")}`
              : "tutte le scorte sono ok"
          }
        />
        <StatCard
          label="Valore magazzino"
          value={formatCents(inventoryValue)}
          icon={Wallet}
          hint="stimato sui costi unitari demo"
        />
        <StatCard
          label="Fornitori attivi"
          value={String(restaurantSuppliers.length)}
          icon={Truck}
          hint="anagrafica dimostrativa"
        />
      </div>

      <div className="mt-4">
        <DataTable
          data={restaurantItems}
          columns={columns}
          getRowId={(item) => item.id}
          searchText={(item) =>
            `${item.name} ${item.category} ${supplierName(item.supplierId)}`
          }
          searchPlaceholder="Cerca articolo o fornitore…"
          pageSize={10}
          onRowClick={openEdit}
          rowActions={(item) => (
            <RowMenu
              items={[
                {
                  label: "Modifica",
                  icon: Pencil,
                  onSelect: () => openEdit(item),
                },
                {
                  label: "Carico demo +10",
                  icon: PackagePlus,
                  onSelect: () => {
                    adjustStock(item.id, 10);
                    toast.success(`Carico di 10 ${item.unit} registrato`, {
                      description: `${item.name} aggiornato nel magazzino demo.`,
                    });
                  },
                },
              ]}
            />
          )}
          emptyTitle="Magazzino vuoto"
          emptyDescription="Aggiungi il primo articolo per monitorare le scorte."
          emptyAction={
            <Button size="sm" onClick={openNew}>
              <Plus />
              Nuovo articolo
            </Button>
          }
        />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Fornitori</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Contatti dimostrativi per riordini
            </p>
          </div>
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {restaurantSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                    {supplier.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{supplier.category}</p>
                </div>
                <Truck className="size-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
              </div>
              <div className="mt-2 space-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                <a
                  href={`mailto:${supplier.email}`}
                  className="flex min-h-6 items-center gap-1.5 py-0.5 hover:text-brand-700 dark:hover:text-brand-400"
                >
                  <Mail className="size-3" />
                  {supplier.email}
                </a>
                <a
                  href={`tel:${supplier.phone.replace(/\s/g, "")}`}
                  className="flex min-h-6 items-center gap-1.5 py-0.5 hover:text-brand-700 dark:hover:text-brand-400"
                >
                  <Phone className="size-3" />
                  {supplier.phone}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica articolo" : "Nuovo articolo"}
            </DialogTitle>
            <DialogDescription>
              Le quantità sono dimostrative e non generano ordini ai fornitori.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome articolo" htmlFor="inv-name">
                <Input
                  id="inv-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Mozzarella fiordilatte"
                />
              </Field>
              <Field label="Categoria" htmlFor="inv-category">
                <Input
                  id="inv-category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  placeholder="Latticini"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Unità" htmlFor="inv-unit">
                <Input
                  id="inv-unit"
                  value={form.unit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      unit: event.target.value,
                    }))
                  }
                  placeholder="kg"
                />
              </Field>
              <Field label="Giacenza" htmlFor="inv-qty">
                <Input
                  id="inv-qty"
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.qty}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qty: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Soglia minima" htmlFor="inv-min">
                <Input
                  id="inv-min"
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.minQty}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      minQty: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Costo unitario (€)" htmlFor="inv-cost">
                <Input
                  id="inv-cost"
                  value={form.cost}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cost: event.target.value,
                    }))
                  }
                  placeholder="8,90"
                  inputMode="decimal"
                />
              </Field>
              <Field label="Fornitore" htmlFor="inv-supplier">
                <Select
                  id="inv-supplier"
                  value={form.supplierId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      supplierId: event.target.value,
                    }))
                  }
                >
                  <option value="">Nessun fornitore</option>
                  {restaurantSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={submit}>
              {editing ? "Salva modifiche" : "Aggiungi articolo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

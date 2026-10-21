"use client";

import {
  HeartHandshake,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  Wallet,
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
import { Field, Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RowMenu } from "@/components/ui/row-menu";
import { StatCard } from "@/components/ui/stat-card";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import type { Customer } from "@/lib/demo/types";
import {
  addDays,
  formatCents,
  formatShortDate,
  makeId,
  toISODate,
  todayISODate,
} from "@/lib/utils";

type CustomerForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string;
  allergies: string;
};

const emptyForm: CustomerForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  tags: "",
  allergies: "",
};

export default function ClientiPage() {
  const restaurant = useActiveRestaurant();
  const customers = useDemoStore((state) => state.customers);
  const saveCustomer = useDemoStore((state) => state.saveCustomer);
  const deleteCustomer = useDemoStore((state) => state.deleteCustomer);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  if (!restaurant) return null;

  const restaurantCustomers = customers.filter(
    (customer) => customer.restaurantId === restaurant.id,
  );
  const totalSpent = restaurantCustomers.reduce(
    (sum, customer) => sum + customer.totalSpentCents,
    0,
  );
  const repeaters = restaurantCustomers.filter(
    (customer) => customer.visits >= 5,
  );
  const activeThreshold = toISODate(addDays(new Date(), -30));
  const activeCustomers = restaurantCustomers.filter(
    (customer) => customer.lastVisit >= activeThreshold,
  );
  const averageSpent =
    restaurantCustomers.length > 0
      ? Math.round(totalSpent / restaurantCustomers.length)
      : 0;

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      tags: customer.tags.join(", "),
      allergies: customer.allergies ?? "",
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Nome e cognome sono obbligatori.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Inserisci un indirizzo email.");
      return;
    }
    const customer: Customer = {
      id: editing?.id ?? makeId("cust"),
      restaurantId: restaurant.id,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      visits: editing?.visits ?? 0,
      totalSpentCents: editing?.totalSpentCents ?? 0,
      lastVisit: editing?.lastVisit ?? todayISODate(),
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      allergies: form.allergies.trim() || undefined,
    };
    saveCustomer(customer);
    setDialogOpen(false);
    toast.success(editing ? "Cliente aggiornato" : "Cliente aggiunto", {
      description: `${customer.firstName} ${customer.lastName} salvato nella demo.`,
    });
  };

  const columns: DataTableColumn<Customer>[] = [
    {
      id: "name",
      header: "Cliente",
      sortValue: (customer) =>
        `${customer.lastName} ${customer.firstName}`,
      cell: (customer) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950 text-[10px] font-semibold text-brand-800 dark:text-brand-300">
            {customer.firstName[0]}
            {customer.lastName[0]}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {customer.firstName} {customer.lastName}
            </p>
            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {customer.tags.length > 0
                ? customer.tags.join(" · ")
                : "Nessun tag"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contatti",
      cell: (customer) => (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          <p className="truncate">{customer.email}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{customer.phone}</p>
        </div>
      ),
    },
    {
      id: "visits",
      header: "Visite",
      sortValue: (customer) => customer.visits,
      cell: (customer) => (
        <span className="text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
          {customer.visits}
        </span>
      ),
    },
    {
      id: "spent",
      header: "Spesa totale",
      sortValue: (customer) => customer.totalSpentCents,
      cell: (customer) => (
        <div>
          <p className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
            {formatCents(customer.totalSpentCents)}
          </p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            media{" "}
            {formatCents(
              customer.visits > 0
                ? Math.round(customer.totalSpentCents / customer.visits)
                : 0,
            )}
          </p>
        </div>
      ),
    },
    {
      id: "lastVisit",
      header: "Ultima visita",
      sortValue: (customer) => customer.lastVisit,
      cell: (customer) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatShortDate(`${customer.lastVisit}T12:00:00`)}
        </span>
      ),
    },
    {
      id: "allergies",
      header: "Allergie",
      cell: (customer) =>
        customer.allergies ? (
          <Badge variant="warning">{customer.allergies}</Badge>
        ) : (
          <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Relazioni e fidelizzazione"
        title="Clienti"
        description="Anagrafica, preferenze e storico demo del locale. I dati restano nel browser e non vengono inviati."
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button onClick={openNew}>
            <Plus />
            Nuovo cliente
          </Button>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Clienti in anagrafica"
          value={String(restaurantCustomers.length)}
          icon={Users}
          hint={`${activeCustomers.length} attivi negli ultimi 30 giorni`}
        />
        <StatCard
          label="Clienti abituali"
          value={String(repeaters.length)}
          icon={HeartHandshake}
          hint="5 visite o più"
        />
        <StatCard
          label="Valore storico"
          value={formatCents(totalSpent)}
          icon={Wallet}
          hint="spesa cumulata demo"
        />
        <StatCard
          label="Spesa media cliente"
          value={formatCents(averageSpent)}
          icon={Sparkles}
          hint="su tutto lo storico"
        />
      </div>

      <div className="mt-4">
        <DataTable
          data={restaurantCustomers}
          columns={columns}
          getRowId={(customer) => customer.id}
          searchText={(customer) =>
            `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phone} ${customer.tags.join(" ")}`
          }
          searchPlaceholder="Cerca cliente…"
          pageSize={10}
          onRowClick={openEdit}
          rowActions={(customer) => (
            <RowMenu
              items={[
                {
                  label: "Modifica",
                  icon: Pencil,
                  onSelect: () => openEdit(customer),
                },
                {
                  label: "Elimina",
                  icon: Trash2,
                  destructive: true,
                  separatorBefore: true,
                  onSelect: () => setDeleteTarget(customer),
                },
              ]}
            />
          )}
          emptyTitle="Nessun cliente"
          emptyDescription="Aggiungi il primo cliente per iniziare a costruire l'anagrafica."
          emptyAction={
            <Button size="sm" onClick={openNew}>
              <Plus />
              Nuovo cliente
            </Button>
          }
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica cliente" : "Nuovo cliente"}
            </DialogTitle>
            <DialogDescription>
              Dati dimostrativi per CRM, preferenze e allergie. Nessun invio
              email o SMS in questa demo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" htmlFor="customer-first">
                <Input
                  id="customer-first"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  placeholder="Laura"
                />
              </Field>
              <Field label="Cognome" htmlFor="customer-last">
                <Input
                  id="customer-last"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  placeholder="Vanni"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email" htmlFor="customer-email">
                <Input
                  id="customer-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="nome@email.it"
                />
              </Field>
              <Field label="Telefono" htmlFor="customer-phone">
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="333 123 4567"
                />
              </Field>
            </div>
            <Field
              label="Tag"
              htmlFor="customer-tags"
              hint="Separati da virgola, es. Abituale, VIP, Famiglie."
            >
              <Input
                id="customer-tags"
                value={form.tags}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tags: event.target.value,
                  }))
                }
                placeholder="Abituale, Vino"
              />
            </Field>
            <Field label="Allergie e intolleranze" htmlFor="customer-allergies">
              <Textarea
                id="customer-allergies"
                value={form.allergies}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    allergies: event.target.value,
                  }))
                }
                placeholder="Es. glutine, frutta a guscio…"
                className="min-h-16"
              />
            </Field>
            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              <UserRound className="mt-0.5 size-3 shrink-0" />
              Nella versione reale l&apos;anagrafica clienti sarà protetta da
              permessi e consenso privacy sul server.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={submit}>
              {editing ? "Salva modifiche" : "Aggiungi cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminare il cliente?"
        description={
          deleteTarget
            ? `${deleteTarget.firstName} ${deleteTarget.lastName} verrà rimosso dall'anagrafica demo. Le prenotazioni e gli ordini esistenti non vengono modificati.`
            : ""
        }
        confirmLabel="Elimina"
        onConfirm={() => {
          if (deleteTarget) {
            deleteCustomer(deleteTarget.id);
            toast.success("Cliente eliminato dalla demo");
          }
        }}
      />
    </div>
  );
}

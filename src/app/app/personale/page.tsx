"use client";

import {
  ChefHat,
  Pencil,
  Plus,
  Trash2,
  UserCog,
  UserPlus,
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
import { Field, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RowMenu } from "@/components/ui/row-menu";
import { StatCard } from "@/components/ui/stat-card";
import { StaffRoleBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { useActiveRestaurant, useDemoStore } from "@/lib/demo/store";
import { STAFF_ROLE_LABELS } from "@/lib/demo/calc";
import type { StaffMember, StaffRole } from "@/lib/demo/types";
import {
  formatShortDate,
  makeId,
  parseEuroToCents,
  todayISODate,
} from "@/lib/utils";

type StaffForm = {
  name: string;
  role: StaffRole;
  email: string;
  phone: string;
  hourlyRate: string;
  hiredAt: string;
  active: boolean;
};

const emptyForm = (): StaffForm => ({
  name: "",
  role: "cameriere",
  email: "",
  phone: "",
  hourlyRate: "12,00",
  hiredAt: todayISODate(),
  active: true,
});

const ROLES = Object.keys(STAFF_ROLE_LABELS) as StaffRole[];

export default function PersonalePage() {
  const restaurant = useActiveRestaurant();
  const staff = useDemoStore((state) => state.staff);
  const saveStaffMember = useDemoStore((state) => state.saveStaffMember);
  const setStaffActive = useDemoStore((state) => state.setStaffActive);
  const deleteStaffMember = useDemoStore((state) => state.deleteStaffMember);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);

  if (!restaurant) return null;

  const restaurantStaff = staff.filter(
    (member) => member.restaurantId === restaurant.id,
  );
  const activeStaff = restaurantStaff.filter((member) => member.active);
  const kitchenStaff = restaurantStaff.filter(
    (member) => member.role === "cucina",
  );
  const hourlyCost = activeStaff.reduce(
    (sum, member) => sum + member.hourlyRateCents,
    0,
  );

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setForm({
      name: member.name,
      role: member.role,
      email: member.email,
      phone: member.phone,
      hourlyRate: (member.hourlyRateCents / 100)
        .toFixed(2)
        .replace(".", ","),
      hiredAt: member.hiredAt,
      active: member.active,
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Inserisci nome e cognome.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Inserisci un indirizzo email.");
      return;
    }
    const member: StaffMember = {
      id: editing?.id ?? makeId("st"),
      restaurantId: restaurant.id,
      name: form.name.trim(),
      role: form.role,
      email: form.email.trim(),
      phone: form.phone.trim(),
      active: form.active,
      hiredAt: form.hiredAt || todayISODate(),
      hourlyRateCents: parseEuroToCents(form.hourlyRate),
    };
    saveStaffMember(member);
    setDialogOpen(false);
    toast.success(editing ? "Membro aggiornato" : "Membro aggiunto", {
      description: `${member.name} · ${STAFF_ROLE_LABELS[member.role]} (demo).`,
    });
  };

  const columns: DataTableColumn<StaffMember>[] = [
    {
      id: "name",
      header: "Persona",
      sortValue: (member) => member.name,
      cell: (member) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
            {member.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {member.name}
            </p>
            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Ruolo",
      sortValue: (member) => member.role,
      cell: (member) => <StaffRoleBadge role={member.role} />,
    },
    {
      id: "phone",
      header: "Telefono",
      cell: (member) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{member.phone || "—"}</span>
      ),
    },
    {
      id: "rate",
      header: "Costo orario",
      sortValue: (member) => member.hourlyRateCents,
      cell: (member) =>
        member.hourlyRateCents > 0 ? (
          <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {(member.hourlyRateCents / 100).toFixed(2).replace(".", ",")} €/h
          </span>
        ) : (
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Titolare</span>
        ),
    },
    {
      id: "hiredAt",
      header: "Dal",
      sortValue: (member) => member.hiredAt,
      cell: (member) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatShortDate(`${member.hiredAt}T12:00:00`)}
        </span>
      ),
    },
    {
      id: "active",
      header: "Attivo",
      cell: (member) => (
        <div onClick={(event) => event.stopPropagation()}>
          <Switch
            checked={member.active}
            onCheckedChange={(checked) => {
              setStaffActive(member.id, checked);
              toast.success(
                checked
                  ? `${member.name} attivato`
                  : `${member.name} disattivato`,
                { description: "Stato account demo aggiornato." },
              );
            }}
            aria-label={`Attivo ${member.name}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Squadra e turni"
        title="Personale"
        description="Staff, ruoli e costo orario del locale. La gestione account e turni reali sarà collegata al backend."
        badge={<Badge variant="warning">Demo</Badge>}
        actions={
          <Button onClick={openNew}>
            <UserPlus />
            Nuovo membro
          </Button>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Persone in organico"
          value={String(restaurantStaff.length)}
          icon={Users}
          hint={`${activeStaff.length} attive`}
        />
        <StatCard
          label="In cucina"
          value={String(kitchenStaff.length)}
          icon={ChefHat}
          hint="ruolo cucina"
        />
        <StatCard
          label="Costo orario attivo"
          value={`${(hourlyCost / 100).toFixed(2).replace(".", ",")} €`}
          icon={Wallet}
          hint="somma delle retribuzioni demo"
        />
        <StatCard
          label="Ruoli coperti"
          value={String(
            new Set(restaurantStaff.map((member) => member.role)).size,
          )}
          icon={UserCog}
          hint={`su ${ROLES.length} ruoli disponibili`}
        />
      </div>

      <div className="mt-4">
        <DataTable
          data={restaurantStaff}
          columns={columns}
          getRowId={(member) => member.id}
          searchText={(member) =>
            `${member.name} ${member.email} ${member.phone} ${STAFF_ROLE_LABELS[member.role]}`
          }
          searchPlaceholder="Cerca persona, email o ruolo…"
          pageSize={10}
          onRowClick={openEdit}
          rowActions={(member) => (
            <RowMenu
              items={[
                {
                  label: "Modifica",
                  icon: Pencil,
                  onSelect: () => openEdit(member),
                },
                {
                  label: member.active ? "Disattiva" : "Attiva",
                  icon: UserCog,
                  onSelect: () => {
                    setStaffActive(member.id, !member.active);
                    toast.success(
                      member.active
                        ? `${member.name} disattivato`
                        : `${member.name} attivato`,
                    );
                  },
                },
                {
                  label: "Elimina",
                  icon: Trash2,
                  destructive: true,
                  separatorBefore: true,
                  onSelect: () => setDeleteTarget(member),
                },
              ]}
            />
          )}
          emptyTitle="Nessun membro dello staff"
          emptyDescription="Aggiungi il primo membro del team per gestire ruoli e accessi demo."
          emptyAction={
            <Button size="sm" onClick={openNew}>
              <Plus />
              Nuovo membro
            </Button>
          }
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica membro" : "Nuovo membro"}
            </DialogTitle>
            <DialogDescription>
              Ruoli e permessi sono dimostrativi: nella versione reale gli
              accessi saranno gestiti lato server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Nome e cognome" htmlFor="staff-name">
              <Input
                id="staff-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Luca Marchetti"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ruolo" htmlFor="staff-role">
                <Select
                  id="staff-role"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as StaffRole,
                    }))
                  }
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {STAFF_ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Costo orario (€)" htmlFor="staff-rate">
                <Input
                  id="staff-rate"
                  value={form.hourlyRate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      hourlyRate: event.target.value,
                    }))
                  }
                  placeholder="12,00"
                  inputMode="decimal"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email" htmlFor="staff-email">
                <Input
                  id="staff-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="nome@ristorante.it"
                />
              </Field>
              <Field label="Telefono" htmlFor="staff-phone">
                <Input
                  id="staff-phone"
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data di assunzione" htmlFor="staff-hired">
                <Input
                  id="staff-hired"
                  type="date"
                  value={form.hiredAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      hiredAt: event.target.value,
                    }))
                  }
                />
              </Field>
              <label className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 sm:mt-6">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Account attivo
                </span>
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, active: checked }))
                  }
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={submit}>
              {editing ? "Salva modifiche" : "Aggiungi membro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Rimuovere il membro?"
        description={
          deleteTarget
            ? `${deleteTarget.name} verrà rimosso dallo staff demo. Puoi ripristinare i dati demo in qualsiasi momento.`
            : ""
        }
        confirmLabel="Rimuovi"
        onConfirm={() => {
          if (deleteTarget) {
            deleteStaffMember(deleteTarget.id);
            toast.success("Membro rimosso dallo staff demo");
          }
        }}
      />
    </div>
  );
}

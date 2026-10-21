"use client";

import { LayoutGrid, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { FloorPlan } from "@/components/dashboard/floor-plan";
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
import { RowMenu } from "@/components/ui/row-menu";
import {
  createAreaAction,
  createTableAction,
  deleteAreaAction,
  deleteTableAction,
  renameAreaAction,
  toggleTableActiveAction,
  updateTableAction,
} from "@/server/tables/actions";
import {
  initialFloorActionState,
  type FloorActionState,
  type FloorAreaRow,
  type FloorObjectRow,
  type FloorTableRow,
} from "@/server/tables/types";

type TableTarget =
  | { mode: "create"; areaId: string | null }
  | { mode: "edit"; table: FloorTableRow };

type Props = {
  areas: FloorAreaRow[];
  tables: FloorTableRow[];
  objects: FloorObjectRow[];
  canManage: boolean;
};

export function FloorManager({ areas, tables, objects, canManage }: Props) {
  const [areaState, areaFormAction, areaPending] = useActionState(
    createAreaAction,
    initialFloorActionState,
  );
  const areaFormRef = useRef<HTMLFormElement>(null);
  const [tableTarget, setTableTarget] = useState<TableTarget | null>(null);
  const [renameTarget, setRenameTarget] = useState<FloorAreaRow | null>(null);
  const [deleteTableTarget, setDeleteTableTarget] =
    useState<FloorTableRow | null>(null);
  const [deleteAreaTarget, setDeleteAreaTarget] = useState<FloorAreaRow | null>(
    null,
  );
  const [areaFilter, setAreaFilter] = useState("all");
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (areaState.status === "success") {
      areaFormRef.current?.reset();
      toast.success(areaState.message ?? "Area creata.");
    } else if (
      areaState.status === "error" &&
      areaState.message &&
      !areaState.fieldErrors
    ) {
      toast.error(areaState.message);
    }
  }, [areaState]);

  const areaName = (areaId: string | null) =>
    areas.find((area) => area.id === areaId)?.name ?? null;

  const tablesInArea = (areaId: string | null) =>
    tables.filter((table) => table.areaId === areaId).length;

  const seatsInArea = (areaId: string | null) =>
    tables
      .filter((table) => table.areaId === areaId)
      .reduce((total, table) => total + table.seats, 0);

  const filteredTables = tables.filter((table) => {
    if (areaFilter === "all") return true;
    if (areaFilter === "none") return table.areaId === null;
    return table.areaId === areaFilter;
  });

  const runAction = (
    action: (state: FloorActionState, formData: FormData) => Promise<FloorActionState>,
    entries: Record<string, string>,
  ) => {
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(entries)) {
        formData.set(key, value);
      }
      const result = await action(initialFloorActionState, formData);
      if (result.status === "success") {
        toast.success(result.message ?? "Operazione completata.");
      } else {
        toast.error(result.message ?? "Operazione non riuscita.");
      }
    });
  };

  const columns: DataTableColumn<FloorTableRow>[] = [
    {
      id: "name",
      header: "Tavolo",
      sortValue: (table) => table.name,
      cell: (table) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {table.name}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {table.seats} {table.seats === 1 ? "posto" : "posti"}
          </p>
        </div>
      ),
    },
    {
      id: "area",
      header: "Area",
      sortValue: (table) => areaName(table.areaId) ?? "",
      cell: (table) => (
        <Badge variant="secondary">
          {areaName(table.areaId) ?? "Senza area"}
        </Badge>
      ),
    },
    {
      id: "seats",
      header: "Posti",
      sortValue: (table) => table.seats,
      cell: (table) => (
        <span className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
          {table.seats}
        </span>
      ),
    },
    {
      id: "status",
      header: "Stato",
      cell: (table) =>
        table.isActive ? (
          <Badge variant="success" dot>
            Attivo
          </Badge>
        ) : (
          <Badge variant="warning" dot>
            Sospeso
          </Badge>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <FloorPlan
        areas={areas}
        tables={tables}
        objects={objects}
        canManage={canManage}
        onEditTable={(table) => setTableTarget({ mode: "edit", table })}
      />

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-brand-700 dark:text-brand-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Aree
          </h2>
          <Badge variant="secondary">{areas.length}</Badge>
        </div>

        {areas.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessuna area: crea la prima (es. Sala principale, Veranda) per
            organizzare i tavoli del locale.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {areas.map((area) => (
              <li
                key={area.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {area.name}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {tablesInArea(area.id)}{" "}
                    {tablesInArea(area.id) === 1 ? "tavolo" : "tavoli"} ·{" "}
                    {seatsInArea(area.id)} posti
                  </span>
                </div>
                {canManage ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Rinomina ${area.name}`}
                      onClick={() => setRenameTarget(area)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                      aria-label={`Elimina ${area.name}`}
                      onClick={() => setDeleteAreaTarget(area)}
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
            ref={areaFormRef}
            action={areaFormAction}
            className="mt-4 flex flex-wrap items-start gap-2"
          >
            <div className="w-full max-w-xs">
              <Input
                name="name"
                placeholder="Nuova area (es. Veranda)"
                aria-label="Nome nuova area"
                maxLength={80}
                required
              />
              {areaState.fieldErrors?.name ? (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {areaState.fieldErrors.name}
                </p>
              ) : null}
            </div>
            <Button type="submit" size="sm" disabled={areaPending}>
              <Plus />
              Aggiungi area
            </Button>
          </form>
        ) : null}
      </section>

      <DataTable
        data={filteredTables}
        columns={columns}
        getRowId={(table) => table.id}
        searchText={(table) =>
          `${table.name} ${areaName(table.areaId) ?? ""} ${table.seats}`
        }
        searchPlaceholder="Cerca tavolo…"
        onRowClick={
          canManage
            ? (table) => setTableTarget({ mode: "edit", table })
            : undefined
        }
        pageSize={10}
        toolbar={
          <>
            <Select
              value={areaFilter}
              onChange={(event) => setAreaFilter(event.target.value)}
              className="h-8 w-44 text-xs"
              aria-label="Filtra per area"
            >
              <option value="all">Tutte le aree</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
              <option value="none">Senza area</option>
            </Select>
            {canManage ? (
              <Button
                size="sm"
                onClick={() => setTableTarget({ mode: "create", areaId: null })}
              >
                <Plus />
                Nuovo tavolo
              </Button>
            ) : null}
          </>
        }
        rowActions={
          canManage
            ? (table) => (
                <RowMenu
                  items={[
                    {
                      label: "Modifica",
                      icon: Pencil,
                      onSelect: () => setTableTarget({ mode: "edit", table }),
                    },
                    {
                      label: table.isActive ? "Sospendi" : "Riattiva",
                      onSelect: () =>
                        runAction(toggleTableActiveAction, {
                          tableId: table.id,
                          active: table.isActive ? "false" : "true",
                        }),
                    },
                    {
                      label: "Elimina",
                      icon: Trash2,
                      destructive: true,
                      separatorBefore: true,
                      onSelect: () => setDeleteTableTarget(table),
                    },
                  ]}
                />
              )
            : undefined
        }
        emptyTitle="Nessun tavolo"
        emptyDescription={
          areas.length === 0
            ? "Crea prima un'area (es. Sala principale), poi aggiungi i tavoli."
            : "Aggiungi il primo tavolo del locale con la sua capienza."
        }
        emptyAction={
          canManage ? (
            <Button
              size="sm"
              onClick={() => setTableTarget({ mode: "create", areaId: null })}
            >
              <Plus />
              Nuovo tavolo
            </Button>
          ) : undefined
        }
      />

      {tableTarget ? (
        <TableFormDialog
          key={
            tableTarget.mode === "edit"
              ? `edit-${tableTarget.table.id}`
              : `create-${tableTarget.areaId ?? "none"}`
          }
          target={tableTarget}
          areas={areas}
          onClose={() => setTableTarget(null)}
        />
      ) : null}

      {renameTarget ? (
        <RenameAreaDialog
          key={`rename-${renameTarget.id}`}
          area={renameTarget}
          onClose={() => setRenameTarget(null)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTableTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTableTarget(null);
        }}
        title="Eliminare il tavolo?"
        description={
          deleteTableTarget
            ? `«${deleteTableTarget.name}» verrà rimosso dalla sala. Le comande già registrate non vengono modificate.`
            : ""
        }
        confirmLabel="Elimina"
        onConfirm={() => {
          if (deleteTableTarget) {
            runAction(deleteTableAction, { tableId: deleteTableTarget.id });
          }
        }}
      />

      <ConfirmDialog
        open={deleteAreaTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAreaTarget(null);
        }}
        title="Eliminare l'area?"
        description={
          deleteAreaTarget
            ? `«${deleteAreaTarget.name}» verrà eliminata. I tavoli restano in sala come “Senza area”.`
            : ""
        }
        confirmLabel="Elimina"
        onConfirm={() => {
          if (deleteAreaTarget) {
            runAction(deleteAreaAction, { areaId: deleteAreaTarget.id });
          }
        }}
      />
    </div>
  );
}

function TableFormDialog({
  target,
  areas,
  onClose,
}: {
  target: TableTarget;
  areas: FloorAreaRow[];
  onClose: () => void;
}) {
  const action =
    target.mode === "create" ? createTableAction : updateTableAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialFloorActionState,
  );
  const table = target.mode === "edit" ? target.table : null;
  const initialArea =
    target.mode === "edit"
      ? (target.table.areaId ?? "")
      : (target.areaId ?? "");

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Tavolo salvato.");
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
            {table ? "Modifica tavolo" : "Nuovo tavolo"}
          </DialogTitle>
          <DialogDescription>
            Il tavolo è attivo subito dopo il salvataggio e disponibile per la
            sala e le prenotazioni.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {table ? <input type="hidden" name="tableId" value={table.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nome"
              htmlFor="floor-table-name"
              error={state.fieldErrors?.name}
            >
              <Input
                id="floor-table-name"
                name="name"
                defaultValue={table?.name ?? ""}
                placeholder="Es. T1"
                maxLength={40}
                required
              />
            </Field>
            <Field
              label="Posti"
              htmlFor="floor-table-seats"
              error={state.fieldErrors?.seats}
            >
              <Input
                id="floor-table-seats"
                name="seats"
                defaultValue={table ? String(table.seats) : ""}
                placeholder="4"
                inputMode="numeric"
                required
              />
            </Field>
          </div>
          <Field
            label="Area"
            htmlFor="floor-table-area"
            error={state.fieldErrors?.areaId}
          >
            <Select
              id="floor-table-area"
              name="areaId"
              defaultValue={initialArea}
            >
              <option value="">Senza area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </Select>
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
              {table ? "Salva modifiche" : "Aggiungi tavolo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameAreaDialog({
  area,
  onClose,
}: {
  area: FloorAreaRow;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    renameAreaAction,
    initialFloorActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Area aggiornata.");
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
          <DialogTitle>Rinomina area</DialogTitle>
          <DialogDescription>
            Il nuovo nome è visibile subito nell&apos;area reale.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="areaId" value={area.id} />
          <Field
            label="Nome"
            htmlFor="area-rename-name"
            error={state.fieldErrors?.name}
          >
            <Input
              id="area-rename-name"
              name="name"
              defaultValue={area.name}
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

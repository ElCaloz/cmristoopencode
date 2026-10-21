"use client";

import {
  Armchair,
  DoorOpen,
  LayoutGrid,
  Leaf,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveFloorLayoutAction } from "@/server/tables/actions";
import {
  FLOOR_GRID_X,
  FLOOR_GRID_Y,
  FLOOR_OBJECT_KINDS,
  FLOOR_SHAPES,
  initialFloorActionState,
  type FloorAreaRow,
  type FloorObjectKind,
  type FloorObjectRow,
  type FloorTableRow,
  type FloorTableShape,
} from "@/server/tables/types";

type Selection = { type: "table" | "object"; key: string } | null;

type DraftTable = {
  key: string;
  id: string | null;
  name: string;
  seats: number;
  shape: FloorTableShape;
  posX: number;
  posY: number;
  width: number;
  height: number;
  isActive: boolean;
};

type DraftObject = {
  key: string;
  id: string | null;
  kind: FloorObjectKind;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
};

const GRID_BACKGROUND = {
  backgroundImage:
    "linear-gradient(to right, rgba(113,113,122,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(113,113,122,0.22) 1px, transparent 1px)",
  backgroundSize: `${100 / 24}% ${100 / 16}%`,
} as const;

const OBJECT_LABELS: Record<FloorObjectKind, string> = {
  wall: "Muro",
  counter: "Banco",
  door: "Ingresso",
  plant: "Pianta",
  label: "Testo",
};

function clampInt(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

function itemStyle(item: {
  posX: number;
  posY: number;
  width: number;
  height: number;
}) {
  return {
    left: `${(item.posX / FLOOR_GRID_X) * 100}%`,
    top: `${(item.posY / FLOOR_GRID_Y) * 100}%`,
    width: `${(item.width / FLOOR_GRID_X) * 100}%`,
    height: `${(item.height / FLOOR_GRID_Y) * 100}%`,
  };
}

function tableTone(isActive: boolean): string {
  return isActive
    ? "border-emerald-300 bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-950 dark:border-emerald-700 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-50"
    : "border-dashed border-amber-400 bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.16)_0px,rgba(245,158,11,0.16)_6px,transparent_6px,transparent_12px)] text-amber-800 dark:text-amber-300";
}

function objectTone(kind: FloorObjectKind): string {
  switch (kind) {
    case "wall":
      return "rounded-[3px] bg-zinc-700/90 dark:bg-zinc-300/80";
    case "counter":
      return "rounded-md border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200";
    case "door":
      return "rounded-md border-2 border-dashed border-zinc-400 bg-white text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400";
    case "plant":
      return "rounded-full border border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300";
    case "label":
      return "bg-transparent text-zinc-500 dark:text-zinc-400";
  }
}

function findFreeSpot(
  items: { posX: number; posY: number; width: number; height: number }[],
  width: number,
  height: number,
) {
  for (let y = 2; y <= FLOOR_GRID_Y - height; y += 4) {
    for (let x = 2; x <= FLOOR_GRID_X - width; x += 4) {
      const overlaps = items.some(
        (item) =>
          x < item.posX + item.width &&
          x + width > item.posX &&
          y < item.posY + item.height &&
          y + height > item.posY,
      );
      if (!overlaps) return { posX: x, posY: y };
    }
  }
  return { posX: 2, posY: 2 };
}

function nextTableName(tables: DraftTable[]): string {
  const used = new Set(tables.map((table) => table.name.toLowerCase()));
  let index = 1;
  while (used.has(`t${index}`)) index += 1;
  return `T${index}`;
}

function toDraftTable(row: FloorTableRow): DraftTable {
  return {
    key: row.id,
    id: row.id,
    name: row.name,
    seats: row.seats,
    shape: row.shape,
    posX: row.posX,
    posY: row.posY,
    width: row.width,
    height: row.height,
    isActive: row.isActive,
  };
}

function toDraftObject(row: FloorObjectRow): DraftObject {
  return {
    key: row.id,
    id: row.id,
    kind: row.kind,
    label: row.label,
    posX: row.posX,
    posY: row.posY,
    width: row.width,
    height: row.height,
  };
}

type FloorPlanProps = {
  areas: FloorAreaRow[];
  tables: FloorTableRow[];
  objects: FloorObjectRow[];
  canManage: boolean;
  onEditTable: (table: FloorTableRow) => void;
};

export function FloorPlan({
  areas,
  tables,
  objects,
  canManage,
  onEditTable,
}: FloorPlanProps) {
  const [areaId, setAreaId] = useState(areas[0]?.id ?? "");
  const [editorOpen, setEditorOpen] = useState(false);

  const area =
    areas.find((item) => item.id === areaId) ?? areas[0] ?? null;
  const areaTables = area
    ? tables.filter((table) => table.areaId === area.id)
    : [];
  const areaObjects = area
    ? objects.filter((object) => object.areaId === area.id)
    : [];
  const unassigned = tables.filter((table) => table.areaId === null);

  if (areas.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <LayoutGrid className="mx-auto size-6 text-zinc-400" />
        <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          La piantina è vuota
        </h2>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Crea la prima area (es. Sala principale) qui sotto: apparirà qui la
          piantina grafica che potrai disporre con il pulsante{" "}
          <span className="font-medium">Modifica sala</span>.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-brand-700 dark:text-brand-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Piantina sala
          </h2>
          <Badge variant="secondary">
            {areaTables.length}{" "}
            {areaTables.length === 1 ? "tavolo" : "tavoli"}
          </Badge>
        </div>
        {canManage && area ? (
          <Button size="sm" onClick={() => setEditorOpen(true)}>
            <Pencil />
            Modifica sala
          </Button>
        ) : (
          <Badge variant="muted">Solo lettura</Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        {areas.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAreaId(item.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              item.id === areaId
                ? "bg-brand-700 text-white shadow-sm"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        {area ? (
          <div
            role="group"
            aria-label={`Piantina di ${area.name}`}
            className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={GRID_BACKGROUND}
            />
            {areaObjects.map((object) => (
              <div
                key={object.id}
                aria-hidden
                className={cn(
                  "pointer-events-none absolute flex items-center justify-center overflow-hidden",
                  objectTone(object.kind),
                )}
                style={itemStyle(object)}
              >
                <ObjectContent object={object} />
              </div>
            ))}
            {areaTables.map((table) => (
              <button
                key={table.id}
                type="button"
                disabled={!canManage}
                onClick={() => onEditTable(table)}
                aria-label={`Apri tavolo ${table.name}`}
                className={cn(
                  "absolute flex select-none flex-col items-center justify-center gap-0.5 overflow-hidden border px-1 text-center shadow-sm transition-shadow",
                  table.shape === "round" ? "rounded-full" : "rounded-lg",
                  tableTone(table.isActive),
                  canManage &&
                    "cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40",
                )}
                style={itemStyle(table)}
              >
                <span className="max-w-full truncate text-xs font-semibold">
                  {table.name}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] opacity-75">
                  <Armchair className="size-3" aria-hidden />
                  {table.seats}
                </span>
              </button>
            ))}
            {areaTables.length === 0 ? (
              <p className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-xs text-zinc-400 dark:text-zinc-500">
                Nessun tavolo in quest&apos;area.
                {canManage
                  ? " Usa Modifica sala per disporre la piantina."
                  : ""}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-200 px-5 py-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-400" />
          Disponibile
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-dashed border-amber-400 bg-amber-100 dark:bg-amber-950" />
          Sospesa
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-zinc-400" />
          Arredo
        </span>
        {unassigned.length > 0 ? (
          <span className="ml-auto">
            {unassigned.length}{" "}
            {unassigned.length === 1 ? "tavolo non è" : "tavoli non sono"}{" "}
            assegnato a un&apos;area
          </span>
        ) : null}
      </div>

      {editorOpen && area ? (
        <FloorPlanEditor
          key={area.id}
          area={area}
          tables={areaTables}
          objects={areaObjects}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}
    </section>
  );
}

function ObjectContent({
  object,
}: {
  object: { kind: FloorObjectKind; label: string };
}) {
  switch (object.kind) {
    case "counter":
      return (
        <span className="max-w-full truncate px-1 text-[10px] font-medium">
          {object.label || OBJECT_LABELS.counter}
        </span>
      );
    case "door":
      return <DoorOpen className="size-3.5" aria-hidden />;
    case "plant":
      return <Leaf className="size-3.5" aria-hidden />;
    case "label":
      return (
        <span className="max-w-full truncate px-1 text-[10px] font-semibold uppercase tracking-wide">
          {object.label || OBJECT_LABELS.label}
        </span>
      );
    default:
      return null;
  }
}

type FloorPlanEditorProps = {
  area: FloorAreaRow;
  tables: FloorTableRow[];
  objects: FloorObjectRow[];
  onClose: () => void;
};

function FloorPlanEditor({
  area,
  tables,
  objects,
  onClose,
}: FloorPlanEditorProps) {
  const [state, formAction, pending] = useActionState(
    saveFloorLayoutAction,
    initialFloorActionState,
  );
  const [draftTables, setDraftTables] = useState<DraftTable[]>(() =>
    tables.map(toDraftTable),
  );
  const [draftObjects, setDraftObjects] = useState<DraftObject[]>(() =>
    objects.map(toDraftObject),
  );
  const [removedTableIds, setRemovedTableIds] = useState<string[]>([]);
  const [removedObjectIds, setRemovedObjectIds] = useState<string[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [newObjectKind, setNewObjectKind] = useState<FloorObjectKind>("counter");
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const keyCounter = useRef(1);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Layout salvato.");
      onClose();
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state, onClose]);

  const selectedTable =
    selection?.type === "table"
      ? (draftTables.find((table) => table.key === selection.key) ?? null)
      : null;
  const selectedObject =
    selection?.type === "object"
      ? (draftObjects.find((object) => object.key === selection.key) ?? null)
      : null;

  const payload = useMemo(
    () =>
      JSON.stringify({
        areaId: area.id,
        tables: draftTables.map((table) => ({
          id: table.id,
          name: table.name,
          seats: table.seats,
          shape: table.shape,
          posX: table.posX,
          posY: table.posY,
          width: table.width,
          height: table.height,
        })),
        objects: draftObjects.map((object) => ({
          id: object.id,
          kind: object.kind,
          label: object.label,
          posX: object.posX,
          posY: object.posY,
          width: object.width,
          height: object.height,
        })),
        removeTableIds: removedTableIds,
        removeObjectIds: removedObjectIds,
      }),
    [area.id, draftTables, draftObjects, removedTableIds, removedObjectIds],
  );

  function updateTable(key: string, patch: Partial<DraftTable>) {
    setDraftTables((prev) =>
      prev.map((table) =>
        table.key === key ? { ...table, ...patch } : table,
      ),
    );
    setDirty(true);
  }

  function updateObject(key: string, patch: Partial<DraftObject>) {
    setDraftObjects((prev) =>
      prev.map((object) =>
        object.key === key ? { ...object, ...patch } : object,
      ),
    );
    setDirty(true);
  }

  function moveTable(key: string, posX: number, posY: number) {
    setDraftTables((prev) =>
      prev.map((table) =>
        table.key === key
          ? {
              ...table,
              posX: clampInt(posX, 0, FLOOR_GRID_X - table.width),
              posY: clampInt(posY, 0, FLOOR_GRID_Y - table.height),
            }
          : table,
      ),
    );
    setDirty(true);
  }

  function resizeTable(key: string, width: number, height: number) {
    setDraftTables((prev) =>
      prev.map((table) =>
        table.key === key
          ? {
              ...table,
              width: clampInt(width, 2, FLOOR_GRID_X - table.posX),
              height: clampInt(height, 2, FLOOR_GRID_Y - table.posY),
            }
          : table,
      ),
    );
    setDirty(true);
  }

  function moveObject(key: string, posX: number, posY: number) {
    setDraftObjects((prev) =>
      prev.map((object) =>
        object.key === key
          ? {
              ...object,
              posX: clampInt(posX, 0, FLOOR_GRID_X - object.width),
              posY: clampInt(posY, 0, FLOOR_GRID_Y - object.height),
            }
          : object,
      ),
    );
    setDirty(true);
  }

  function resizeObject(key: string, width: number, height: number) {
    setDraftObjects((prev) =>
      prev.map((object) =>
        object.key === key
          ? {
              ...object,
              width: clampInt(width, 1, FLOOR_GRID_X - object.posX),
              height: clampInt(height, 1, FLOOR_GRID_Y - object.posY),
            }
          : object,
      ),
    );
    setDirty(true);
  }

  function startDrag(
    event: ReactPointerEvent<HTMLElement>,
    item: DraftTable | DraftObject,
    mode: "move" | "resize",
  ) {
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = {
      posX: item.posX,
      posY: item.posY,
      width: item.width,
      height: item.height,
    };
    const key = item.key;
    const isTable = "seats" in item;

    setSelection({ type: isTable ? "table" : "object", key });
    element.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = Math.round(
        ((moveEvent.clientX - startX) / rect.width) * FLOOR_GRID_X,
      );
      const deltaY = Math.round(
        ((moveEvent.clientY - startY) / rect.height) * FLOOR_GRID_Y,
      );

      if (mode === "move") {
        if (isTable) {
          moveTable(key, origin.posX + deltaX, origin.posY + deltaY);
        } else {
          moveObject(key, origin.posX + deltaX, origin.posY + deltaY);
        }
      } else if (isTable) {
        resizeTable(key, origin.width + deltaX, origin.height + deltaY);
      } else {
        resizeObject(key, origin.width + deltaX, origin.height + deltaY);
      }
    };

    const onEnd = () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onEnd);
      element.removeEventListener("pointercancel", onEnd);
    };

    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onEnd);
    element.addEventListener("pointercancel", onEnd);
  }

  function addTable() {
    const key = `new-table-${keyCounter.current++}`;
    const spot = findFreeSpot([...draftTables, ...draftObjects], 4, 4);
    setDraftTables((prev) => [
      ...prev,
      {
        key,
        id: null,
        name: nextTableName(prev),
        seats: 4,
        shape: "rect",
        posX: spot.posX,
        posY: spot.posY,
        width: 4,
        height: 4,
        isActive: true,
      },
    ]);
    setSelection({ type: "table", key });
    setDirty(true);
  }

  function addObject() {
    const defaults = FLOOR_OBJECT_KINDS.find(
      (kind) => kind.value === newObjectKind,
    );
    const width = defaults?.defaultWidth ?? 8;
    const height = defaults?.defaultHeight ?? 1;
    const key = `new-object-${keyCounter.current++}`;
    const spot = findFreeSpot([...draftTables, ...draftObjects], width, height);
    setDraftObjects((prev) => [
      ...prev,
      {
        key,
        id: null,
        kind: newObjectKind,
        label: OBJECT_LABELS[newObjectKind] === "Testo" ? "" : OBJECT_LABELS[newObjectKind],
        posX: spot.posX,
        posY: spot.posY,
        width,
        height,
      },
    ]);
    setSelection({ type: "object", key });
    setDirty(true);
  }

  function removeSelected() {
    if (selectedTable) {
      if (selectedTable.id) {
        setRemovedTableIds((prev) => [...prev, selectedTable.id as string]);
      }
      setDraftTables((prev) =>
        prev.filter((table) => table.key !== selectedTable.key),
      );
      setSelection(null);
      setDirty(true);
      return;
    }

    if (selectedObject) {
      if (selectedObject.id) {
        setRemovedObjectIds((prev) => [...prev, selectedObject.id as string]);
      }
      setDraftObjects((prev) =>
        prev.filter((object) => object.key !== selectedObject.key),
      );
      setSelection(null);
      setDirty(true);
    }
  }

  function resetDraft() {
    setDraftTables(tables.map(toDraftTable));
    setDraftObjects(objects.map(toDraftObject));
    setRemovedTableIds([]);
    setRemovedObjectIds([]);
    setSelection(null);
    setDirty(false);
  }

  function requestClose() {
    if (pending) return;
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-6xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>Modifica sala</DialogTitle>
            <DialogDescription>
              Trascina i tavoli per spostarli, usa l&apos;angolo in basso a
              destra per ridimensionarli. Aggiungi arredi e salva: la piantina
              di {area.name} verrà aggiornata per tutti.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction}>
            <input type="hidden" name="layout" value={payload} />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTable}
              >
                <Plus />
                Aggiungi tavolo
              </Button>
              <div className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
                <Select
                  value={newObjectKind}
                  onChange={(event) =>
                    setNewObjectKind(event.target.value as FloorObjectKind)
                  }
                  aria-label="Tipo oggetto"
                  className="h-7 w-36 border-0 text-xs shadow-none"
                >
                  {FLOOR_OBJECT_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addObject}
                >
                  <Plus />
                  Aggiungi oggetto
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetDraft}
                disabled={!dirty}
              >
                <RotateCcw />
                Ripristina
              </Button>
              <span className="ml-auto text-[11px] text-zinc-500 dark:text-zinc-400">
                {draftTables.length}{" "}
                {draftTables.length === 1 ? "tavolo" : "tavoli"} ·{" "}
                {draftObjects.length}{" "}
                {draftObjects.length === 1 ? "oggetto" : "oggetti"}
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div
                ref={canvasRef}
                role="group"
                aria-label="Piantina interattiva"
                onClick={() => setSelection(null)}
                className="relative aspect-[3/2] w-full touch-none overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={GRID_BACKGROUND}
                />

                {draftObjects.map((object) => {
                  const selected =
                    selection?.type === "object" &&
                    selection.key === object.key;
                  return (
                    <button
                      key={object.key}
                      type="button"
                      aria-label={`Oggetto ${OBJECT_LABELS[object.kind]}${
                        object.label ? ` ${object.label}` : ""
                      }`}
                      onPointerDown={(event) => startDrag(event, object, "move")}
                      onClick={(event) => event.stopPropagation()}
                      className={cn(
                        "absolute flex touch-none select-none items-center justify-center overflow-hidden shadow-sm",
                        objectTone(object.kind),
                        selected &&
                          "ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-zinc-950",
                      )}
                      style={itemStyle(object)}
                    >
                      <ObjectContent object={object} />
                      {selected ? (
                        <span
                          aria-hidden
                          onPointerDown={(event) =>
                            startDrag(event, object, "resize")
                          }
                          className="absolute -bottom-1 -right-1 size-3.5 cursor-se-resize rounded-sm border border-white bg-brand-600 shadow dark:border-zinc-900"
                        />
                      ) : null}
                    </button>
                  );
                })}

                {draftTables.map((table) => {
                  const selected =
                    selection?.type === "table" &&
                    selection.key === table.key;
                  return (
                    <button
                      key={table.key}
                      type="button"
                      aria-label={`Tavolo ${table.name}`}
                      onPointerDown={(event) => startDrag(event, table, "move")}
                      onClick={(event) => event.stopPropagation()}
                      className={cn(
                        "absolute flex touch-none select-none flex-col items-center justify-center gap-0.5 overflow-hidden border px-1 text-center shadow-sm",
                        table.shape === "round" ? "rounded-full" : "rounded-lg",
                        tableTone(table.isActive),
                        selected &&
                          "ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-zinc-950",
                      )}
                      style={itemStyle(table)}
                    >
                      <span className="max-w-full truncate text-xs font-semibold">
                        {table.name}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] opacity-75">
                        <Armchair className="size-3" aria-hidden />
                        {table.seats}
                      </span>
                      {selected ? (
                        <span
                          aria-hidden
                          onPointerDown={(event) =>
                            startDrag(event, table, "resize")
                          }
                          className="absolute -bottom-1 -right-1 size-3.5 cursor-se-resize rounded-sm border border-white bg-brand-600 shadow dark:border-zinc-900"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                {selectedTable ? (
                  <TablePanel
                    table={selectedTable}
                    onChange={(patch) => updateTable(selectedTable.key, patch)}
                    onRemove={removeSelected}
                  />
                ) : selectedObject ? (
                  <ObjectPanel
                    object={selectedObject}
                    onChange={(patch) => updateObject(selectedObject.key, patch)}
                    onRemove={removeSelected}
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Proprietà
                    </p>
                    <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      Seleziona un tavolo o un oggetto sulla piantina per
                      modificarne nome, posti, forma e posizione. Puoi anche
                      trascinarlo direttamente.
                    </p>
                    <ul className="space-y-1.5 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <li className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm bg-emerald-400" />
                        Tavolo disponibile
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm border border-dashed border-amber-400 bg-amber-100 dark:bg-amber-950" />
                        Tavolo sospeso
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm bg-zinc-400" />
                        Elemento di arredo
                      </li>
                    </ul>
                  </div>
                )}
              </aside>
            </div>

            {state.status === "error" && state.message ? (
              <p role="alert" className="mt-3 text-xs text-red-600">
                {state.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={requestClose}
                disabled={pending}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={pending}>
                Salva layout
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Scartare le modifiche?"
        description="La piantina non è ancora stata salvata: le modifiche appena fatte andranno perse."
        confirmLabel="Scarta"
        onConfirm={() => {
          setDiscardOpen(false);
          onClose();
        }}
      />
    </>
  );
}

function TablePanel({
  table,
  onChange,
  onRemove,
}: {
  table: DraftTable;
  onChange: (patch: Partial<DraftTable>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Tavolo
        </p>
        <Badge variant={table.isActive ? "success" : "warning"} dot>
          {table.isActive ? "Attivo" : "Sospeso"}
        </Badge>
      </div>

      <Field label="Nome tavolo" htmlFor="floor-plan-name">
        <Input
          id="floor-plan-name"
          value={table.name}
          maxLength={40}
          onChange={(event) => onChange({ name: event.target.value })}
          className="h-8 text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Posti" htmlFor="floor-plan-seats">
          <Input
            id="floor-plan-seats"
            type="number"
            min={1}
            max={50}
            value={table.seats}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(value)) {
                onChange({ seats: clampInt(value, 1, 50) });
              }
            }}
            className="h-8 text-sm"
          />
        </Field>
        <Field label="Forma" htmlFor="floor-plan-shape">
          <Select
            id="floor-plan-shape"
            value={table.shape}
            onChange={(event) =>
              onChange({ shape: event.target.value as FloorTableShape })
            }
            className="h-8 text-sm"
          >
            {FLOOR_SHAPES.map((shape) => (
              <option key={shape.value} value={shape.value}>
                {shape.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Posizione X"
          value={table.posX}
          min={0}
          max={FLOOR_GRID_X - table.width}
          onChange={(value) => onChange({ posX: value })}
        />
        <NumberField
          label="Posizione Y"
          value={table.posY}
          min={0}
          max={FLOOR_GRID_Y - table.height}
          onChange={(value) => onChange({ posY: value })}
        />
        <NumberField
          label="Larghezza"
          value={table.width}
          min={2}
          max={FLOOR_GRID_X - table.posX}
          onChange={(value) => onChange({ width: value })}
        />
        <NumberField
          label="Altezza"
          value={table.height}
          min={2}
          max={FLOOR_GRID_Y - table.posY}
          onChange={(value) => onChange({ height: value })}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRemove}
        className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
      >
        <Trash2 />
        Elimina tavolo
      </Button>
    </div>
  );
}

function ObjectPanel({
  object,
  onChange,
  onRemove,
}: {
  object: DraftObject;
  onChange: (patch: Partial<DraftObject>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Arredo
      </p>

      <Field label="Tipo" htmlFor="floor-plan-kind">
        <Select
          id="floor-plan-kind"
          value={object.kind}
          onChange={(event) =>
            onChange({ kind: event.target.value as FloorObjectKind })
          }
          className="h-8 text-sm"
        >
          {FLOOR_OBJECT_KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Testo" htmlFor="floor-plan-label" hint="Massimo 40 caratteri.">
        <Input
          id="floor-plan-label"
          value={object.label}
          maxLength={40}
          onChange={(event) => onChange({ label: event.target.value })}
          className="h-8 text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Posizione X"
          value={object.posX}
          min={0}
          max={FLOOR_GRID_X - object.width}
          onChange={(value) => onChange({ posX: value })}
        />
        <NumberField
          label="Posizione Y"
          value={object.posY}
          min={0}
          max={FLOOR_GRID_Y - object.height}
          onChange={(value) => onChange({ posY: value })}
        />
        <NumberField
          label="Larghezza"
          value={object.width}
          min={1}
          max={FLOOR_GRID_X - object.posX}
          onChange={(value) => onChange({ width: value })}
        />
        <NumberField
          label="Altezza"
          value={object.height}
          min={1}
          max={FLOOR_GRID_Y - object.posY}
          onChange={(value) => onChange({ height: value })}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRemove}
        className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
      >
        <Trash2 />
        Elimina oggetto
      </Button>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10);
          if (!Number.isNaN(next)) onChange(clampInt(next, min, max));
        }}
        className="h-8 text-sm"
      />
    </label>
  );
}

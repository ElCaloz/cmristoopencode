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
import { TABLE_STATUS_LABELS } from "@/lib/demo/calc";
import type {
  FloorLayoutInput,
  FloorObject,
  RestaurantTable,
  TableStatus,
} from "@/lib/demo/types";
import {
  FLOOR_GRID_X,
  FLOOR_GRID_Y,
  FLOOR_OBJECT_KINDS,
  FLOOR_OBJECT_LABELS,
  FLOOR_SHAPES,
  clampFloorInt,
  findFreeFloorSpot,
  floorItemStyle,
  nextFloorTableName,
  type FloorObjectKind,
  type FloorTableShape,
} from "@/lib/floor-plan";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/lib/demo/store";

type Selection = { type: "table" | "object"; key: string } | null;

type DraftTable = {
  key: string;
  id: string | null;
  name: string;
  seats: number;
  status: TableStatus;
  shape: FloorTableShape;
  posX: number;
  posY: number;
  width: number;
  height: number;
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

const TABLE_TONES: Record<TableStatus, string> = {
  free: "border-emerald-300 bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-950 dark:border-emerald-700 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-50",
  occupied:
    "border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-950 dark:border-amber-700 dark:from-amber-950 dark:to-amber-900 dark:text-amber-50",
  reserved:
    "border-sky-300 bg-gradient-to-b from-sky-50 to-sky-100 text-sky-950 dark:border-sky-700 dark:from-sky-950 dark:to-sky-900 dark:text-sky-50",
  to_clean:
    "border-red-300 bg-gradient-to-b from-red-50 to-red-100 text-red-950 dark:border-red-800 dark:from-red-950 dark:to-red-900 dark:text-red-50",
};

const STATUS_DOT: Record<TableStatus, string> = {
  free: "bg-emerald-400",
  occupied: "bg-amber-400",
  reserved: "bg-sky-400",
  to_clean: "bg-red-400",
};

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

function toDraftTable(table: RestaurantTable): DraftTable {
  return {
    key: table.id,
    id: table.id,
    name: table.name,
    seats: table.seats,
    status: table.status,
    shape: table.shape,
    posX: table.posX,
    posY: table.posY,
    width: table.width,
    height: table.height,
  };
}

function toDraftObject(object: FloorObject): DraftObject {
  return {
    key: object.id,
    id: object.id,
    kind: object.kind,
    label: object.label,
    posX: object.posX,
    posY: object.posY,
    width: object.width,
    height: object.height,
  };
}

type DemoFloorPlanProps = {
  restaurantId: string;
  tables: RestaurantTable[];
  objects: FloorObject[];
  statusFilter: TableStatus | "all";
  canManage: boolean;
  onOpenTable: (table: RestaurantTable) => void;
};

export function DemoFloorPlan({
  restaurantId,
  tables,
  objects,
  statusFilter,
  canManage,
  onOpenTable,
}: DemoFloorPlanProps) {
  const rooms = Array.from(
    new Set(tables.map((table) => table.room)),
  );
  const [selectedRoom, setSelectedRoom] = useState(rooms[0] ?? "");
  const [editorOpen, setEditorOpen] = useState(false);

  const room = rooms.includes(selectedRoom)
    ? selectedRoom
    : (rooms[0] ?? "");
  const roomTables = tables.filter((table) => table.room === room);
  const roomObjects = objects.filter((object) => object.room === room);
  const visibleTables =
    statusFilter === "all"
      ? roomTables
      : roomTables.filter((table) => table.status === statusFilter);

  if (rooms.length === 0) {
    return (
      <section className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <LayoutGrid className="mx-auto size-6 text-zinc-400" />
        <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          La piantina è vuota
        </h2>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          I dati demo non contengono tavoli per questo locale.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-brand-700 dark:text-brand-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Piantina sala
          </h2>
          <Badge variant="secondary">
            {roomTables.length}{" "}
            {roomTables.length === 1 ? "tavolo" : "tavoli"}
          </Badge>
          <Badge variant="outline">Demo</Badge>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => setEditorOpen(true)}>
            <Pencil />
            Modifica sala
          </Button>
        ) : (
          <Badge variant="muted">Solo lettura</Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        {rooms.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setSelectedRoom(entry)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              entry === room
                ? "bg-brand-700 text-white shadow-sm"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
            )}
          >
            {entry}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        <div
          role="group"
          aria-label={`Piantina di ${room}`}
          className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={GRID_BACKGROUND}
          />
          {roomObjects.map((object) => (
            <div
              key={object.id}
              aria-hidden
              className={cn(
                "pointer-events-none absolute flex items-center justify-center overflow-hidden",
                objectTone(object.kind),
              )}
              style={floorItemStyle(object)}
            >
              <ObjectContent object={object} />
            </div>
          ))}
          {visibleTables.map((table) => (
            <button
              key={table.id}
              type="button"
              onClick={() => onOpenTable(table)}
              aria-label={`Apri tavolo ${table.name}`}
              className={cn(
                "absolute flex select-none flex-col items-center justify-center gap-0.5 overflow-hidden border px-1 text-center shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40",
                table.shape === "round" ? "rounded-full" : "rounded-lg",
                TABLE_TONES[table.status],
              )}
              style={floorItemStyle(table)}
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
          {visibleTables.length === 0 ? (
            <p className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {roomTables.length === 0
                ? "Nessun tavolo in questa sala."
                : `Nessun tavolo ${TABLE_STATUS_LABELS[
                    statusFilter as TableStatus
                  ].toLowerCase()} in questa sala.`}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-200 px-5 py-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        {(Object.keys(TABLE_STATUS_LABELS) as TableStatus[]).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", STATUS_DOT[status])} />
            {TABLE_STATUS_LABELS[status]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-zinc-400" />
          Arredo
        </span>
        <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">
          Trascina i tavoli in Modifica sala per comporre la piantina.
        </span>
      </div>

      {editorOpen ? (
        <DemoFloorPlanEditor
          key={room}
          restaurantId={restaurantId}
          room={room}
          tables={roomTables}
          objects={roomObjects}
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
          {object.label || FLOOR_OBJECT_LABELS.counter}
        </span>
      );
    case "door":
      return <DoorOpen className="size-3.5" aria-hidden />;
    case "plant":
      return <Leaf className="size-3.5" aria-hidden />;
    case "label":
      return (
        <span className="max-w-full truncate px-1 text-[10px] font-semibold uppercase tracking-wide">
          {object.label || FLOOR_OBJECT_LABELS.label}
        </span>
      );
    default:
      return null;
  }
}

type DemoFloorPlanEditorProps = {
  restaurantId: string;
  room: string;
  tables: RestaurantTable[];
  objects: FloorObject[];
  onClose: () => void;
};

function DemoFloorPlanEditor({
  restaurantId,
  room,
  tables,
  objects,
  onClose,
}: DemoFloorPlanEditorProps) {
  const saveFloorLayout = useDemoStore((state) => state.saveFloorLayout);
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
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const keyCounter = useRef(1);

  const selectedTable =
    selection?.type === "table"
      ? (draftTables.find((table) => table.key === selection.key) ?? null)
      : null;
  const selectedObject =
    selection?.type === "object"
      ? (draftObjects.find((object) => object.key === selection.key) ?? null)
      : null;

  function updateTable(key: string, patch: Partial<DraftTable>) {
    setDraftTables((prev) =>
      prev.map((table) =>
        table.key === key ? { ...table, ...patch } : table,
      ),
    );
    setDirty(true);
    setError(null);
  }

  function updateObject(key: string, patch: Partial<DraftObject>) {
    setDraftObjects((prev) =>
      prev.map((object) =>
        object.key === key ? { ...object, ...patch } : object,
      ),
    );
    setDirty(true);
    setError(null);
  }

  function moveTable(key: string, posX: number, posY: number) {
    setDraftTables((prev) =>
      prev.map((table) =>
        table.key === key
          ? {
              ...table,
              posX: clampFloorInt(posX, 0, FLOOR_GRID_X - table.width),
              posY: clampFloorInt(posY, 0, FLOOR_GRID_Y - table.height),
            }
          : table,
      ),
    );
    setDirty(true);
    setError(null);
  }

  function resizeTable(key: string, width: number, height: number) {
    setDraftTables((prev) =>
      prev.map((table) =>
        table.key === key
          ? {
              ...table,
              width: clampFloorInt(width, 2, FLOOR_GRID_X - table.posX),
              height: clampFloorInt(height, 2, FLOOR_GRID_Y - table.posY),
            }
          : table,
      ),
    );
    setDirty(true);
    setError(null);
  }

  function moveObject(key: string, posX: number, posY: number) {
    setDraftObjects((prev) =>
      prev.map((object) =>
        object.key === key
          ? {
              ...object,
              posX: clampFloorInt(posX, 0, FLOOR_GRID_X - object.width),
              posY: clampFloorInt(posY, 0, FLOOR_GRID_Y - object.height),
            }
          : object,
      ),
    );
    setDirty(true);
    setError(null);
  }

  function resizeObject(key: string, width: number, height: number) {
    setDraftObjects((prev) =>
      prev.map((object) =>
        object.key === key
          ? {
              ...object,
              width: clampFloorInt(width, 1, FLOOR_GRID_X - object.posX),
              height: clampFloorInt(height, 1, FLOOR_GRID_Y - object.posY),
            }
          : object,
      ),
    );
    setDirty(true);
    setError(null);
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
    const spot = findFreeFloorSpot([...draftTables, ...draftObjects], 6, 5);
    setDraftTables((prev) => [
      ...prev,
      {
        key,
        id: null,
        name: nextFloorTableName(prev.map((table) => table.name)),
        seats: 4,
        status: "free",
        shape: "rect",
        posX: spot.posX,
        posY: spot.posY,
        width: 6,
        height: 5,
      },
    ]);
    setSelection({ type: "table", key });
    setDirty(true);
    setError(null);
  }

  function addObject() {
    const defaults = FLOOR_OBJECT_KINDS.find(
      (kind) => kind.value === newObjectKind,
    );
    const width = defaults?.defaultWidth ?? 8;
    const height = defaults?.defaultHeight ?? 1;
    const key = `new-object-${keyCounter.current++}`;
    const spot = findFreeFloorSpot([...draftTables, ...draftObjects], width, height);
    setDraftObjects((prev) => [
      ...prev,
      {
        key,
        id: null,
        kind: newObjectKind,
        label:
          FLOOR_OBJECT_LABELS[newObjectKind] === "Testo"
            ? ""
            : FLOOR_OBJECT_LABELS[newObjectKind],
        posX: spot.posX,
        posY: spot.posY,
        width,
        height,
      },
    ]);
    setSelection({ type: "object", key });
    setDirty(true);
    setError(null);
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
      setError(null);
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
      setError(null);
    }
  }

  function resetDraft() {
    setDraftTables(tables.map(toDraftTable));
    setDraftObjects(objects.map(toDraftObject));
    setRemovedTableIds([]);
    setRemovedObjectIds([]);
    setSelection(null);
    setDirty(false);
    setError(null);
  }

  function requestClose() {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }

  function save() {
    const input: FloorLayoutInput = {
      restaurantId,
      room,
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
    };

    const result = saveFloorLayout(input);
    if (!result.ok) {
      setError(result.error ?? "Salvataggio non riuscito.");
      toast.error(result.error ?? "Salvataggio non riuscito.");
      return;
    }

    toast.success(`Piantina di ${room} salvata.`, {
      description: "Layout aggiornato nella demo.",
    });
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
              di {room} verrà aggiornata nella demo.
            </DialogDescription>
          </DialogHeader>

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
                  selection?.type === "object" && selection.key === object.key;
                return (
                  <button
                    key={object.key}
                    type="button"
                    aria-label={`Oggetto ${FLOOR_OBJECT_LABELS[object.kind]}${
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
                    style={floorItemStyle(object)}
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
                  selection?.type === "table" && selection.key === table.key;
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
                      TABLE_TONES[table.status],
                      selected &&
                        "ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-zinc-950",
                    )}
                    style={floorItemStyle(table)}
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
                    {(Object.keys(TABLE_STATUS_LABELS) as TableStatus[]).map(
                      (status) => (
                        <li key={status} className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-2.5 rounded-sm",
                              STATUS_DOT[status],
                            )}
                          />
                          {TABLE_STATUS_LABELS[status]}
                        </li>
                      ),
                    )}
                    <li className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-zinc-400" />
                      Elemento di arredo
                    </li>
                  </ul>
                </div>
              )}
            </aside>
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-xs text-red-600">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={requestClose}>
              Annulla
            </Button>
            <Button type="button" onClick={save}>
              Salva layout
            </Button>
          </DialogFooter>
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
  const statusVariant =
    table.status === "free"
      ? "success"
      : table.status === "occupied"
        ? "warning"
        : table.status === "reserved"
          ? "info"
          : "danger";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Tavolo
        </p>
        <Badge variant={statusVariant} dot>
          {TABLE_STATUS_LABELS[table.status]}
        </Badge>
      </div>

      <Field label="Nome tavolo" htmlFor="demo-floor-plan-name">
        <Input
          id="demo-floor-plan-name"
          value={table.name}
          maxLength={40}
          onChange={(event) => onChange({ name: event.target.value })}
          className="h-8 text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Posti" htmlFor="demo-floor-plan-seats">
          <Input
            id="demo-floor-plan-seats"
            type="number"
            min={1}
            max={50}
            value={table.seats}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(value)) {
                onChange({ seats: clampFloorInt(value, 1, 50) });
              }
            }}
            className="h-8 text-sm"
          />
        </Field>
        <Field label="Forma" htmlFor="demo-floor-plan-shape">
          <Select
            id="demo-floor-plan-shape"
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

      <Field label="Tipo" htmlFor="demo-floor-plan-kind">
        <Select
          id="demo-floor-plan-kind"
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

      <Field
        label="Testo"
        htmlFor="demo-floor-plan-label"
        hint="Massimo 40 caratteri."
      >
        <Input
          id="demo-floor-plan-label"
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
          if (!Number.isNaN(next)) onChange(clampFloorInt(next, min, max));
        }}
        className="h-8 text-sm"
      />
    </label>
  );
}

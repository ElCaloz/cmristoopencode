export type FloorTableShape = "rect" | "round";

export type FloorObjectKind = "wall" | "counter" | "door" | "plant" | "label";

// Griglia logica della piantina: 48 x 32 mezze-celle (24 x 16 celle).
export const FLOOR_GRID_X = 48;
export const FLOOR_GRID_Y = 32;

export const FLOOR_SHAPES: { value: FloorTableShape; label: string }[] = [
  { value: "rect", label: "Rettangolare" },
  { value: "round", label: "Rotondo" },
];

export const FLOOR_OBJECT_KINDS: {
  value: FloorObjectKind;
  label: string;
  defaultWidth: number;
  defaultHeight: number;
}[] = [
  { value: "wall", label: "Muro", defaultWidth: 12, defaultHeight: 1 },
  { value: "counter", label: "Banco / bar", defaultWidth: 12, defaultHeight: 3 },
  { value: "door", label: "Ingresso", defaultWidth: 4, defaultHeight: 1 },
  { value: "plant", label: "Pianta", defaultWidth: 3, defaultHeight: 3 },
  { value: "label", label: "Testo", defaultWidth: 8, defaultHeight: 2 },
];

export const FLOOR_OBJECT_LABELS: Record<FloorObjectKind, string> = {
  wall: "Muro",
  counter: "Banco",
  door: "Ingresso",
  plant: "Pianta",
  label: "Testo",
};

export function clampFloorInt(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

export function floorItemStyle(item: {
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

export function findFreeFloorSpot(
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

export function nextFloorTableName(names: string[]): string {
  const used = new Set(names.map((name) => name.toLowerCase()));
  let index = 1;
  while (used.has(`t${index}`)) index += 1;
  return `T${index}`;
}

// ---------------------------------------------------------------------------
// Configurazione base della sala (allineata allo screenshot approvato).
// Usata da demo e dalla creazione di nuovi ristoranti: resta modificabile
// dall'editor piantina dopo il seed.
// ---------------------------------------------------------------------------

export type BaseRoomTable = {
  name: string;
  seats: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export type BaseRoomObject = {
  kind: FloorObjectKind;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export const BASE_ROOM_AREA_NAME = "Sala principale";

export const BASE_ROOM_TABLES: BaseRoomTable[] = [
  // Riga alta
  { name: "28", seats: 4, posX: 3, posY: 3, width: 10, height: 4 },
  { name: "26", seats: 4, posX: 15, posY: 3, width: 3, height: 5 },
  { name: "25", seats: 4, posX: 19, posY: 3, width: 3, height: 5 },
  { name: "24", seats: 4, posX: 26, posY: 3, width: 3, height: 5 },
  { name: "23", seats: 4, posX: 30, posY: 3, width: 3, height: 5 },
  { name: "22", seats: 2, posX: 34, posY: 3, width: 3, height: 3 },
  { name: "21", seats: 2, posX: 38, posY: 3, width: 3, height: 3 },
  { name: "20", seats: 2, posX: 42, posY: 3, width: 3, height: 3 },
  // Fascia centrale
  { name: "14", seats: 6, posX: 3, posY: 11, width: 3, height: 7 },
  { name: "13", seats: 2, posX: 17, posY: 15, width: 3, height: 3 },
  { name: "12", seats: 2, posX: 22, posY: 15, width: 3, height: 3 },
  { name: "11", seats: 2, posX: 28, posY: 15, width: 3, height: 3 },
  { name: "10", seats: 2, posX: 34, posY: 15, width: 3, height: 3 },
  // Riga bassa
  { name: "5", seats: 2, posX: 6, posY: 25, width: 3, height: 3 },
  { name: "4", seats: 5, posX: 13, posY: 23, width: 3, height: 5 },
  { name: "3", seats: 5, posX: 20, posY: 23, width: 3, height: 5 },
  { name: "2", seats: 5, posX: 26, posY: 23, width: 3, height: 5 },
  { name: "1", seats: 5, posX: 34, posY: 23, width: 3, height: 5 },
];

export const BASE_ROOM_OBJECTS: BaseRoomObject[] = [
  { kind: "wall", label: "", posX: 22, posY: 4, width: 3, height: 3 },
  { kind: "wall", label: "", posX: 45, posY: 14, width: 3, height: 4 },
];

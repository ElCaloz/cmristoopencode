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

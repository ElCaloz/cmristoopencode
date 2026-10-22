import { describe, expect, it } from "vitest";
import {
  BASE_ROOM_AREA_NAME,
  BASE_ROOM_OBJECTS,
  BASE_ROOM_TABLES,
  FLOOR_GRID_X,
  FLOOR_GRID_Y,
} from "../../src/lib/floor-plan";

type Box = { posX: number; posY: number; width: number; height: number };

function overlaps(a: Box, b: Box): boolean {
  return (
    a.posX < b.posX + b.width &&
    a.posX + a.width > b.posX &&
    a.posY < b.posY + b.height &&
    a.posY + a.height > b.posY
  );
}

describe("configurazione base della sala", () => {
  const boxes: Box[] = [...BASE_ROOM_TABLES, ...BASE_ROOM_OBJECTS];

  it("ha l'area e i 18 tavoli della configurazione approvata", () => {
    expect(BASE_ROOM_AREA_NAME).toBe("Sala principale");
    expect(BASE_ROOM_TABLES).toHaveLength(18);
    expect(BASE_ROOM_OBJECTS).toHaveLength(2);
    expect(BASE_ROOM_TABLES.map((table) => table.name)).toEqual([
      "28",
      "26",
      "25",
      "24",
      "23",
      "22",
      "21",
      "20",
      "14",
      "13",
      "12",
      "11",
      "10",
      "5",
      "4",
      "3",
      "2",
      "1",
    ]);
  });

  it("riporta i posti come da configurazione approvata", () => {
    const seats = Object.fromEntries(
      BASE_ROOM_TABLES.map((table) => [table.name, table.seats]),
    );
    expect(seats).toEqual({
      "28": 4,
      "26": 4,
      "25": 4,
      "24": 4,
      "23": 4,
      "22": 2,
      "21": 2,
      "20": 2,
      "14": 6,
      "13": 2,
      "12": 2,
      "11": 2,
      "10": 2,
      "5": 2,
      "4": 5,
      "3": 5,
      "2": 5,
      "1": 5,
    });
  });

  it("rispetta i vincoli geometrici del database", () => {
    for (const table of BASE_ROOM_TABLES) {
      expect(table.posX).toBeGreaterThanOrEqual(0);
      expect(table.posY).toBeGreaterThanOrEqual(0);
      expect(table.width).toBeGreaterThanOrEqual(2);
      expect(table.width).toBeLessThanOrEqual(24);
      expect(table.height).toBeGreaterThanOrEqual(2);
      expect(table.height).toBeLessThanOrEqual(16);
      expect(table.posX + table.width).toBeLessThanOrEqual(FLOOR_GRID_X);
      expect(table.posY + table.height).toBeLessThanOrEqual(FLOOR_GRID_Y);
      expect(table.seats).toBeGreaterThanOrEqual(1);
      expect(table.seats).toBeLessThanOrEqual(50);
    }
    for (const object of BASE_ROOM_OBJECTS) {
      expect(object.posX).toBeGreaterThanOrEqual(0);
      expect(object.posY).toBeGreaterThanOrEqual(0);
      expect(object.width).toBeGreaterThanOrEqual(1);
      expect(object.height).toBeGreaterThanOrEqual(1);
      expect(object.posX + object.width).toBeLessThanOrEqual(FLOOR_GRID_X);
      expect(object.posY + object.height).toBeLessThanOrEqual(FLOOR_GRID_Y);
      expect(["wall", "counter", "door", "plant", "label"]).toContain(
        object.kind,
      );
    }
  });

  it("ha nomi univoci e nessuna sovrapposizione", () => {
    const names = BASE_ROOM_TABLES.map((table) => table.name);
    expect(new Set(names).size).toBe(names.length);

    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        expect(overlaps(boxes[i], boxes[j])).toBe(false);
      }
    }
  });
});

export type FloorActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialFloorActionState: FloorActionState = { status: "idle" };

export type FloorAreaRow = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

import type { FloorObjectKind, FloorTableShape } from "@/lib/floor-plan";

export type { FloorObjectKind, FloorTableShape };

export type FloorTableRow = {
  id: string;
  areaId: string | null;
  name: string;
  seats: number;
  sortOrder: number;
  isActive: boolean;
  shape: FloorTableShape;
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export type FloorObjectRow = {
  id: string;
  areaId: string;
  kind: FloorObjectKind;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export type FloorData = {
  areas: FloorAreaRow[];
  tables: FloorTableRow[];
  objects: FloorObjectRow[];
};

export {
  FLOOR_GRID_X,
  FLOOR_GRID_Y,
  FLOOR_OBJECT_KINDS,
  FLOOR_SHAPES,
} from "@/lib/floor-plan";

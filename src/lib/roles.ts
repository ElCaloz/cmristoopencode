export type Role = "super_admin" | "admin" | "cassiere" | "cameriere" | "cucina";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin CM Risto",
  admin: "Amministratore",
  cassiere: "Cassiere",
  cameriere: "Cameriere",
  cucina: "Cucina",
};

export const ROLE_SHORT_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  cassiere: "Cassiere",
  cameriere: "Cameriere",
  cucina: "Cucina",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Console di amministrazione della piattaforma CM Risto",
  admin: "Gestione completa del locale e delle sue impostazioni",
  cassiere: "Cassa, conti e incassi",
  cameriere: "Sala, tavoli e comande",
  cucina: "Kitchen Display e avanzamento dei piatti",
};

export type AppArea =
  | "dashboard"
  | "platform"
  | "pos"
  | "floor"
  | "orders"
  | "kitchen"
  | "menu"
  | "reservations"
  | "customers"
  | "sales"
  | "inventory"
  | "reports"
  | "staff"
  | "devices"
  | "settings"
  | "billing";

const ADMIN_AREAS: AppArea[] = [
  "dashboard",
  "pos",
  "floor",
  "orders",
  "kitchen",
  "menu",
  "reservations",
  "customers",
  "sales",
  "inventory",
  "reports",
  "staff",
  "devices",
  "settings",
  "billing",
];

const SUPER_ADMIN_DEMO_AREAS: AppArea[] = [...ADMIN_AREAS, "platform"];

export const ROLE_AREAS: Record<Role, AppArea[]> = {
  super_admin: SUPER_ADMIN_DEMO_AREAS,
  admin: ADMIN_AREAS,
  cassiere: ["dashboard", "pos", "sales", "customers", "floor", "orders"],
  cameriere: ["dashboard", "floor", "orders"],
  cucina: ["dashboard", "kitchen", "orders"],
};

export function canAccess(role: Role, area: AppArea): boolean {
  return ROLE_AREAS[role].includes(area);
}

export function homeRouteForRole(role: Role): string {
  switch (role) {
    case "super_admin":
      return "/app/piattaforma";
    case "cassiere":
      return "/app/pos";
    case "cameriere":
      return "/app/sala";
    case "cucina":
      return "/app/cucina";
    default:
      return "/app/panoramica";
  }
}

export const DEMO_ROLES: Role[] = [
  "admin",
  "cassiere",
  "cameriere",
  "cucina",
  "super_admin",
];

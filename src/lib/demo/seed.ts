import {
  BASE_ROOM_AREA_NAME,
  BASE_ROOM_OBJECTS,
  BASE_ROOM_TABLES,
} from "@/lib/floor-plan";
import { addDays, toISODate } from "@/lib/utils";
import type {
  ActivityEntry,
  AppNotification,
  Customer,
  DailySales,
  DemoSeedState,
  Device,
  FloorObject,
  InventoryItem,
  MenuCategory,
  MenuProduct,
  Order,
  OrderCourse,
  OrderItem,
  OrderItemStatus,
  OrderType,
  PaymentMethod,
  ProductVariant,
  Reservation,
  Restaurant,
  RestaurantTable,
  StaffMember,
  Station,
  Supplier,
} from "./types";
import { orderTotalCents } from "./calc";

export const SEED_VERSION = 2;

const now = new Date();
const today = toISODate(now);

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function dateFromNow(days: number): string {
  return toISODate(addDays(now, days));
}

function localDateTime(hour: number, minute: number): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0,
  );
}

const restaurants: Restaurant[] = [
  {
    id: "r1",
    name: "Osteria del Borgo",
    kind: "Trattoria toscana",
    address: "Via dei Giusti 12",
    city: "Firenze",
    phone: "055 238 4411",
    email: "info@osteriadelborgo.it",
    vatNumber: "IT01234567890",
    planId: "pro",
    status: "active",
    createdAt: "2025-03-18T09:00:00.000Z",
    seats: 64,
    ownerName: "Marco Bellini",
    ownerEmail: "marco.bellini@osteriadelborgo.it",
  },
  {
    id: "r2",
    name: "Pizzeria Vesuvio 22",
    kind: "Pizzeria napoletana",
    address: "Via Toledo 22",
    city: "Napoli",
    phone: "081 552 9022",
    email: "ciao@vesuvio22.it",
    vatNumber: "IT09876543210",
    planId: "business",
    status: "active",
    createdAt: "2024-11-05T14:30:00.000Z",
    seats: 92,
    ownerName: "Gennaro Esposito",
    ownerEmail: "gennaro@vesuvio22.it",
  },
  {
    id: "r3",
    name: "Bistrot Aurora",
    kind: "Bistrot contemporaneo",
    address: "Corso Garibaldi 41",
    city: "Milano",
    phone: "02 890 1145",
    email: "hello@bistrotaurora.it",
    vatNumber: "IT05544332211",
    planId: "starter",
    status: "trial",
    trialEndsAt: dateFromNow(18),
    createdAt: dateFromNow(-12),
    seats: 40,
    ownerName: "Elena Moretti",
    ownerEmail: "elena@bistrotaurora.it",
  },
  {
    id: "r4",
    name: "Sushi Kumo",
    kind: "Sushi bar",
    address: "Via dell'Indipendenza 8",
    city: "Bologna",
    phone: "051 224 7766",
    email: "info@sushikumo.it",
    vatNumber: "IT03322110099",
    planId: "pro",
    status: "suspended",
    createdAt: "2025-06-21T10:15:00.000Z",
    seats: 48,
    ownerName: "Hiroshi Tanaka",
    ownerEmail: "hiroshi@sushikumo.it",
  },
];

type CategorySeed = { key: string; name: string };

const categorySeeds: Record<string, CategorySeed[]> = {
  r1: [
    { key: "antipasti", name: "Antipasti" },
    { key: "primi", name: "Primi" },
    { key: "secondi", name: "Secondi" },
    { key: "dolci", name: "Dolci" },
    { key: "bevande", name: "Bevande" },
    { key: "vini", name: "Vini" },
  ],
  r2: [
    { key: "fritti", name: "Fritti" },
    { key: "classiche", name: "Pizze classiche" },
    { key: "speciali", name: "Pizze speciali" },
    { key: "dolci", name: "Dolci" },
    { key: "bevande", name: "Bevande" },
  ],
  r3: [
    { key: "antipasti", name: "Antipasti" },
    { key: "primi", name: "Primi" },
    { key: "secondi", name: "Secondi" },
    { key: "dolci", name: "Dolci" },
    { key: "bevande", name: "Bevande" },
  ],
  r4: [
    { key: "nigiri", name: "Nigiri" },
    { key: "uramaki", name: "Uramaki" },
    { key: "sashimi", name: "Sashimi" },
    { key: "bevande", name: "Bevande" },
  ],
};

type ProductSeed = {
  key: string;
  cat: string;
  name: string;
  description: string;
  priceCents: number;
  foodCostCents: number;
  station: Station;
  allergens?: string[];
  variants?: ProductVariant[];
  available?: boolean;
};

const productSeeds: Record<string, ProductSeed[]> = {
  r1: [
    { key: "tagliere", cat: "antipasti", name: "Tagliere toscano", description: "Selezione di salumi e formaggi con crostini", priceCents: 1400, foodCostCents: 520, station: "cucina", allergens: ["glutine", "latte"] },
    { key: "crostini", cat: "antipasti", name: "Crostini neri", description: "Fegatini di pollo su pane toscano", priceCents: 900, foodCostCents: 280, station: "cucina", allergens: ["glutine"] },
    { key: "burrata", cat: "antipasti", name: "Burrata e pomodori", description: "Burrata pugliese, pomodorini confit e basilico", priceCents: 1200, foodCostCents: 410, station: "cucina", allergens: ["latte"] },
    { key: "carpaccio", cat: "antipasti", name: "Carpaccio di manzo", description: "Rucola, scaglie di grana e limone", priceCents: 1300, foodCostCents: 540, station: "cucina", allergens: ["latte"] },
    { key: "pappardelle", cat: "primi", name: "Pappardelle al cinghiale", description: "Pasta fresca, ragù di cinghiale e ginepro", priceCents: 1600, foodCostCents: 560, station: "cucina", allergens: ["glutine", "uova"] },
    { key: "ravioli", cat: "primi", name: "Ravioli ricotta e spinaci", description: "Burro e salvia", priceCents: 1500, foodCostCents: 490, station: "cucina", allergens: ["glutine", "latte", "uova"] },
    { key: "ribollita", cat: "primi", name: "Ribollita", description: "Zuppa toscana di pane, cavolo nero e fagioli", priceCents: 1200, foodCostCents: 320, station: "cucina", allergens: ["glutine", "sedano"] },
    { key: "aglio", cat: "primi", name: "Spaghetti aglio e olio", description: "Peperoncino e prezzemolo fresco", priceCents: 1300, foodCostCents: 260, station: "cucina", allergens: ["glutine"] },
    { key: "fiorentina", cat: "secondi", name: "Bistecca alla fiorentina", description: "Per due persone, circa 1 kg al peso", priceCents: 4800, foodCostCents: 2200, station: "cucina" },
    { key: "peposo", cat: "secondi", name: "Peposo dell'Impruneta", description: "Brasato al vino rosso e pepe nero", priceCents: 1900, foodCostCents: 680, station: "cucina" },
    { key: "pollo", cat: "secondi", name: "Pollo al mattone", description: "Con patate arrosto e rosmarino", priceCents: 1800, foodCostCents: 620, station: "cucina" },
    { key: "baccala", cat: "secondi", name: "Baccalà alla livornese", description: "Pomodoro, olive e capperi", priceCents: 1700, foodCostCents: 690, station: "cucina", allergens: ["pesce"] },
    { key: "tiramisu", cat: "dolci", name: "Tiramisù", description: "Ricetta della casa", priceCents: 700, foodCostCents: 210, station: "dolci", allergens: ["latte", "uova", "glutine"] },
    { key: "cantucci", cat: "dolci", name: "Cantucci e vinsanto", description: "Biscotti alle mandorle e vinsanto", priceCents: 600, foodCostCents: 180, station: "dolci", allergens: ["glutine", "uova", "frutta a guscio"] },
    { key: "pannacotta", cat: "dolci", name: "Panna cotta", description: "Frutti di bosco", priceCents: 650, foodCostCents: 160, station: "dolci", allergens: ["latte"] },
    { key: "acqua", cat: "bevande", name: "Acqua naturale 1L", description: "", priceCents: 300, foodCostCents: 40, station: "bar" },
    { key: "acqua-f", cat: "bevande", name: "Acqua frizzante 1L", description: "", priceCents: 300, foodCostCents: 40, station: "bar" },
    { key: "coca", cat: "bevande", name: "Coca-Cola 33cl", description: "", priceCents: 400, foodCostCents: 110, station: "bar" },
    { key: "caffe", cat: "bevande", name: "Caffè", description: "", priceCents: 150, foodCostCents: 30, station: "bar" },
    { key: "chianti", cat: "vini", name: "Chianti Classico", description: "Bottiglia 0,75L", priceCents: 2400, foodCostCents: 900, station: "bar" },
    { key: "vermentino", cat: "vini", name: "Vermentino", description: "Bottiglia 0,75L", priceCents: 2000, foodCostCents: 750, station: "bar" },
    { key: "calice", cat: "vini", name: "Calice della casa", description: "Rosso o bianco", priceCents: 500, foodCostCents: 140, station: "bar" },
  ],
  r2: [
    { key: "frittatina", cat: "fritti", name: "Frittatina di bucatini", description: "Bucatini, besciamella e ragù", priceCents: 450, foodCostCents: 130, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "crocche", cat: "fritti", name: "Crocchè di patate", description: "Crocchetta classica napoletana", priceCents: 250, foodCostCents: 70, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "arancino", cat: "fritti", name: "Arancino", description: "Riso, ragù e piselli", priceCents: 350, foodCostCents: 110, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "montanara", cat: "fritti", name: "Montanara", description: "Pizza fritta con pomodoro e parmigiano", priceCents: 500, foodCostCents: 150, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "margherita", cat: "classiche", name: "Margherita", description: "Pomodoro San Marzano, fiordilatte e basilico", priceCents: 650, foodCostCents: 180, station: "pizzeria", allergens: ["glutine", "latte"], variants: [{ name: "Bufala", priceDeltaCents: 250 }, { name: "Impasto integrale", priceDeltaCents: 100 }] },
    { key: "marinara", cat: "classiche", name: "Marinara", description: "Pomodoro, aglio, origano e olio EVO", priceCents: 550, foodCostCents: 120, station: "pizzeria", allergens: ["glutine"] },
    { key: "diavola", cat: "classiche", name: "Diavola", description: "Pomodoro, fiordilatte e salame piccante", priceCents: 850, foodCostCents: 260, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "capricciosa", cat: "classiche", name: "Capricciosa", description: "Prosciutto cotto, funghi, carciofi e olive", priceCents: 900, foodCostCents: 300, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "quattro-formaggi", cat: "classiche", name: "Quattro formaggi", description: "Fiordilatte, gorgonzola, provola e parmigiano", priceCents: 950, foodCostCents: 340, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "prosciutto-funghi", cat: "classiche", name: "Prosciutto e funghi", description: "Pomodoro, fiordilatte, prosciutto cotto e funghi", priceCents: 900, foodCostCents: 310, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "vesuvio", cat: "speciali", name: "Vesuvio 22", description: "Friarielli, salsiccia e provola affumicata", priceCents: 1150, foodCostCents: 380, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "tartufo", cat: "speciali", name: "Tartufo e funghi", description: "Crema di tartufo, funghi porcini e mozzarella", priceCents: 1250, foodCostCents: 430, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "bufala", cat: "speciali", name: "Bufala e pomodorini", description: "Pomodorini del Piennolo e mozzarella di bufala", priceCents: 1100, foodCostCents: 400, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "vegetariana", cat: "speciali", name: "Vegetariana", description: "Verdure grigliate di stagione", priceCents: 1000, foodCostCents: 320, station: "pizzeria", allergens: ["glutine", "latte"] },
    { key: "tiramisu", cat: "dolci", name: "Tiramisù", description: "Classico napoletano", priceCents: 500, foodCostCents: 150, station: "dolci", allergens: ["glutine", "latte", "uova"] },
    { key: "baba", cat: "dolci", name: "Babà al rum", description: "Babà artigianale", priceCents: 400, foodCostCents: 120, station: "dolci", allergens: ["glutine", "uova"] },
    { key: "acqua", cat: "bevande", name: "Acqua 0,5L", description: "", priceCents: 200, foodCostCents: 30, station: "bar" },
    { key: "coca", cat: "bevande", name: "Coca-Cola 33cl", description: "", priceCents: 350, foodCostCents: 110, station: "bar" },
    { key: "birra", cat: "bevande", name: "Birra Peroni 33cl", description: "", priceCents: 400, foodCostCents: 150, station: "bar", allergens: ["glutine"] },
    { key: "caffe", cat: "bevande", name: "Caffè", description: "", priceCents: 150, foodCostCents: 30, station: "bar" },
  ],
  r3: [
    { key: "burrata", cat: "antipasti", name: "Burrata pugliese", description: "Pomodorini, pesto e pane carasau", priceCents: 1300, foodCostCents: 420, station: "cucina", allergens: ["latte", "glutine"] },
    { key: "tartare", cat: "antipasti", name: "Tartare di manzo", description: "Capperi, senape e tuorlo marinato", priceCents: 1500, foodCostCents: 640, station: "cucina", allergens: ["uova", "senape"] },
    { key: "plin", cat: "primi", name: "Plin al burro e salvia", description: "Pasta ripiena del giorno", priceCents: 1600, foodCostCents: 520, station: "cucina", allergens: ["glutine", "latte", "uova"] },
    { key: "risotto", cat: "primi", name: "Risotto ai porcini", description: "Mantecato al parmigiano", priceCents: 1700, foodCostCents: 600, station: "cucina", allergens: ["latte"] },
    { key: "tagliata", cat: "secondi", name: "Tagliata di manzo", description: "Rucola, pomodorini e scaglie di grana", priceCents: 2100, foodCostCents: 950, station: "cucina", allergens: ["latte"] },
    { key: "branzino", cat: "secondi", name: "Filetto di branzino", description: "Verdure croccanti e limone", priceCents: 1900, foodCostCents: 850, station: "cucina", allergens: ["pesce"] },
    { key: "cheesecake", cat: "dolci", name: "Cheesecake ai frutti rossi", description: "Base croccante e coulis", priceCents: 700, foodCostCents: 200, station: "dolci", allergens: ["glutine", "latte", "uova"] },
    { key: "caffe", cat: "bevande", name: "Caffè", description: "", priceCents: 150, foodCostCents: 30, station: "bar" },
    { key: "spremuta", cat: "bevande", name: "Spremuta d'arancia", description: "Fresca del giorno", priceCents: 450, foodCostCents: 180, station: "bar" },
    { key: "acqua", cat: "bevande", name: "Acqua 0,75L", description: "", priceCents: 300, foodCostCents: 40, station: "bar" },
  ],
  r4: [
    { key: "nigiri-salmone", cat: "nigiri", name: "Nigiri salmone", description: "2 pezzi", priceCents: 450, foodCostCents: 160, station: "cucina", allergens: ["pesce"] },
    { key: "nigiri-tonno", cat: "nigiri", name: "Nigiri tonno", description: "2 pezzi", priceCents: 500, foodCostCents: 190, station: "cucina", allergens: ["pesce"] },
    { key: "california", cat: "uramaki", name: "Uramaki California", description: "8 pezzi, surimi e avocado", priceCents: 800, foodCostCents: 280, station: "cucina", allergens: ["pesce", "crostacei"] },
    { key: "dragon", cat: "uramaki", name: "Uramaki Dragon", description: "8 pezzi, anguilla e avocado", priceCents: 1200, foodCostCents: 430, station: "cucina", allergens: ["pesce"] },
    { key: "sashimi", cat: "sashimi", name: "Sashimi misto", description: "12 pezzi di pesce fresco", priceCents: 1800, foodCostCents: 700, station: "cucina", allergens: ["pesce"] },
    { key: "edamame", cat: "sashimi", name: "Edamame", description: "Fagioli di soia al sale", priceCents: 400, foodCostCents: 120, station: "cucina", allergens: ["soia"] },
    { key: "gyoza", cat: "sashimi", name: "Gyoza di verdure", description: "6 pezzi", priceCents: 600, foodCostCents: 200, station: "cucina", allergens: ["glutine", "soia"] },
    { key: "birra", cat: "bevande", name: "Birra Asahi 33cl", description: "", priceCents: 500, foodCostCents: 180, station: "bar", allergens: ["glutine"] },
    { key: "sake", cat: "bevande", name: "Sake 10cl", description: "", priceCents: 600, foodCostCents: 210, station: "bar" },
    { key: "acqua", cat: "bevande", name: "Acqua 0,75L", description: "", priceCents: 300, foodCostCents: 40, station: "bar" },
  ],
};

function buildCategories(restaurantId: string): MenuCategory[] {
  return categorySeeds[restaurantId].map((seed) => ({
    id: `${restaurantId}-cat-${seed.key}`,
    name: seed.name,
  }));
}

function buildProducts(
  restaurantId: string,
  categories: MenuCategory[],
): MenuProduct[] {
  return productSeeds[restaurantId].map((seed) => {
    const category = categories.find(
      (entry) => entry.id === `${restaurantId}-cat-${seed.cat}`,
    );
    if (!category) {
      throw new Error(`Categoria mancante: ${seed.cat} per ${restaurantId}`);
    }
    return {
      id: `${restaurantId}-p-${seed.key}`,
      restaurantId,
      categoryId: category.id,
      name: seed.name,
      description: seed.description,
      priceCents: seed.priceCents,
      foodCostCents: seed.foodCostCents,
      station: seed.station,
      allergens: seed.allergens ?? [],
      available: seed.available ?? true,
      variants: seed.variants,
    };
  });
}

function buildTables(
  restaurantId: string,
  room: string,
  prefix: string,
  seatPlan: number[],
): RestaurantTable[] {
  return seatPlan.map((seats, index) => {
    const round = seats <= 2 || seats >= 8;
    const width = round ? (seats >= 8 ? 7 : 5) : 6;
    return {
      id: `${restaurantId}-tbl-${prefix}${index + 1}`,
      restaurantId,
      name: `${prefix}${index + 1}`,
      room,
      seats,
      status: "free",
      shape: round ? "round" : "rect",
      posX: 3 + (index % 4) * 11,
      posY: 3 + Math.floor(index / 4) * 9,
      width,
      height: round ? width : 5,
    };
  });
}

// Sala base dello screenshot approvato: stessa configurazione del seed reale.
function buildBaseRoomTables(
  restaurantId: string,
  room: string,
): RestaurantTable[] {
  return BASE_ROOM_TABLES.map((table, index) => ({
    id: `${restaurantId}-tbl-base${index + 1}`,
    restaurantId,
    name: table.name,
    room,
    seats: table.seats,
    status: "free" as const,
    shape: "rect" as const,
    posX: table.posX,
    posY: table.posY,
    width: table.width,
    height: table.height,
  }));
}

function buildAllTables(): RestaurantTable[] {
  return [
    ...buildBaseRoomTables("r1", BASE_ROOM_AREA_NAME),
    ...buildTables("r1", "Veranda", "V", [4, 4, 2, 6]),
    ...buildTables("r1", "Privé", "P", [8, 10]),
    ...buildTables("r2", "Sala forno", "F", [2, 4, 4, 2, 6, 4]),
    ...buildTables("r2", "Sala grande", "G", [4, 4, 2, 6, 2, 4]),
    ...buildTables("r2", "Esterno", "E", [2, 2, 4, 4]),
    ...buildTables("r3", "Sala", "B", [2, 2, 4, 4, 2, 4]),
    ...buildTables("r3", "Terrazza", "A", [2, 2, 4, 4]),
    ...buildTables("r4", "Sala", "K", [2, 2, 4, 4, 6, 2]),
  ];
}

function buildFloorObjects(tables: RestaurantTable[]): FloorObject[] {
  const rooms = new Map<string, { restaurantId: string; room: string }>();
  for (const table of tables) {
    rooms.set(`${table.restaurantId}|${table.room}`, {
      restaurantId: table.restaurantId,
      room: table.room,
    });
  }

  return Array.from(rooms.values()).flatMap(({ restaurantId, room }, index) => {
    if (room === BASE_ROOM_AREA_NAME) {
      // Sala base: solo i due muri della configurazione approvata.
      return BASE_ROOM_OBJECTS.map((object, objectIndex) => ({
        id: `${restaurantId}-floor-base-${objectIndex + 1}`,
        restaurantId,
        room,
        kind: object.kind,
        label: object.label,
        posX: object.posX,
        posY: object.posY,
        width: object.width,
        height: object.height,
      }));
    }
    const base = `${restaurantId}-floor-${index + 1}`;
    return [
      {
        id: `${base}-wall`,
        restaurantId,
        room,
        kind: "wall" as const,
        label: "",
        posX: 0,
        posY: 30,
        width: 48,
        height: 1,
      },
      {
        id: `${base}-counter`,
        restaurantId,
        room,
        kind: "counter" as const,
        label: "Banco",
        posX: 30,
        posY: 26,
        width: 15,
        height: 3,
      },
      {
        id: `${base}-door`,
        restaurantId,
        room,
        kind: "door" as const,
        label: "",
        posX: 2,
        posY: 26,
        width: 5,
        height: 3,
      },
      {
        id: `${base}-plant`,
        restaurantId,
        room,
        kind: "plant" as const,
        label: "",
        posX: 44,
        posY: 2,
        width: 3,
        height: 3,
      },
      {
        id: `${base}-label`,
        restaurantId,
        room,
        kind: "label" as const,
        label: room,
        posX: 2,
        posY: 1,
        width: 10,
        height: 2,
      },
    ];
  });
}

const staff: StaffMember[] = [
  { id: "st-r1-1", restaurantId: "r1", name: "Marco Bellini", role: "admin", email: "marco.bellini@osteriadelborgo.it", phone: "333 214 8877", active: true, hiredAt: "2025-03-18", hourlyRateCents: 0 },
  { id: "st-r1-2", restaurantId: "r1", name: "Giulia Fontana", role: "cassiere", email: "giulia.fontana@osteriadelborgo.it", phone: "347 883 2211", active: true, hiredAt: "2025-04-02", hourlyRateCents: 1400 },
  { id: "st-r1-3", restaurantId: "r1", name: "Luca Marchetti", role: "cameriere", email: "luca.marchetti@osteriadelborgo.it", phone: "340 552 7788", active: true, hiredAt: "2025-05-10", hourlyRateCents: 1200 },
  { id: "st-r1-4", restaurantId: "r1", name: "Sara Conti", role: "cameriere", email: "sara.conti@osteriadelborgo.it", phone: "328 990 4455", active: true, hiredAt: "2025-09-01", hourlyRateCents: 1200 },
  { id: "st-r1-5", restaurantId: "r1", name: "Antonio Russo", role: "cucina", email: "antonio.russo@osteriadelborgo.it", phone: "366 112 3344", active: true, hiredAt: "2025-03-20", hourlyRateCents: 1600 },
  { id: "st-r1-6", restaurantId: "r1", name: "Pietro Neri", role: "magazziniere", email: "pietro.neri@osteriadelborgo.it", phone: "351 667 8899", active: false, hiredAt: "2025-07-15", hourlyRateCents: 1100 },
  { id: "st-r2-1", restaurantId: "r2", name: "Gennaro Esposito", role: "admin", email: "gennaro@vesuvio22.it", phone: "333 445 6677", active: true, hiredAt: "2024-11-05", hourlyRateCents: 0 },
  { id: "st-r2-2", restaurantId: "r2", name: "Ciro Esposito", role: "cassiere", email: "ciro@vesuvio22.it", phone: "348 223 9988", active: true, hiredAt: "2024-12-01", hourlyRateCents: 1350 },
  { id: "st-r2-3", restaurantId: "r2", name: "Anna De Luca", role: "cameriere", email: "anna@vesuvio22.it", phone: "339 774 5566", active: true, hiredAt: "2025-02-14", hourlyRateCents: 1200 },
  { id: "st-r2-4", restaurantId: "r2", name: "Salvatore Riva", role: "cameriere", email: "salvatore@vesuvio22.it", phone: "327 331 2244", active: true, hiredAt: "2025-06-30", hourlyRateCents: 1200 },
  { id: "st-r2-5", restaurantId: "r2", name: "Rosaria Greco", role: "cucina", email: "rosaria@vesuvio22.it", phone: "366 889 1100", active: true, hiredAt: "2024-11-20", hourlyRateCents: 1550 },
  { id: "st-r3-1", restaurantId: "r3", name: "Elena Moretti", role: "admin", email: "elena@bistrotaurora.it", phone: "334 118 7722", active: true, hiredAt: dateFromNow(-12), hourlyRateCents: 0 },
  { id: "st-r3-2", restaurantId: "r3", name: "Davide Sala", role: "cameriere", email: "davide@bistrotaurora.it", phone: "349 665 4433", active: true, hiredAt: dateFromNow(-10), hourlyRateCents: 1200 },
  { id: "st-r3-3", restaurantId: "r3", name: "Chiara Bassi", role: "cassiere", email: "chiara@bistrotaurora.it", phone: "331 240 9988", active: true, hiredAt: dateFromNow(-8), hourlyRateCents: 1300 },
  { id: "st-r3-4", restaurantId: "r3", name: "Omar Fikri", role: "cucina", email: "omar@bistrotaurora.it", phone: "388 123 4455", active: true, hiredAt: dateFromNow(-10), hourlyRateCents: 1500 },
  { id: "st-r4-1", restaurantId: "r4", name: "Hiroshi Tanaka", role: "admin", email: "hiroshi@sushikumo.it", phone: "335 778 2211", active: true, hiredAt: "2025-06-21", hourlyRateCents: 0 },
  { id: "st-r4-2", restaurantId: "r4", name: "Kenji Mori", role: "cucina", email: "kenji@sushikumo.it", phone: "342 990 1122", active: true, hiredAt: "2025-06-25", hourlyRateCents: 1650 },
  { id: "st-r4-3", restaurantId: "r4", name: "Alice Bianchi", role: "cameriere", email: "alice@sushikumo.it", phone: "346 551 8877", active: false, hiredAt: "2025-07-01", hourlyRateCents: 1200 },
];

function courseForCategory(
  categories: MenuCategory[],
  categoryId: string,
): OrderCourse | undefined {
  const name = categories.find((category) => category.id === categoryId)?.name;
  if (!name) return undefined;
  const map: Record<string, OrderCourse> = {
    Antipasti: "antipasti",
    Fritti: "antipasti",
    Primi: "primi",
    Secondi: "secondi",
    "Pizze classiche": "pizze",
    "Pizze speciali": "pizze",
    Nigiri: "secondi",
    Uramaki: "secondi",
    Sashimi: "secondi",
    Dolci: "dolci",
    Bevande: "bevande",
    Vini: "bevande",
  };
  return map[name];
}

function waiterNames(restaurantId: string): string[] {
  const names = staff
    .filter(
      (member) =>
        member.restaurantId === restaurantId && member.role === "cameriere",
    )
    .map((member) => member.name);
  return names.length > 0 ? names : ["Staff demo"];
}

type PaidOrderOptions = {
  restaurantId: string;
  count: number;
  startNumber: number;
  rng: () => number;
  products: MenuProduct[];
  categories: MenuCategory[];
  tables: RestaurantTable[];
  waiters: string[];
};

function buildPaidOrders({
  restaurantId,
  count,
  startNumber,
  rng,
  products,
  categories,
  tables,
  waiters,
}: PaidOrderOptions): Order[] {
  const weights: PaymentMethod[] = [
    "carta",
    "carta",
    "carta",
    "carta",
    "contanti",
    "contanti",
    "satispay",
    "buoni",
  ];
  const orders: Order[] = [];
  for (let index = 0; index < count; index += 1) {
    const isTakeaway = rng() < 0.12;
    const table = pick(tables, rng);
    const hour = index % 2 === 0 ? 12 + Math.floor(rng() * 2) : 19 + Math.floor(rng() * 3);
    const minute = Math.floor(rng() * 60);
    const createdAt = localDateTime(hour, minute).toISOString();
    const orderId = `${restaurantId}-ord-${startNumber + index}`;
    const itemCount = 1 + Math.floor(rng() * 3);
    const items: OrderItem[] = [];
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const product = pick(products, rng);
      const qty = rng() < 0.18 ? 2 : 1;
      const variant =
        product.variants && product.variants.length > 0 && rng() < 0.3
          ? pick(product.variants, rng)
          : undefined;
      items.push({
        id: `${orderId}-it${itemIndex + 1}`,
        productId: product.id,
        name: product.name,
        qty,
        unitPriceCents: product.priceCents + (variant?.priceDeltaCents ?? 0),
        variant: variant?.name,
        status: "served",
        station: product.station,
        course: courseForCategory(categories, product.categoryId),
      });
    }
    const discountPct = rng() < 0.08 ? 10 : undefined;
    const draft: Order = {
      id: orderId,
      restaurantId,
      number: startNumber + index,
      type: isTakeaway ? "asporto" : "tavolo",
      tableId: isTakeaway ? undefined : table.id,
      tableName: isTakeaway ? "Banco asporto" : table.name,
      covers: isTakeaway ? 1 : 2 + Math.floor(rng() * 3),
      waiter: pick(waiters, rng),
      status: "paid",
      items,
      createdAt,
      updatedAt: createdAt,
      paymentMethod: pick(weights, rng),
      discountPct,
    };
    draft.totalPaidCents = orderTotalCents(draft);
    orders.push(draft);
  }
  return orders;
}

function makeItem(
  orderId: string,
  index: number,
  product: MenuProduct,
  qty: number,
  status: OrderItemStatus,
  categories: MenuCategory[],
  extra?: { variant?: string; notes?: string; priceDeltaCents?: number },
): OrderItem {
  return {
    id: `${orderId}-it${index}`,
    productId: product.id,
    name: product.name,
    qty,
    unitPriceCents: product.priceCents + (extra?.priceDeltaCents ?? 0),
    variant: extra?.variant,
    notes: extra?.notes,
    status,
    station: product.station,
    course: courseForCategory(categories, product.categoryId),
  };
}

type ActiveOrderOptions = {
  restaurantId: string;
  number: number;
  table: RestaurantTable | null;
  type?: OrderType;
  covers: number;
  waiter: string;
  status: "open" | "preparing" | "ready";
  minutesAgo: number;
  items: OrderItem[];
};

function buildActiveOrder({
  restaurantId,
  number,
  table,
  type = "tavolo",
  covers,
  waiter,
  status,
  minutesAgo,
  items,
}: ActiveOrderOptions): Order {
  const createdAt = new Date(now.getTime() - minutesAgo * 60000).toISOString();
  const orderId = `${restaurantId}-ord-${number}`;
  return {
    id: orderId,
    restaurantId,
    number,
    type,
    tableId: table?.id,
    tableName: table ? table.name : type === "asporto" ? "Banco asporto" : undefined,
    covers,
    waiter,
    status,
    items,
    createdAt,
    updatedAt: createdAt,
  };
}

export function buildSeedState(): DemoSeedState {
  const categories: Record<string, MenuCategory[]> = {};
  const products: MenuProduct[] = [];
  for (const restaurant of restaurants) {
    categories[restaurant.id] = buildCategories(restaurant.id);
    products.push(
      ...buildProducts(restaurant.id, categories[restaurant.id]),
    );
  }

  const tables = buildAllTables();

  const findProduct = (restaurantId: string, key: string): MenuProduct => {
    const product = products.find(
      (entry) => entry.id === `${restaurantId}-p-${key}`,
    );
    if (!product) throw new Error(`Prodotto mancante: ${restaurantId}/${key}`);
    return product;
  };

  const paid: Order[] = [
    ...buildPaidOrders({
      restaurantId: "r1",
      count: 26,
      startNumber: 101,
      rng: mulberry32(1101),
      products: products.filter((product) => product.restaurantId === "r1"),
      categories: categories.r1,
      tables: tables.filter((table) => table.restaurantId === "r1"),
      waiters: waiterNames("r1"),
    }),
    ...buildPaidOrders({
      restaurantId: "r2",
      count: 24,
      startNumber: 101,
      rng: mulberry32(2202),
      products: products.filter((product) => product.restaurantId === "r2"),
      categories: categories.r2,
      tables: tables.filter((table) => table.restaurantId === "r2"),
      waiters: waiterNames("r2"),
    }),
    ...buildPaidOrders({
      restaurantId: "r3",
      count: 14,
      startNumber: 101,
      rng: mulberry32(3303),
      products: products.filter((product) => product.restaurantId === "r3"),
      categories: categories.r3,
      tables: tables.filter((table) => table.restaurantId === "r3"),
      waiters: waiterNames("r3"),
    }),
    ...buildPaidOrders({
      restaurantId: "r4",
      count: 8,
      startNumber: 101,
      rng: mulberry32(4404),
      products: products.filter((product) => product.restaurantId === "r4"),
      categories: categories.r4,
      tables: tables.filter((table) => table.restaurantId === "r4"),
      waiters: waiterNames("r4"),
    }),
  ];

  const table = (restaurantId: string, name: string): RestaurantTable => {
    const found = tables.find(
      (entry) => entry.restaurantId === restaurantId && entry.name === name,
    );
    if (!found) throw new Error(`Tavolo mancante: ${restaurantId}/${name}`);
    return found;
  };

  const r1Order127 = buildActiveOrder({
    restaurantId: "r1",
    number: 127,
    table: table("r1", "26"),
    covers: 2,
    waiter: "Luca Marchetti",
    status: "preparing",
    minutesAgo: 18,
    items: [
      makeItem("r1-ord-127", 1, findProduct("r1", "pappardelle"), 2, "preparing", categories.r1),
      makeItem("r1-ord-127", 2, findProduct("r1", "tagliere"), 1, "ready", categories.r1),
      makeItem("r1-ord-127", 3, findProduct("r1", "acqua-f"), 2, "served", categories.r1),
    ],
  });
  const r1Order128 = buildActiveOrder({
    restaurantId: "r1",
    number: 128,
    table: table("r1", "25"),
    covers: 4,
    waiter: "Sara Conti",
    status: "preparing",
    minutesAgo: 9,
    items: [
      makeItem("r1-ord-128", 1, findProduct("r1", "crostini"), 2, "pending", categories.r1),
      makeItem("r1-ord-128", 2, findProduct("r1", "ribollita"), 2, "pending", categories.r1),
      makeItem("r1-ord-128", 3, findProduct("r1", "peposo"), 1, "pending", categories.r1),
    ],
  });
  const r1Order129 = buildActiveOrder({
    restaurantId: "r1",
    number: 129,
    table: table("r1", "V2"),
    covers: 3,
    waiter: "Luca Marchetti",
    status: "preparing",
    minutesAgo: 6,
    items: [
      makeItem("r1-ord-129", 1, findProduct("r1", "ravioli"), 3, "pending", categories.r1),
      makeItem("r1-ord-129", 2, findProduct("r1", "pannacotta"), 2, "pending", categories.r1),
    ],
  });
  const r1Order130 = buildActiveOrder({
    restaurantId: "r1",
    number: 130,
    table: table("r1", "13"),
    covers: 2,
    waiter: "Sara Conti",
    status: "ready",
    minutesAgo: 24,
    items: [
      makeItem("r1-ord-130", 1, findProduct("r1", "tagliere"), 1, "ready", categories.r1),
      makeItem("r1-ord-130", 2, findProduct("r1", "peposo"), 1, "ready", categories.r1),
      makeItem("r1-ord-130", 3, findProduct("r1", "chianti"), 1, "served", categories.r1),
    ],
  });
  const r1Order131 = buildActiveOrder({
    restaurantId: "r1",
    number: 131,
    table: null,
    type: "asporto",
    covers: 1,
    waiter: "Giulia Fontana",
    status: "preparing",
    minutesAgo: 4,
    items: [
      makeItem("r1-ord-131", 1, findProduct("r1", "aglio"), 1, "pending", categories.r1),
      makeItem("r1-ord-131", 2, findProduct("r1", "coca"), 1, "pending", categories.r1),
    ],
  });

  const r2Order125 = buildActiveOrder({
    restaurantId: "r2",
    number: 125,
    table: table("r2", "F2"),
    covers: 3,
    waiter: "Anna De Luca",
    status: "preparing",
    minutesAgo: 12,
    items: [
      makeItem("r2-ord-125", 1, findProduct("r2", "margherita"), 2, "preparing", categories.r2),
      makeItem("r2-ord-125", 2, findProduct("r2", "diavola"), 1, "pending", categories.r2),
      makeItem("r2-ord-125", 3, findProduct("r2", "birra"), 2, "pending", categories.r2),
    ],
  });
  const r2Order126 = buildActiveOrder({
    restaurantId: "r2",
    number: 126,
    table: table("r2", "G3"),
    covers: 2,
    waiter: "Salvatore Riva",
    status: "ready",
    minutesAgo: 20,
    items: [
      makeItem("r2-ord-126", 1, findProduct("r2", "marinara"), 1, "ready", categories.r2),
      makeItem("r2-ord-126", 2, findProduct("r2", "frittatina"), 2, "ready", categories.r2),
      makeItem("r2-ord-126", 3, findProduct("r2", "acqua"), 2, "served", categories.r2),
    ],
  });
  const r2Order127 = buildActiveOrder({
    restaurantId: "r2",
    number: 127,
    table: table("r2", "E1"),
    covers: 4,
    waiter: "Anna De Luca",
    status: "preparing",
    minutesAgo: 7,
    items: [
      makeItem("r2-ord-127", 1, findProduct("r2", "bufala"), 2, "pending", categories.r2),
      makeItem("r2-ord-127", 2, findProduct("r2", "vesuvio"), 1, "pending", categories.r2),
    ],
  });
  const r2Order128 = buildActiveOrder({
    restaurantId: "r2",
    number: 128,
    table: null,
    type: "asporto",
    covers: 1,
    waiter: "Salvatore Riva",
    status: "preparing",
    minutesAgo: 3,
    items: [
      makeItem("r2-ord-128", 1, findProduct("r2", "diavola"), 1, "pending", categories.r2),
      makeItem("r2-ord-128", 2, findProduct("r2", "coca"), 1, "pending", categories.r2),
    ],
  });

  const r3Order115 = buildActiveOrder({
    restaurantId: "r3",
    number: 115,
    table: table("r3", "B2"),
    covers: 2,
    waiter: "Davide Sala",
    status: "preparing",
    minutesAgo: 14,
    items: [
      makeItem("r3-ord-115", 1, findProduct("r3", "plin"), 2, "pending", categories.r3),
      makeItem("r3-ord-115", 2, findProduct("r3", "tagliata"), 1, "pending", categories.r3),
    ],
  });
  const r3Order116 = buildActiveOrder({
    restaurantId: "r3",
    number: 116,
    table: table("r3", "B4"),
    covers: 2,
    waiter: "Davide Sala",
    status: "preparing",
    minutesAgo: 5,
    items: [
      makeItem("r3-ord-116", 1, findProduct("r3", "burrata"), 1, "ready", categories.r3),
      makeItem("r3-ord-116", 2, findProduct("r3", "cheesecake"), 1, "pending", categories.r3),
    ],
  });

  const activeOrders: Order[] = [
    r1Order127,
    r1Order128,
    r1Order129,
    r1Order130,
    r1Order131,
    r2Order125,
    r2Order126,
    r2Order127,
    r2Order128,
    r3Order115,
    r3Order116,
  ];

  const nextTables = tables.map((entry) => ({ ...entry }));
  for (const order of activeOrders) {
    if (!order.tableId) continue;
    const target = nextTables.find((entry) => entry.id === order.tableId);
    if (target) {
      target.status = "occupied";
      target.currentOrderId = order.id;
    }
  }
  const markTable = (
    restaurantId: string,
    name: string,
    status: RestaurantTable["status"],
  ) => {
    const target = nextTables.find(
      (entry) => entry.restaurantId === restaurantId && entry.name === name,
    );
    if (target) target.status = status;
  };
  markTable("r1", "22", "to_clean");
  markTable("r1", "V1", "reserved");
  markTable("r2", "G6", "reserved");
  markTable("r2", "E2", "reserved");
  markTable("r2", "F3", "to_clean");
  markTable("r3", "B5", "reserved");

  const todayOrders: Record<string, Order[]> = {};
  for (const restaurant of restaurants) {
    todayOrders[restaurant.id] = paid.filter(
      (order) =>
        order.restaurantId === restaurant.id &&
        order.createdAt.slice(0, 10) === today,
    );
  }

  const bases: Record<string, { revenue: number; ticket: number; covers: number }> = {
    r1: { revenue: 268000, ticket: 3600, covers: 2.4 },
    r2: { revenue: 342000, ticket: 2800, covers: 2.2 },
    r3: { revenue: 138000, ticket: 3000, covers: 2.1 },
    r4: { revenue: 192000, ticket: 4000, covers: 2.0 },
  };
  const weekdayFactor = [1.12, 0.72, 0.78, 0.9, 1.0, 1.28, 1.42];

  const sales: Record<string, DailySales[]> = {};
  for (const restaurant of restaurants) {
    const rng = mulberry32(Number(restaurant.id.replace("r", "")) * 719);
    const base = bases[restaurant.id];
    const series: DailySales[] = [];
    for (let offset = 29; offset >= 1; offset -= 1) {
      const date = addDays(now, -offset);
      const day = date.getDay();
      const noise = 0.82 + rng() * 0.36;
      let revenueCents = Math.round(
        base.revenue * weekdayFactor[day] * noise,
      );
      if (restaurant.status === "suspended" && offset <= 3) {
        revenueCents = 0;
      }
      const ordersCount =
        revenueCents === 0 ? 0 : Math.max(1, Math.round(revenueCents / base.ticket));
      series.push({
        date: toISODate(date),
        revenueCents,
        orders: ordersCount,
        covers: Math.round(ordersCount * base.covers),
      });
    }
    const todayPaid = todayOrders[restaurant.id];
    series.push({
      date: today,
      revenueCents: todayPaid.reduce(
        (sum, order) => sum + (order.totalPaidCents ?? orderTotalCents(order)),
        0,
      ),
      orders: todayPaid.length,
      covers: todayPaid.reduce((sum, order) => sum + order.covers, 0),
    });
    sales[restaurant.id] = series;
  }

  const reservations: Reservation[] = [
    { id: "res-1", restaurantId: "r1", customerName: "Famiglia Bianchi", phone: "333 887 2211", date: today, time: "19:45", covers: 4, tableName: "28", status: "confirmed", notes: "Seggiolone per bambino" },
    { id: "res-2", restaurantId: "r1", customerName: "Laura Vanni", phone: "347 112 6677", date: today, time: "20:15", covers: 2, tableName: "22", status: "confirmed" },
    { id: "res-3", restaurantId: "r1", customerName: "Roberto Fabbri", phone: "340 998 3366", date: today, time: "20:30", covers: 3, tableName: "V3", status: "pending", notes: "Possibile allergia al glutine" },
    { id: "res-4", restaurantId: "r1", customerName: "Giulia Pratesi", phone: "328 441 9900", date: today, time: "21:00", covers: 2, status: "pending" },
    { id: "res-5", restaurantId: "r1", customerName: "Marco Ricci", phone: "366 221 4477", date: dateFromNow(1), time: "20:00", covers: 6, tableName: "P1", status: "confirmed", notes: "Compleanno" },
    { id: "res-6", restaurantId: "r1", customerName: "Chiara Neri", phone: "351 334 8899", date: dateFromNow(1), time: "12:30", covers: 2, status: "confirmed" },
    { id: "res-7", restaurantId: "r1", customerName: "Studio Contabilità", phone: "055 221 8899", date: dateFromNow(2), time: "13:00", covers: 8, tableName: "P2", status: "confirmed", notes: "Pranzo di lavoro" },
    { id: "res-8", restaurantId: "r1", customerName: "Paolo Innocenti", phone: "333 667 1122", date: dateFromNow(3), time: "19:30", covers: 4, status: "pending" },
    { id: "res-9", restaurantId: "r2", customerName: "Alessia Romano", phone: "334 556 7788", date: today, time: "20:00", covers: 4, tableName: "G2", status: "confirmed" },
    { id: "res-10", restaurantId: "r2", customerName: "Luigi Esposito", phone: "338 990 1133", date: today, time: "20:30", covers: 2, status: "confirmed" },
    { id: "res-11", restaurantId: "r2", customerName: "Gruppo Ferrara", phone: "081 334 9988", date: dateFromNow(1), time: "21:15", covers: 10, status: "pending", notes: "Tavolo unico se possibile" },
    { id: "res-12", restaurantId: "r2", customerName: "Mario Falcone", phone: "347 223 8899", date: dateFromNow(2), time: "13:15", covers: 3, status: "confirmed" },
    { id: "res-13", restaurantId: "r3", customerName: "Sofia Marini", phone: "345 114 2233", date: today, time: "20:15", covers: 2, tableName: "B1", status: "confirmed" },
    { id: "res-14", restaurantId: "r3", customerName: "Andrea Costa", phone: "331 889 5566", date: dateFromNow(1), time: "12:45", covers: 4, status: "pending" },
    { id: "res-15", restaurantId: "r3", customerName: "Elisa Fumagalli", phone: "333 221 9900", date: dateFromNow(2), time: "19:45", covers: 3, status: "confirmed" },
    { id: "res-16", restaurantId: "r4", customerName: "Davide Pini", phone: "340 667 2233", date: dateFromNow(1), time: "20:30", covers: 2, status: "pending" },
  ];

  const customers: Customer[] = [
    { id: "cust-1", restaurantId: "r1", firstName: "Laura", lastName: "Vanni", email: "laura.vanni@email.it", phone: "347 112 6677", visits: 14, totalSpentCents: 62400, lastVisit: dateFromNow(-6), tags: ["Abituale", "Vino"] },
    { id: "cust-2", restaurantId: "r1", firstName: "Roberto", lastName: "Fabbri", email: "r.fabbri@email.it", phone: "340 998 3366", visits: 9, totalSpentCents: 38700, lastVisit: dateFromNow(-13), tags: ["Senza glutine"], allergies: "Glutine" },
    { id: "cust-3", restaurantId: "r1", firstName: "Famiglia", lastName: "Bianchi", email: "bianchi.family@email.it", phone: "333 887 2211", visits: 21, totalSpentCents: 115600, lastVisit: dateFromNow(-3), tags: ["VIP", "Famiglie"] },
    { id: "cust-4", restaurantId: "r1", firstName: "Marco", lastName: "Ricci", email: "marco.ricci@email.it", phone: "366 221 4477", visits: 6, totalSpentCents: 41200, lastVisit: dateFromNow(-22), tags: ["Compleanni"] },
    { id: "cust-5", restaurantId: "r1", firstName: "Giulia", lastName: "Pratesi", email: "g.pratesi@email.it", phone: "328 441 9900", visits: 4, totalSpentCents: 17600, lastVisit: dateFromNow(-31), tags: ["Nuovo"] },
    { id: "cust-6", restaurantId: "r1", firstName: "Paolo", lastName: "Innocenti", email: "p.innocenti@email.it", phone: "333 667 1122", visits: 11, totalSpentCents: 58200, lastVisit: dateFromNow(-9), tags: ["Pranzo lavoro"] },
    { id: "cust-7", restaurantId: "r1", firstName: "Chiara", lastName: "Neri", email: "chiara.neri@email.it", phone: "351 334 8899", visits: 3, totalSpentCents: 9900, lastVisit: dateFromNow(-44), tags: ["Nuovo"] },
    { id: "cust-8", restaurantId: "r2", firstName: "Alessia", lastName: "Romano", email: "alessia.romano@email.it", phone: "334 556 7788", visits: 18, totalSpentCents: 71500, lastVisit: dateFromNow(-2), tags: ["VIP"] },
    { id: "cust-9", restaurantId: "r2", firstName: "Luigi", lastName: "Esposito", email: "luigi.esposito@email.it", phone: "338 990 1133", visits: 25, totalSpentCents: 88900, lastVisit: dateFromNow(-1), tags: ["Abituale"] },
    { id: "cust-10", restaurantId: "r2", firstName: "Mario", lastName: "Falcone", email: "m.falcone@email.it", phone: "347 223 8899", visits: 7, totalSpentCents: 26300, lastVisit: dateFromNow(-17), tags: ["Famiglie"] },
    { id: "cust-11", restaurantId: "r3", firstName: "Sofia", lastName: "Marini", email: "sofia.marini@email.it", phone: "345 114 2233", visits: 5, totalSpentCents: 24100, lastVisit: dateFromNow(-8), tags: ["Brunch"] },
    { id: "cust-12", restaurantId: "r3", firstName: "Andrea", lastName: "Costa", email: "andrea.costa@email.it", phone: "331 889 5566", visits: 2, totalSpentCents: 8700, lastVisit: dateFromNow(-20), tags: ["Nuovo"] },
    { id: "cust-13", restaurantId: "r4", firstName: "Davide", lastName: "Pini", email: "davide.pini@email.it", phone: "340 667 2233", visits: 4, totalSpentCents: 18900, lastVisit: dateFromNow(-12), tags: ["Abituale"] },
  ];

  const devices: Device[] = [
    { id: "dev-r1-1", restaurantId: "r1", name: "Palmare Sala 1", type: "palmare", status: "online", lastSeen: new Date(now.getTime() - 2 * 60000).toISOString(), pairedAt: "2025-04-10T10:00:00.000Z" },
    { id: "dev-r1-2", restaurantId: "r1", name: "Palmare Sala 2", type: "palmare", status: "online", lastSeen: new Date(now.getTime() - 6 * 60000).toISOString(), pairedAt: "2025-04-10T10:05:00.000Z" },
    { id: "dev-r1-3", restaurantId: "r1", name: "Palmare Veranda", type: "palmare", status: "offline", lastSeen: new Date(now.getTime() - 3 * 3600000).toISOString(), pairedAt: "2025-06-01T18:20:00.000Z" },
    { id: "dev-r1-4", restaurantId: "r1", name: "Palmare Cucina", type: "palmare", status: "online", lastSeen: new Date(now.getTime() - 60000).toISOString(), pairedAt: "2025-09-12T09:30:00.000Z" },
    { id: "dev-r1-5", restaurantId: "r1", name: "Cassa POS 1", type: "pos", status: "online", lastSeen: new Date(now.getTime() - 60000).toISOString(), pairedAt: "2025-03-19T11:00:00.000Z" },
    { id: "dev-r1-6", restaurantId: "r1", name: "KDS Cucina", type: "kds", status: "online", lastSeen: new Date(now.getTime() - 60000).toISOString(), pairedAt: "2025-03-19T11:10:00.000Z" },
    { id: "dev-r1-7", restaurantId: "r1", name: "Stampante scontrini", type: "stampante", status: "online", lastSeen: new Date(now.getTime() - 10 * 60000).toISOString(), pairedAt: "2025-03-19T11:15:00.000Z" },
    { id: "dev-r2-1", restaurantId: "r2", name: "Palmare Sala 1", type: "palmare", status: "online", lastSeen: new Date(now.getTime() - 60000).toISOString(), pairedAt: "2024-12-02T10:00:00.000Z" },
    { id: "dev-r2-2", restaurantId: "r2", name: "Palmare Sala 2", type: "palmare", status: "online", lastSeen: new Date(now.getTime() - 4 * 60000).toISOString(), pairedAt: "2024-12-02T10:10:00.000Z" },
    { id: "dev-r2-3", restaurantId: "r2", name: "Palmare Forno", type: "palmare", status: "online", lastSeen: new Date(now.getTime() - 8 * 60000).toISOString(), pairedAt: "2025-05-11T16:40:00.000Z" },
    { id: "dev-r2-4", restaurantId: "r2", name: "Palmare Esterno", type: "palmare", status: "offline", lastSeen: new Date(now.getTime() - 26 * 3600000).toISOString(), pairedAt: "2025-07-20T19:00:00.000Z" },
    { id: "dev-r2-5", restaurantId: "r2", name: "Cassa POS 1", type: "pos", status: "online", lastSeen: new Date(now.getTime() - 60000).toISOString(), pairedAt: "2024-11-05T12:00:00.000Z" },
    { id: "dev-r2-6", restaurantId: "r2", name: "KDS Forno", type: "kds", status: "online", lastSeen: new Date(now.getTime() - 60000).toISOString(), pairedAt: "2024-11-05T12:10:00.000Z" },
    { id: "dev-r3-1", restaurantId: "r3", name: "Palmare Sala", type: "palmare", status: "online", lastSeen: new Date(now.getTime() - 3 * 60000).toISOString(), pairedAt: dateFromNow(-9) + "T09:00:00.000Z" },
    { id: "dev-r3-2", restaurantId: "r3", name: "Cassa POS 1", type: "pos", status: "online", lastSeen: new Date(now.getTime() - 60000).toISOString(), pairedAt: dateFromNow(-11) + "T09:00:00.000Z" },
    { id: "dev-r4-1", restaurantId: "r4", name: "Palmare Sala 1", type: "palmare", status: "offline", lastSeen: "2026-10-05T20:10:00.000Z", pairedAt: "2025-07-02T10:00:00.000Z" },
    { id: "dev-r4-2", restaurantId: "r4", name: "Palmare Sala 2", type: "palmare", status: "offline", lastSeen: "2026-10-05T20:12:00.000Z", pairedAt: "2025-07-02T10:10:00.000Z" },
  ];

  const suppliers: Supplier[] = [
    { id: "sup-r1-1", restaurantId: "r1", name: "Ortofrutta Toscana", category: "Frutta e verdura", email: "ordini@ortofruttatoscana.it", phone: "055 221 7744" },
    { id: "sup-r1-2", restaurantId: "r1", name: "Macelleria Conti", category: "Carni", email: "info@macelleriaconti.it", phone: "055 441 2288" },
    { id: "sup-r1-3", restaurantId: "r1", name: "Caseificio Mugello", category: "Latticini", email: "ordini@caseificiomugello.it", phone: "055 771 9900" },
    { id: "sup-r1-4", restaurantId: "r1", name: "Cantina del Chianti", category: "Vini", email: "vendite@cantinachianti.it", phone: "0577 334 1122" },
    { id: "sup-r1-5", restaurantId: "r1", name: "Forniture Bar Ale", category: "Bevande", email: "ale@forniturebar.it", phone: "055 882 3311" },
    { id: "sup-r2-1", restaurantId: "r2", name: "Molino Caputo", category: "Farine", email: "ordini@molinocaputo.it", phone: "081 220 4477" },
    { id: "sup-r2-2", restaurantId: "r2", name: "Latteria Sorrentina", category: "Latticini", email: "info@latteriasorrentina.it", phone: "081 445 9988" },
    { id: "sup-r2-3", restaurantId: "r2", name: "Salumificio Vesuviano", category: "Salumi", email: "ordini@salumificio.it", phone: "081 776 2200" },
    { id: "sup-r3-1", restaurantId: "r3", name: "Mercato Comunale", category: "Frutta e verdura", email: "ordini@mercatocomunale.it", phone: "02 330 4455" },
    { id: "sup-r3-2", restaurantId: "r3", name: "Panificio Colombo", category: "Pane", email: "info@panificiocolombo.it", phone: "02 665 8899" },
    { id: "sup-r4-1", restaurantId: "r4", name: "Ittica Adriatica", category: "Pesce", email: "ordini@itticadriatica.it", phone: "051 220 7788" },
    { id: "sup-r4-2", restaurantId: "r4", name: "Asia Food Import", category: "Ingredienti etnici", email: "info@asiafood.it", phone: "051 990 1122" },
  ];

  const inventory: InventoryItem[] = [
    { id: "inv-r1-1", restaurantId: "r1", name: "Pomodori San Marzano", unit: "kg", qty: 12, minQty: 8, costPerUnitCents: 380, supplierId: "sup-r1-1", category: "Ortofrutta" },
    { id: "inv-r1-2", restaurantId: "r1", name: "Mozzarella fiordilatte", unit: "kg", qty: 6, minQty: 10, costPerUnitCents: 890, supplierId: "sup-r1-3", category: "Latticini" },
    { id: "inv-r1-3", restaurantId: "r1", name: "Farina 00", unit: "kg", qty: 25, minQty: 10, costPerUnitCents: 120, supplierId: "sup-r1-1", category: "Dispensa" },
    { id: "inv-r1-4", restaurantId: "r1", name: "Olio extravergine", unit: "L", qty: 8, minQty: 5, costPerUnitCents: 850, supplierId: "sup-r1-1", category: "Dispensa" },
    { id: "inv-r1-5", restaurantId: "r1", name: "Chianti Classico", unit: "bt", qty: 18, minQty: 12, costPerUnitCents: 900, supplierId: "sup-r1-4", category: "Vini" },
    { id: "inv-r1-6", restaurantId: "r1", name: "Burrata", unit: "pz", qty: 14, minQty: 12, costPerUnitCents: 320, supplierId: "sup-r1-3", category: "Latticini" },
    { id: "inv-r1-7", restaurantId: "r1", name: "Cinghiale", unit: "kg", qty: 6, minQty: 4, costPerUnitCents: 1450, supplierId: "sup-r1-2", category: "Carni" },
    { id: "inv-r1-8", restaurantId: "r1", name: "Ricotta", unit: "kg", qty: 5, minQty: 3, costPerUnitCents: 750, supplierId: "sup-r1-3", category: "Latticini" },
    { id: "inv-r1-9", restaurantId: "r1", name: "Pane toscano", unit: "pz", qty: 20, minQty: 15, costPerUnitCents: 180, supplierId: "sup-r1-1", category: "Pane" },
    { id: "inv-r1-10", restaurantId: "r1", name: "Caffè in grani", unit: "kg", qty: 4, minQty: 3, costPerUnitCents: 1600, supplierId: "sup-r1-5", category: "Dispensa" },
    { id: "inv-r1-11", restaurantId: "r1", name: "Acqua minerale", unit: "bt", qty: 48, minQty: 24, costPerUnitCents: 40, supplierId: "sup-r1-5", category: "Bevande" },
    { id: "inv-r1-12", restaurantId: "r1", name: "Patate", unit: "kg", qty: 15, minQty: 10, costPerUnitCents: 140, supplierId: "sup-r1-1", category: "Ortofrutta" },
    { id: "inv-r2-1", restaurantId: "r2", name: "Farina Caputo", unit: "kg", qty: 18, minQty: 40, costPerUnitCents: 135, supplierId: "sup-r2-1", category: "Farine" },
    { id: "inv-r2-2", restaurantId: "r2", name: "Pomodori pelati", unit: "kg", qty: 32, minQty: 20, costPerUnitCents: 210, supplierId: "sup-r2-3", category: "Dispensa" },
    { id: "inv-r2-3", restaurantId: "r2", name: "Fiordilatte", unit: "kg", qty: 9, minQty: 12, costPerUnitCents: 820, supplierId: "sup-r2-2", category: "Latticini" },
    { id: "inv-r2-4", restaurantId: "r2", name: "Salame piccante", unit: "kg", qty: 4, minQty: 3, costPerUnitCents: 1180, supplierId: "sup-r2-3", category: "Salumi" },
    { id: "inv-r2-5", restaurantId: "r2", name: "Birra Peroni", unit: "bt", qty: 36, minQty: 24, costPerUnitCents: 150, supplierId: "sup-r2-3", category: "Bevande" },
    { id: "inv-r2-6", restaurantId: "r2", name: "Olio di semi", unit: "L", qty: 12, minQty: 8, costPerUnitCents: 320, supplierId: "sup-r2-3", category: "Dispensa" },
    { id: "inv-r3-1", restaurantId: "r3", name: "Burrata", unit: "pz", qty: 6, minQty: 8, costPerUnitCents: 340, supplierId: "sup-r3-1", category: "Latticini" },
    { id: "inv-r3-2", restaurantId: "r3", name: "Manzo per tagliata", unit: "kg", qty: 4, minQty: 3, costPerUnitCents: 2400, supplierId: "sup-r3-1", category: "Carni" },
    { id: "inv-r3-3", restaurantId: "r3", name: "Pasta fresca", unit: "kg", qty: 5, minQty: 4, costPerUnitCents: 520, supplierId: "sup-r3-2", category: "Dispensa" },
    { id: "inv-r3-4", restaurantId: "r3", name: "Funghi porcini", unit: "kg", qty: 2, minQty: 1, costPerUnitCents: 2900, supplierId: "sup-r3-1", category: "Ortofrutta" },
    { id: "inv-r3-5", restaurantId: "r3", name: "Pane carasau", unit: "pz", qty: 10, minQty: 6, costPerUnitCents: 250, supplierId: "sup-r3-2", category: "Pane" },
    { id: "inv-r4-1", restaurantId: "r4", name: "Salmone fresco", unit: "kg", qty: 5, minQty: 4, costPerUnitCents: 2100, supplierId: "sup-r4-1", category: "Pesce" },
    { id: "inv-r4-2", restaurantId: "r4", name: "Tonno fresco", unit: "kg", qty: 3, minQty: 3, costPerUnitCents: 2800, supplierId: "sup-r4-1", category: "Pesce" },
    { id: "inv-r4-3", restaurantId: "r4", name: "Riso per sushi", unit: "kg", qty: 15, minQty: 10, costPerUnitCents: 260, supplierId: "sup-r4-2", category: "Dispensa" },
    { id: "inv-r4-4", restaurantId: "r4", name: "Alga nori", unit: "pz", qty: 30, minQty: 20, costPerUnitCents: 90, supplierId: "sup-r4-2", category: "Dispensa" },
  ];

  const notifications: AppNotification[] = [
    { id: "notif-1", restaurantId: "r1", title: "Scorta in esaurimento", message: "Mozzarella fiordilatte sotto la soglia minima (6 kg su 10 kg).", time: new Date(now.getTime() - 22 * 60000).toISOString(), kind: "warning", read: false },
    { id: "notif-2", restaurantId: "r1", title: "Prenotazione in attesa", message: "Roberto Fabbri, 3 coperti alle 20:30. Note: possibile allergia al glutine.", time: new Date(now.getTime() - 48 * 60000).toISOString(), kind: "info", read: false },
    { id: "notif-3", restaurantId: "r1", title: "Comanda pronta", message: "Ordine #130 per il tavolo T7 è pronto per il servizio.", time: new Date(now.getTime() - 4 * 60000).toISOString(), kind: "success", read: false },
    { id: "notif-4", restaurantId: "r1", title: "Tavolo da riordinare", message: "Il tavolo T4 è stato liberato e attende la riordinatura.", time: new Date(now.getTime() - 70 * 60000).toISOString(), kind: "info", read: true },
    { id: "notif-5", restaurantId: "r1", title: "Palmare offline", message: "Il dispositivo «Palmare Veranda» non risponde da 3 ore.", time: new Date(now.getTime() - 3 * 3600000).toISOString(), kind: "warning", read: true },
    { id: "notif-6", restaurantId: null, title: "Prova in scadenza", message: "Bistrot Aurora: la prova gratuita scade tra 18 giorni.", time: new Date(now.getTime() - 2 * 3600000).toISOString(), kind: "warning", read: false },
    { id: "notif-7", restaurantId: null, title: "Nuovo ristorante registrato", message: "Sushi Kumo (Bologna) ha completato la registrazione.", time: new Date(now.getTime() - 26 * 3600000).toISOString(), kind: "info", read: true },
    { id: "notif-8", restaurantId: "r2", title: "Scorta in esaurimento", message: "Farina Caputo sotto la soglia minima (18 kg su 40 kg).", time: new Date(now.getTime() - 35 * 60000).toISOString(), kind: "warning", read: false },
  ];

  const activity: ActivityEntry[] = [
    { id: "act-1", restaurantId: "r1", actor: "Marco Bellini", action: "Menu aggiornato", detail: "Prezzo di «Tagliere toscano» aggiornato a 14,00 €", time: new Date(now.getTime() - 5 * 3600000).toISOString() },
    { id: "act-2", restaurantId: "r1", actor: "Giulia Fontana", action: "Chiusura cassa", detail: "Turno pranzo chiuso con 872,00 € incassati", time: new Date(now.getTime() - 4 * 3600000).toISOString() },
    { id: "act-3", restaurantId: "r1", actor: "Sistema", action: "Palmare disconnesso", detail: "«Palmare Veranda» offline da 3 ore", time: new Date(now.getTime() - 3 * 3600000).toISOString() },
    { id: "act-4", restaurantId: "r2", actor: "Gennaro Esposito", action: "Nuovo dipendente", detail: "Salvatore Riva aggiunto come cameriere", time: new Date(now.getTime() - 20 * 3600000).toISOString() },
    { id: "act-5", restaurantId: "r3", actor: "Elena Moretti", action: "Prova gratuita avviata", detail: "Piano Starter, 30 giorni di prova", time: new Date(now.getTime() - 12 * 86400000).toISOString() },
    { id: "act-6", restaurantId: "r4", actor: "Super Admin", action: "Ristorante sospeso", detail: "Pagamento non riuscito per 3 cicli consecutivi", time: new Date(now.getTime() - 4 * 86400000).toISOString() },
    { id: "act-7", restaurantId: null, actor: "Super Admin", action: "Accesso console", detail: "Accesso alla console di piattaforma", time: new Date(now.getTime() - 25 * 60000).toISOString() },
  ];

  return {
    activeRestaurantId: "r1",
    activeRole: "admin",
    restaurants,
    categories,
    products,
    tables: nextTables,
    floorObjects: buildFloorObjects(nextTables),
    orders: [...paid, ...activeOrders],
    reservations,
    customers,
    staff,
    devices,
    suppliers,
    inventory,
    sales,
    notifications,
    activity,
  };
}

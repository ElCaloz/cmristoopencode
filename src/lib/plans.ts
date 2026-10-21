export type PlanId = "starter" | "pro" | "business" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyCents: number | null;
  users: number | null;
  locations: number | null;
  handhelds: number;
  highlighted?: boolean;
  features: string[];
};

/**
 * Prezzi PROVVISORI (non ancora decisi commercialmente).
 * Unico punto di configurazione: non duplicare importi altrove.
 */
export const PRICES_ARE_PROVISIONAL = true;
export const TRIAL_DAYS = 30;
export const ANNUAL_MONTHS_CHARGED = 10;

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Le funzioni essenziali per iniziare",
    monthlyCents: 2900,
    users: 3,
    locations: 1,
    handhelds: 4,
    features: [
      "Cassa POS e gestione tavoli",
      "Comande digitali per cucina",
      "Menu digitale fino a 1 sede",
      "Report essenziali",
      "Palmari inclusi (fino a 4 per locale)",
      "Assistenza via email",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Operatività completa per il ristorante",
    monthlyCents: 5900,
    users: 10,
    locations: 2,
    handhelds: 4,
    highlighted: true,
    features: [
      "Tutto il piano Starter",
      "Prenotazioni e CRM clienti",
      "Magazzino, fornitori e scorte",
      "Report avanzati e margini",
      "Gestione turni e personale",
      "Palmari inclusi (fino a 4 per locale)",
      "Assistenza prioritaria",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "Controllo e analisi per gruppi in crescita",
    monthlyCents: 9900,
    users: 25,
    locations: 5,
    handhelds: 4,
    features: [
      "Tutto il piano Pro",
      "Dashboard multi-sede aggregata",
      "Analisi costi e food cost",
      "Ruoli e permessi avanzati",
      "Registro attività completo",
      "Palmari inclusi (fino a 4 per locale)",
      "Assistenza dedicata",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Gruppi di ristoranti e esigenze su misura",
    monthlyCents: null,
    users: null,
    locations: null,
    handhelds: 4,
    features: [
      "Tutto il piano Business",
      "Sedi e utenti personalizzati",
      "Gestione centralizzata del gruppo",
      "Onboarding assistito",
      "Integrazioni su richiesta",
      "Referente commerciale dedicato",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "business", "enterprise"];

export function annualTotalCents(plan: Plan): number | null {
  if (plan.monthlyCents === null) return null;
  return plan.monthlyCents * ANNUAL_MONTHS_CHARGED;
}

export function annualMonthlyEquivalentCents(plan: Plan): number | null {
  const total = annualTotalCents(plan);
  if (total === null) return null;
  return Math.round(total / 12);
}

export function annualSavingsCents(plan: Plan): number | null {
  if (plan.monthlyCents === null) return null;
  return plan.monthlyCents * 12 - plan.monthlyCents * ANNUAL_MONTHS_CHARGED;
}

export function formatPlanName(id: PlanId): string {
  return PLANS[id].name;
}

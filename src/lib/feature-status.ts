import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * Tassonomia ufficiale dello stato delle funzionalità (D-055).
 *
 * Quattro stati, dall'assente all'operativo:
 * - mancante: non esiste nel prodotto;
 * - implementato: codice completo, test automatici parziali, collaudo end-to-end assente;
 * - testato: verificato nei test automatici o con un provider in modalità di prova;
 * - operativo: disponibile su un locale reale, con dati salvati nel database.
 *
 * `internalLabel` è il nome usato nella documentazione (docs/STATUS.md, docs/DECISIONS.md),
 * `label` è il nome mostrato nelle pagine pubbliche.
 */
export type FeatureStatus = "operativo" | "testato" | "implementato" | "mancante";

export type FeatureStatusMeta = {
  internalLabel: string;
  label: string;
  description: string;
  badge: BadgeTone;
};

export const FEATURE_STATUS: Record<FeatureStatus, FeatureStatusMeta> = {
  operativo: {
    internalLabel: "Operativo",
    label: "Operativo",
    description:
      "Disponibile oggi su un locale reale: i dati sono salvati nel database e le azioni principali sono coperte da test end-to-end.",
    badge: "success",
  },
  testato: {
    internalLabel: "Testato",
    label: "In test",
    description:
      "Collegato a un servizio esterno in modalità di prova. Funziona tecnicamente, ma non è ancora utilizzabile in esercizio.",
    badge: "info",
  },
  implementato: {
    internalLabel: "Implementato",
    label: "In collaudo",
    description:
      "Codice completo e verificato nei test del database; manca il collaudo end-to-end dell'interfaccia.",
    badge: "warning",
  },
  mancante: {
    internalLabel: "Mancante",
    label: "In arrivo",
    description:
      "Non ancora disponibile: non esiste nel prodotto e non viene dichiarato come attivo.",
    badge: "muted",
  },
};

export const FEATURE_STATUS_ORDER: FeatureStatus[] = [
  "operativo",
  "testato",
  "implementato",
  "mancante",
];

import type { Metadata } from "next";
import {
  ArrowRight,
  Armchair,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  Check,
  ChefHat,
  CreditCard,
  Package,
  ShieldCheck,
  Smartphone,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Funzionalità",
  description:
    "Cassa, sala, cucina, palmari, prenotazioni, magazzino, report e multi-sede: tutte le funzioni di CM Risto, con demo interattiva.",
};

const sections = [
  {
    id: "cassa",
    icon: CreditCard,
    eyebrow: "Operatività",
    title: "Cassa veloce, conti sempre chiari",
    description:
      "Un POS touchscreen pensato per i momenti di punta: pochi tocchi, feedback immediato e nessun conto perso.",
    points: [
      "Apertura e gestione di più conti contemporaneamente",
      "Inserimento per categorie, ricerca rapida e varianti",
      "Note per cucina, sconti autorizzati e trasferimento articoli",
      "Anteprima del conto e metodi di pagamento",
      "Stati di connessione e indicazione della modalità offline",
    ],
    demo: "Apri la cassa nella demo",
  },
  {
    id: "sala",
    icon: Armchair,
    eyebrow: "Sala",
    title: "La sala, leggibile a colpo d'occhio",
    description:
      "Tavoli liberi, occupati, prenotati e da riordinare. Il cameriere sa sempre dove andare e cosa manca.",
    points: [
      "Mappa tavoli per sala con stato in tempo reale",
      "Apertura tavolo, coperti e comanda",
      "Trasferimento tavolo e richiesta del conto",
      "Storico delle proprie attività",
      "Interfaccia mobile-first per il servizio in piedi",
    ],
    demo: "Prova la vista sala",
  },
  {
    id: "cucina",
    icon: ChefHat,
    eyebrow: "Cucina",
    title: "Kitchen Display che si legge da lontano",
    description:
      "Le comande arrivano ordinate per reparto, con timer e priorità. Nessun foglio appeso, nessuna voce ripetuta.",
    points: [
      "Colonne in arrivo, in preparazione e pronti",
      "Suddivisione per reparto (cucina, pizzeria, bar, dolci)",
      "Timer, ritardi e priorità visive",
      "Note, allergeni e personalizzazioni in evidenza",
      "Avanzamento per singola portata e modalità schermo intero",
    ],
    demo: "Apri il Kitchen Display",
  },
  {
    id: "palmari",
    icon: Smartphone,
    eyebrow: "Dispositivi",
    title: "Palmari associati, non semplici browser aperti",
    description:
      "Il locale autorizza i dispositivi, non si affida a un identificatore salvato nel browser. Fino a 4 palmari per locale.",
    points: [
      "Flusso di associazione controllato per locale e postazione",
      "Autenticazione rapida prevista via PIN lato backend",
      "Limite di 4 palmari applicato dal servizio, non solo dalla UI",
      "Revoca immediata di un dispositivo smarrito",
      "Stato online e ultimo contatto per ogni dispositivo",
    ],
    demo: "Gestisci i dispositivi demo",
    note: "Nella demo associazione e PIN sono simulati: la protezione reale arriverà con il backend.",
  },
  {
    id: "prenotazioni",
    icon: CalendarCheck,
    eyebrow: "Prenotazioni",
    title: "Agenda, coperti e clienti in un unico posto",
    description:
      "Prenotazioni, arrivi, no-show e preferenze del cliente non vivono più su fogli o rubriche separate.",
    points: [
      "Prenotazioni per data, ora e coperti",
      "Conferma, accoglienza, annullamento e no-show",
      "Note su allergie, compleanni e richieste speciali",
      "Anagrafica clienti con visite e spesa totale",
      "Tag e preferenze per un servizio più personale",
    ],
    demo: "Apri le prenotazioni demo",
  },
  {
    id: "menu",
    icon: BookOpen,
    eyebrow: "Menu",
    title: "Menu e margini sotto controllo",
    description:
      "Prezzi, costi e disponibilità nello stesso sistema: se un piatto finisce, la cassa lo sa subito.",
    points: [
      "Categorie, prodotti, varianti e allergeni",
      "Prezzo di vendita e food cost per piatto",
      "Margine calcolato e disponibilità in tempo reale",
      "Duplicazione e archiviazione dei prodotti",
      "Aggiornamenti immediati su cassa e palmari",
    ],
    demo: "Modifica il menu demo",
  },
  {
    id: "magazzino",
    icon: Package,
    eyebrow: "Magazzino",
    title: "Scorte, fornitori e soglie minime",
    description:
      "Sai cosa sta finendo prima che finisca. Carichi, rettifiche e fornitori ordinati per categoria.",
    points: [
      "Giacenze con unità di misura e soglia minima",
      "Avvisi sulle scorte in esaurimento",
      "Carico merce e rettifiche di inventario",
      "Fornitori collegati alle categorie di acquisto",
      "Costi di acquisto per voce",
    ],
    demo: "Apri il magazzino demo",
  },
  {
    id: "report",
    icon: BarChart3,
    eyebrow: "Analisi",
    title: "Report che rispondono a domande concrete",
    description:
      "Incassi, scontrino medio, metodi di pagamento e prodotti più venduti. Dati leggibili, non grafici decorativi.",
    points: [
      "Andamento incassi per periodo",
      "Ordini, coperti e scontrino medio",
      "Mix dei metodi di pagamento",
      "Top prodotti per ricavi",
      "Export CSV dei dati visualizzati",
    ],
    demo: "Apri i report demo",
  },
  {
    id: "multi-sede",
    icon: Building2,
    eyebrow: "Gruppi",
    title: "Più sedi, permessi espliciti",
    description:
      "Ogni record operativo appartiene a un locale. Gli admin vedono solo ciò che gli è stato assegnato.",
    points: [
      "Cambio sede rapido dalla barra superiore",
      "Personale e dispositivi per singola sede",
      "Piani Business ed Enterprise per la gestione centralizzata",
      "Console Super Admin separata dagli admin cliente",
      "Registro delle attività amministrative",
    ],
    demo: "Gestisci il gruppo demo",
  },
];

const roadmap = [
  {
    title: "Integrazione fiscale",
    description:
      "Registratore telematico e scontrino fiscale: previsti come adapter configurabili, da verificare con un dispositivo reale prima di dichiararli disponibili.",
    icon: ShieldCheck,
  },
  {
    title: "Pagamenti reali",
    description:
      "Il flusso è predisposto per un provider come Stripe. Nessun pagamento viene elaborato in questa build.",
    icon: CreditCard,
  },
  {
    title: "Servizio locale e offline",
    description:
      "Un servizio dedicato al locale gestirà stampanti, palmari e sincronizzazione offline con idempotenza.",
    icon: UtensilsCrossed,
  },
  {
    title: "Receptionist AI e telefonia",
    description:
      "Prenotazioni telefoniche e assistenza vocale richiedono integrazioni esterne e test dedicati. Non sono simulate come se fossero reali.",
    icon: Users,
  },
];

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="border-b border-zinc-100 py-14 sm:py-20 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <Badge variant="muted" className="mb-4">
                Funzionalità di CM Risto
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
                Tutto il locale, dall&apos;ordine al margine.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
                Ogni sezione della demo è navigabile e usa dati coerenti. Questa
                pagina descrive cosa fa il prodotto, senza promesse su
                integrazioni non ancora verificate.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link href="/app/panoramica">
                    Esplora la demo
                    <ArrowRight />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/prezzi">Vedi i piani</Link>
                </Button>
              </div>
            </div>
            <nav className="mt-8 flex flex-wrap gap-2" aria-label="Sezioni funzionalità">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-brand-300 hover:text-brand-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-brand-700 dark:hover:text-brand-400"
                >
                  {section.eyebrow}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 border-b border-zinc-100 py-14 sm:py-16 dark:border-zinc-800"
            >
              <div
                className={`grid gap-8 lg:grid-cols-2 lg:items-center ${
                  index % 2 === 1 ? "lg:[&>:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                      <section.icon className="size-4.5" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                      {section.eyebrow}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {section.description}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {section.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                          <Check className="size-3" />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                  {section.note ? (
                    <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-300">
                      {section.note}
                    </p>
                  ) : null}
                  <Button variant="outline" className="mt-5" asChild>
                    <Link
                      href={
                        section.id === "cucina"
                          ? "/app/cucina"
                          : section.id === "palmari"
                            ? "/app/dispositivi"
                            : section.id === "multi-sede"
                              ? "/app/piattaforma"
                              : section.id === "sala"
                                ? "/app/sala"
                                : section.id === "cassa"
                                  ? "/app/pos"
                                  : section.id === "prenotazioni"
                                    ? "/app/prenotazioni"
                                    : section.id === "menu"
                                      ? "/app/menu"
                                      : section.id === "magazzino"
                                        ? "/app/magazzino"
                                        : "/app/report"
                      }
                    >
                      {section.demo}
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {section.eyebrow}
                      </p>
                      <Badge variant="warning" className="text-[9px]">
                        ANTEPRIMA DEMO
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {section.points.slice(0, 4).map((point, pointIndex) => (
                        <div
                          key={point}
                          className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/60"
                        >
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            {point}
                          </span>
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              pointIndex % 3 === 0
                                ? "bg-brand-500"
                                : pointIndex % 3 === 1
                                  ? "bg-amber-400"
                                  : "bg-zinc-300 dark:bg-zinc-600"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-3">
                Trasparenza
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Cosa non è ancora attivo
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Queste funzioni sono progettate ma richiedono integrazioni
                esterne e verifica reale. Non le dichiariamo complete finché non
                lo sono.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {roadmap.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-900/50"
                >
                  <item.icon className="size-5 text-zinc-500 dark:text-zinc-400" />
                  <div className="mt-3 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {item.title}
                    </h3>
                    <Badge variant="muted">In sviluppo</Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Button asChild>
                <Link href="/app/panoramica">
                  Prova ciò che è già utilizzabile
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  ChefHat,
  CreditCard,
  Database,
  LayoutDashboard,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import Link from "next/link";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Documentazione",
  description:
    "Guida rapida a CM Risto: demo, area reale, ruoli, cassa, cucina, dispositivi e stato reale delle integrazioni.",
};

const quickStart = [
  {
    title: "Apri la demo",
    description: "Nessuna registrazione: la demo parte con l'Osteria del Borgo.",
    href: "/app/panoramica",
    cta: "Apri la dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Prova la cassa",
    description: "Seleziona un tavolo, invia una comanda e incassa un ordine.",
    href: "/app/pos",
    cta: "Apri il POS",
    icon: CreditCard,
  },
  {
    title: "Guarda la cucina",
    description: "Le comande inviate dalla cassa e dalla sala compaiono qui.",
    href: "/app/cucina",
    cta: "Apri il KDS",
    icon: ChefHat,
  },
];

const topics = [
  {
    id: "ambienti",
    title: "Demo, area reale e stati",
    icon: LayoutDashboard,
    body: [
      "La demo (/app) non richiede registrazione e usa dati fittizi salvati nel browser. L'area reale (/dashboard) richiede un account e lavora su Supabase, con organizzazione, ruoli e dati letti dal database.",
      "Le funzionalità sono classificate in quattro stati: Operativo (usabile su un locale reale), In test (provider esterno in modalità di prova), In collaudo (codice completo, collaudo end-to-end in corso) e In arrivo (non disponibile).",
      "La pagina Funzionalità riporta lo stato di ogni modulo e di ogni integrazione esterna, con le verifiche che lo sostengono.",
    ],
  },
  {
    id: "ruoli",
    title: "Ruoli e cambio ruolo nella demo",
    icon: Users,
    body: [
      "In alto a destra, dal menu dell'utente demo, puoi cambiare ruolo: Amministratore, Cassiere, Cameriere e Cucina. Il ruolo Super Admin è escluso dalla demo: la console di piattaforma vive solo nell'area reale.",
      "Nell'area reale non esiste alcun selettore: ruolo e permessi arrivano dall'identità autenticata e sono verificati lato server, con policy RLS sul database.",
      "Alcune sezioni non sono visibili per tutti i ruoli. Nella demo il controllo è di interfaccia; nell'area reale è applicato anche dal database.",
    ],
  },
  {
    id: "cassa",
    title: "Flusso di cassa",
    icon: CreditCard,
    body: [
      "Nella demo apri la Cassa POS, scegli un tavolo libero e aggiungi prodotti dal menu: puoi impostare coperti, varianti e note.",
      "«Invia in cucina» crea un ordine reale nella demo: lo vedrai nel KDS e nelle vendite dopo il pagamento. Il pagamento della demo è dimostrativo e non produce scontrini fiscali.",
      "Nell'area reale il POS apre un conto per tavolo, aggiunge righe, annulla righe o l'intero conto e registra l'incasso con metodo e mancia. Alla chiusura il conto viene accodato alla stampa.",
      "Mancano ancora l'integrazione fiscale, gli sconti e il trasferimento di articoli tra conti.",
    ],
  },
  {
    id: "cucina",
    title: "Kitchen Display",
    icon: ChefHat,
    body: [
      "Le comande attive sono divise in In arrivo, In preparazione e Pronti al pass, con il tempo trascorso su ogni portata.",
      "Avvia la preparazione, segna le portate come pronte e completa l'ordine. Gli stati sono condivisi con cassa e sala: sono gli stessi dati, non una copia.",
      "La modalità schermo intero usa il fullscreen del browser. Nella demo la vista si aggiorna subito; nell'area reale il KDS aggiorna i dati ogni 30 secondi, con un pulsante di refresh manuale.",
      "Reparti, priorità automatiche e allergeni sulle portate non sono ancora implementati.",
    ],
  },
  {
    id: "dispositivi",
    title: "Palmari e associazione",
    icon: Smartphone,
    body: [
      "La pagina Dispositivi mostra i device associati al locale, lo stato e l'ultimo contatto.",
      "Nell'area reale l'associazione usa un codice monouso legato al locale; l'operatore entra con un PIN personale da 4 a 6 cifre e il limite di 4 palmari è applicato dal database.",
      "Nella demo associazione, PIN e limite sono simulati dallo store locale, con le stesse regole visibili nell'interfaccia.",
      "Puoi revocare un dispositivo per simulare la perdita o la sostituzione di un palmare. Il palmare non funziona offline.",
    ],
  },
  {
    id: "dati-demo",
    title: "Dati demo e ripristino",
    icon: Database,
    body: [
      "Tutti i ristoranti, gli ordini, i clienti e gli importi della demo sono fittizi e generati in modo deterministico.",
      "La demo salva le modifiche nel browser per mantenere lo stato tra le pagine. Il comando «Ripristina demo» ricarica i dati iniziali.",
      "I dati demo restano nel browser e non vengono inviati al database. L'area reale usa tabelle separate, con isolamento per organizzazione.",
      "Nessun ordine, pagamento o messaggio della demo viene inviato a sistemi esterni.",
    ],
  },
  {
    id: "backend",
    title: "Stato del backend e integrazioni",
    icon: ShieldCheck,
    body: [
      "L'area reale gira su Next.js 16 e Supabase, con autenticazione, ruoli e RLS attivi. La produzione è pubblicata e usa un progetto Supabase dedicato.",
      "Sono operativi: cassa, sala e piantina, cucina, menu, palmari, prenotazioni, magazzino, ricette, acquisti, report, vendite e gestione delle sedi.",
      "Sono in test: abbonamenti Stripe, email transazionali e stampa scontrini. Sono in collaudo: CRM, personale, ordini online, sicurezza MFA e monitoraggio errori.",
      "Mancano: integrazione fiscale, SMS, telefonia del receptionist, palmare offline e aggiornamenti in tempo reale.",
    ],
  },
];

export default function DocumentationPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="border-b border-zinc-100 py-14 sm:py-20 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <Badge variant="muted" className="mb-4">
                <BookOpen className="size-3" />
                Documentazione di base
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
                Come esplorare CM Risto.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
                Una guida rapida per orientarsi tra demo e area reale, capire
                quale parte del prodotto è operativa, quale è in prova e quale
                deve ancora arrivare.
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {quickStart.map((entry) => (
                <Link
                  key={entry.title}
                  href={entry.href}
                  className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition-colors hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-700"
                >
                  <entry.icon className="size-5 text-brand-700 dark:text-brand-400" />
                  <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {entry.title}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {entry.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 dark:text-brand-400">
                    {entry.cta}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
            <nav className="hidden lg:block" aria-label="Indice documentazione">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                In questa pagina
              </p>
              <ul className="mt-3 space-y-1 border-l border-zinc-200 dark:border-zinc-800">
                {topics.map((topic) => (
                  <li key={topic.id}>
                    <a
                      href={`#${topic.id}`}
                      className="-ml-px block border-l border-transparent px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-brand-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {topic.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-10">
              {topics.map((topic) => (
                <article
                  key={topic.id}
                  id={topic.id}
                  className="scroll-mt-24 rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      <topic.icon className="size-4" />
                    </span>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {topic.title}
                    </h2>
                  </div>
                  <div className="mt-4 space-y-3">
                    {topic.body.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              ))}

              <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-5 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Serve altro?
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Scrivici: la documentazione è in espansione insieme al
                    prodotto.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/contatti">Contatti</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/app/panoramica">Apri la demo</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

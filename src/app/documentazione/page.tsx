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
    "Guida rapida a CM Risto: demo, ruoli, cassa, cucina, dispositivi, dati dimostrativi e stato delle integrazioni.",
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
    id: "ruoli",
    title: "Ruoli e cambio ruolo nella demo",
    icon: Users,
    body: [
      "In alto a destra, dal menu dell'utente demo, puoi cambiare ruolo: Amministratore, Cassiere, Cameriere, Cucina e Super Admin.",
      "In modalità reale il ruolo deriverà dall'identità autenticata e dai permessi assegnati lato server: il selettore esiste solo nella demo.",
      "Alcune sezioni non sono visibili per tutti i ruoli. Questo replica i permessi previsti, ma nella demo la protezione è solo di interfaccia.",
    ],
  },
  {
    id: "cassa",
    title: "Flusso di cassa",
    icon: CreditCard,
    body: [
      "Apri la sezione Cassa POS, scegli un tavolo libero e aggiungi prodotti dal menu. Puoi impostare coperti, varianti e note.",
      "«Invia in cucina» crea un ordine reale nella demo: lo vedrai nella sala, nel KDS e nelle vendite dopo il pagamento.",
      "«Incassa» apre il dialog di pagamento. Il pagamento è dimostrativo: nessun importo viene addebitato e nessun scontrino fiscale viene emesso.",
      "La cassa reale richiederà integrazione fiscale e provider di pagamento; qui l'interfaccia è predisposta.",
    ],
  },
  {
    id: "cucina",
    title: "Kitchen Display",
    icon: ChefHat,
    body: [
      "Le comande attive sono divise in In arrivo, In preparazione e Pronti. Filtra per reparto (cucina, pizzeria, bar, dolci).",
      "Avvia la preparazione, segna le portate come pronte e completa l'ordine. Gli stati sono condivisi con sala e cassa.",
      "La modalità schermo intero usa il fullscreen del browser. Il timer si aggiorna ogni secondo lato client.",
      "Nella versione reale gli aggiornamenti arriveranno da Supabase Realtime o da un servizio locale, con fallback offline.",
    ],
  },
  {
    id: "dispositivi",
    title: "Palmari e associazione",
    icon: Smartphone,
    body: [
      "La pagina Dispositivi mostra i device associati al locale, lo stato e l'ultimo contatto.",
      "Nella demo puoi associare un nuovo palmare: il limite di 4 per locale viene applicato dallo store dimostrativo.",
      "L'associazione reale richiederà un codice monouso, un PIN e una verifica lato server. Non è sufficiente un identificatore salvato nel browser.",
      "Puoi revocare un dispositivo per simulare la perdita o la sostituzione di un palmare.",
    ],
  },
  {
    id: "dati-demo",
    title: "Dati demo e ripristino",
    icon: Database,
    body: [
      "Tutti i ristoranti, gli ordini, i clienti e gli importi sono fittizi e generati in modo deterministico.",
      "La demo salva le modifiche nel browser per mantenere lo stato tra le pagine. Il comando «Ripristina demo» ricarica i dati iniziali.",
      "Per nessun motivo la demo invia pagamenti, email, comande o dati a sistemi esterni.",
      "In futuro i dati demo saranno separati a livello di backend dai dati reali dei tenant.",
    ],
  },
  {
    id: "backend",
    title: "Stato del backend e integrazioni",
    icon: ShieldCheck,
    body: [
      "Questa build è un frontend completo con dati dimostrativi. Supabase è previsto per autenticazione, database multi-tenant e RLS.",
      "Nessuna integrazione fiscale, di pagamento, stampa o telefonia è dichiarata attiva.",
      "Le integrazioni saranno implementate come adapter separati e testate con servizi reali prima di essere mostrate come disponibili.",
      "Sicurezza: in produzione autorizzazioni, prezzi e importi saranno verificati lato server; il frontend non sarà una fonte di verità.",
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
                Una guida rapida per orientarsi nella demo e capire quali parti
                sono già utilizzabili e quali richiedono ancora il backend.
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

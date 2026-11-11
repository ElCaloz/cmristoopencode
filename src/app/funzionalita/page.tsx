import type { Metadata } from "next";
import {
  Armchair,
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  Check,
  ChefHat,
  CreditCard,
  Package,
  Phone,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  UserCog,
  Users,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FEATURE_STATUS,
  FEATURE_STATUS_ORDER,
  type FeatureStatus,
} from "@/lib/feature-status";

export const metadata: Metadata = {
  title: "Funzionalità",
  description:
    "Cosa fa oggi CM Risto: moduli operativi con dati reali, integrazioni in modalità di prova e funzioni ancora in arrivo, con lo stato dichiarato di ogni parte.",
};

type FeatureSection = {
  id: string;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
  description: string;
  status: FeatureStatus;
  points: string[];
  evidence: string;
  missing?: string;
  href: string;
  cta: string;
};

const sections: FeatureSection[] = [
  {
    id: "cassa",
    eyebrow: "Cassa",
    icon: CreditCard,
    title: "Conti chiari dal primo tavolo all'ultimo incasso",
    description:
      "Un conto per tavolo, righe modificabili e incasso registrato con metodo di pagamento. Ogni operazione passa da funzioni atomiche e idempotenti del database.",
    status: "operativo",
    points: [
      "Più conti aperti contemporaneamente, uno per tavolo",
      "Prodotti filtrabili per categoria, con nota di riga e nota di conto",
      "Annullamento di una singola riga o dell'intero conto",
      "Incasso con metodo di pagamento e mancia",
      "Scontrino accodato alla stampa alla chiusura del conto",
    ],
    evidence: "58 test sul database · test end-to-end sulla cassa reale",
    missing: "Sconti, varianti e trasferimento di articoli tra conti.",
    href: "/app/pos",
    cta: "Apri la cassa nella demo",
  },
  {
    id: "sala",
    eyebrow: "Sala",
    icon: Armchair,
    title: "La piantina è un dato del gestionale",
    description:
      "Aree, tavoli e arredi sono salvati nel database e modificabili con un editor grafico. La stessa sala alimenta cassa, prenotazioni e palmari.",
    status: "operativo",
    points: [
      "Aree e tavoli con posti, forma e posizione",
      "Editor della piantina con trascinamento, ridimensionamento, muri e arredi",
      "Sospensione temporanea di un tavolo senza cancellarlo",
      "18 tavoli di partenza in ogni nuovo locale",
      "Tavoli e conti aperti collegati alla cassa",
    ],
    evidence: "33 test sul database · 2 test end-to-end sulla piantina",
    missing: "Vista servizio con stato dei tavoli aggiornato in automatico.",
    href: "/app/sala",
    cta: "Prova la vista sala",
  },
  {
    id: "cucina",
    eyebrow: "Cucina",
    icon: ChefHat,
    title: "Kitchen Display con stati condivisi",
    description:
      "Le comande arrivano dalla cassa e dal palmare e avanzano su tre colonne. Lo stato è lo stesso che vede la sala, senza passaggi a voce.",
    status: "operativo",
    points: [
      "Tre colonne: in arrivo, in preparazione, pronti al pass",
      "Tempo trascorso su ogni portata",
      "Avanzamento per singola riga, condiviso con cassa e sala",
      "Note di cucina in evidenza e modalità schermo intero",
      "Aggiornamento automatico ogni 30 secondi, più refresh manuale",
    ],
    evidence: "41 test sul database · test end-to-end sulla cucina reale",
    missing: "Reparti, priorità automatiche e allergeni sulle portate.",
    href: "/app/cucina",
    cta: "Apri il Kitchen Display",
  },
  {
    id: "palmari",
    eyebrow: "Palmari",
    icon: Smartphone,
    title: "Dispositivi autorizzati, non browser qualsiasi",
    description:
      "Il locale associa il palmare con un codice monouso e l'operatore entra con il proprio PIN. Il limite di dispositivi è applicato dal database.",
    status: "operativo",
    points: [
      "Associazione con codice monouso legato al locale",
      "Accesso operatore con PIN personale da 4 a 6 cifre",
      "Limite di 4 palmari per locale applicato dal database",
      "Revoca immediata e ultimo contatto di ogni dispositivo",
      "Comande dal palmare: apertura conto e invio prodotti",
    ],
    evidence:
      "59 + 81 + 58 test sul database · test end-to-end su dispositivi e comande",
    missing: "Modalità offline: oggi il palmare richiede connessione.",
    href: "/app/dispositivi",
    cta: "Gestisci i dispositivi demo",
  },
  {
    id: "prenotazioni",
    eyebrow: "Prenotazioni",
    icon: CalendarCheck,
    title: "Disponibilità calcolata, non a occhio",
    description:
      "La disponibilità dipende da orari, chiusure, preavviso e capienza dei tavoli. La prenotazione nasce nello stesso database del servizio.",
    status: "operativo",
    points: [
      "Disponibilità su orari, chiusure, preavviso e capienza dei tavoli",
      "Conferma, arrivo, completamento, no-show e annullamento",
      "Note su allergie e richieste speciali",
      "Orari di apertura e date di chiusura configurabili",
      "API interne pronte per un agente vocale, con token firmati",
    ],
    evidence:
      "72 test sul database · test end-to-end su prenotazioni e receptionist",
    missing: "Chiamate in ingresso: manca il provider telefonico.",
    href: "/app/prenotazioni",
    cta: "Apri le prenotazioni demo",
  },
  {
    id: "menu",
    eyebrow: "Menu",
    icon: BookOpen,
    title: "Menu, prezzi e margini nello stesso posto",
    description:
      "Categorie, prodotti e disponibilità vivono nel database. Il food cost arriva dalle ricette, non da un foglio di calcolo separato.",
    status: "operativo",
    points: [
      "Categorie e prodotti con descrizione e prezzo in centesimi",
      "Disponibilità attivabile e disattivabile in un tocco",
      "Food cost e margine per piatto calcolati dalle ricette",
      "Menu pubblico con link token-only, senza registrazione",
      "Gli ordini online diventano conti in cassa",
    ],
    evidence: "30 + 34 test sul database · test end-to-end su menu e ricette",
    missing:
      "Varianti, allergeni strutturati, foto prodotto e duplicazione dei piatti.",
    href: "/app/menu",
    cta: "Modifica il menu demo",
  },
  {
    id: "online",
    eyebrow: "Ordini online",
    icon: ShoppingBag,
    title: "Ordini dal menu pubblico, senza doppioni",
    description:
      "Un link con token apre il menu del locale. L'ordine viene ricalcolato dal database e, una volta confermato, diventa un conto in cassa.",
    status: "implementato",
    points: [
      "Link pubblici per menu o singolo tavolo, con scadenza e revoca",
      "Carrello con chiave di idempotenza: nessun doppio ordine",
      "Totali ricalcolati dal database, mai dal browser",
      "Conferma dell'ordine che crea il conto in cassa",
      "QR del link scaricabile in PNG e stampabile",
      "Limite anti-abuso: 10 ordini ogni 10 minuti per contatto",
    ],
    evidence:
      "Test sul database Sprint 7 · test end-to-end su link pubblici e QR · collaudo ordini in corso",
    missing: "Test end-to-end del flusso d'ordine completo.",
    href: "/dashboard/online",
    cta: "Apri nell'area reale",
  },
  {
    id: "magazzino",
    eyebrow: "Magazzino",
    icon: Package,
    title: "Scorte tracciate, non stimate",
    description:
      "Le giacenze cambiano solo con un movimento registrato: carico, scarico, spreco o rettifica. Ogni passaggio ha una motivazione.",
    status: "operativo",
    points: [
      "Giacenze in millesimi con soglia minima e stato esaurito",
      "Movimenti di carico, scarico, spreco e rettifica con motivazione",
      "Fornitori, lotti e scadenze",
      "Ordini ai fornitori con ricezioni anche parziali",
      "Costi aggiornati all'ultima ricezione",
    ],
    evidence: "23 + 61 test sul database · test end-to-end su magazzino e acquisti",
    missing: "Scansione barcode e conversione automatica delle unità di misura.",
    href: "/app/magazzino",
    cta: "Apri il magazzino demo",
  },
  {
    id: "clienti",
    eyebrow: "Clienti",
    icon: Users,
    title: "Il cliente non è una riga di scontrino",
    description:
      "Anagrafica, visite, spesa, preferenze e consensi raccolti in un solo posto, con punti fedeltà gestiti lato database.",
    status: "implementato",
    points: [
      "Anagrafica con visite, spesa totale e ultima visita",
      "Allergie, note e tag per il servizio",
      "Consensi email e SMS separati",
      "Punti fedeltà con transazioni idempotenti",
      "Messaggi diretti al cliente",
    ],
    evidence: "Test sul database Sprint 7 · collaudo interfaccia in corso",
    missing: "Invii reali solo con email e SMS configurati; test end-to-end sulle pagine.",
    href: "/app/clienti",
    cta: "Apri i clienti in demo",
  },
  {
    id: "personale",
    eyebrow: "Personale",
    icon: UserCog,
    title: "Ruoli dal database, turni espliciti",
    description:
      "Ogni membro ha un ruolo e un perimetro. Costo orario e turni sono dati gestiti, non appunti fuori dal gestionale.",
    status: "implementato",
    points: [
      "Inviti con ruolo e permessi",
      "Costo orario e data di assunzione",
      "Turni con aggiunta e annullamento",
      "Sospensione di un membro senza eliminarlo",
      "Permessi verificati lato server, non nel browser",
    ],
    evidence: "Test sul database Sprint 7 · collaudo interfaccia in corso",
    missing: "Pianificazione automatica dei turni e timbratura presenze.",
    href: "/app/personale",
    cta: "Apri il personale in demo",
  },
  {
    id: "report",
    eyebrow: "Report",
    icon: BarChart3,
    title: "Numeri che derivano dagli incassi",
    description:
      "Le vendite nascono dai pagamenti registrati, non da un riepilogo compilato a mano. Ogni importo è in centesimi interi.",
    status: "operativo",
    points: [
      "Incassi per giornata di servizio",
      "Scontrino medio e coperti",
      "Mix dei metodi di pagamento",
      "Top prodotti per ricavi",
      "Confronto tra sedi ed export CSV",
    ],
    evidence: "Test sul database · test end-to-end su vendite e report",
    href: "/app/report",
    cta: "Apri i report demo",
  },
  {
    id: "multi-sede",
    eyebrow: "Sedi e ruoli",
    icon: Building2,
    title: "Più sedi, confini espliciti",
    description:
      "Ogni record operativo appartiene a un locale. L'isolamento tra tenant è applicato dal database, non dall'interfaccia.",
    status: "operativo",
    points: [
      "Più sedi nella stessa organizzazione",
      "Cambio sede dalla barra superiore",
      "Limite di sedi del piano applicato lato server",
      "Ruoli e permessi per singola sede",
      "Console di piattaforma separata dagli admin cliente",
    ],
    evidence: "30 test RLS · test di isolamento cross-tenant",
    missing: "Il registro attività esiste nel database ma non ha ancora una vista.",
    href: "/app/panoramica",
    cta: "Gestisci il gruppo demo",
  },
];

const integrations: Array<{
  name: string;
  status: FeatureStatus;
  detail: string;
}> = [
  {
    name: "Stripe — abbonamenti",
    status: "testato",
    detail:
      "Prodotti, prezzi, checkout, portale clienti e webhook firmato sono attivi in modalità test. Manca un pagamento reale.",
  },
  {
    name: "Email transazionali",
    status: "testato",
    detail:
      "Invio verificato verso il proprietario dell'account. Manca un dominio verificato per scrivere ai clienti finali.",
  },
  {
    name: "SMS",
    status: "implementato",
    detail:
      "Il codice di invio è pronto, ma l'account non ha un mittente: gli SMS restano disattivati.",
  },
  {
    name: "Stampa scontrini 58/80 mm",
    status: "testato",
    detail:
      "Coda di stampa, formattazione ESC/POS e servizio locale sono pronti. Nessuna prova su una stampante fisica.",
  },
  {
    name: "Receptionist vocale",
    status: "implementato",
    detail:
      "Le API interne con token firmati esistono e proteggono le prenotazioni. Non c'è un provider telefonico collegato.",
  },
  {
    name: "Monitoraggio errori",
    status: "implementato",
    detail:
      "Route di osservabilità e chiavi configurate. L'SDK non è ancora collegato agli errori in tempo reale.",
  },
];

const roadmap: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Integrazione fiscale",
    description:
      "Registratore telematico e scontrino fiscale: adapter da verificare con un dispositivo reale prima di dichiararli disponibili.",
    icon: ReceiptText,
  },
  {
    title: "Telefonia del receptionist",
    description:
      "Numero dedicato, provider vocale e trasferimento delle chiamate. Oggi esistono solo le API interne.",
    icon: Phone,
  },
  {
    title: "Palmare offline",
    description:
      "Coda locale e sincronizzazione differita con idempotenza. Oggi il palmare richiede connessione.",
    icon: WifiOff,
  },
  {
    title: "Aggiornamenti in tempo reale",
    description:
      "Sala e cucina si aggiornano oggi con polling ogni 30 secondi. Gli aggiornamenti istantanei non sono collegati.",
    icon: BarChart3,
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
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
                Quello che il gestionale fa oggi.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
                Ogni modulo riporta il proprio stato reale. Cassa, sala, cucina,
                magazzino e report lavorano su dati salvati nel database; le
                integrazioni esterne sono distinte tra prova e funzionamento
                effettivo.
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

            <div className="mt-12">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Come leggere lo stato
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURE_STATUS_ORDER.map((status) => {
                  const meta = FEATURE_STATUS[status];
                  return (
                    <div
                      key={status}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                    >
                      <Badge variant={meta.badge} dot>
                        {meta.label}
                      </Badge>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {meta.description}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
                Stato aggiornato all&apos;11 novembre 2026.
              </p>
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
          {sections.map((section, index) => {
            const meta = FEATURE_STATUS[section.status];
            return (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 border-b border-zinc-100 py-14 sm:py-16 dark:border-zinc-800"
              >
                <div
                  className={`grid gap-8 lg:grid-cols-2 lg:items-start ${
                    index % 2 === 1 ? "lg:[&>:first-child]:order-2" : ""
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                        <section.icon className="size-4.5" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                        {section.eyebrow}
                      </span>
                      <Badge variant={meta.badge} dot>
                        {meta.label}
                      </Badge>
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
                    <Button variant="outline" className="mt-5" asChild>
                      <Link href={section.href}>
                        {section.cta}
                        <ArrowRight />
                      </Link>
                    </Button>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Stato del modulo
                      </p>
                      <Badge variant={meta.badge} dot>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {meta.description}
                    </p>
                    <dl className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          Verificato con
                        </dt>
                        <dd className="mt-0.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                          {section.evidence}
                        </dd>
                      </div>
                      {section.missing ? (
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Non ancora disponibile
                          </dt>
                          <dd className="mt-0.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                            {section.missing}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <section className="py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-3">
                Servizi esterni
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Integrazioni, stato per stato
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Un&apos;integrazione pronta nel codice non è un servizio attivo per
                il ristorante. Qui la differenza è esplicita.
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {integrations.map((integration) => {
                const meta = FEATURE_STATUS[integration.status];
                return (
                  <div
                    key={integration.name}
                    className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {integration.name}
                      </h3>
                      <Badge variant={meta.badge} dot>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {integration.detail}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8">
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Lo stato delle integrazioni è consultabile anche dall&apos;area
                reale, nella pagina{" "}
                <Link
                  href="/dashboard/integrazioni"
                  className="font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-400"
                >
                  Integrazioni
                </Link>
                , che legge la configurazione effettiva del servizio.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-zinc-50/60 py-14 sm:py-20 dark:bg-zinc-900/50">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <Badge variant="muted" className="mb-3">
                Trasparenza
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Cosa non è ancora disponibile
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Funzioni progettate ma non collegate a un servizio reale. Non le
                dichiariamo attive finché non lo sono.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roadmap.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-dashed border-zinc-300 bg-white/60 p-5 dark:border-zinc-700 dark:bg-zinc-900/40"
                >
                  <item.icon className="size-5 text-zinc-500 dark:text-zinc-400" />
                  <div className="mt-3 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {item.title}
                    </h3>
                    <Badge variant="muted">In arrivo</Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/app/panoramica">
                  Prova ciò che è già utilizzabile
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/registrati">
                  <ShieldCheck />
                  Crea un account
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

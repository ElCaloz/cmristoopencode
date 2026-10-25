import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  Check,
  ChefHat,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Timer,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { PricingCards } from "@/components/public/pricing-cards";
import { ProductPreview } from "@/components/public/product-preview";
import { Reveal } from "@/components/public/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const homeTitle =
  "CM Risto — Gestionale per ristoranti, cassa, sala e cucina";
const homeDescription =
  "Cassa, sala, cucina, palmari e prenotazioni in un'unica piattaforma. Prova la demo interattiva di CM Risto, senza registrazione.";

export const metadata: Metadata = {
  title: { absolute: homeTitle },
  description: homeDescription,
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "CM Risto",
    title: homeTitle,
    description: homeDescription,
  },
  twitter: {
    card: "summary",
    title: homeTitle,
    description: homeDescription,
  },
  robots: { index: true, follow: true },
};

const capabilities = [
  { label: "Cassa POS", icon: CreditCard },
  { label: "Sala e tavoli", icon: UtensilsCrossed },
  { label: "Cucina KDS", icon: ChefHat },
  { label: "Palmari", icon: MonitorSmartphone },
  { label: "Prenotazioni", icon: CalendarCheck },
  { label: "Ruoli e permessi", icon: ShieldCheck },
];

const problems = [
  {
    title: "Comande che cambiano voce",
    description:
      "Fogli, chat e passaggi a memoria trasformano una nota in un errore. La comanda arriva in cucina con tavolo, quantità e note già strutturati.",
    icon: ClipboardList,
  },
  {
    title: "Sala e cucina su due binari",
    description:
      "Se lo stato del piatto non è condiviso, il cameriere chiede e la cucina risponde. Ogni avanzamento è visibile a chi serve.",
    icon: ChefHat,
  },
  {
    title: "Conti ricostruiti a fine servizio",
    description:
      "La cassa lavora sulla stessa comanda della sala e della cucina. Incassi, righe e pagamenti restano coerenti.",
    icon: CircleDollarSign,
  },
  {
    title: "Prenotazioni senza contesto",
    description:
      "Capienza, orari e chiusure vengono verificati prima di confermare. Il receptionist AI prepara la richiesta, la sala decide.",
    icon: CalendarCheck,
  },
];

const modules = [
  {
    title: "Cassa e incassi",
    description:
      "Conti aperti, righe, sconti e pagamenti. Le vendite derivano dai pagamenti registrati, non da un foglio separato.",
    icon: CreditCard,
    detail: "POS touch · pagamenti · giornata vendite",
  },
  {
    title: "Sala e tavoli",
    description:
      "Aree, tavoli e capienze reali. Lo stato della sala resta allineato alle comande in corso.",
    icon: UtensilsCrossed,
    detail: "Mappa sala · coperti · stati tavolo",
  },
  {
    title: "Cucina, senza ambiguità",
    description:
      "Il KDS mostra le righe in attesa, in preparazione e pronte. Le transizioni sono validate dal database.",
    icon: ChefHat,
    detail: "KDS · tempi · note di preparazione",
  },
  {
    title: "Palmari e operatori",
    description:
      "Fino a quattro palmari per locale, attivazione con codice monouso e accesso rapido con PIN.",
    icon: MonitorSmartphone,
    detail: "Dispositivi · PIN · sessione operatore",
  },
  {
    title: "Prenotazioni",
    description:
      "Disponibilità verificata su orari, chiusure, capienza e preavviso. Le richieste AI restano da confermare.",
    icon: CalendarCheck,
    detail: "Agenda · stati · note · receptionist",
  },
  {
    title: "Permessi dal database",
    description:
      "Ruoli e autorizzazioni sono verificati lato server. La demo cambia ruolo per mostrare la differenza.",
    icon: ShieldCheck,
    detail: "RLS · ruoli · registro attività",
  },
];

const outcomes = [
  {
    title: "Un solo flusso",
    description: "Comanda, preparazione e incasso parlano dello stesso ordine.",
    icon: Zap,
  },
  {
    title: "Meno passaggi",
    description: "Le azioni frequenti restano a portata di tocco, anche in sala.",
    icon: Timer,
  },
  {
    title: "Dati leggibili",
    description: "Incassi e vendite con importi in centesimi e formati coerenti.",
    icon: BarChart3,
  },
  {
    title: "Confini chiari",
    description: "Demo e area reale sono ambienti separati, con dati distinti.",
    icon: Building2,
  },
];

const roleCards = [
  {
    title: "Admin ristorante",
    description: "Panoramica, menu, sala, personale e configurazione del locale.",
    icon: LayoutDashboard,
  },
  {
    title: "Cassiere",
    description: "Cassa, conti aperti, incassi e chiusura del servizio.",
    icon: CreditCard,
  },
  {
    title: "Cameriere",
    description: "Vista sala mobile-first, comande e stato delle portate.",
    icon: Smartphone,
  },
  {
    title: "Cucina",
    description: "Kitchen Display leggibile a distanza, con reparti e tempi.",
    icon: ChefHat,
  },
];

const faqs = [
  {
    question: "Posso provare CM Risto senza registrarmi?",
    answer:
      "Sì. La demo interattiva è accessibile dalla homepage e usa dati fittizi. Puoi navigare tra dashboard, cassa, sala, cucina e prenotazioni, cambiare ristorante e ruolo e ripristinare i dati iniziali in qualsiasi momento.",
  },
  {
    question: "La prova gratuita richiede una carta di credito?",
    answer:
      "La demo non richiede carta e non elabora pagamenti. Il piano commerciale prevede una prova, ma in questa build il backend di fatturazione non è ancora collegato.",
  },
  {
    question: "Le integrazioni fiscali, i pagamenti e la telefonia sono attivi?",
    answer:
      "No. Le integrazioni esterne sono predisposte come adapter separati e saranno dichiarate disponibili solo dopo una verifica reale. La configurazione del receptionist AI è già presente, ma la telefonia non è collegata.",
  },
  {
    question: "I dati che vedo sono reali?",
    answer:
      "No. Ristoranti, ordini, clienti e importi della demo sono fittizi e restano nel browser. L'area reale usa Supabase, autenticazione e permessi verificati lato server.",
  },
  {
    question: "La demo è la stessa cosa dell'area reale?",
    answer:
      "No. La demo è un ambiente separato con dati locali e ruoli selezionabili. L'area reale richiede un account, legge organizzazione e ruolo dal database e non permette di cambiare identità dal frontend.",
  },
];

function KitchenBand() {
  return (
    <div
      data-ui
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e0c] p-4 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.7)] sm:p-5"
    >
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ChefHat className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-white">Cucina · Osteria del Borgo</p>
              <p className="text-[10px] text-zinc-400">Anteprima KDS · dati demo</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-medium text-zinc-300">
            <span className="size-1.5 rounded-full bg-amber-400" />
            Servizio attivo
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "In attesa", value: "7", tone: "text-zinc-200" },
            { label: "In preparazione", value: "1", tone: "text-amber-300" },
            { label: "Pronte", value: "1", tone: "text-emerald-300" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
            >
              <p className="text-[9px] uppercase tracking-wide text-zinc-400">{stat.label}</p>
              <p className={`mt-0.5 text-xl font-semibold tabular-nums ${stat.tone}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
          {[
            {
              number: "130",
              table: "T7 · 2 coperti",
              time: "24 min",
              status: "Pronta",
              items: ["Tagliere toscano", "Peposo dell'Impruneta"],
              color: "border-emerald-500/40",
              badge: "bg-emerald-500/15 text-emerald-300",
            },
            {
              number: "128",
              table: "T5 · 4 coperti",
              time: "9 min",
              status: "In preparazione",
              items: ["Crostini neri", "Ribollita", "Peposo"],
              color: "border-amber-500/30",
              badge: "bg-amber-500/15 text-amber-300",
            },
            {
              number: "131",
              table: "Banco · 1 coperto",
              time: "4 min",
              status: "In preparazione",
              items: ["Spaghetti aglio e olio", "Acqua frizzante"],
              color: "border-amber-500/30",
              badge: "bg-amber-500/15 text-amber-300",
            },
          ].map((ticket) => (
            <div
              key={ticket.number}
              className={`overflow-hidden rounded-lg border bg-zinc-900/80 ${ticket.color}`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-white">#{ticket.number}</p>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400">{ticket.table}</p>
                </div>
                <span className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${ticket.badge}`}>
                  {ticket.time}
                </span>
              </div>
              <div className="space-y-1.5 p-3">
                {ticket.items.map((item) => (
                  <p key={item} className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                    <span className="size-1.5 rounded-full bg-white/20" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="border-t border-white/5 px-3 py-1.5">
                <span className="block rounded bg-white/5 px-2 py-1 text-center text-[9px] font-medium text-zinc-400">
                  {ticket.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="relative overflow-hidden">
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:gap-10 lg:px-8 lg:py-24">
            <div className="max-w-xl animate-rise-in">
              <h1 className="mt-8 text-balance text-[2.75rem] font-semibold leading-[1.03] tracking-[-0.035em] text-zinc-950 sm:text-[3.6rem] dark:text-zinc-50">
                Il servizio, sotto controllo.
              </h1>
              <p className="mt-3 text-balance text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-brand-700 sm:text-[2.1rem] dark:text-brand-400">
                Dal primo coperto all&apos;ultimo incasso.
              </p>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                Cassa, sala, cucina, palmari e prenotazioni in un unico sistema.
                Demo interattiva, senza registrazione: meno passaggi tra le
                persone, più contesto per ogni decisione.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/app/panoramica">
                    Apri la demo
                    <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#prezzi">Scopri i piani</Link>
                </Button>
              </div>

              <div className="mt-7 grid max-w-md gap-2 text-sm text-zinc-500 sm:grid-cols-2 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-brand-600" />
                  Navigazione libera tra i moduli
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-brand-600" />
                  Ruoli dimostrativi selezionabili
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-brand-600" />
                  Nessun pagamento reale
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-brand-600" />
                  Ripristino dati in un tocco
                </span>
              </div>
            </div>

            <div className="animate-rise-in [animation-delay:120ms]">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="bg-zinc-50/70 py-5 dark:bg-zinc-900/40">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-300">
              Un unico ambiente operativo
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {capabilities.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400"
                >
                  <item.icon className="size-3.5 text-brand-600 dark:text-brand-400" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16 lg:px-8">
            <div>
              <Reveal>
                <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl dark:text-zinc-50">
                  La comanda non si perde più tra il tavolo e il pass.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Il cameriere invia, la cucina vede, la cassa incassa. Ogni
                  avanzamento cambia lo stato per tutti, senza riscrivere nulla a
                  voce.
                </p>
              </Reveal>
              <ul className="mt-6 space-y-3">
                {[
                  "Righe con tavolo, quantità e note già strutturate.",
                  "Stati validati dal database: in attesa, preparazione, pronto.",
                  "Tempi e priorità visibili sul Kitchen Display.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-base text-zinc-700 dark:text-zinc-300">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                      <Check className="size-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/app/cucina">
                    Apri il KDS demo
                    <ArrowRight />
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/app/panoramica">Torna alla panoramica demo</Link>
                </Button>
              </div>
            </div>
            <KitchenBand />
          </div>
        </section>

        <section className="bg-zinc-50/60 py-16 sm:py-24 dark:bg-zinc-900/40">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <Reveal>
                  <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl dark:text-zinc-50">
                    Funzioni reali, non promesse.
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                    La demo attraversa gli stessi componenti e gli stessi stati
                    dell&apos;area operativa. Le integrazioni esterne non
                    dichiarate non vengono raccontate come attive.
                  </p>
                </Reveal>
              </div>
              <Button variant="outline" asChild>
                <Link href="/funzionalita">
                  Dettaglio funzionalità
                  <ArrowRight />
                </Link>
              </Button>
            </div>

            <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {modules.map((module) => (
                <li key={module.title}>
                  <h3 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    <module.icon className="size-5 shrink-0 text-brand-700 dark:text-brand-400" />
                    {module.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {module.description}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-300">
                    {module.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-2xl">
              <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl dark:text-zinc-50">
                Le schermate che usi ogni giorno.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                Piantina sala, cassa e Kitchen Display: gli stessi componenti
                della demo, senza ritocchi per lo screenshot. Puoi provarli prima
                di decidere.
              </p>
            </Reveal>
            <Reveal className="mt-10 overflow-hidden rounded-2xl" delay={80}>
              <Image
                src="/product/sala.jpg"
                alt="Piantina della sala con tavoli, posti e stato del servizio nella demo di CM Risto"
                width={1440}
                height={900}
                className="animate-drift w-full"
                sizes="(min-width: 1280px) 1216px, 100vw"
              />
            </Reveal>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Reveal className="overflow-hidden rounded-2xl" delay={120}>
                <Image
                  src="/product/pos.jpg"
                  alt="Cassa POS con conto aperto, righe dell'ordine e metodi di pagamento"
                  width={1440}
                  height={900}
                  className="w-full"
                  sizes="(min-width: 640px) 600px, 100vw"
                />
              </Reveal>
              <Reveal className="overflow-hidden rounded-2xl" delay={180}>
                <Image
                  src="/product/cucina.jpg"
                  alt="Kitchen Display con ordini in attesa, in preparazione e pronti"
                  width={1440}
                  height={900}
                  className="w-full"
                  sizes="(min-width: 640px) 600px, 100vw"
                />
              </Reveal>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <Reveal>
                  <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl dark:text-zinc-50">
                    I problemi che un gestionale deve togliere.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                    CM Risto parte dai momenti più fragili del servizio: la
                    comanda che cambia, lo stato che non si aggiorna, il conto che
                    non torna. Ogni funzione nasce per chiudere uno di questi
                    vuoti.
                  </p>
                </Reveal>
              </div>
              <ul className="space-y-8">
                {problems.map((problem) => (
                  <li key={problem.title}>
                    <h3 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      <problem.icon className="size-5 shrink-0 text-brand-700 dark:text-brand-400" />
                      {problem.title}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {problem.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-zinc-950 py-16 text-white sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <Reveal>
                  <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                    Il valore è il lavoro che smetti di rifare.
                  </h2>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400">
                    Nessuna percentuale promessa a caso. Questi sono gli ambiti
                    che il prodotto affronta oggi, verificabili nella demo.
                  </p>
                </Reveal>
              </div>
              <ul className="space-y-8">
                {outcomes.map((outcome) => (
                  <li key={outcome.title}>
                    <h3 className="flex items-center gap-2 text-xl font-semibold text-white">
                      <outcome.icon className="size-5 shrink-0 text-brand-400" />
                      {outcome.title}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-zinc-400">
                      {outcome.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <Reveal>
                  <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl dark:text-zinc-50">
                    Una dashboard per ogni ruolo.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Ognuno vede ciò che gli serve. Nella demo puoi cambiare ruolo e
                    ristorante in qualsiasi momento. Nell&apos;area reale il ruolo
                    deriva dall&apos;identità autenticata e non è selezionabile dal
                    frontend.
                  </p>
                </Reveal>
                <Button className="mt-6" variant="outline" asChild>
                  <Link href="/app/panoramica">
                    Prova i ruoli nella demo
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <ul className="space-y-6">
                {roleCards.map((role) => (
                  <li key={role.title}>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      <role.icon className="size-5 shrink-0 text-brand-700 dark:text-brand-400" />
                      {role.title}
                    </h3>
                    <p className="mt-1.5 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {role.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-zinc-50/60 py-10 dark:bg-zinc-900/40">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950 dark:text-amber-300">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Trasparenza prima di tutto
                </p>
                <p className="mt-0.5 max-w-[60ch] text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Dati demo dichiarati, nessun pagamento o documento fiscale
                  reale, telefonia del receptionist non collegata. Le
                  integrazioni esterne saranno dichiarate solo dopo verifica.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">Demo separata</Badge>
              <Badge variant="secondary" className="text-sm">Nessuna carta richiesta</Badge>
              <Badge variant="secondary" className="text-sm">Prodotto in sviluppo</Badge>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24" id="prezzi">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Reveal>
                <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl dark:text-zinc-50">
                  Prezzi per ogni fase della crescita.
                </h2>
                <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Quattro livelli, funzioni cumulative e prezzi centralizzati. I
                  valori mostrati sono indicativi e provvisori.
                </p>
              </Reveal>
            </div>
            <div className="mt-10">
              <PricingCards withToggle={false} />
            </div>
            <div className="mt-6 text-center">
              <Button variant="outline" asChild>
                <Link href="/prezzi">
                  Confronta tutti i piani
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-zinc-50/60 py-16 sm:py-24 dark:bg-zinc-900/40">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Reveal>
                <h2 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-4xl dark:text-zinc-50">
                  Domande frequenti
                </h2>
                <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Le risposte che servono prima di iniziare.
                </p>
              </Reveal>
            </div>
            <div className="mt-8 space-y-2">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-card bg-white px-5 py-4 dark:bg-zinc-900"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-zinc-900 marker:content-none dark:text-zinc-100">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="text-lg font-light text-zinc-400 transition-transform duration-200 group-open:rotate-45 dark:text-zinc-500"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl bg-zinc-950 px-6 py-12 text-center sm:px-12 sm:py-16">
              <div className="relative mx-auto max-w-2xl">
                <Reveal>
                  <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                    La demo è già pronta.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-zinc-400">
                    Il locale puoi esplorarlo adesso: ristoranti, ordini e comande
                    fittizie. Cambia ruolo, invia una comanda e guarda la cucina
                    aggiornarsi.
                  </p>
                </Reveal>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/app/panoramica">
                      Esplora la demo
                      <ArrowRight />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <Link href="/registrati">Crea un account</Link>
                  </Button>
                </div>
                <p className="mt-4 text-sm text-zinc-500">
                  Nessun pagamento reale. Dati dimostrativi. Prodotto in sviluppo.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

import type { Metadata } from "next";
import { Check, Minus, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { PricingCards } from "@/components/public/pricing-cards";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER, TRIAL_DAYS } from "@/lib/plans";
import { cn, formatCents } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Prezzi e piani",
  description:
    "Confronta i piani Starter, Pro, Business ed Enterprise di CM Risto. Prezzi indicativi, prova gratuita di 30 giorni.",
};

type ComparisonValue = string | boolean | null;

const comparisonRows: Array<{
  label: string;
  values: Record<string, ComparisonValue>;
}> = [
  {
    label: "Prezzo mensile",
    values: Object.fromEntries(
      PLAN_ORDER.map((id) => [
        id,
        PLANS[id].monthlyCents === null
          ? "Su misura"
          : formatCents(PLANS[id].monthlyCents ?? 0),
      ]),
    ),
  },
  {
    label: "Utenti inclusi",
    values: Object.fromEntries(
      PLAN_ORDER.map((id) => [
        id,
        PLANS[id].users === null
          ? "Personalizzati"
          : String(PLANS[id].users),
      ]),
    ),
  },
  {
    label: "Sedi incluse",
    values: Object.fromEntries(
      PLAN_ORDER.map((id) => [
        id,
        PLANS[id].locations === null
          ? "Personalizzate"
          : String(PLANS[id].locations),
      ]),
    ),
  },
  {
    label: "Palmari per locale",
    values: Object.fromEntries(PLAN_ORDER.map((id) => [id, "4"])),
  },
  {
    label: "Cassa POS e gestione tavoli",
    values: Object.fromEntries(PLAN_ORDER.map((id) => [id, true])),
  },
  {
    label: "Kitchen Display System",
    values: Object.fromEntries(PLAN_ORDER.map((id) => [id, true])),
  },
  {
    label: "Menu e disponibilità piatti",
    values: Object.fromEntries(PLAN_ORDER.map((id) => [id, true])),
  },
  {
    label: "Prenotazioni e CRM clienti",
    values: { starter: false, pro: true, business: true, enterprise: true },
  },
  {
    label: "Magazzino, fornitori e scorte",
    values: { starter: false, pro: true, business: true, enterprise: true },
  },
  {
    label: "Report avanzati e food cost",
    values: { starter: false, pro: true, business: true, enterprise: true },
  },
  {
    label: "Personale e turni",
    values: { starter: false, pro: true, business: true, enterprise: true },
  },
  {
    label: "Dashboard multi-sede aggregata",
    values: { starter: false, pro: false, business: true, enterprise: true },
  },
  {
    label: "Ruoli e permessi avanzati",
    values: { starter: false, pro: false, business: true, enterprise: true },
  },
  {
    label: "Assistenza",
    values: {
      starter: "Email",
      pro: "Prioritaria",
      business: "Dedicata",
      enterprise: "Referente dedicato",
    },
  },
];

const pricingFaqs = [
  {
    question: "Quanto dura la prova gratuita?",
    answer: `Ogni nuovo locale parte con ${TRIAL_DAYS} giorni di prova. Il conteggio è registrato nel database e non richiede una carta di credito. Alla scadenza non viene addebitato nulla: l'abbonamento si attiva solo con un pagamento completato.`,
  },
  {
    question: "Serve una carta di credito?",
    answer:
      "Per la prova no. La fatturazione è collegata a Stripe in modalità di test: il checkout e il portale sono funzionanti, ma nessun importo viene addebitato. Prima dell'attivazione commerciale le condizioni saranno mostrate prima di qualsiasi pagamento.",
  },
  {
    question: "Come funzionano rinnovi e cancellazione?",
    answer:
      "Il piano è mensile o annuale con rinnovo automatico. La disdetta si gestisce dal pannello Abbonamento, che apre il portale clienti del provider di pagamento. In modalità di test nessun rinnovo viene addebitato.",
  },
  {
    question: "I prezzi sono definitivi?",
    answer:
      "No. I valori mostrati sono indicativi e provvisori, IVA esclusa, finché non viene definita la politica commerciale. Sono centralizzati in un unico file di configurazione per essere aggiornati senza toccare il resto dell'interfaccia.",
  },
  {
    question: "Cosa succede alla fine della prova?",
    answer:
      "Nessun addebito automatico: senza un pagamento completato il locale resta in prova scaduta e le funzioni restano accessibili. La gestione della scadenza e della sospensione è una decisione commerciale ancora da approvare.",
  },
  {
    question: "Posso cambiare piano in seguito?",
    answer:
      "Sì. Il cambio piano passa dal pannello Abbonamento e dal portale del provider di pagamento; il limite di sedi del piano è applicato lato server. Gli altri limiti di piano non sono ancora applicati dal prodotto.",
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-balance text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-zinc-950 sm:text-[3.4rem] dark:text-zinc-50">
                Scegli il piano giusto per il tuo locale.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
                Valori indicativi e provvisori, senza sorprese. Funzioni
                cumulative: inizia con l&apos;essenziale e passa a più sedi quando
                serve. Tutti i piani includono fino a 4 palmari per locale.
              </p>
            </div>
            <div className="mt-10">
              <h2 className="sr-only">Piani disponibili</h2>
              <PricingCards />
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Confronto completo
              </h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Le stesse informazioni della pagina prezzi, senza ambiguità.
              </p>
            </div>
            <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                    <th className="w-64 px-4 py-3 text-left text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                      Funzionalità
                    </th>
                    {PLAN_ORDER.map((id) => (
                      <th
                        key={id}
                        className={cn(
                          "px-4 py-3 text-center text-sm font-semibold",
                          PLANS[id].highlighted
                            ? "bg-brand-50/70 text-brand-800 dark:bg-brand-950/70 dark:text-brand-300"
                            : "text-zinc-700 dark:text-zinc-300",
                        )}
                      >
                        {PLANS[id].name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {row.label}
                      </td>
                      {PLAN_ORDER.map((id) => {
                        const value = row.values[id];
                        return (
                          <td
                            key={id}
                            className={cn(
                              "px-4 py-3 text-center text-sm text-zinc-600 dark:text-zinc-400",
                              PLANS[id].highlighted && "bg-brand-50/40 dark:bg-brand-950/40",
                            )}
                          >
                            {value === true ? (
                              <Check className="mx-auto size-4 text-brand-600" />
                            ) : value === false ? (
                              <Minus className="mx-auto size-4 text-zinc-300 dark:text-zinc-600" />
                            ) : (
                              (value as string)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Prezzi IVA esclusa. Palmari: fino a 4 per locale in tutti i piani.
              Utenti e sedi sono limiti inclusi; estensioni disponibili nel piano
              Enterprise.
            </p>
          </div>
        </section>

        <section className="bg-zinc-50/60 py-14 sm:py-20 dark:bg-zinc-900/50">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Come funziona la prova
                </h2>
                <p className="mt-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Regole chiare prima di iniziare. Se qualcosa non è ancora
                  attivo, lo diciamo apertamente.
                </p>
              </div>
              <ol className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
                {[
                  {
                    title: "Scegli il piano",
                    text: "Valuta utenti, sedi e funzioni. Puoi cambiare idea durante la prova.",
                    icon: Timer,
                  },
                  {
                    title: `Esplora per ${TRIAL_DAYS} giorni`,
                    text: "Configura il locale e usa il gestionale con i tuoi dati: il database è attivo dalla registrazione.",
                    icon: ShieldCheck,
                  },
                  {
                    title: "Decidi con calma",
                    text: "Prima della scadenza ricevi un avviso. Nessun addebito senza un pagamento completato.",
                    icon: Check,
                  },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="rounded-xl bg-white p-5 dark:bg-zinc-900"
                  >
                    <item.icon className="size-5 text-brand-700 dark:text-brand-400" />
                    <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {item.text}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Nota di trasparenza: autenticazione e database sono attivi. La
              fatturazione è collegata a Stripe in modalità di test: nessun
              addebito reale viene effettuato finché non sarà completata la
              verifica con un pagamento di prova.
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Domande su prova e fatturazione
            </h2>
            <div className="mt-6 space-y-2">
              {pricingFaqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-xl bg-white px-5 py-4 dark:bg-zinc-900"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-zinc-900 marker:content-none dark:text-zinc-100">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="text-zinc-400 transition-transform group-open:rotate-45 dark:text-zinc-500"
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
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/registrati">
                  Crea un account
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contatti">Parla con il commerciale</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CopyrightYear } from "@/components/public/copyright-year";

const productLinks = [
  { href: "/funzionalita", label: "Funzionalità" },
  { href: "/prezzi", label: "Prezzi e piani" },
  { href: "/app/panoramica", label: "Demo interattiva" },
  { href: "/documentazione", label: "Documentazione" },
];

const companyLinks = [
  { href: "/contatti", label: "Contatti" },
  { href: "/registrati", label: "Registrazione" },
  { href: "/login", label: "Accesso" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/cookie", label: "Cookie" },
  { href: "/termini", label: "Termini di servizio" },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo withTagline />
            <p className="max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Il gestionale SaaS per ristoranti, pizzerie e bar: cassa, sala,
              cucina e controllo del locale in un unico posto.
            </p>
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-300">
              Ambiente dimostrativo: i dati mostrati nella demo sono fittizi.
              Nessuna funzione fiscale o di pagamento reale è attiva in questa
              build.
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
              Prodotto
            </h2>
            <ul className="mt-3 space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
              Account
            </h2>
            <ul className="mt-3 space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
              Legale
            </h2>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-zinc-200 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:text-zinc-300">
          <p>
            © <CopyrightYear /> CM Risto. Tutti i diritti riservati.
          </p>
          <p>Prodotto dimostrativo in sviluppo — non è ancora un servizio commerciale.</p>
        </div>
      </div>
    </footer>
  );
}

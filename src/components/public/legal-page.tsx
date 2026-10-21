import { AlertTriangle } from "lucide-react";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
            Documento legale
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-300">Ultimo aggiornamento: {updated}</p>

          <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Testo segnaposto.</strong> Questo documento va completato e
              verificato con consulenza legale prima della pubblicazione del
              servizio. Non costituisce un&apos;informativa legale definitiva.
            </span>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{intro}</p>

          <div className="mt-8 space-y-8">
            {sections.map((section, index) => (
              <section key={section.title}>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-2 space-y-2.5">
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-10 border-t border-zinc-100 pt-6 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-300">
            Per chiarimenti: supporto@cm-risto.example (indirizzo segnaposto,
            non attivo).
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

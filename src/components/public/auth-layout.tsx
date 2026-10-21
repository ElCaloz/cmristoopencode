import { ArrowLeft, ArrowRight, Check, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const highlights = [
  "Cassa, sala e cucina sulla stessa comanda",
  "Palmari fino a 4 per locale, con revoca immediata",
  "Report su incassi, margini e prodotti",
  "Multi-sede con permessi separati",
];

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        Vai al contenuto
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex w-full flex-col px-4 py-6 focus:outline-none sm:px-8 lg:w-[55%] lg:px-16"
      >
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="CM Risto — home">
            <Logo />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft />
              Torna al sito
            </Link>
          </Button>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          </div>
          {children}
        </div>

        {footer ? (
          <div className="mx-auto w-full max-w-md pb-2">{footer}</div>
        ) : null}
      </main>

      <aside
        aria-label="Presentazione CM Risto"
        className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-12 lg:flex lg:w-[45%]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(53,162,106,0.28),transparent_60%)]" />
        <div className="relative">
          <Badge variant="dark" className="border-white/10 bg-white/5 text-zinc-300">
            <UtensilsCrossed className="size-3" />
            Ambiente dimostrativo
          </Badge>
          <h2 className="mt-6 max-w-sm text-2xl font-semibold leading-snug text-white">
            Il servizio non si ferma quando la sala è piena.
          </h2>
          <ul className="mt-6 space-y-3">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-zinc-400"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                  <Check className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-medium text-white">
            Vuoi vedere subito il prodotto?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Non serve registrarsi: la demo include ristoranti, ordini e comande
            fittizie, con ruoli selezionabili.
          </p>
          <Button className="mt-4 w-full" variant="secondary" asChild>
            <Link href="/app/panoramica">
              Esplora la demo
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </aside>
    </div>
  );
}

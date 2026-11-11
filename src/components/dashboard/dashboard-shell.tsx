import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SignOutForm } from "@/components/dashboard/sign-out-form";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  tone?: "light" | "dark";
};

/**
 * Struttura condivisa dell'area reale: barra superiore con marchio e uscita,
 * navigazione laterale dei moduli e contenuto della pagina. Il tono scuro è
 * riservato alle postazioni che restano accese a lungo (cucina, console
 * piattaforma).
 */
export function DashboardShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  tone = "light",
}: DashboardShellProps) {
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "min-h-screen",
        dark ? "bg-zinc-950" : "bg-zinc-50 dark:bg-zinc-950",
      )}
    >
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900 focus:shadow-lift dark:focus:bg-zinc-900 dark:focus:text-zinc-100"
      >
        Vai al contenuto
      </a>

      <header
        className={cn(
          "sticky top-0 z-30 border-b",
          dark
            ? "border-white/10 bg-zinc-950"
            : "border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950",
        )}
      >
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" aria-label="CM Risto — dashboard">
              <Logo inverted={dark} />
            </Link>
            <Badge
              variant={dark ? "dark" : "outline"}
              className={cn(
                "hidden sm:inline-flex",
                dark && "border-white/15 bg-white/5 text-zinc-300",
              )}
            >
              Area reale
            </Badge>
          </div>
          <SignOutForm compact inverted={dark} />
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <DashboardNav tone={tone} />

        <main
          id="dashboard-main"
          className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[11px] font-medium",
                    dark ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  {eyebrow}
                </p>
                <h1
                  className={cn(
                    "mt-1 text-2xl font-semibold leading-8 tracking-[-0.02em]",
                    dark ? "text-white" : "text-zinc-950 dark:text-zinc-50",
                  )}
                >
                  {title}
                </h1>
                <p
                  className={cn(
                    "mt-2 max-w-2xl text-sm leading-6",
                    dark ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-400",
                  )}
                >
                  {description}
                </p>
              </div>
              {actions ? (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
              ) : null}
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Segnaposto di caricamento allineato alla shell: nessun salto di layout
 * quando arrivano i dati.
 */
export function DashboardSkeleton({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";

  return (
    <div className={cn("min-h-screen", dark ? "bg-zinc-950" : "bg-zinc-50 dark:bg-zinc-950")}>
      <div
        className={cn(
          "h-14 border-b",
          dark ? "border-white/10" : "border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950",
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              "h-4 w-28 animate-pulse rounded",
              dark ? "bg-zinc-800" : "bg-zinc-200 dark:bg-zinc-800",
            )}
          />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div
          className={cn(
            "h-3 w-24 animate-pulse rounded",
            dark ? "bg-zinc-800" : "bg-zinc-200 dark:bg-zinc-800",
          )}
        />
        <div
          className={cn(
            "mt-2 h-7 w-64 animate-pulse rounded-lg",
            dark ? "bg-zinc-800" : "bg-zinc-200 dark:bg-zinc-800",
          )}
        />
        <div
          className={cn(
            "mt-3 h-4 w-96 max-w-full animate-pulse rounded",
            dark ? "bg-zinc-900" : "bg-zinc-200/70 dark:bg-zinc-800/70",
          )}
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-28 animate-pulse rounded-xl border",
                dark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

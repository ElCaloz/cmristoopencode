import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SignOutForm } from "@/components/dashboard/sign-out-form";
import { Badge } from "@/components/ui/badge";

type DashboardShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Struttura condivisa dell'area reale, allineata alla demo: topbar con marchio
 * e uscita, navigazione laterale dei moduli, contenuto della pagina.
 */
export function DashboardShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" aria-label="CM Risto — dashboard">
              <Logo />
            </Link>
            <Badge variant="success" dot className="hidden sm:inline-flex">
              Area reale
            </Badge>
          </div>
          <SignOutForm compact />
        </div>
      </header>

      <div className="flex">
        <DashboardNav />

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6">
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">
                  {eyebrow}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {title}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              </div>
              {actions}
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

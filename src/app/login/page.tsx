import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthLayout } from "@/components/public/auth-layout";
import { Button } from "@/components/ui/button";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Accedi",
  description: "Accedi al tuo account CM Risto.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function LoginContent({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = (await searchParams) ?? {};
  const next = safeNextPath(first(params.next));

  return (
    <LoginForm
      next={next}
      reason={first(params.reason)}
      status={first(params.status)}
    />
  );
}

function LoginFallback() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthLayout
      title="Accedi a CM Risto"
      description="Inserisci le credenziali del tuo account per gestire il locale. La demo resta disponibile senza registrazione."
      footer={
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          Non hai un account?{" "}
          <Link href="/registrati" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
            Registrati
          </Link>
        </p>
      }
    >
      <Suspense fallback={<LoginFallback />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100">Prova senza account</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          La demo apre il gestionale con ristoranti di esempio e consente di cambiare
          ruolo in qualsiasi momento. È separata dai dati reali.
        </p>
        <Button variant="outline" className="mt-3 w-full bg-white dark:bg-zinc-900" asChild>
          <Link href="/app/panoramica">Entra nella demo</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}

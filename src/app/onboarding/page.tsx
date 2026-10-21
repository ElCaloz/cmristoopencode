import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/server/auth/session";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Configura il locale",
  description: "Completa la configurazione del tuo ristorante su CM Risto.",
};

async function OnboardingGate() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/onboarding");
  }

  if (session.membershipsError) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Impossibile verificare l&apos;account
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Il database non è raggiungibile in questo momento. Riprova tra poco.
        </p>
        <Button className="mt-5" asChild>
          <Link href="/dashboard">Riprova</Link>
        </Button>
      </div>
    );
  }

  if (session.activeMembership) {
    redirect("/dashboard");
  }

  return <OnboardingForm email={session.user.email} />;
}

function OnboardingSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto h-16 w-full max-w-4xl px-4 sm:px-6" />
      </div>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-8 h-80 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingGate />
    </Suspense>
  );
}

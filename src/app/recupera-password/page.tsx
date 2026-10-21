import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { RecoveryForm } from "@/components/auth/recovery-form";
import { AuthLayout } from "@/components/public/auth-layout";

export const metadata: Metadata = {
  title: "Recupera password",
  description: "Richiedi un link per reimpostare la password del tuo account CM Risto.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function RecoveryContent({
  searchParams,
}: {
  searchParams: PageProps<"/recupera-password">["searchParams"];
}) {
  const params = (await searchParams) ?? {};
  return <RecoveryForm reason={first(params.reason)} />;
}

export default function PasswordRecoveryPage({
  searchParams,
}: PageProps<"/recupera-password">) {
  return (
    <AuthLayout
      title="Recupera la password"
      description="Inserisci l'email del tuo account: riceverai un link temporaneo per impostare una nuova password."
      footer={
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            <ArrowLeft className="size-3" />
            Torna all&apos;accesso
          </Link>
        </p>
      }
    >
      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />}>
        <RecoveryContent searchParams={searchParams} />
      </Suspense>
    </AuthLayout>
  );
}

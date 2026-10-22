import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Console piattaforma non disponibile",
};

export default function PiattaformaPage() {
  return (
    <div>
      <PageHeader
        title="Console di piattaforma"
        description="Questa area non è disponibile nella demo."
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand-700 dark:text-brand-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Riservata all&apos;amministratore globale
          </h2>
          <Badge variant="warning">Non disponibile nella demo</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          La console di amministrazione della piattaforma CM Risto (gestione di
          tutti i ristoranti, piani e sospensioni) è accessibile solo
          all&apos;account amministratore globale, con credenziali reali e
          login dedicato. Chi prova la demo non può aprirla né vederne i dati.
        </p>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Se sei l&apos;amministratore della piattaforma, accedi
          all&apos;area reale dalla pagina di login: la console è in{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            /dashboard/piattaforma
          </span>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/app/panoramica"
            className="inline-flex h-9 items-center rounded-[10px] bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800"
          >
            Torna alla panoramica demo
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-[10px] border border-zinc-300 px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Accedi all&apos;area reale
          </Link>
        </div>
      </div>
    </div>
  );
}

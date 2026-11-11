import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export function NoRestaurant({
  eyebrow,
  title,
  description,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <DashboardShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      tone={tone}
    >
      <div
        className={
          dark
            ? "rounded-xl border border-amber-500/30 bg-amber-500/10 p-5"
            : "rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40"
        }
      >
        <div className="flex items-center gap-2">
          <LockKeyhole
            className={
              dark
                ? "size-4 text-amber-300"
                : "size-4 text-amber-700 dark:text-amber-300"
            }
          />
          <h2
            className={
              dark
                ? "text-sm font-semibold text-amber-200"
                : "text-sm font-semibold text-amber-900 dark:text-amber-200"
            }
          >
            Nessuna sede attiva
          </h2>
        </div>
        <p
          className={
            dark
              ? "mt-1 text-xs leading-relaxed text-amber-200/80"
              : "mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300"
          }
        >
          Questo account non ha una sede su cui operare. Se hai appena ricevuto
          un invito, verifica di essere membro attivo dell&apos;organizzazione;
          altrimenti crea la prima sede dalla pagina Sedi.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant={dark ? "dark" : "default"} asChild>
            <Link href="/dashboard/sedi">Gestisci le sedi</Link>
          </Button>
          <Button
            size="sm"
            variant={dark ? "ghost" : "outline"}
            className={dark ? "text-zinc-300" : undefined}
            asChild
          >
            <Link href="/dashboard">Torna alla dashboard</Link>
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}

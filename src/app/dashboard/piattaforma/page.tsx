import type { Metadata } from "next";
import { ArrowLeft, Building2, Globe2, ShieldAlert, Store, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { SignOutForm } from "@/components/dashboard/sign-out-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Console piattaforma",
  description: "Console globale riservata agli amministratori della piattaforma CM Risto.",
};

async function PlatformContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard/piattaforma");
  }

  if (!session.isPlatformAdmin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [organizations, restaurants, memberships, recentOrganizations] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("restaurants").select("id", { count: "exact", head: true }),
    supabase.from("memberships").select("id", { count: "exact", head: true }),
    supabase
      .from("organizations")
      .select("id, name, slug, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    {
      label: "Organizzazioni",
      value: organizations.count ?? 0,
      icon: Building2,
    },
    {
      label: "Ristoranti",
      value: restaurants.count ?? 0,
      icon: Store,
    },
    {
      label: "Membership",
      value: memberships.count ?? 0,
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/dashboard" aria-label="CM Risto — dashboard">
            <Logo inverted />
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="dark">Super Admin</Badge>
            <SignOutForm compact inverted />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Button variant="ghost" size="sm" className="text-zinc-400" asChild>
          <Link href="/dashboard">
            <ArrowLeft />
            Dashboard ristorante
          </Link>
        </Button>

        <div className="mt-5 flex items-center gap-2">
          <Globe2 className="size-5 text-brand-400" />
          <p className="text-xs font-medium uppercase tracking-wide text-brand-400">
            Accesso globale
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Console piattaforma
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-zinc-400">
          Visibilità aggregata su tutte le organizzazioni. Questa console non assegna
          ruoli di ristorante e non modifica i dati operativi.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{stat.label}</span>
                <stat.icon className="size-4 text-zinc-500" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-semibold">Organizzazioni recenti</h2>
          {recentOrganizations.error ? (
            <p className="mt-2 text-xs text-red-300">
              Impossibile caricare le organizzazioni. Riprova più tardi.
            </p>
          ) : (recentOrganizations.data ?? []).length === 0 ? (
            <p className="mt-2 text-xs text-zinc-400">Nessuna organizzazione creata.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/10">
              {(recentOrganizations.data ?? []).map((organization) => (
                <li
                  key={organization.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                >
                  <span className="font-medium text-zinc-200">{organization.name}</span>
                  <span className="text-zinc-500">
                    {organization.slug} · {organization.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-amber-200">
              Assegnazione solo amministrativa
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
              Il ruolo Super Admin non è selezionabile in registrazione o onboarding. Viene
              assegnato esclusivamente con un&apos;operazione amministrativa sul database
              tramite service role o SQL controllato. Non esistono account predefiniti.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function PlatformSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-800" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlatformPage() {
  return (
    <Suspense fallback={<PlatformSkeleton />}>
      <PlatformContent />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Building2, ShieldAlert, Store, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardShell,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
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
    <DashboardShell
      eyebrow="Accesso globale"
      title="Console piattaforma"
      description="Visibilità aggregata su tutte le organizzazioni. Questa console non assegna ruoli di ristorante e non modifica i dati operativi."
      tone="dark"
      actions={<Badge variant="dark">Super Admin</Badge>}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">{stat.label}</span>
              <stat.icon className="size-4 text-zinc-500" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-sm font-semibold text-white">Organizzazioni recenti</h2>
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
    </DashboardShell>
  );
}

function PlatformSkeleton() {
  return <DashboardSkeleton tone="dark" />;
}

export default function PlatformPage() {
  return (
    <Suspense fallback={<PlatformSkeleton />}>
      <PlatformContent />
    </Suspense>
  );
}

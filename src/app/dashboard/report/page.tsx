import type { Metadata } from "next";
import {
  BadgeEuro,
  CalendarRange,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NoRestaurant } from "@/components/dashboard/no-restaurant";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/utils";
import { requireDashboardContext } from "@/server/dashboard/context";
import {
  canReadReports,
  getReportData,
  normalizeReportRange,
} from "@/server/reports/queries";

export const metadata: Metadata = {
  title: "Report e statistiche",
  description: "Ricavi, ordini, canali online, clienti e performance per sede.",
};

type ReportSearchParams = Promise<{ from?: string; to?: string }>;

function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

async function ReportsContent({
  searchParams,
}: {
  searchParams: ReportSearchParams;
}) {
  const { restaurant } = await requireDashboardContext("/dashboard/report");

  if (!restaurant) {
    return (
      <NoRestaurant
        eyebrow="Report e statistiche"
        title="Report"
        description="Ricavi, ordini e performance della sede attiva."
      />
    );
  }

  const allowed = await canReadReports(restaurant.id);

  if (!allowed) {
    return (
      <DashboardShell
        eyebrow="Report e statistiche"
        title={restaurant.name}
        description="La consultazione dei report richiede il permesso di reportistica."
      >
        <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Il tuo ruolo non consente di leggere report e statistiche. Chiedi a un
          proprietario o amministratore se ti serve questo accesso.
        </p>
      </DashboardShell>
    );
  }

  const params = await searchParams;
  const range = normalizeReportRange(params.from, params.to);
  const data = await getReportData(restaurant.id, restaurant.organizationId, range);

  const maxDaily = Math.max(
    1,
    ...data.daily.map((entry) => entry.revenueCents),
  );
  const maxMethod = Math.max(
    1,
    ...data.paymentMethods.map((entry) => entry.amountCents),
  );

  return (
    <DashboardShell
      eyebrow="Report e statistiche"
      title={restaurant.name}
      description="Dati aggregati dai pagamenti, dagli ordini, dal CRM e dai turni reali. Le date sono incluse; l'intervallo massimo è 180 giorni."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/vendite">
            <CalendarRange />
            Dettaglio giornaliero
          </Link>
        </Button>
      }
    >
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Dal
          <input
            type="date"
            name="from"
            defaultValue={toInputDate(range.from)}
            className="mt-1 block h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Al
          <input
            type="date"
            name="to"
            defaultValue={toInputDate(
              new Date(new Date(range.to).getTime() - 86_400_000).toISOString(),
            )}
            className="mt-1 block h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <Button type="submit" variant="outline">
          Aggiorna report
        </Button>
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ricavi"
          value={formatCents(data.kpis.revenueCents)}
          icon={BadgeEuro}
          hint={`${data.kpis.orders} conti chiusi`}
        />
        <StatCard
          label="Ticket medio"
          value={formatCents(data.kpis.averageTicketCents)}
          icon={TrendingUp}
          hint={`${formatCents(data.kpis.tipsCents)} di mance`}
        />
        <StatCard
          label="Ordini online"
          value={String(data.kpis.onlineOrders)}
          icon={ShoppingBag}
          hint={`${formatCents(data.kpis.onlineRevenueCents)} di valore`}
        />
        <StatCard
          label="Nuovi clienti"
          value={String(data.kpis.newCustomers)}
          icon={Users}
          hint={`${data.kpis.loyaltyPoints} punti fedeltà · ${data.kpis.shifts} turni`}
        />
      </div>

      <section className="mt-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Ricavi per giorno
        </h2>
        {data.kpis.revenueCents === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun pagamento nel periodo selezionato.
          </p>
        ) : (
          <div className="mt-4 flex h-40 items-end gap-1 overflow-x-auto">
            {data.daily.map((entry) => (
              <div
                key={entry.day}
                className="flex min-w-6 flex-1 flex-col items-center gap-1"
                title={`${entry.label}: ${formatCents(entry.revenueCents)} (${entry.orders} conti)`}
              >
                <div
                  className="w-full rounded-t bg-brand-600/80 dark:bg-brand-500/70"
                  style={{
                    height: `${Math.max(
                      2,
                      Math.round((entry.revenueCents / maxDaily) * 140),
                    )}px`,
                  }}
                />
                <span className="text-[9px] text-zinc-400">{entry.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Metodi di pagamento
          </h2>
          {data.paymentMethods.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Nessun incasso registrato.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.paymentMethods.map((method) => (
                <li key={method.method}>
                  <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                    <span>{method.label}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCents(method.amountCents)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-2 rounded-full bg-emerald-500/80"
                      style={{
                        width: `${Math.max(
                          2,
                          Math.round((method.amountCents / maxMethod) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Prodotti più venduti
          </h2>
          {data.topItems.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Nessuna riga di vendita nel periodo.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.topItems.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-3 py-2 text-xs"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {item.name} · {item.quantity} pz
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCents(item.revenueCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Confronto tra sedi
        </h2>
        {data.locations.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun incasso registrato nelle sedi dell&apos;organizzazione nel
            periodo.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.locations.map((location) => (
              <li
                key={location.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {location.name}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {location.orders} conti · {formatCents(location.revenueCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}

function ReportsSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardReportsPage({
  searchParams,
}: {
  searchParams: ReportSearchParams;
}) {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsContent searchParams={searchParams} />
    </Suspense>
  );
}

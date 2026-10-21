"use client";

import {
  Building2,
  LayoutDashboard,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RowMenu } from "@/components/ui/row-menu";
import { StatCard } from "@/components/ui/stat-card";
import { RestaurantStatusBadge } from "@/components/ui/status-badge";
import { useDemoStore } from "@/lib/demo/store";
import type { Restaurant, RestaurantStatus } from "@/lib/demo/types";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";
import { formatCents, formatDate, relativeTime } from "@/lib/utils";

type StatusFilter = RestaurantStatus | "all";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "active", label: "Attivi" },
  { id: "trial", label: "In prova" },
  { id: "suspended", label: "Sospesi" },
];

export default function PiattaformaPage() {
  const router = useRouter();
  const restaurants = useDemoStore((state) => state.restaurants);
  const activity = useDemoStore((state) => state.activity);
  const setActiveRestaurant = useDemoStore((state) => state.setActiveRestaurant);
  const setActiveRole = useDemoStore((state) => state.setActiveRole);
  const updateRestaurant = useDemoStore((state) => state.updateRestaurant);
  const suspendRestaurant = useDemoStore((state) => state.suspendRestaurant);
  const activateRestaurant = useDemoStore((state) => state.activateRestaurant);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [statusTarget, setStatusTarget] = useState<{
    restaurant: Restaurant;
    next: "suspended" | "active";
  } | null>(null);

  const activeCount = restaurants.filter(
    (restaurant) => restaurant.status === "active",
  ).length;
  const trialCount = restaurants.filter(
    (restaurant) => restaurant.status === "trial",
  ).length;
  const suspendedCount = restaurants.filter(
    (restaurant) => restaurant.status === "suspended",
  ).length;
  const mrrCents = restaurants
    .filter((restaurant) => restaurant.status === "active")
    .reduce(
      (sum, restaurant) => sum + (PLANS[restaurant.planId].monthlyCents ?? 0),
      0,
    );

  const filteredRestaurants =
    statusFilter === "all"
      ? restaurants
      : restaurants.filter(
          (restaurant) => restaurant.status === statusFilter,
        );

  const openRestaurant = (restaurant: Restaurant) => {
    setActiveRestaurant(restaurant.id);
    setActiveRole("admin");
    toast.success(`Aperto ${restaurant.name}`, {
      description: "Ruolo demo impostato su titolare del locale.",
    });
    router.push("/app/panoramica");
  };

  const changePlan = (restaurant: Restaurant, planId: PlanId) => {
    if (planId === restaurant.planId) return;
    updateRestaurant(restaurant.id, { planId });
    toast.success(`Piano ${PLANS[planId].name} assegnato a ${restaurant.name}`, {
      description: "Modifica demo: nessun pagamento reale.",
    });
  };

  const columns: DataTableColumn<Restaurant>[] = [
    {
      id: "restaurant",
      header: "Locale",
      sortValue: (restaurant) => restaurant.name,
      cell: (restaurant) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
            <Building2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-800">
              {restaurant.name}
            </p>
            <p className="truncate text-[10px] text-zinc-400">
              {restaurant.city} · {restaurant.kind}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "owner",
      header: "Titolare",
      sortValue: (restaurant) => restaurant.ownerName,
      cell: (restaurant) => (
        <div className="min-w-0">
          <p className="truncate text-xs text-zinc-600">
            {restaurant.ownerName}
          </p>
          <p className="truncate text-[10px] text-zinc-400">
            {restaurant.ownerEmail}
          </p>
        </div>
      ),
    },
    {
      id: "plan",
      header: "Piano",
      sortValue: (restaurant) => PLANS[restaurant.planId].name,
      cell: (restaurant) => (
        <Select
          aria-label={`Piano di ${restaurant.name}`}
          value={restaurant.planId}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            changePlan(restaurant, event.target.value as PlanId)
          }
          className="h-8 w-28 text-xs"
        >
          {PLAN_ORDER.map((planId) => (
            <option key={planId} value={planId}>
              {PLANS[planId].name}
            </option>
          ))}
        </Select>
      ),
    },
    {
      id: "status",
      header: "Stato",
      sortValue: (restaurant) => restaurant.status,
      cell: (restaurant) => (
        <RestaurantStatusBadge status={restaurant.status} />
      ),
    },
    {
      id: "createdAt",
      header: "Cliente dal",
      sortValue: (restaurant) => restaurant.createdAt,
      cell: (restaurant) => (
        <span className="text-xs text-zinc-500">
          {formatDate(restaurant.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Amministrazione SaaS"
        title="Console piattaforma"
        description="Vista Super Admin su ristoranti, piani e stato degli account. Tutti i dati e le azioni sono dimostrativi."
        badge={<Badge variant="dark">Super Admin</Badge>}
        actions={
          <Badge variant="warning">
            <ShieldCheck className="size-3" />
            Console demo
          </Badge>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ristoranti"
          value={String(restaurants.length)}
          icon={Building2}
          hint={`${activeCount} attivi · ${trialCount} in prova`}
        />
        <StatCard
          label="MRR stimato (demo)"
          value={formatCents(mrrCents)}
          icon={Wallet}
          hint="solo piani attivi, prezzi provvisori"
        />
        <StatCard
          label="In prova"
          value={String(trialCount)}
          icon={Sparkles}
          hint="nessun addebito automatico"
        />
        <StatCard
          label="Sospesi"
          value={String(suspendedCount)}
          icon={PauseCircle}
          hint="accesso bloccato nella demo"
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {FILTERS.map((filter) => {
              const selected = statusFilter === filter.id;
              const count =
                filter.id === "all"
                  ? restaurants.length
                  : restaurants.filter(
                      (restaurant) => restaurant.status === filter.id,
                    ).length;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setStatusFilter(filter.id)}
                  className={
                    selected
                      ? "inline-flex items-center gap-1.5 rounded-full border border-zinc-900 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white"
                      : "inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-800"
                  }
                >
                  {filter.label}
                  <span
                    className={
                      selected
                        ? "text-[10px] text-zinc-300"
                        : "text-[10px] text-zinc-400"
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <DataTable
            data={filteredRestaurants}
            columns={columns}
            getRowId={(restaurant) => restaurant.id}
            searchText={(restaurant) =>
              `${restaurant.name} ${restaurant.city} ${restaurant.kind} ${restaurant.ownerName} ${restaurant.ownerEmail} ${PLANS[restaurant.planId].name}`
            }
            searchPlaceholder="Cerca ristorante o titolare…"
            pageSize={10}
            rowActions={(restaurant) => (
              <RowMenu
                items={[
                  {
                    label: "Apri gestionale",
                    icon: LayoutDashboard,
                    onSelect: () => openRestaurant(restaurant),
                  },
                  {
                    label:
                      restaurant.status === "suspended"
                        ? "Riattiva account"
                        : "Sospendi account",
                    icon:
                      restaurant.status === "suspended"
                        ? PlayCircle
                        : PauseCircle,
                    destructive: restaurant.status !== "suspended",
                    separatorBefore: true,
                    onSelect: () =>
                      setStatusTarget({
                        restaurant,
                        next:
                          restaurant.status === "suspended"
                            ? "active"
                            : "suspended",
                      }),
                  },
                ]}
              />
            )}
            emptyTitle="Nessun ristorante in questo stato"
            emptyDescription="Cambia filtro o cerca un altro locale."
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900">
                Distribuzione piani
              </p>
            </div>
            <div className="mt-3 space-y-2.5">
              {PLAN_ORDER.map((planId) => {
                const count = restaurants.filter(
                  (restaurant) => restaurant.planId === planId,
                ).length;
                const percent =
                  restaurants.length > 0
                    ? Math.round((count / restaurants.length) * 100)
                    : 0;
                return (
                  <div key={planId}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">{PLANS[planId].name}</span>
                      <span className="tabular-nums text-zinc-500">
                        {count} · {percent}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <p className="text-sm font-semibold text-zinc-900">
              Attività recente
            </p>
            <ul className="mt-2 space-y-2.5">
              {activity.slice(0, 6).map((entry) => (
                <li key={entry.id} className="flex gap-2">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-500" />
                  <div className="min-w-0">
                    <p className="text-[11px] leading-snug text-zinc-600">
                      <span className="font-medium text-zinc-800">
                        {entry.actor}
                      </span>{" "}
                      · {entry.action}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">
                      {entry.detail} · {relativeTime(entry.time)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-zinc-300" />
            <p className="text-[10px] leading-relaxed text-zinc-400">
              Sospensione, riattivazione e cambio piano modificano solo lo
              stato locale della demo. In produzione queste operazioni
              richiederanno autorizzazione server-side, audit trail e blocco
              degli accessi del tenant.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={statusTarget !== null}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        title={
          statusTarget?.next === "suspended"
            ? "Sospendere il ristorante?"
            : "Riattivare il ristorante?"
        }
        description={
          statusTarget
            ? statusTarget.next === "suspended"
              ? `${statusTarget.restaurant.name} verrà sospeso nella demo: il locale risulterà bloccato nella console.`
              : `${statusTarget.restaurant.name} tornerà attivo e l'eventuale prova verrà chiusa. Operazione solo demo.`
            : ""
        }
        confirmLabel={
          statusTarget?.next === "suspended" ? "Sospendi" : "Riattiva"
        }
        onConfirm={() => {
          if (!statusTarget) return;
          if (statusTarget.next === "suspended") {
            suspendRestaurant(statusTarget.restaurant.id);
            toast.success(`${statusTarget.restaurant.name} sospeso (demo)`);
          } else {
            activateRestaurant(statusTarget.restaurant.id);
            toast.success(`${statusTarget.restaurant.name} riattivato (demo)`);
          }
        }}
      />
    </div>
  );
}

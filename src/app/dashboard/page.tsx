import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Store,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutForm } from "@/components/dashboard/sign-out-form";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanId } from "@/lib/plans";
import { getSessionContext } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard reale del tuo ristorante su CM Risto.",
};

const organizationStatusLabels: Record<string, string> = {
  trialing: "In prova",
  active: "Attiva",
  suspended: "Sospesa",
  canceled: "Annullata",
};

const planStatusLabels: Record<string, string> = {
  not_activated: "Non attivata",
  requested: "Richiesta registrata",
  active: "Attiva",
  canceled: "Annullata",
};

function planName(planId: string | null) {
  if (!planId || !(planId in PLANS)) return null;
  return PLANS[planId as PlanId].name;
}

function firstName(fullName: string, email: string | null) {
  const fromName = fullName.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  return email?.split("@")[0] ?? "";
}

async function DashboardContent() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login?reason=session&next=/dashboard");
  }

  const membership = session.activeMembership;

  if (!membership && !session.isPlatformAdmin) {
    redirect("/onboarding");
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

  const plan = membership ? planName(membership.requestedPlan) : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/dashboard" aria-label="CM Risto — dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="success" dot>
              Area reale
            </Badge>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/app/panoramica">
                Demo
                <ExternalLink />
              </Link>
            </Button>
            <SignOutForm compact />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">
              Dashboard reale
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {firstName(session.fullName, session.user.email)
                ? `Ciao, ${firstName(session.fullName, session.user.email)}`
                : "Benvenuto"}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {membership
                ? `Stai gestendo ${membership.organizationName}.`
                : "Account amministratore della piattaforma."}
            </p>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{session.user.email}</p>
        </div>

        {!membership ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Nessuna organizzazione associata
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              Questo account è amministratore della piattaforma. L&apos;accesso globale è
              separato dai ruoli di ristorante.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/piattaforma">
                Apri la console piattaforma
                <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <Building2 className="size-4" />
                  Organizzazione
                </div>
                <p className="mt-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {membership.organizationName}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Identificativo pubblico: {membership.organizationSlug}
                </p>
                <div className="mt-3">
                  <Badge variant="secondary">
                    {organizationStatusLabels[membership.organizationStatus] ??
                      membership.organizationStatus}
                  </Badge>
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <Store className="size-4" />
                  Sede principale
                </div>
                <p className="mt-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {membership.restaurantName ?? "Tutte le sedi"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <MapPin className="size-3.5" />
                  {membership.restaurantId
                    ? "Accesso limitato a questa sede"
                    : "Accesso all'intera organizzazione"}
                </p>
                <div className="mt-3">
                  <Badge variant="success">Dati reali</Badge>
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <UserRound className="size-4" />
                  Il tuo ruolo
                </div>
                <p className="mt-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {membership.roleName}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Il ruolo è letto dal database e verificato lato server.
                </p>
                <div className="mt-3">
                  <Badge variant="secondary">Key: {membership.roleKey}</Badge>
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <CreditCard className="size-4" />
                  Piano richiesto
                </div>
                <p className="mt-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {plan ?? "Nessun piano selezionato"}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {planStatusLabels[membership.planStatus] ?? membership.planStatus}
                </p>
                <div className="mt-3">
                  <Badge variant="warning">Nessun addebito attivo</Badge>
                </div>
              </section>
            </div>

            {session.memberships.length > 1 ? (
              <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">I tuoi accessi</h2>
                <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {session.memberships.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                    >
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {entry.organizationName}
                        {entry.restaurantName ? ` · ${entry.restaurantName}` : ""}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">{entry.roleName}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand-700 dark:text-brand-400" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Sicurezza e isolamento
                </h2>
              </div>
              <ul className="mt-3 grid gap-2 text-xs text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                  Sessione verificata sul server a ogni richiesta.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                  Row Level Security attiva su tutte le tabelle operative.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                  Ruoli e permessi provengono solo dal database.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                  Nessun selettore di ruolo nella dashboard reale.
                </li>
              </ul>
            </section>

            {session.isPlatformAdmin ? (
              <section className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950 p-5 text-white">
                <div className="flex items-center gap-2">
                  <LockKeyhole className="size-4 text-brand-400" />
                  <h2 className="text-sm font-semibold">Console piattaforma</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Il tuo account è abilitato come amministratore globale. Questo accesso è
                  separato dal ruolo Proprietario del ristorante.
                </p>
                <Button className="mt-4" variant="secondary" asChild>
                  <Link href="/dashboard/piattaforma">
                    Apri console globale
                    <ArrowRight />
                  </Link>
                </Button>
              </section>
            ) : null}
          </>
        )}

        {membership ? (
          <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center gap-2">
              <UtensilsCrossed className="size-4 text-brand-700 dark:text-brand-400" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Moduli reali
              </h2>
              <Badge variant="success" dot>
                Dati operativi
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Funzioni collegate al database, con permessi verificati lato
              server e tracciamento delle modifiche nel registro attività.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Menu e prodotti
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Categorie, prodotti, prezzi e disponibilità del locale.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/menu">
                    Apri il menu
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Sala e tavoli
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Aree del locale, tavoli e capienze per servizio e
                  prenotazioni.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/sala">
                    Apri la sala
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Cassa POS
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Conti tavolo, pagamenti e saldo collegati al menu reale.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/pos">
                    Apri il POS
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Cucina (KDS)
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Righe in attesa, in preparazione e pronte al pass, con stati
                  validati dal database.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/cucina">
                    Apri la cucina
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Magazzino
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Giacenze, fornitori, lotti, scadenze e movimenti tracciati.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/magazzino">
                    Apri il magazzino
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Acquisti
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Ordini ai fornitori, ricezioni e differenze di consegna.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/acquisti">
                    Apri gli acquisti
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Ricette e food cost
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Ingredienti, sfridi, costo per porzione e margine sui piatti.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/ricette">
                    Apri le ricette
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Vendite e incassi
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Incassi, mance e ticket medio derivati dai pagamenti reali.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/vendite">
                    Apri le vendite
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Prenotazioni
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Prenotazioni con disponibilità verificata su capienza, orari
                  e chiusure del locale.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/prenotazioni">
                    Apri le prenotazioni
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Receptionist AI
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Orari, chiusure, limiti e chiamate del receptionist vocale,
                  con telefonia in predisposizione.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/receptionist">
                    Configura il receptionist
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Dispositivi
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Palmari e dispositivi con codici di attivazione monouso e
                  limite di quattro palmari per locale.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/dashboard/dispositivi">
                    Gestisci i dispositivi
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Demo separata</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            La demo interattiva usa dati fittizi, non richiede credenziali e resta
            completamente separata da organizzazioni, membri e ruoli reali.
          </p>
          <Button className="mt-3" variant="outline" asChild>
            <Link href="/app/panoramica">
              Apri la demo
              <ExternalLink />
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto h-16 w-full max-w-5xl px-4 sm:px-6" />
      </div>
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  clearDemoStorage,
  getDemoHydrationError,
  subscribeDemoHydrationError,
  useDemoStore,
} from "@/lib/demo/store";

const subscribeHydration = (onStoreChange: () => void) =>
  useDemoStore.persist.onFinishHydration(onStoreChange);

const getHydrated = () => useDemoStore.persist.hasHydrated();

const getServerHydrated = () => false;

const getServerHydrationError = () => null;

export function StoreGate({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydrated,
    getServerHydrated,
  );
  const hydrationError = useSyncExternalStore(
    subscribeDemoHydrationError,
    getDemoHydrationError,
    getServerHydrationError,
  );

  useEffect(() => {
    if (!useDemoStore.persist.hasHydrated()) {
      void useDemoStore.persist.rehydrate();
    }
  }, []);

  const recover = useCallback(() => {
    clearDemoStorage();
    void useDemoStore.persist.rehydrate();
  }, []);

  if (hydrationError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Logo withTagline />
          <h1 className="mt-5 text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Dati demo non caricabili
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {hydrationError} Puoi ripristinare i dati dimostrativi originali: i
            dati demo non contengono informazioni operative reali.
          </p>
          <Button className="mt-5" onClick={recover}>
            Ripristina dati demo
          </Button>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Logo withTagline />
          <div className="h-1 w-28 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" />
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Caricamento ambiente demo…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import {
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { formatCents } from "@/lib/utils";
import { submitPublicOrderAction } from "@/server/online/public-actions";
import {
  initialPublicOrderState,
  type PublicMenuData,
  type PublicOrderState,
} from "@/server/online/types";

type CartLine = {
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

export function PublicMenu({
  data,
  token,
}: {
  data: PublicMenuData;
  token: string;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `key-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const [state, action, pending] = useActionState(
    async (prevState: PublicOrderState, formData: FormData) => {
      const result = await submitPublicOrderAction(prevState, formData);
      if (result.status === "success" && result.orderNumber) {
        setCart([]);
      }
      return result;
    },
    initialPublicOrderState,
  );

  const totalCents = useMemo(
    () =>
      cart.reduce(
        (total, line) => total + line.unitPriceCents * line.quantity,
        0,
      ),
    [cart],
  );

  const addItem = (item: PublicMenuData["categories"][number]["items"][number]) => {
    setCart((lines) => {
      const existing = lines.find((line) => line.menuItemId === item.id);
      if (existing) {
        return lines.map((line) =>
          line.menuItemId === item.id
            ? { ...line, quantity: Math.min(99, line.quantity + 1) }
            : line,
        );
      }
      return [
        ...lines,
        {
          menuItemId: item.id,
          name: item.name,
          unitPriceCents: item.price_cents,
          quantity: 1,
        },
      ];
    });
  };

  const changeQuantity = (menuItemId: string, delta: number) => {
    setCart((lines) =>
      lines
        .map((line) =>
          line.menuItemId === menuItemId
            ? { ...line, quantity: line.quantity + delta }
            : line,
        )
        .filter((line) => line.quantity >= 1),
    );
  };

  const itemCount = cart.reduce((total, line) => total + line.quantity, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">
            Menu digitale
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {data.restaurant.name}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            {[data.restaurant.cuisine, data.restaurant.address, data.restaurant.phone]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {data.restaurant.description ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {data.restaurant.description}
            </p>
          ) : null}
          {data.restaurant.public_note ? (
            <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:bg-brand-950 dark:text-brand-300">
              {data.restaurant.public_note}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {data.link.kind === "table" ? (
              <Badge variant="info">
                Ordini per il tavolo {data.link.label}
              </Badge>
            ) : null}
            {!data.link.allow_ordering ? (
              <Badge variant="warning">Solo consultazione</Badge>
            ) : null}
            {data.settings.prices_include_tax ? (
              <Badge variant="outline">Prezzi IVA inclusa</Badge>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:px-6">
        {state.status === "success" ? (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Ordine {state.orderNumber} ricevuto
              </p>
            </div>
            <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
              Il ristorante lo confermerà a breve. Totale registrato:{" "}
              {state.totalCents !== undefined
                ? formatCents(state.totalCents)
                : "—"}
              .
            </p>
          </div>
        ) : null}

        {state.status === "error" && state.message ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40">
            <p className="text-sm text-red-800 dark:text-red-300">{state.message}</p>
          </div>
        ) : null}

        <div className="space-y-6">
          {data.categories.map((category) => (
            <section key={category.id}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {category.name}
              </h2>
              <ul className="mt-3 space-y-2">
                {category.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </p>
                        {!item.is_available ? (
                          <Badge variant="danger">Non disponibile</Badge>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {item.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCents(item.price_cents)}
                      </p>
                    </div>
                    {data.link.allow_ordering && item.is_available ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addItem(item)}
                      >
                        <Plus />
                        Aggiungi
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {data.link.allow_ordering ? (
          <form action={action} className="mt-8 space-y-4">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="items" value={JSON.stringify(cart)} />
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            <input type="hidden" name="tableId" value={data.link.table_id ?? ""} />
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Il tuo ordine
                </h2>
                {itemCount > 0 ? (
                  <Badge variant="secondary">{itemCount} articoli</Badge>
                ) : null}
              </div>

              {cart.length === 0 ? (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  Il carrello è vuoto: aggiungi i prodotti che desideri.
                </p>
              ) : (
                <>
                  <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {cart.map((line) => (
                      <li
                        key={line.menuItemId}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-900 dark:text-zinc-100">
                            {line.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatCents(line.unitPriceCents)} ·{" "}
                            {formatCents(line.unitPriceCents * line.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Riduci ${line.name}`}
                            onClick={() => changeQuantity(line.menuItemId, -1)}
                          >
                            <Minus />
                          </Button>
                          <span className="w-8 text-center text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
                            {line.quantity}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Aggiungi ${line.name}`}
                            onClick={() => changeQuantity(line.menuItemId, 1)}
                          >
                            <Plus />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Rimuovi ${line.name}`}
                            onClick={() =>
                              setCart((lines) =>
                                lines.filter(
                                  (entry) => entry.menuItemId !== line.menuItemId,
                                ),
                              )
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 flex items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    <span>Totale indicativo</span>
                    <span>{formatCents(totalCents)}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Il totale definitivo è calcolato dal ristorante al momento
                    della conferma.
                  </p>
                </>
              )}
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                I tuoi dati
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Nome e cognome
                  <Input
                    name="customerName"
                    required
                    maxLength={160}
                    className="mt-1"
                  />
                  {state.fieldErrors?.customerName ? (
                    <span className="mt-1 block text-[11px] text-red-600 dark:text-red-400">
                      {state.fieldErrors.customerName}
                    </span>
                  ) : null}
                </label>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Telefono
                  <Input name="phone" maxLength={40} className="mt-1" />
                  {state.fieldErrors?.phone ? (
                    <span className="mt-1 block text-[11px] text-red-600 dark:text-red-400">
                      {state.fieldErrors.phone}
                    </span>
                  ) : null}
                </label>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2">
                  Email
                  <Input name="email" type="email" maxLength={254} className="mt-1" />
                  {state.fieldErrors?.email ? (
                    <span className="mt-1 block text-[11px] text-red-600 dark:text-red-400">
                      {state.fieldErrors.email}
                    </span>
                  ) : null}
                </label>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2">
                  Modalità
                  <Select
                    name="fulfillment"
                    className="mt-1"
                    defaultValue={
                      data.link.kind === "table" ? "dine_in" : "pickup"
                    }
                  >
                    <option value="pickup">Ritiro al banco</option>
                    <option value="delivery">Consegna a domicilio</option>
                    <option value="dine_in">Consumo al tavolo</option>
                  </Select>
                </label>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2">
                  Note per il ristorante
                  <Textarea
                    name="notes"
                    rows={2}
                    maxLength={500}
                    className="mt-1"
                    placeholder="Allergie, tempi, indicazioni…"
                  />
                </label>
              </div>
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <input type="checkbox" name="marketingEmail" className="size-4" />
                  Desidero ricevere novità via email
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <input type="checkbox" name="marketingSms" className="size-4" />
                  Desidero ricevere novità via SMS
                </label>
              </div>
              {state.fieldErrors?.items ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {state.fieldErrors.items}
                </p>
              ) : null}
              <Button
                type="submit"
                className="mt-4 w-full"
                disabled={pending || cart.length === 0}
              >
                <UtensilsCrossed />
                {pending ? "Invio in corso…" : "Invia ordine al ristorante"}
              </Button>
              <p className="mt-2 text-center text-[11px] text-zinc-400">
                Nessun pagamento online: pagherai direttamente al ristorante.
              </p>
            </section>
          </form>
        ) : (
          <p className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Questo menu è in sola consultazione. Chiedi al personale per
            ordinare.
          </p>
        )}
      </main>
    </div>
  );
}

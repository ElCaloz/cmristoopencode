# ARCHITECTURE — CM Risto

Il documento distingue **ciò che esiste realmente nel repository** (verificato) da **ciò che è pianificato** (non ancora implementato).

---

## Parte A - Stato attuale verificato (21 ottobre 2026)

### Applicazione

- **Next.js 16.4.2** (App Router, build con Turbopack, `cacheComponents` attivo), **React 19.3.0**, **TypeScript 5 strict**, **Tailwind CSS 4**, **ESLint 9** + `eslint-config-next` 16.4.2.
- **Tema scuro automatico (D-022):** variant `dark:` Tailwind su `prefers-color-scheme`, `color-scheme` e sfondi in `globals.css`, `themeColor` chiaro/scuro; nessun toggle applicativo. KDS e console piattaforma restano sezioni intenzionalmente scure in entrambi i temi.
- **Autenticazione reale (Sprint 1 sub completato):**
  - client Supabase `@supabase/ssr` in `src/lib/supabase/` (server + helper proxy/middleware, config con `isSupabaseConfigured()`);
  - middleware `src/proxy.ts` (convenzione Next 16): refresh sessione, protezione di `/dashboard`, `/onboarding`, `/reimposta-password`, redirect degli utenti autenticati dalle pagine auth, `Cache-Control: private, no-store`;
  - server action in `src/server/auth/actions.ts` (login, signup con email di conferma, recupero/aggiornamento password, logout, onboarding via RPC `complete_onboarding`), `getSessionContext` con `cache` in `src/server/auth/session.ts`;
  - route `/auth/callback` (PKCE e `token_hash`), con `${getSiteUrl()}` configurabile.
- **Area reale:** `/dashboard` (organizzazione, sede, ruolo e piano richiesto letti dal database con RLS; nessun selettore di ruolo; sezione "Moduli reali"), `/dashboard/menu` (**modulo menu**, D-021), `/dashboard/sala` (**modulo sala e tavoli con piantina grafica modificabile**, D-024/D-044), `/dashboard/pos` (**modulo cassa POS e ordini**, D-025), `/dashboard/vendite` (**modulo vendite**, D-027), `/dashboard/cucina` (**modulo KDS**, D-028, dark-by-design), `/dashboard/dispositivi` (**registro dispositivi, palmari e PIN operatore**, D-030/D-031), **`/dashboard/prenotazioni`** (**registro prenotazioni, D-033**), **`/dashboard/receptionist`** (**configurazione receptionist AI, D-033/D-034**) **`/dashboard/magazzino`** (**fornitori, giacenze, lotti, scadenze e movimenti**, D-041), **`/dashboard/ricette`** (**ricette, ingredienti, food cost e margini**, D-042), **`/dashboard/acquisti`** (**ordini ai fornitori, ricezioni e differenze di consegna**, D-043), `/dashboard/piattaforma` (console platform admin), `/onboarding` (form in 2 step → RPC atomica e idempotente); pagina pubblica `/palmare` con attivazione del dispositivo (RPC anon, codice monouso), **accesso operatore con PIN**, **board sala**, **apertura conto e invio comande** (D-031/D-032).
- **Backend applicativo - moduli menu, sala/piantina, POS, vendite, KDS, dispositivi, magazzino, ricette/food cost, acquisti e Fase A prenotazioni/receptionist (Sprint 2-4):**
  - `src/server/menu/queries.ts`: ristorante attivo, permesso `menu.manage` (RPC `auth_has_permission_for_restaurant`), lettura menu (React `cache`); `src/server/menu/actions.ts`: 7 server action protette (categorie CRUD, prodotti CRUD, toggle disponibilità) con validazione Zod (prezzo in formato italiano), autorizzazione server-side, audit su `audit_logs`, `revalidatePath`;
   - `src/server/tables/queries.ts` e `actions.ts`: aree e tavoli con permesso `reservations.manage`, 8 azioni (aree CRUD, tavoli CRUD, sospensione/riattivazione, salvataggio layout), geometria in mezze-celle, arredi `floor_objects` e RPC atomica `save_floor_layout`, stessa pipeline (Zod, autorizzazione, audit, revalidate); `getActiveRestaurant` condiviso in `src/server/restaurant/active.ts` (D-024/D-044);
  - `src/server/pos/queries.ts` e `actions.ts`: ordini aperti con righe e pagamenti, permesso `pos.operate` (`canOperatePos`), 5 azioni (apri conto, aggiungi prodotti, annulla riga, incassa, annulla conto) che chiamano RPC `security definer` atomiche e idempotenti (`open_order`, `add_order_items`, `cancel_order_item`, `pay_order`, `void_order`); autorizzazione, audit `pos.*` e `revalidatePath` nel layer server;
  - `src/server/sales/queries.ts`: giornata derivata in sola lettura dai pagamenti (`getSalesDay`), aggregazione in `src/lib/sales.ts`, permesso `reports.read` (`canReadSales`); nessuna tabella o migrazione dedicata;
  - `src/server/kds/queries.ts` e `actions.ts`: board della cucina con righe attive dei conti aperti, permesso `kitchen.operate` o `pos.operate` (`canOperateKitchen`), action `advanceItemAction` che chiama la RPC `set_order_item_status` (state machine `pending → preparing → ready → served`, idempotente sullo stesso stato), audit `kds.item_status_changed` e revalidation di cucina e POS;
  - `src/server/devices/queries.ts`, `actions.ts` e `claim.ts`: registro dispositivi e palmari, permesso `devices.manage` per creazione/codici/stati e per i PIN altrui, RPC `security definer` (`create_device` con limite di 4 palmari e lock sul ristorante, `reissue_device_pairing`, `set_device_status`, `claim_device_pairing` anon con codici monouso hashati, `set_operator_pin`/`clear_operator_pin`/`operator_pins_overview`), audit `device.*`; l'attivazione dalla pagina pubblica `/palmare` deposita il token in cookie httpOnly `cm_risto_device` (D-030);
  - `src/server/palmare/{types,queries,actions}.ts`: stato discriminato `claim → login → board`; `getPalmareState` fa heartbeat del dispositivo, valida la sessione operatore e costruisce board o elenco operatori con PIN; `palmareLoginAction` chiama `verify_operator_pin` (PIN errato → messaggio dal contatore persistito; lockout 5 tentativi/5 minuti) e deposita il token di sessione in cookie httpOnly `cm_risto_operator` (12 ore); `palmareLogoutAction` revoca la sessione (idempotente) e cancella il cookie; PIN salvati come hash bcrypt e token come hash SHA-256, RLS senza policy su `operator_pins`/`operator_sessions` (D-031);
  - `src/server/inventory/{types,queries,actions}.ts`: permesso `inventory.manage`, fornitori, articoli, giacenze in millesimi, registro movimenti (ultimi 40), RPC atomiche `create_inventory_item` e `record_inventory_movement` con idempotenza, stock non negativo, motivazioni spreco e audit; helper `src/lib/inventory.ts` per parsing/formattazione/valore; UI `/dashboard/magazzino` con KPI, filtri, fornitori e registro (D-041);
  - `src/server/recipes/{types,queries,actions}.ts`: permessi `menu.manage` e `inventory.manage`, elenco piatti con ricetta/ingredienti, costo per porzione e margine calcolati dai costi correnti del magazzino; RPC atomiche `save_recipe` e `delete_recipe`, helper `src/lib/recipes.ts`, UI `/dashboard/ricette` (D-042);
  - `src/server/purchasing/{types,queries,actions}.ts`: permesso `inventory.manage` per le scritture e lettura per `inventory.manage`/`reports.read`, ordini ai fornitori con righe, ricezione definitiva (anche parziale) che aggiorna giacenza e costo corrente, annullamento e idempotenza; RPC atomiche `save_purchase_order`, `mark_purchase_order_ordered`, `cancel_purchase_order` e `receive_purchase_order`, helper `src/lib/purchasing.ts`, UI `/dashboard/acquisti` con sola lettura per chi ha solo `reports.read` (D-043);
  - `src/server/reservations/{types,queries,actions}.ts`: permesso `reservations.manage`, registro prenotazioni (limite 500), creazione manuale, cambio stato, note e audit; tutte le mutazioni passano dalle RPC atomiche `create_reservation`, `set_reservation_status`, `update_reservation_notes`; `src/server/receptionist/{types,queries,actions}.ts` gestisce configurazione, orari, chiusure, registro chiamate e `receptionist.manage`, con audit e revalidation;
  - `src/server/receptionist/{internal-auth,internal,http}.ts` + `src/lib/supabase/admin.ts`: bootstrap token statico, token per chiamata HMAC-SHA256 con scadenza e claim del tenant, verifica della chiamata `in_progress`, service role solo server-side e mapping errori RPC (D-034);
  - route `/api/internal/voice/calls`, `/calls/[id]/end` e `/tools/{check-availability,create-reservation,take-message,transfer}`: contatto tra provider vocale e database; la prenotazione AI nasce `pending` con `call_id` e non può confermare; `transfer` restituisce solo il numero configurato (nessuna telefonia reale);
  - UI `/dashboard/menu`, `/dashboard/sala`, `/dashboard/pos`, `/dashboard/vendite`, `/dashboard/cucina`, `/dashboard/dispositivi`, **`/dashboard/prenotazioni`**, **`/dashboard/receptionist`**, **`/dashboard/magazzino`**, **`/dashboard/ricette`** e **`/dashboard/acquisti`** con badge "solo lettura" quando manca il permesso; ogni azione ha effetto reale nel database (nessun pulsante decorativo).
- **Front-end demo completo e navigabile senza backend:**
  - sito pubblico statico (home, prezzi, funzionalità, contatti, documentazione, legali);
  - gestionale `/app/*` con 16 pagine (panoramica, POS, sala con piantina grafica modificabile, comande, KDS, menu, prenotazioni, clienti, vendite, magazzino, report, personale, dispositivi, impostazioni, abbonamento, console piattaforma);
  - app shell con topbar, sidebar desktop/mobile, command palette, user menu e guardie di area per ruolo demo; `/app/cucina` è un KDS full-screen per i ruoli autorizzati, con controllo permessi prima del rendering.
  - design system a token CSS (`shadow-card`, `shadow-lift`, `radius-card`, `ease-smooth`), `PageHeader` con eyebrow, `StatCard` premium, tabelle con `aria-sort`, skip link, skeleton di caricamento e notifiche non bloccanti; animazioni CSS brevi con rispetto di `prefers-reduced-motion` (D-036/D-038).
- **Layer demo separato** (`src/lib/demo/`): tipi, calcoli, seed deterministico (mulberry32) e store zustand persistito in `localStorage` (`cm-risto-demo-v1`, `skipHydration`). `StoreGate` reidrata lo store prima di renderizzare `/app/*` e, se lo storage è corrotto, mostra il ripristino guidato (`clearDemoStorage`). Nessun dato demo viene inviato a servizi esterni; il layer demo non importa client Supabase. Il falso positivo Next `instant-unrendered-segment` è gestito con `instantInsights: manual-warning` (D-037).
- **Ruoli demo** (`src/lib/roles.ts`): admin, cassiere, cameriere, cucina, super_admin; `dashboard` è accessibile a cassiere, cameriere e cucina, mentre le rispettive aree operative restano invariate. Il controllo è client-side e dichiaratamente non equivalente all'autorizzazione reale, che è server-side nell'area reale.
- **Componenti browser-only** (recharts, anno di copyright, store persistito) protetti con `useSyncExternalStore` per evitare hydration mismatch e valori instabili nel prerender (D-014).
- Script npm attivi: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `e2e`, `local-service:build`, `local-service`. Build verificata (**55 route/pagine** generate, proxy/middleware attivo, incluse 6 route API interne, robots.txt e sitemap.xml), lint/typecheck senza errori (app + servizio locale), **62 test unitari Vitest**, **25 e2e Playwright** (15 flussi auth reali inclusi menu, sala, piantina grafica, POS, vendite, cucina KDS, dispositivi, accesso col PIN, prenotazioni/receptionist, magazzino, ricette e acquisti, 7 demo inclusa la piantina grafica, 3 dark mode) e **656 test pgTAP Supabase** (30 RLS + 14 escalation + 28 auth/onboarding + 30 menu + 34 sala/tavoli + 33 piantina sala + 58 POS + 41 KDS + 59 dispositivi + 81 operatori/palmare + 72 prenotazioni/receptionist + 58 comande palmare + 23 magazzino + 34 ricette + 61 acquisti). Il conteggio comande palmare è incluso nei 656 complessivi; la ripartizione somma i file di test correnti. Gli e2e hanno un global teardown che rimuove i dati di prova dal database locale, pagamenti e ordini inclusi (D-020).

### File presenti nel repository

```
CM-Risto/
  src/proxy.ts                  middleware Next 16 (refresh sessione, route protette)
  src/app/                      route pubbliche + /app gestionale demo + /dashboard, /onboarding, /auth/callback
  src/components/ui/            design system (pulsanti, dialog, tabelle, grafici…)
  src/components/public/        header, footer, pricing, auth/legal layout
  src/components/app/           app shell, topbar, sidebar, command palette, StoreGate, piantina sala demo
  src/components/auth/          form reali (login, registrazione, recupero, reset, onboarding)
  src/components/dashboard/     componenti area reale (sign-out, menu-manager, floor-manager, floor-plan, pos-manager, sales-manager, kitchen-manager, devices-manager, reservations-manager, receptionist-manager, inventory-manager, recipe-manager, purchasing-manager)
  src/components/palmare/       pagina pubblica /palmare (claim-form, login-form con PIN, board-view della sala)
  src/components/brand/         logo
  src/lib/supabase/             client SSR, helper proxy, configurazione ambiente
  src/lib/auth/redirect.ts      allowlist dei redirect post-login (safeNextPath)
  src/server/auth/              server action, session context, tipi condivisi
  src/server/restaurant/        ristorante attivo condiviso (getActiveRestaurant)
  src/server/inventory/         server action, query e tipi del magazzino (fornitori, articoli, movimenti)
  src/server/recipes/           server action, query e tipi di ricette, ingredienti e food cost
  src/server/purchasing/        server action, query e tipi ordini ai fornitori, ricezioni e differenze
  src/server/menu/              server action, query e tipi del modulo menu
  src/server/tables/            server action, query e tipi del modulo sala/tavoli e piantina (geometria, arredi)
  src/server/pos/               server action, query e tipi del modulo cassa POS
  src/server/sales/             query e tipi del modulo vendite (derivate dai pagamenti)
  src/server/kds/               server action, query e tipi del modulo cucina (KDS)
  src/server/devices/           server action, query, claim e tipi del registro dispositivi e PIN
  src/server/palmare/           stato, query e azioni del palmare (heartbeat, PIN, board, logout)
  src/server/reservations/      query, action, tipi e RPC prenotazioni
  src/server/receptionist/      configurazione, orari, chiamate e API interne del receptionist
  src/app/api/internal/voice/  route server-to-server del provider vocale (bootstrap, tools, end)
  src/lib/supabase/admin.ts    client service role solo server-side per le API interne
  src/lib/demo/                 types, calc, labels, seed, store (demo)
  src/lib/floor-plan.ts         griglia, forme, arredi e helper condivisi della piantina
  src/lib/plans.ts              piani e prezzi provvisori (unica fonte)
  src/lib/roles.ts              ruoli e permessi demo
  src/lib/recipes.ts            costo ricetta, sfrido e margini in aritmetica intera
  src/lib/purchasing.ts         totali ordine, valore ricevuto e differenze in aritmetica intera
  src/lib/inventory.ts          parsing/formattazione quantità in millesimi e valore magazzino
  src/lib/utils.ts              formattazione, CSV, helper date/importi
  src/lib/use-is-client.ts      hook hydration-safe
  local-service/src/            servizio locale Node: config, coda SQLite, ESC/POS, sync, worker e API
  local-service/.env.example    configurazione del servizio locale (token, stampante, sync)
  tests/unit/                   test Vitest (calc, seed, store demo, utils/CSV, redirect auth, token receptionist, servizio locale, acquisti, quantità/valori magazzino)
  tests/e2e/                    test Playwright (auth reali + menu/sala/POS/vendite/cucina/dispositivi/PIN/prenotazioni/receptionist, magazzino, ricette, acquisti, demo, dark mode) con global teardown
  vitest.config.mts             configurazione Vitest
  playwright.config.ts          configurazione Playwright (Chrome, dev server, teardown)
  supabase/config.toml          configurazione CLI (stack locale attivo)
  supabase/migrations/          schema v1 + ruoli + auth/onboarding + menu + sala/tavoli + piantina sala + POS + KDS + dispositivi + operatori + prenotazioni/receptionist + magazzino + ricette + acquisti (19 applicate)
  supabase/tests/               pgTAP: RLS (30) + escalation (14) + auth/onboarding (28) + menu (30) + sala/tavoli (34) + piantina sala (33) + POS (58) + KDS (41) + dispositivi (59) + operatori/palmare (81) + prenotazioni/receptionist (72) + comande palmare (58) + magazzino (23) + ricette (34) + acquisti (61) = 656
  .env.example                  variabili richieste (nessun segreto committed); include token/segreto API receptionist
  public/                       asset statici
  next.config.ts                configurazione Next (cacheComponents, devIndicators off)
  docs/                         documentazione di progetto (incluso AUDIT_COMPLETO.md)
```

### Cosa NON esiste ancora (dichiarato esplicitamente)

- **Moduli di prodotto reali:** menu, sala/tavoli con **piantina grafica** (posizioni, forme, dimensioni, arredi, editor a comparsa), cassa POS, vendite, KDS, dispositivi/palmari (attivazione, PIN, board, presa in carico e comande), **prenotazioni**, **configurazione receptionist AI** e **magazzino** (fornitori, giacenze, lotti, scadenze, movimenti) e **ricette/food cost** (ingredienti, sfrido, resa, costo per porzione e margine) e **acquisti** (ordini ai fornitori, ricezioni anche parziali, differenze, aggiornamento di giacenze e costi) con database + server action/API + UI. **Restano da costruire** CRM, report, personale e gli altri moduli dello Sprint 4-5.
- Migrazioni applicate e verificate (**19 file**: schema v1, gerarchia ruoli, auth/onboarding, fix RPC onboarding, sprint 2 menu, sprint 2 sala/tavoli, sprint 2 POS, sprint 2 KDS, sprint 3 dispositivi, sprint 3 operatori/palmare, fix hash token operatore, filtro lockout scaduto, sprint 5/Fase A receptionist, sprint 4 magazzino, fix policy inventario, cascades inventario, sprint 4 ricette/food cost, sprint 4 acquisti, piantina sala/arredi), con RLS, gerarchia ruoli e **656/656 test pgTAP**. Nessun seed reale.
- I permessi sono applicati nel database (RLS + trigger) e i moduli reali li usano per autorizzare le azioni server (`menu.manage`, `reservations.manage`, `receptionist.manage`, `pos.operate`, `kitchen.operate`, `reports.read`, `devices.manage`, `inventory.manage`); gli altri moduli reali non esistono ancora.
- **Telefonia e provider vocale non collegati:** le API interne e il modello dati sono pronti, ma non esiste alcun numero reale, webhook firmato dal provider, trasferimento effettivo o costo per chiamata. Il budget mensile del receptionist è memorizzato ma non applicato. Non dichiarare operativo il receptionist finché non ci sono riscontri reali (regola 5).
- **CI predisposta** in `.github/workflows/ci.yml` (D-029): job qualità (lint, typecheck, vitest, build Next e local-service), database (pgTAP) ed e2e (Playwright su stack Supabase locale); prima esecuzione reale da verificare al primo push. Il servizio locale ha coda, stampa ESC/POS e sync adapter, ma non è ancora collegato a un endpoint cloud, a WebSocket/realtime o alla UI palmare; `.env.example` presenti con segnaposto (i valori locali vivono in `.env.local`/`local-service/.env`, mai committati).
- **Porte locali Supabase spostate** su `55000-55006` per un'esclusione di Windows (API `55001`, Mailpit `55004`); `.env.example`, `.env.local` e test e2e aggiornati (D-035). La configurazione di produzione userà il progetto cloud.
- **Comande generiche, CRM e report** restano interazioni demo su store locale; la dashboard reale mostra organizzazione, sede, ruolo, piano richiesto, menu, sala con piantina grafica, POS, vendite, cucina (KDS), dispositivi, palmare operativo, prenotazioni, receptionist, magazzino e acquisti.
- Nessun commit git (branch `main`, lavoro non committato; Git richiede `safe.directory`).

### Ambiente di sviluppo verificato

- Windows, PowerShell 5.1; Node.js v24.19.0; npm 11.17.0; Docker 29.2.0; git 2.43.0.
- Nota operativa: durante lo scaffold iniziale l'installazione npm è stata interrotta e il binario nativo `@next/swc-win32-x64-msvc` è risultato troncato (12,7 MB invece di 110 MB); risolto rimuovendo il pacchetto e reinstallando. La build ora funziona con il binario nativo (105 MB).

### Progetto legacy di riferimento (non fa parte di questo repository)

`C:\Users\calos\Downloads\Sa-as-Ristoranti-main` — predecessore "CMRistorante": Vite + React + Express + Supabase, ~46 componenti (POS, KDS, menu, prenotazioni, clienti, vendite, admin), schema SQL monolitico in `db/schema.sql`, diversi moduli mock (sala, magazzino, delivery), sicurezza incompleta (RLS debole, endpoint non protetti, pairing dispositivi simulato con localStorage). Va usato **solo come riferimento di porting e di requisiti impliciti**; ha problemi di sicurezza documentati nell'audit e non va copiato acriticamente.

---

## Parte B — Architettura pianificata (target e parti residue)

> Le parti già realizzate sono descritte nella Parte A. Questa sezione resta il riferimento per servizio locale, integrazioni esterne e moduli non ancora costruiti.

### Applicazione web

- **Next.js App Router** con TypeScript strict e Tailwind CSS 4; PWA per POS e palmari.
- Server Components per le pagine dati; Client Components per le interazioni.
- **Server Actions / Route Handlers** per tutte le mutazioni, con validazione **Zod**.
- Logica di business in servizi applicativi (`src/server/`) separati dalla UI.
- Realtime Supabase filtrato per sede e protetto da RLS, per POS/KDS/palmari.
- Denaro in **centesimi interi** (`bigint`/`integer` in DB); helper condivisi di formato e aritmetica.

### Struttura cartelle target

```
src/app/                  route: area pubblica, dashboard admin, POS, palmare, KDS
src/components/           UI riusabile (porting selettivo dal legacy)
src/features/             moduli: menu, ordini, cassa, sala, cucina, prenotazioni,
                          magazzino, ricette, fornitori, CRM, marketing, report, staff
src/server/               servizi applicativi, permessi, tenant, audit
src/lib/                  client Supabase (browser/server/middleware), validazione, formato
src/types/                tipi condivisi
supabase/migrations/      schema versionato + RLS + seed
local-service/            servizio locale per palmari e stampanti (Node + TS)
tests/                    unit, integrazione, e2e
docs/                     documentazione di progetto
```

### Database e sicurezza

- **PostgreSQL su Supabase**. Entità principali: organizations, restaurants, restaurant_locations, users/profiles, memberships, roles, permissions, restaurant_settings, devices, device_pairings, audit_logs, sale/tavoli, comande/ordini, pagamenti, menu/prodotti/varianti/modificatori/allergeni, ricette/ingredienti/movimenti magazzino, fornitori/ordini acquisto, clienti/consensi, prenotazioni, conversazioni/AI, personale/turni, piani/abbonamenti.
- **RLS su ogni tabella** con funzioni tenant: `auth_org_ids()`, `auth_restaurant_ids()`, `auth_has_permission()` (security definer, `search_path` fissato).
- **Gerarchia ruoli membership** applicata con trigger database: nessun utente può assegnare/rimuovere ruoli pari o superiori al proprio, cambiare il proprio ruolo o spostare una membership su altro tenant/utente (D-017).
- Doppia difesa: RLS nel database + controllo autorizzazioni nel layer server. Mai solo frontend.
- Migrazioni versionate con Supabase CLI; ambienti separati (locale → cloud di produzione).

### Autenticazione e dispositivi

- Supabase Auth via `@supabase/ssr` (cookie), protezione route con middleware.
- Dispositivi palmari: tabella `devices` con token hashati, pairing monouso con codice/QR a scadenza, **limite di 4 palmari applicato in transazione lato server**, stati (pending/authorized/active/offline/revoked/blocked), revoca e sostituzione.
- PIN rapido operatore: **realizzato** (D-031) — hash bcrypt, lockout dopo 5 tentativi per 5 minuti, sessione operativa di 12 ore con inattività 15 minuti, un solo accesso aperto per dispositivo, audit per operatore.

### Servizio locale

- Pacchetto separato `local-service/`: Node 24 + TypeScript, processo HTTP su `127.0.0.1:4100` per default, autenticazione bearer, coda persistente SQLite (`node:sqlite`, WAL), idempotenza su `idempotency_key`, retry con backoff e recupero dei job rimasti `processing` dopo un riavvio.
- Driver stampante ESC/POS: adapter `file` per test/spool locale e `network` TCP verso stampante di rete; formattazione comanda, note, taglio. Nessuna stampante fisica verificata.
- Sync adapter: HTTP firmato con bearer e `Idempotency-Key` verso un endpoint cloud configurabile; `LOCAL_SERVICE_TEST_MODE=true` scrive gli eventi nella spool locale e non contatta il cloud.
- API: `GET /health`, `GET /jobs/stats`, `POST /jobs`, `POST /worker/run`; body limitato a 64 KiB e payload validati con Zod.
- Restano da realizzare: trasporto WebSocket/realtime verso il cloud, discovery LAN dei palmari, integrazione con la UI palmare, riconciliazione conflitti lato server e test con stampanti reali. La modalità offline del palmare non è dichiarata operativa.

### Integrazioni esterne (adapter isolati)

- Provider vocale/telefonico (LiveKit o altro, previa verifica costi e copertura), provider AI configurabile (OpenAI/Gemini; adapter intercambiabile), Stripe (Billing SaaS, webhook firmati e idempotenti), Resend (email), Twilio/WhatsApp Business (SMS), provider fiscali italiani (da verificare), Sentry, Vercel. Le API interne del receptionist sono già pronte lato applicazione (D-034), ma nessun adapter esterno è collegato.
- Regola: ogni adapter ha configurazione, gestione errori e modalità test; nessuna integrazione è "completata" finché non verificata realmente (vedi AGENTS.md regola 5).

### Testing e CI

- **Vitest** per unit: calcoli, seed e store demo, utils/CSV, redirect auth, token/HMAC receptionist e servizio locale (coda, ESC/POS, API).
- Integrazione database con **pgTAP** su Supabase locale (RLS, ruoli, moduli, prenotazioni/receptionist); webhook e coda offline reali non ancora testati end-to-end.
- **Playwright** per gli E2E dei flussi A–E definiti nel product spec (auth reali, demo, dark mode).
- CI GitHub Actions: lint, typecheck app e servizio locale, unit, build Next e `local-service`, pgTAP ed e2e.

### Gestione sessioni AI e memoria

- La memoria del progetto vive nei documenti `AGENTS.md` e `docs/` (STATUS, PRODUCT_SPEC, ARCHITECTURE, DECISIONS): ogni sessione AI li legge all'avvio e li aggiorna alla chiusura.
- Non dipendere dalla cronologia delle conversazioni come unica memoria.

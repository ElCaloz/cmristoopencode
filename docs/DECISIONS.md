# DECISIONS â€” Registro delle decisioni tecniche

Formato: ID, data, decisione, motivazione, stato. Le decisioni superseded restano registrate.

---

**D-001 â€” Nuovo repository dedicato invece di evolvere il progetto legacy** (17/10/2026)
- Decisione: sviluppare CM Risto in `C:\Users\calos\CM-Risto` come nuovo progetto; il legacy `Sa-as-Ristoranti-main` resta intatto come riferimento di porting (sola lettura).
- Motivazione: il legacy ha problemi di sicurezza strutturali (RLS debole, endpoint non protetti, pairing dispositivi simulato) e un modello dati inadatto al multi-tenancy; un percorso di hardening in-place sarebbe piÃ¹ rischioso di una migrazione controllata con porting selettivo.
- Stato: attiva.

**D-002 â€” Stack Next.js App Router + TypeScript strict + Tailwind 4** (17/10/2026)
- Decisione: Next.js 16.4.2 con App Router (Turbopack), TypeScript strict, Tailwind CSS 4, ESLint 9.
- Motivazione: allineamento all'architettura di riferimento del prompt master; route handler/server action per logica lato server, middleware per protezione route, PWA, ecosistema maturo per SaaS commerciale. Confermata esplicitamente dall'utente.
- Stato: attiva (scaffold verificato con build).

**D-003 â€” Supabase locale per lo sviluppo, cloud in seguito** (17/10/2026)
- Decisione: sviluppo con Supabase CLI + Docker locale e migrazioni versionate; la produzione sarÃ  un progetto cloud dedicato collegato in seguito.
- Motivazione: isolamento dall'ambiente demo esistente, test RLS riproducibili, nessuna dipendenza da credenziali cloud durante lo sviluppo. Indicazione dell'utente ("Supabase locale + cloud dopo").
- Stato: attiva. Stack locale avviato e verificato il 17/10/2026; migrazioni applicate e test pgTAP 44/44.

**D-004 â€” Denaro in centesimi interi** (17/10/2026)
- Decisione: importi monetari come interi (centesimi, `bigint`) nel database e helper condivisi nel codice; mai `float`/`real`.
- Motivazione: il legacy usa `real` (errore inaccettabile per cassa/fiscale); i centesimi eliminano errori di arrotondamento e semplificano riconciliazione e split conto.
- Stato: attiva (da applicare nello schema v1).

**D-005 â€” Schema database in inglese con entitÃ  multi-tenant** (17/10/2026)
- Decisione: tabelle e colonne in inglese (`organizations`, `restaurants`, `locations`, `orders`, `payments`...), UI e documentazione in italiano.
- Motivazione: standard professionale, migliore integrazione con tooling; il modello legacy in italiano era single-tenant e limitato. Il mapping legacyâ†’nuovo verrÃ  documentato durante il porting.
- Stato: attiva.

**D-006 â€” Doppia difesa autorizzativa: RLS + servizi server** (17/10/2026)
- Decisione: ogni tabella protetta da RLS con funzioni tenant (`auth_org_ids`, `auth_restaurant_ids`, `auth_has_permission`); ogni mutazione passa da server action/route handler con controlli espliciti.
- Motivazione: audit del legacy â€” policy permissive su `ristoranti`, admin API senza autenticazione, chiaramente insufficienti per un SaaS commerciale. I test di isolamento cross-tenant sono bloccanti.
- Stato: attiva (da implementare in Sprint 1).

**D-007 â€” Limite di 4 palmari applicato lato server** (17/10/2026)
- Decisione: il limite (default 4 per cassa/gruppo operativo) Ã¨ verificato in transazione dal backend e dal servizio locale, non dalla UI; il quinto dispositivo Ã¨ bloccato anche con uno dei quattro offline.
- Motivazione: requisito esplicito del prompt master; il legacy non aveva alcun registro dispositivi nÃ© limite (solo localStorage lato client).
- Stato: attiva (Sprint 3).

**D-008 â€” Servizio locale dedicato per palmari, stampanti e offline** (17/10/2026)
- Decisione: pacchetto separato `local-service/` (Node + TypeScript) con coda persistente, outbox idempotente e adapter stampanti; la modalitÃ  offline sarÃ  dichiarata solo dopo test reali di disconnessione/riavvio/conflitto.
- Motivazione: requisito del prompt master; la stampa "simulata" del legacy con IP fittizio e token placeholder non Ã¨ accettabile per uso reale.
- Stato: attiva (Sprint 3).

**D-009 â€” Integrazioni esterne solo come adapter verificabili** (17/10/2026)
- Decisione: Stripe, Resend, Twilio/WhatsApp, provider AI, provider fiscali e stampanti vengono isolati in adapter con configurazione, gestione errori e modalitÃ  test; nessuna integrazione Ã¨ dichiarata completata senza verifica reale.
- Motivazione: regola 5 del prompt master; il legacy conteneva pagamenti/fiscale simulati presentati come funzionanti (checkout simulato senza chiave, XML fiscale loggato e mai inviato).
- Stato: attiva.

**D-010 â€” Git inizializzato, commit solo su richiesta esplicita** (17/10/2026)
- Decisione: repository git inizializzato su branch `main`; i commit vengono effettuati solo quando l'utente lo chiede esplicitamente.
- Motivazione: regola operativa dell'assistente; il versionamento va comunque predisposto per proteggere il lavoro.
- Stato: attiva (0 commit al 17/10/2026).

**D-011 â€” Memoria di progetto nei file, non nella chat** (17/10/2026)
- Decisione: `AGENTS.md` + `docs/STATUS.md` (e gli altri documenti) sono la memoria ufficiale; ogni sessione li legge all'avvio e li aggiorna alla chiusura.
- Motivazione: richiesta esplicita dell'utente; garantisce continuitÃ  tra sessioni diverse e macchine diverse.
- Stato: attiva.

**D-012 â€” Nota operativa: policy allow-scripts di npm** (17/10/2026)
- Decisione: mantenere la policy predefinita di npm (postinstall non approvati automaticamente); valutare `unrs-resolver` solo se emergono problemi di lint/import.
- Motivazione: build e lint funzionano senza approvare lo script; non introdurre eccezioni non necessarie.
- Stato: attiva, da rivalutare in caso di problemi.

**D-013 â€” Layer demo front-end separato, persistito e deterministico** (17/10/2026)
- Decisione: la demo interattiva vive in `src/lib/demo/` con store zustand persistito in `localStorage` (chiave `cm-risto-demo-v1`, `skipHydration`), seed deterministico (PRNG mulberry32) e azioni che simulano il dominio. Nessuna pagina demo importa client Supabase o servizi reali.
- Motivazione: permettere di esplorare tutte le funzioni senza backend, mantenendo la separazione netta dai futuri dati operativi (regola 4). Il seed deterministico evita divergenze tra server e client; `StoreGate` reidrata prima di mostrare `/app/*` per evitare hydration mismatch e dati â€œvuotiâ€ al primo render.
- Stato: attiva. Il layer demo andrÃ  rimosso o isolato dietro flag quando il backend reale sarÃ  collegato.

**D-014 â€” Pattern hydration-safe con `useSyncExternalStore`** (17/10/2026)
- Decisione: evitare `setState` sincrono dentro `useEffect` (regola React 19 `react-hooks/set-state-in-effect`). Usare:
  - `useDemoStore.persist.onFinishHydration` + `hasHydrated` con `useSyncExternalStore` in `StoreGate`;
  - hook `useIsClient` (`getServerSnapshot â†’ false`) per componenti browser-only (grafici, anno di copyright).
- Motivazione: lint pulito senza disabilitazioni, nessun hydration mismatch, nessun uso di `new Date()` durante il prerender (vincolo `cacheComponents` di Next 16). `ChartFrame` monta recharts solo dopo l'idratazione.
- Stato: attiva. Gli `export const instant = false` non sono utilizzabili nelle page client: la segnalazione dev `instant-unrendered-segment` resta nota e non bloccante.

**D-015 â€” Test: Vitest per la logica, Playwright sul dev server con overlay nascosto** (17/10/2026)
- Decisione:
  - unit test in ambiente `node` su `src/lib/demo` (calcoli, seed deterministico, azioni store), con `localStorage` in memoria nel setup;
  - e2e Playwright con Chrome giÃ  installato (`channel: "chrome"`, nessun download browser), workers 1, `webServer: npm run dev` con `reuseExistingServer`;
  - nei soli test, `nextjs-portal` (overlay dev di Next 16) viene nascosto via CSS iniettato con `addInitScript`; i click sui menu utente usano il trigger della topbar (`banner`).
- Motivazione: verificare i flussi reali nel browser senza dipendere da un build di produzione; l'overlay dev intercettava i pointer events sul menu utente della sidebar rendendo i test fragili. Nasconderlo nei test non altera l'app nÃ© la produzione.
- Stato: attiva. Se in futuro gli e2e gireranno in CI, valutare l'esecuzione contro `next start` per eliminare del tutto il workaround.

**D-016 â€” Schema v1: tenant, membership con scoping e RLS tramite helper** (17/10/2026)
- Decisione:
  - gerarchia `organizations` â†’ `restaurants` â†’ `restaurant_locations`; `profiles` collegati a `auth.users` da trigger;
  - ruoli/permessi di sistema globali (`roles`, `permissions`, `role_permissions`), personalizzazione per organizzazione rimandata;
  - `memberships` con `restaurant_id` nullable: membership org-wide se null, altrimenti limitata a un ristorante; unicitÃ  `nulls not distinct`;
  - RLS con funzioni `security definer` (`auth_org_ids`, `auth_restaurant_ids`, `auth_has_permission`, `auth_has_permission_for_restaurant`, `auth_shares_org_with`) per evitare ricorsione e centralizzare lo scoping;
  - i permessi organizzativi richiedono membership org-wide; quelli di ristorante accettano membership org-wide o scoped;
  - `create_organization` RPC atomica (organizzazione + ristorante + membership owner + audit) per il futuro onboarding;
  - `platform_admins` separati dalle membership e `audit_logs` con sola lettura per chi ha `audit.read`.
- Motivazione: isolamento multi-tenant applicato nel database (D-006), niente controlli solo frontend, onboarding senza deadlock RLS e base pronta per i moduli Sprint 2.
- Stato: attiva. Migrazione applicata e verificata il 17/10/2026; 30 test pgTAP di isolamento/RLS superati, piÃ¹ 14 test di escalation membership (D-017).

**D-017 â€” Gerarchia ruoli membership imposta nel database** (17/10/2026)
- Decisione: trigger `BEFORE INSERT/UPDATE/DELETE` su `memberships` con rank `owner > admin > manager > ruoli operativi`; un membro puÃ² gestire solo ruoli inferiori al proprio (l'owner puÃ² assegnare anche owner), non puÃ² modificare il proprio ruolo, non puÃ² rimuovere la propria membership e non puÃ² cambiare `user_id`/`organization_id`. Il primo membership di una nuova organizzazione deve essere `owner`.
- Motivazione: l'audit ha dimostrato che un manager con `members.manage` poteva auto-promuoversi a owner (e promuovere altri) perchÃ© la RLS verificava il permesso ma non il rango del ruolo. La correzione Ã¨ server-side, nel database, non nella UI.
- Stato: attiva. Migrazione `20261017120000_membership_role_hierarchy.sql` applicata; 14 test pgTAP di regressione superati, oltre ai 30 test RLS preesistenti.

**D-018 â€” Neutralizzazione delle formule nelle esportazioni CSV** (17/10/2026)
- Decisione: `csvEscape` prefissa con apostrofo le stringhe che iniziano con `=`, `+`, `-`, `@`, TAB o CR, lasciando invariati i valori numerici; mantenuti escaping di virgolette, punti e virgola e newline.
- Motivazione: i CSV esportati da vendite/report possono contenere testo inserito dall'utente; senza escape una cella puÃ² essere interpretata come formula da Excel/Sheets (CSV injection). Test unitari dedicati in `tests/unit/utils.test.ts`.
- Stato: attiva.

**D-019 â€” Key distinte sui pulsanti condizionali del form onboarding** (18/10/2026)
- Decisione: i due pulsanti alternativi del footer di `onboarding-form.tsx` (`Avanti` `type="button"` e `Crea il locale` `type="submit"`) hanno `key` distinte (`step-next`, `step-submit`) per forzare il remount del nodo DOM.
- Motivazione: React 19 riutilizza lo stesso nodo `<button>` e muta l'attributo `type` durante l'handler di click; il browser valuta l'azione di default dopo l'handler e invia il form (facebook/react#33197). Riprodotto dagli e2e: il click su `Avanti` creava l'organizzazione col piano predefinito, saltando la scelta del piano. Il fix vale per utenti reali, non Ã¨ solo per i test.
- Stato: attiva. Verificato dall'e2e "registrazione reale: conferma email e onboarding".

**D-020 â€” Igiene e determinismo dei test: teardown e2e, baseline pgTAP, filtro errore dev** (18/10/2026)
- Decisione:
  - `tests/e2e/global-teardown.ts` elimina dopo ogni run le organizzazioni `trattoria-e2e-*` e gli utenti `e2e-*@example.test` dal database locale, tramite API admin Supabase e `SUPABASE_SERVICE_ROLE_KEY` letta da `.env.local` (solo locale, mai lato client; assente â†’ il teardown avvisa e salta);
  - i test pgTAP di isolamento conteggiano organizzazioni e ristoranti **relativamente a una baseline** catturata a inizio transazione, non con valori assoluti;
  - i test e2e filtrano il solo errore dev-only `Performance.measure ... negative time stamp` (vercel/next.js#86060; assente nel build di produzione) tramite `tests/e2e/support/errors.ts`.
- Motivazione: la suite e2e che crea dati reali lasciava organizzazioni nel database locale, facendo fallire i conteggi assoluti dei test RLS (2 fallimenti su 72 rilevati il 18/10/2026). I test devono essere deterministici anche con database non vuoto e non devono accumulare dati di prova.
- Stato: attiva. Verificato: 10/10 e2e con teardown automatico (0 organizzazioni residue) e 72/72 pgTAP.

**D-021 â€” Schema menu per-ristorante con integritÃ  referenziale composita** (18/10/2026)
- Decisione: `menu_categories` e `menu_items` appartengono sempre a un ristorante (`organization_id` + `restaurant_id` non nulli), con FK composita `(category_id, restaurant_id)` â†’ `menu_categories(id, restaurant_id)` e `ON DELETE SET NULL (category_id)` (richiede PostgreSQL 15+; locale in uso 17.11). UnicitÃ  `(restaurant_id, name)` per le categorie; prezzi in `bigint` centesimi (0â€“100.000.000) con vincolo; RLS: lettura per `auth_restaurant_ids()`, scrittura solo con `auth_has_permission_for_restaurant(restaurant_id, 'menu.manage')` (permesso giÃ  nel seed Sprint 1).
- Motivazione: garantisce nel database che un prodotto non possa mai referenziare una categoria di un altro ristorante/organizzazione (isolamento multi-tenant applicativo, D-006/D-016) e che l'eliminazione di una categoria non cancelli i prodotti. Menu per singola sede coerente con i permessi per-ristorante.
- Stato: attiva. Migrazione `20261018090000_sprint2_menu.sql` applicata; 30 test pgTAP dedicati superati; e2e CRUD menu verificato.

**D-022 â€” Dark mode automatica basata su `prefers-color-scheme`, senza toggle applicativo** (18/10/2026)
- Decisione: il tema segue la preferenza di sistema tramite i variant `dark:` di Tailwind 4 (media `prefers-color-scheme: dark`), senza pulsante tema e senza stato client: `color-scheme` in `globals.css`, `themeColor` viewport chiaro/scuro, sweep esplicito dei componenti (`dark:` accanto alla classe chiara). Non si usa l'inversione delle variabili colore (conflitto `bg-white`/`text-white`; sezioni dark-by-design come KDS e console piattaforma restano intatte).
- Motivazione: richiesta esplicita ("il sistema deve riconoscere la modalitÃ  del dispositivo e adattare i colori"); un solo tema coerente evita stati duplicati e flash di tema. Lo sweep esplicito mantiene il controllo su contrasto e sezioni volutamente scure.
- Stato: attiva. Verificata in browser reale (dark e light) e da 3 test e2e dedicati (`tests/e2e/dark-mode.spec.ts`).

**D-023 â€” RowMenu: blocco della propagazione dei click dai contenuti portaled** (18/10/2026)
- Decisione: il contenuto del `DropdownMenu` dentro `RowMenu` ferma il click (`onClick` â†’ `stopPropagation`); i menuitem chiudono il menu senza `preventDefault`.
- Motivazione: i portal Radix propagano gli eventi attraverso l'albero React (non il DOM): il click su un menuitem risaliva all'`onClick` della riga cliccabile della tabella, aprendo anche il dialog di modifica (bug riprodotto dall'e2e menu). Il `preventDefault` in `onSelect` teneva inoltre il menu aperto dopo l'azione.
- Stato: attiva. Verificato dagli e2e menu e dall'intera suite demo.

**D-024 â€” Schema sala per-ristorante: aree e tavoli, scrittura con `reservations.manage`** (18/10/2026)
- Decisione: `floor_areas` (aree del locale) e `restaurant_tables` (tavoli) seguono lo stesso schema del menu (D-021): tenant esplicito, FK composita al ristorante, `(floor_areas.id, restaurant_id)` come chiave referenziabile, `ON DELETE SET NULL (area_id)` per conservare i tavoli alla cancellazione dell'area, unicitÃ  di nome per ristorante, `seats` con vincolo 1â€“50. La scrittura Ã¨ autorizzata con il permesso esistente `reservations.manage` ("Gestire prenotazioni e sala"), che coprono owner/admin/manager/host; la lettura resta per tutti i membri del ristorante. `getActiveRestaurant` Ã¨ stato estratto in `src/server/restaurant/active.ts` per riuso tra moduli.
- Motivazione: la configurazione della sala Ã¨ una responsabilitÃ  di gestione (manager/host), non operativa di cassa; riusare un permesso esistente evita di ampliare la matrice ruoli senza necessitÃ . Lo stato del tavolo (libero/occupato) non Ã¨ una colonna: sarÃ  derivato dalle comande nel modulo ordini, per evitare stato duplicato e disallineabile.
- Stato: attiva. Migrazione `20261018100000_sprint2_tables.sql` applicata; 34 test pgTAP dedicati e e2e CRUD sala verificati.

**D-025 â€” POS e ordini: scritture solo via RPC atomiche, pagamenti idempotenti, un conto aperto per tavolo** (18/10/2026)
- Decisione:
  - tabelle `orders`, `order_items` e `payments` con tenant esplicito e FK composite per ristorante; `orders.status` âˆˆ `open|paid|cancelled` con vincolo `(status = 'open') = (closed_at is null)`; `order_items` copia nome e prezzo dal menu al momento dell'ordinazione (stato riga `pending|preparing|ready|served|cancelled`); `payments.method` âˆˆ `cash|card|other`, importi in centesimi, `idempotency_key` unica per ristorante;
  - indici unici parziali: un solo ordine aperto per tavolo; nessun ordine senza tavolo duplicato;
  - nessuna policy di INSERT/UPDATE/DELETE per `order_items` e `payments`: tutte le mutazioni passano da RPC `security definer` (`open_order`, `add_order_items`, `cancel_order_item`, `pay_order`, `void_order`) che verificano permesso `pos.operate`, stato dell'ordine e prezzi presi dal menu; la lettura RLS resta per tutti i membri del ristorante;
  - `pay_order` Ã¨ idempotente: il replay con la stessa chiave non incassa una seconda volta; il pagamento parziale lascia il conto aperto fino al saldo;
  - la migrazione aggiunge le unique `(id, restaurant_id)` mancanti a `restaurant_tables` e `menu_items`, necessarie alle FK composite delle righe d'ordine;
  - `payments â†’ orders` Ã¨ `ON DELETE RESTRICT` (registrazioni contabili mai cancellate in silenzio); di conseguenza il teardown e2e elimina `payments` e `orders` prima delle organizzazioni.
- Motivazione: autorizzazione, prezzi e importi verificati lato server in transazione (regola 6); i terminali POS possono riprovare per rete instabile, quindi i pagamenti devono essere idempotenti (regola 9); RESTRICT sui pagamenti protegge la tracciabilitÃ  contabile; lo stato del tavolo resta derivato dalle comande (D-024) e il frontend non Ã¨ mai fonte di veritÃ .
- Stato: attiva. Migrazione `20261018120000_sprint2_pos.sql` applicata; 58 test pgTAP dedicati superati; e2e completo (apertura conto, aggiunta prodotti, pagamento con chiusura, teardown pulito).

**D-026 â€” Esiti delle action gestiti dove la revalidation non smonta il componente** (18/10/2026)
- Decisione: lo stato `useActionState` dei dialog il cui esito fa sparire l'entitÃ  dal server (es. conto chiuso â†’ ordine non piÃ¹ aperto) vive nel componente padre, che sopravvive alla revalidation; il dialog riceve `state`, `formAction` e `pending` come prop. La visibilitÃ  del dialog Ã¨ derivata (`payOpenFor === selectedOrder.id`), non gestita con `setState` negli effect (regola React 19 `set-state-in-effect`); gli errori di campo del form restano visibili solo dopo un submit locale (`submitted`).
- Motivazione: con `useActionState` dentro il dialog, al successo la revalidation di Next rimuove l'ordine dalle prop del padre â†’ il dialog si smonta â†’ l'effect che mostrava il toast non gira mai (bug riprodotto dall'e2e POS: pagamento riuscito ma nessun messaggio). Il padre mostra il toast nel proprio effect e il dialog si chiude da solo quando l'ordine non Ã¨ piÃ¹ tra quelli aperti; il pattern Ã¨ riusabile per tutti i moduli futuri con comportamento analogo.
- Stato: attiva. Verificato dall'e2e "cassa POS reale" (toast "Conto incassato e chiuso." visibile dopo la chiusura).

**D-027 â€” Vendite derivate dai pagamenti, nessuna tabella aggregata** (18/10/2026)
- Decisione: il modulo vendite non introduce migrazioni: la giornata Ã¨ derivata in sola lettura da `payments` (fonte di veritÃ  degli incassi), risalendo a ordini e tavoli; l'aggregazione Ã¨ in TypeScript (`src/lib/sales.ts`), con finestra giornaliera nel fuso locale del server (`searchParams.date` in formato `YYYY-MM-DD`, default oggi). L'incasso tiene le mance separate; il ticket medio Ã¨ incasso / conti incassati. L'accesso Ã¨ limitato dal permesso `reports.read` con gate server-side (esclusi i ruoli operativi cameriere/cucina/host). Export CSV con separatore `;` e BOM, con neutralizzazione delle formule (D-018).
- Motivazione: i pagamenti sono giÃ  registrati dal POS con importi e metodi verificati lato server; un aggregato persistente duplicherebbe stato e potrebbe disallinearsi. La vista per giornata Ã¨ coerente con l'uso operativo; il fuso utente per-tenant verrÃ  valutato solo quando emergerÃ  un requisito reale multi-fuso.
- Stato: attiva. Pagina `/dashboard/vendite` con stat, filtro metodo, dettaglio conto e export; e2e "vendite reali" verificato.

**D-028 â€” KDS con state machine nel database e schermo dark-by-design** (18/10/2026)
- Decisione:
  - RPC `set_order_item_status` (`security definer`, migrazione `20261018140000_sprint2_kds.sql`): transizioni solo in avanti di un passo (`pending â†’ preparing â†’ ready â†’ served`); richiesta dello stesso stato = no-op idempotente (`changed: false`); righe `cancelled`/`served` e conti non aperti bloccati; risposta jsonb con `previous_status`, `status`, `changed`; nessuna policy di update diretta sulle righe (come per il POS, D-025);
  - permesso richiesto: `kitchen.operate` **o** `pos.operate` (cucina e cassa possono entrambe avanzare gli stati; la lettura resta per tutti i membri);
  - pagina reale `/dashboard/cucina` intenzionalmente scura in entrambi i temi (coerente con il KDS demo e la console piattaforma, D-022): tre colonne "In attesa / In preparazione / Pronti al pass", tempi trascorsi calcolati client-side con `useSyncExternalStore` a 30â€³ (snapshot server `0` â†’ nessun hydration mismatch, D-014), evidenza rossa oltre 25 minuti, esito dell'action nel componente padre (D-026); il board legge solo ordini aperti con righe nei tre stati attivi.
- Motivazione: le regole di transizione devono vivere nel database (regola 6) e sono coperte da test pgTAP (transizioni illegali, no-op, cross-tenant, conti chiusi); separare i permessi consente alla cucina di operare senza diritti di cassa; lo schermo scuro Ã¨ la scelta operativa per un monitor in cucina.
- Stato: attiva. Migrazione applicata; 41 test pgTAP dedicati superati; e2e "cucina KDS reale" verificato (righe dal POS, tre transizioni, toast, board vuota a fine servizio).

**D-029 â€” CI GitHub Actions predisposta: qualitÃ , pgTAP e e2e su stack locale** (18/10/2026)
- Decisione: workflow unico `.github/workflows/ci.yml` con tre job:
  - `quality`: `npm ci`, lint, typecheck, vitest, build con variabili d'ambiente segnaposto sintatticamente valide (verificato: la build riesce senza stack attivo);
  - `database`: Supabase CLI tramite `supabase/setup-cli@v3` (versione presa dal lockfile), `supabase start`, `supabase test db`;
  - `e2e`: stack locale + `.env.local` generato da `supabase status -o env` (estrazione con `grep`/`sed`; i valori non vengono mai stampati nei log) + `npx playwright install --with-deps chromium` + `npm run e2e`. In CI Playwright usa chromium scaricato (`channel: chrome` resta solo per lo sviluppo locale, per non scaricare browser); trace/screenshot caricati come artifact in caso di errore.
  - Trigger: push su `main`, pull request e avvio manuale; `concurrency` per annullare i run superati.
- Motivazione: eseguire in CI gli stessi controlli locali; pgTAP ed e2e richiedono lo stack Supabase, riproducibile sui runner Linux con Docker. Lo snippet bash di estrazione delle variabili Ã¨ stato provato localmente con lo stesso CLI e `process.loadEnvFile`.
- Stato: predisposta e validata offline (YAML e snippet provati). **Prima esecuzione reale da verificare al primo push su GitHub**: il repository al 18/10/2026 non ha commit nÃ© remote, quindi la CI non Ã¨ considerata "verificata" finchÃ© non gira su un runner reale.

**D-030 â€” Registro dispositivi e pairing monouso con limite palmari nel database** (18/10/2026)
- Decisione:
  - migrazione `20261018160000_sprint3_devices.sql` con `devices` (tipi `palmare|pos|kds|printer|other`; stati `pending|authorized|active|offline|revoked|blocked`; token dispositivo salvato **solo come hash SHA-256** e restituito una sola volta al claim) e `device_pairings` (codici di attivazione da 8 caratteri in alfabeto Crockford-like `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, salvati **solo come hash**, scadenza 15 minuti, una sola pairing aperta per dispositivo);
  - limite di **4 palmari per ristorante** applicato dalla RPC `create_device` (`security definer`) contando i dispositivi `device_type = 'palmare'` con stato **diverso da `revoked`**: un palmare offline o bloccato **occupa ancora lo slot** (D-007: il quinto Ã¨ rifiutato anche se uno dei quattro Ã¨ offline); la revoca libera lo slot e la sostituzione avviene creando un nuovo dispositivo. Lock sulla riga del ristorante per serializzare le creazioni concorrenti; i dispositivi non-palmare (POS, KDS, stampanti) non consumano il limite;
  - `claim_device_pairing` Ã¨ l'unica RPC eseguibile da **anon**: `security definer`, codice normalizzato (maiuscole, senza spazi/trattini), errori generici identici per codice inesistente/scaduto/giÃ  usato (28000, nessun oracolo), rifiuto dei dispositivi bloccati/revocati; al successo il dispositivo passa ad `active` con token nuovo. 8 caratteri su alfabeto da 32 (2^40) + scadenza 15 minuti + single-use mitigano il brute-force sulla pagina pubblica `/palmare`;
  - permesso `devices.manage` (giÃ  in foundation: owner/admin/manager; cameriere e cucina esclusi) per creare, riemettere codici, bloccare/sbloccare/revocare; la **lettura** dei dispositivi resta per tutti i membri del ristorante (RLS), mentre `device_pairings` non ha alcuna policy: gli hash dei codici non sono leggibili nemmeno dal tenant (anti brute-force offline);
  - `set_device_status`: azioni `block|unblock|revoke`, no-op idempotente (`changed: false`), azzera il token e invalida i codici aperti; lo sblocco riporta il dispositivo ad `authorized` (serve un nuovo codice + claim); `reissue_device_pairing` Ã¨ rifiutata (23514) su dispositivi bloccati/revocati; transizioni invalide rifiutate in RPC, non nel frontend;
  - il token viene consegnato al client via cookie `cm_risto_device` httpOnly (30 giorni) dalla server action; l'audit (`device.created`, `device.pairing_reissued`, `device.status_changed`) Ã¨ scritto dal server layer e **non contiene mai codici o token**.
- Motivazione: regola 6 (autorizzazioni e limiti verificati lato server) e D-007; il pairing a codice breve Ã¨ l'unico flusso praticabile su palmare senza login interattivo, ma richiede hash, scadenza breve e rate limiting implicito. Tenere il conteggio su stati â‰  `revoked` riflette la semantica operativa richiesta (uno slot Ã¨ occupato finchÃ© il dispositivo non Ã¨ esplicitamente revocato) e rende la sostituzione un'operazione esplicita dell'admin.
- Stato: attiva (parte 1). Migrazione applicata; 59 test pgTAP dedicati superati; e2e "dispositivi reali" verificato (quattro palmari, quinto rifiutato, revoca, sostituto, attivazione da `/palmare`). Restano per la parte 2: PIN operatore con tentativi/lockout, sessioni dispositivo, UI operativa palmare, heartbeat `offline` e servizio locale (D-008).

**D-031 â€” PIN operatore con lockout, sessioni palmare con hash e board sala in sola lettura** (18/10/2026)
- Decisione:
  - migrazione `20261018180000_sprint3_operators.sql` (+ fix `20261018181000_fix_operator_token_hash.sql` e `20261018190000_expired_lock_filter.sql`) con `operator_pins` (PIN di 4â€“6 cifre salvato **solo come hash bcrypt** â€” `extensions.crypt`/`gen_salt('bf')`; contatore `failed_attempts` 0â€“10; `locked_until`) e `operator_sessions` (token salvato **solo come hash SHA-256 esadecimale**, scadenza **12 ore**, ultimo utilizzo, revoca; indice unico parziale "una sola sessione aperta per dispositivo" â€” un nuovo accesso sullo stesso palmare chiude la sessione precedente);
  - **RLS attiva senza policy** su entrambe le tabelle: PIN, hash e token non sono leggibili nÃ© scrivibili dall'API nemmeno dal tenant (come per `device_pairings`, D-030); tutto passa dalle RPC `security definer`;
  - `set_operator_pin`/`clear_operator_pin`: il membro puÃ² gestire il proprio PIN, chi ha `devices.manage` quello altrui; validazione 4â€“6 cifre in RPC (23514); ogni cambio o rimozione **revoca le sessioni aperte** del membro;
  - `verify_operator_pin`: 5 tentativi errati â†’ lockout di 5 minuti. Il PIN errato **non solleva eccezione ma restituisce jsonb `{status: 'invalid_pin', failed_attempts, locked}`**: un'eccezione annullerebbe l'incremento del contatore (rollback implicito della transazione). Gli errori â€œduriâ€ (dispositivo bloccato/revocato, operatore senza PIN o senza `orders.manage`) restano eccezioni con codici Postgres mappati in messaggi chiari nella server action. Al successo: token di sessione nuovo (mai riutilizzato), nome operatore/ruolo/dispositivo/ristorante;
  - `operator_session_context`/`operator_logout`/`palamare_board`: heartbeat a ogni caricamento (`device_heartbeat` aggiorna `last_seen_at`), scadenza 12 ore e **inattivitÃ  15 minuti** verificate lato server; `palamare_board` restituisce sale, aree, tavoli con ordini aperti (totali esclusi i cancellati, contatori "in cucina"/"pronti"); il logout Ã¨ idempotente;
  - accesso operatori limitato a chi ha `orders.manage` (owner, admin, manager, cameriere, cassiere, host, cucina); `palamre_operators` mostra solo operatori **con PIN attivo**, cosÃ¬ il palmare non elenca nomi senza credenziale;
  - server layer `src/server/palmare/`: stato discriminato `claim â†’ login â†’ board`, cuore su `getPalmareState` (heartbeat â†’ sessione â†’ operatori); cookie `cm_risto_operator` httpOnly, sameSite lax, 12 ore; UI `/palmare` con selezione operatore, PIN, board in tempo reale e logout; l'attivazione del dispositivo ora transita direttamente all'accesso operatore (refresh RSC del server action);
  - il lockout scaduto non viene piÃ¹ mostrato come attivo: il filtro `locked_until > now()` Ã¨ in SQL (`expired_lock_filter.sql`), non nel render (regola React `react-hooks/purity`). Un'idempotenza analoga protegge `verify_operator_pin` (lockout in corso â†’ blocco anche con PIN corretto).
- Motivazione: il PIN Ã¨ una credenziale di identificazione operativa, non di autorizzazione (i permessi restano i ruoli: regola 6); deve quindi essere hashata, con lockout e sessioni scadibili. La scelta di rispondere a un PIN errato con un valore (`invalid_pin`) invece di un'eccezione Ã¨ obbligata dal rollback transazionale di PostgreSQL: il contatore dei tentativi deve persistere anche quando il tentativo fallisce. L'hashato sistematico di token e PIN evita che un accesso al database riveli credenziali (regola 10 nella sostanza). La board in sola lettura Ã¨ il primo passo operativo del palmare: dÃ  valore reale senza introdurre scritture prima che offline e servizio locale (D-008) siano pronti.
- Stato: attiva (parte 2a). Migrazioni applicate; **81 test pgTAP** dedicati superati (PIN, lockout con contatore persistito, sessioni, scadenze, board, RLS) e e2e esteso (imposta PIN da dashboard â†’ PIN errato â†’ accesso â†’ board con tavolo reale â†’ logout). Restano per la parte 2b: presa in carico tavoli e invio comande dal palmare, evoluzione offline e servizio locale (D-008).

**D-032 â€” Comande dal palmare: RPC dedicate con core condivisi, dialog unico per tavolo e sessione operatore obbligatoria** (18/10/2026)
- Decisione:
  - migrazione `20261018200000_sprint3_palmare_orders.sql`: i corpi di `open_order` e `add_order_items` (POS) sono estratti nei core privati `_order_open_core(uuid, uuid, integer, text, uuid)` e `_order_add_items_core(uuid, jsonb)` (revoke a `public, anon, authenticated`); le RPC POS sono ricreate con **firma e permessi invariati** e delegano ai core â†’ una sola implementazione della logica conto/righe (validazioni, merge righe pending, audit) usata da cassa e palmare;
  - nuove RPC `security definer` per il palmare: `palamare_menu(text)` (menu per gli operatori: categorie attive ordinate + prodotti disponibili, prezzo in centesimi, prodotti senza categoria nel bucket "Senza categoria"), `palamare_open_order(text, uuid, integer)` (apertura conto, restituisce `{order_id, table_id, table_name, guests}`), `palamare_add_order_items(text, uuid, jsonb)` (items `[{menu_item_id, quantity}]`, restituisce `{order_id, count}`); grant `anon, authenticated, service_role`;
  - ogni RPC verifica la sessione con `operator_session_context` (scadenza 12 ore + inattivitÃ  15 minuti, heartbeat, dispositivo attivo) e con `_operator_membership_allowed` (difesa in profonditÃ : membership attiva e ruolo con `orders.manage`, anche se la sessione Ã¨ ancora aperta); `opened_by` = `user_id` del membership, mai il client;
  - audit `palmare.order_opened` / `palamare.items_added` con `device_id` e `membership_id` nei metadata, cosÃ¬ le azioni da palmare restano tracciabili e distinte da quelle POS;
  - errori con messaggi utente in italiano sollevati in RPC (23514/23503, es. "Il tavolo ha giÃ  un conto aperto.", "Conto giÃ  chiuso.") e mappati 1:1 nella server action (`orderErrorMessage`), con fallback generico per gli imprevisti;
  - server layer: `getPalmareState` carica anche `palamare_menu` nello stato `board` (menu vuoto in caso di errore, la sala resta usabile); azioni `palmareOpenOrderAction` (Zod: tavolo uuid + coperti 1-50) e `palamareAddItemsAction` (Zod: conto uuid + da 1 a 50 righe, quantity 1-99), entrambe con `revalidatePath("/palmare")` e messaggi di esito specifici;
  - UI: `PalmareBoardView` Ã¨ un client component con un **unico dialog per tavolo** che cambia contenuto in base allo stato (`table.order`): tavolo libero â†’ "Apri il conto" con coperti (default min(2, posti)); tavolo occupato â†’ riepilogo righe con stato e totale, selettore prodotti con stepper (+/âˆ’, quantitÃ  1-99) e "Invia in cucina (N)"; la selezione Ã¨ svuotata nel submit handler con `startTransition` (pattern D-026); la card tavolo mostra coperti, totale, "N in cucina"/"N pronti".
- Motivazione: il palmare deve poter prendere in carico il tavolo e inviare comande alla cucina senza passare dalla cassa, che era finora l'unica fonte di scrittura degli ordini. L'estrazione dei core evita la duplicazione della logica di ordine (regola 1) e mantiene cassa e palmare identici per validazioni, merge e audit. Un dialog unico evita due flussi paralleli da mantenere e rende immediato il passaggio apri â†’ aggiungi sul tavolo selezionato. La sessione operatore resta l'unico requisito di autenticazione del palmare: niente accesso anonimo alle scritture.
- Stato: attiva. Migrazione applicata (13 migrazioni totali); **58 test pgTAP** dedicati (core privati non eseguibili, menu, apertura conto con audit e vincoli, invio items con merge, isolamento tenant, sospensione membership, paritÃ  POSâ†”palmare) â†’ **433 test pgTAP totali**; e2e esteso (apertura di un nuovo conto dal palmare con coperti, invio comanda su conto esistente con badge stato e totale aggiornati, logout) â†’ **19 e2e** verdi. Restano per la parte 2b: uso offline con servizio locale (D-008) e QA responsive palmare.

**D-033 - Prenotazioni e receptionist AI: schema per-tenant, RPC atomiche e prenotazioni AI sempre da confermare** (20/10/2026)
- Decisione:
  - migrazione `20261020100000_sprint5_receptionist.sql` con `reservations`, `restaurant_opening_hours`, `restaurant_closed_dates`, `receptionist_settings`, `receptionist_calls` e `receptionist_messages`; tenant esplicito e FK composite per ristorante/organizzazione;
  - `reservations` ha stato `pending|confirmed|seated|completed|cancelled|no_show`, sorgente `dashboard|phone_ai|phone_manual|web`, `idempotency_key` univoca per ristorante e `call_id` per le prenotazioni telefoniche;
  - scritture dirette revocate ad `anon`/`authenticated`; tutte le mutazioni passano da RPC `security definer` (`check_reservation_availability`, `create_reservation`, `set_reservation_status`, `update_reservation_notes`) che verificano permesso, stato e disponibilitÃ ;
  - disponibilitÃ  calcolata su data/preavviso/giorni massimi, chiusure, fasce orarie, capienza dei tavoli attivi e sovrapposizioni, con lock advisory per ristorante/data e risposta `reservation_unavailable:<reason>`;
  - `create_reservation` accetta `p_confirm` solo da dashboard o service role; le richieste AI (`phone_ai`) richiedono un `call_id` valido, non possono confermare e nascono `pending`;
  - registro chiamate e messaggi separato; `begin_receptionist_call` applica limite giornaliero e idempotenza sul `provider_call_id`; `end_receptionist_call` applica transizioni e durata; `add_receptionist_message` conserva il messaggio con metadati strutturati;
  - `monthly_budget_cents` Ã¨ configurato ma non applicato finchÃ© non esiste un provider che espone i costi reali (dichiarato in UI, non simulato).
- Motivazione: le regole di disponibilitÃ  e conferma devono vivere nel database (regola 6), le prenotazioni telefoniche non devono poter occupare posti senza revisione umana e i retry dei provider devono essere idempotenti (regola 9). La separazione chiamate/messaggi consente il registro operativo senza accoppiare il CRM.
- Stato: attiva. Migrazione applicata; 72 test pgTAP dedicati e 505 totali superati; e2e prenotazione/annullamento/configurazione receptionist verificato. Telefonia reale non collegata.

**D-034 - API interne vocali: bootstrap token, token di chiamata HMAC e service role solo lato server** (20/10/2026)
- Decisione:
  - `POST /api/internal/voice/calls` autentica il provider con `RECEPTIONIST_INTERNAL_TOKEN` (bearer statico, confronto a tempo costante) e risolve il tenant dal numero chiamato con `resolve_receptionist_tenant`; restituisce configurazione receptionist e un token di chiamata firmato HMAC-SHA256 con `RECEPTIONIST_INTERNAL_SECRET`;
  - i tool successivi (`check-availability`, `create-reservation`, `take-message`, `transfer`, `calls/[id]/end`) accettano solo il token di chiamata, ne verificano firma e scadenza e ricontrollano che la chiamata sia ancora `in_progress`;
  - il tenant viene sempre preso dai claim del token, mai dal body; il service role Supabase Ã¨ usato solo nelle route server e non viene mai restituito al client;
  - `create-reservation` AI forza `p_source = 'phone_ai'`, `p_confirm = false` e `p_call_id` dal token; gli errori di disponibilitÃ  tornano `409` con `reason` stabile;
  - `take-message` salva un messaggio di richiamata con metadati; `transfer` restituisce solo il numero configurato e delega il trasferimento al provider; `end` chiude la chiamata solo se l'id coincide con il token;
  - token e segreto devono essere almeno 32 caratteri, vivere solo in variabili d'ambiente server e non essere mai loggati; `.env.example` documenta i nomi, `.env.local` contiene solo valori locali di prova.
- Motivazione: l'agente vocale non deve avere accesso diretto al database nÃ© poter cambiare tenant; token di chiamata brevi limitano il rischio di riuso e il bootstrap statico Ã¨ il minimo per un provider che deve avviare la chiamata. La separazione bootstrap/chiamata rende revocabile il provider senza ruotare le credenziali di ogni chiamata.
- Stato: attiva. Route compilate e smoke testate in locale (401 senza token, 404 tenant non configurato, 401 con token bootstrap sui tool); test unitari su token e scadenza. Provider vocale reale non collegato.

**D-035 - Porte locali Supabase su 55000-55006 per esclusione Windows** (20/10/2026)
- Decisione: `supabase/config.toml` usa API `55001`, DB `55002`, Studio `55003`, Mailpit `55004`, Analytics `55005`, pooler `55006`, shadow DB `55000`; `.env.example` punta a `http://127.0.0.1:55001` e `tests/e2e/support/auth.ts` a Mailpit `55004`.
- Motivazione: Windows escludeva l'intervallo delle porte `543xx` e il bind Docker falliva con `An attempt was made to access a socket in a way forbidden by its access permissions`. Le nuove porte sono fuori dall'intervallo escluso e lo stack si avvia correttamente. La modifica Ã¨ solo locale/sviluppo: in produzione si usano URL e chiavi del progetto cloud.
- Stato: attiva. Stack riavviato, migrazioni applicate, e2e completo verde con Mailpit sulla nuova porta. Eventuali script o documenti esterni che citano `54321`/`54324` vanno aggiornati.

**D-036 - Restyling premium senza dipendenze UI pesanti e KDS demo full-screen per ruoli autorizzati** (21/10/2026)
- Decisione:
  - il restyling usa Tailwind, token CSS e componenti esistenti; nessuna nuova dipendenza (Motion, Aceternity, Magic UI valutati ma non installati). Animazioni CSS brevi e `prefers-reduced-motion`.
  - `/app/cucina` Ã¨ un KDS full-screen per `cucina`, `admin` e `super_admin`; il controllo `denied` in `AppShell` avviene prima del ramo KDS, quindi gli altri ruoli restano bloccati. Rimossi redirect forzati: il KDS espone link a dashboard demo e sito.
  - `dashboard` Ã¨ accessibile a cassiere, cameriere e cucina; le aree operative restano invariate.
  - landing e anteprima prodotto sono riscritte su copy e dati demo coerenti; il KDS demo e quello reale restano separati.
- Motivazione: migliorare la percezione premium senza introdurre dipendenze o animazioni invasive, e correggere il loop di navigazione demo/KDS mantenendo i permessi verificati lato client demo e l'area reale invariata.
- Stato: attiva. Verificato con e2e demo/KDS (ruoli, refresh, uscita, prenotazioni), dark mode e QA screenshot desktop/mobile/tablet.

**D-037 - `instantInsights` in modalitÃ  manuale per il falso positivo di `StoreGate`** (21/10/2026)
- Decisione: `next.config.ts` imposta `experimental.instantInsights.validationLevel = "manual-warning"`; `devIndicators` resta disattivato.
- Motivazione: `StoreGate` rinvia i children della demo fino all'idratazione dello store persistito; la validazione automatica di Next lo segnala come `instant-unrendered-segment` anche se la pagina Ã¨ corretta. La modalitÃ  manuale evita il badge â€œ1 Insightâ€ in sviluppo e non ha effetto sul runtime di produzione. Il build riporta l'esperimento come previsto.
- Stato: attiva. Dev server senza badge; build, lint, typecheck ed e2e verdi.

**D-038 - QualitÃ  trasversale: notifiche non bloccanti, skip link, skeleton e stati accessibili** (21/10/2026)
- Decisione:
  - Sonner usa `position="bottom-right"` con offset desktop e `mobileOffset` sopra la navigazione: i toast non devono intercettare link o comandi nell'header.
  - Skip link "Vai al contenuto" su sito pubblico, area demo e dashboard reale, con `main-content` focusabile (`tabIndex={-1}`).
  - `DataTable` adotta `rounded-card`/`shadow-card` del design system ed espone `aria-sort` sulle colonne ordinabili; i filtri demo usano stato brand e `aria-pressed`.
  - `/dashboard` ha uno skeleton di caricamento coerente; dialog e sheet hanno animazioni brevi di apertura, incluse nel rispetto globale di `prefers-reduced-motion`.
  - La home espone metadati SEO/Open Graph coerenti con il posizionamento e il titolo non duplica il template del root layout.
- Motivazione: eliminare attriti reali emersi dai test (toast sopra la navigazione), rendere la navigazione da tastiera piÃ¹ rapida e mantenere coerenza visiva tra tutte le sezioni senza nuove dipendenze.
- Stato: attiva. Lint/typecheck, 37 unit, 20 e2e e build 52 route verdi.

**D-039 - Audit Lighthouse, contrasti e indicizzazione delle aree private** (21/10/2026)
- Decisione:
  - Testo secondario standardizzato su `text-zinc-500 dark:text-zinc-400`; nei contesti su fondo scuro i testi molto piccoli usano tonalitÃ  piÃ¹ chiare. Le etichette KDS passano a `zinc-400` e il pulsante "Servito" usa `emerald-700` per superare il contrasto 4.5:1.
  - Link `mailto:`/`tel:` dei fornitori con altezza minima 24 px; `TableHead` emette `scope="col"`; intestazione azioni con testo `sr-only`; notifiche con nome accessibile che include il conteggio.
  - `AuthLayout`, KDS e stato di accesso negato espongono un landmark `<main>` con skip link.
  - Aggiunti `src/app/robots.ts`, `src/app/sitemap.ts`, `metadataBase` e `noindex, nofollow` per `/app/*` e `/dashboard/*`.
- Motivazione: chiudere i rilievi Lighthouse senza introdurre dipendenze, evitare l'indicizzazione di demo e cruscotti e rendere coerente il contrasto in dark mode.
- Stato: attiva. Lighthouse accessibilitÃ  100/100 sulle pagine verificate; lint/typecheck, 37 unit, 20 e2e e build 52 route verdi.

**D-040 - Servizio locale: coda SQLite idempotente, ESC/POS e sync adapter testabile** (21/10/2026)
- Decisione:
  - `local-service/` Ã¨ un processo Node 24/TypeScript separato dall'app Next, con API HTTP autenticata su `127.0.0.1:4100` per default e token obbligatorio di almeno 32 caratteri.
  - La coda usa `node:sqlite` in WAL con tabella `jobs`, `idempotency_key` univoca, claim transazionale `BEGIN IMMEDIATE`, retry con backoff, limite tentativi e recupero dei job `processing` al riavvio.
  - La stampa passa da `PrinterAdapter`: `file` scrive comande ESC/POS nella spool, `network` invia via TCP a una stampante ESC/POS. Il formato Ã¨ ASCII traslitterato, con init, allineamento, grassetto e taglio.
  - La sincronizzazione passa da `SyncTransport`: HTTP con bearer e `Idempotency-Key`, oppure modalitÃ  test esplicita su file. Senza endpoint configurato i job di sync falliscono e restano in coda; nessun invio viene simulato come riuscito.
  - Payload validati con Zod, body massimo 64 KiB, health pubblico senza dati e log JSON senza payload o segreti.
- Motivazione: introdurre la base verificabile del servizio locale richiesto da D-008 senza dipendenze native aggiuntive, senza contattare servizi esterni e senza dichiarare completata la stampa reale o la modalitÃ  offline.
- Stato: attiva. 4 unit test dedicati e smoke test locale (health, enqueue, worker, stats) superati; lint/typecheck puliti, build Next 52 route e build `local-service` verificate, typecheck dedicato in CI. Restano WebSocket/realtime, discovery LAN, integrazione palmare, conflitti e stampante fisica.

**D-041 - Magazzino: quantitÃ  in millesimi, registro movimenti immutabile e RPC atomiche** (21/10/2026)
- Decisione:
  - migrazioni `20261021100000_sprint4_inventory.sql`, `20261021101000_fix_inventory_select_policies.sql` e `20261021102000_inventory_delete_cascades.sql` con `suppliers`, `inventory_items` e `inventory_movements`; FK composite `(restaurant_id, organization_id)` verso `restaurants` e `(id, restaurant_id)` tra le tabelle del modulo.
  - Le quantitÃ  sono interi in millesimi (`quantity_milli`, `min_quantity_milli`, `quantity_delta_milli`) per evitare arrotondamenti binari; i costi restano centesimi interi. La UI converte e formatta con helper condivisi (`parseQuantityToMilli`, `formatQuantityMilli`, `inventoryValueCents`), senza usare `float` per il denaro.
  - `suppliers` e `inventory_items` sono modificabili solo con `inventory.manage`; gli articoli non hanno policy di `insert`/`delete` dirette. `inventory_movements` Ã¨ in sola lettura per `inventory.manage` e platform admin, senza insert/update/delete diretti.
  - `create_inventory_item` (security definer) crea l'articolo e, se la giacenza iniziale Ã¨ positiva, registra un carico `opening`; restituisce l'id esistente se la chiave di idempotenza Ã¨ giÃ  stata usata. `record_inventory_movement` blocca la riga articolo, gestisce `load|unload|waste|adjustment`, rifiuta giacenze negative, valida le motivazioni dello spreco, registra audit e restituisce `duplicate: true` su retry identico.
  - Un trigger impedisce ogni modifica diretta di `quantity_milli` fuori dalla variabile transazionale `app.inventory_movement`; le RPC sono le uniche scritture previste.
  - Lettura riservata a owner/admin/manager/warehouse (`inventory.manage`) e platform admin. `reports.read` non basta per il registro movimenti, che contiene dettagli operativi; il commercialista non vede il magazzino finchÃ© non gli viene assegnato `inventory.manage`.
  - Le FK di pulizia tenant usano `on delete cascade` da movimenti ad articoli e `on delete set null (supplier_id)` da articoli a fornitori, cosÃ¬ la rimozione di un'organizzazione non lascia righe orfane e il teardown e2e resta affidabile.
- Motivazione: rispettare le regole 6 (autorizzazioni lato server), 8 (denaro e quantitÃ  intere) e 9 (idempotenza); mantenere un registro movimenti non modificabile rende ricostruibile la giacenza e distingue carichi, scarichi, sprechi e rettifiche. La UI non Ã¨ fonte di veritÃ : tutte le validazioni critiche sono nelle RPC.
- Stato: attiva. 3 migrazioni applicate; 23 test pgTAP dedicati e 528 totali superati; 6 unit test su quantitÃ /valori; e2e magazzino verificato (fornitore, articolo, carico, scarico, spreco, rettifica, soglia minima e scadenza). Limiti: nessun ordine di acquisto, ricetta/food cost, barcode o lotti multipli; nessun hard delete dalla UI.

**D-042 - Ricette e food cost derivati da menu e magazzino** (21/10/2026)
- Decisione:
  - Migrazione `20261021110000_sprint4_recipes.sql` con `recipes` e `recipe_ingredients`, FK composite `(restaurant_id, organization_id)` verso `restaurants` e `(id, restaurant_id)` tra le tabelle del modulo, una sola ricetta per prodotto (`unique (restaurant_id, menu_item_id)`), quantitÃ  in millesimi e sfrido in basis point.
  - `recipes` e `recipe_ingredients` sono in sola lettura per `menu.manage` e platform admin; non esistono policy di insert/update/delete dirette. Le uniche scritture passano da `save_recipe` e `delete_recipe`, RPC `security definer` atomiche che richiedono sia `menu.manage` sia `inventory.manage`.
  - `save_recipe` valida tenant, prodotto, resa 1-1000 porzioni, 1-50 ingredienti, articoli attivi dello stesso ristorante, quantitÃ  positive, sfrido 0-10000 basis point e duplicati; crea o aggiorna la ricetta e sostituisce gli ingredienti nella stessa transazione. `delete_recipe` rimuove ricetta e righe collegate con audit `recipe.deleted`.
  - Il food cost non viene memorizzato: si calcola dai costi correnti del magazzino come somma di `quantity_milli * costo_unitario_centesimi * (10000 + waste_bp)`, divisa per `1000 * 10000 * resa` e arrotondata al centesimo con arrotondamento half-up. Il margine e il prezzo sono confrontati in centesimi; le percentuali sono in basis point. Tutta l'aritmetica usa BigInt, senza float.
  - La UI `/dashboard/ricette` espone KPI, ricerca/filtri, dialog ingredienti con resa e sfrido, anteprima del costo per porzione e stati "senza ricetta", "costo incompleto" e "food cost alto" (soglia UI 35%). I link sono presenti da `/dashboard` e `/dashboard/menu`.
  - Le ricette non scaricano le giacenze e non creano movimenti: il food cost Ã¨ una vista di costing, non un consumo di magazzino. Non ci sono ordini di acquisto, conversione tra unitÃ , costo medio ponderato o gestione lotti multipli per ingrediente.
- Motivazione: rendere il food cost ricostruibile dai costi correnti, evitare snapshot incoerenti, mantenere denaro e quantitÃ  interi e applicare le autorizzazioni lato server. La regola "un prodotto, una ricetta" evita ambiguitÃ  nel calcolo; la sostituzione atomica impedisce che un errore di validazione cancelli una ricetta esistente.
- Stato: attiva. 17 migrazioni applicate; 34 test pgTAP dedicati e 562 totali superati; 9 nuovi unit test (56 totali); e2e ricette verificato con creazione, ingredienti, sfrido, margine, modifica e rimozione; lint/typecheck puliti e build 54 route.

**D-043 - Acquisti: ordini ai fornitori, ricezione definitiva e aggiornamento di giacenze e costi via RPC** (21/10/2026)
- Decisione:
  - migrazione `20261021120000_sprint4_purchasing.sql` con `purchase_orders` e `purchase_order_items`, FK composite `(restaurant_id, organization_id)` verso `restaurants` e `(id, restaurant_id)` tra le tabelle del modulo; numero ordine `PO-YYYYMMDD-NNNN` univoco per ristorante, chiave di idempotenza univoca per ristorante, stato `draft|ordered|received|cancelled`, date `ordered_at`/`received_at`/`cancelled_at` e audit.
  - Le righe fotografano `item_name` e `unit` al momento dell'ordine, con quantita in millesimi (`quantity_milli`), quantita ricevuta (`received_quantity_milli`, mai superiore all'ordinata) e costo unitario in centesimi interi (`unit_cost_cents`). L'articolo di magazzino resta collegato con `on delete set null (inventory_item_id)`, cosi lo storico non dipende dall'esistenza dell'articolo.
  - RLS di sola lettura su entrambe le tabelle per `inventory.manage`, `reports.read` o platform admin; nessuna policy di insert/update/delete diretta. Tutte le mutazioni passano dalle RPC `security definer` `save_purchase_order`, `mark_purchase_order_ordered`, `cancel_purchase_order` e `receive_purchase_order`, che richiedono `inventory.manage`.
  - `save_purchase_order` crea una bozza con idempotenza (stessa chiave nello stesso ristorante restituisce l'id esistente) o aggiorna una bozza esistente sostituendo atomicamente le righe; valida fornitore e articoli attivi dello stesso ristorante, da 1 a 50 righe senza duplicati, quantita positive e costi 0-100.000.000 centesimi. Un ordine non bozza non e piu modificabile.
  - `mark_purchase_order_ordered` e idempotente sullo stato `ordered`; `cancel_purchase_order` consente solo `draft|ordered`, registra `cancelled_at` e non tocca le giacenze.
  - `receive_purchase_order` registra una sola ricezione definitiva per ordine: accetta quantita inferiori a quelle ordinate (differenza tracciata), rifiuta quantita superiori, aggiorna `inventory_items.quantity_milli` e allinea `cost_per_unit_cents` al costo della riga ricevuta. Ogni riga scrive un `inventory_movements` con `reason = 'purchase_order'`, nota `Ricezione ordine <numero>` e idempotency key `purchase-order:<order_id>:<item_id>`; un secondo invio restituisce `{duplicate: true}` senza riapplicare lo stock.
  - Audit `purchasing.order_created`, `purchasing.order_updated`, `purchasing.order_ordered`, `purchasing.order_cancelled` e `purchasing.order_received`; server layer `src/server/purchasing/{types,queries,actions}.ts`, helper `src/lib/purchasing.ts`, UI `/dashboard/acquisti` con KPI, filtro stato, creazione/modifica bozza, invio ordine, ricezione con anteprima differenze, annullamento, dettaglio e modalita sola lettura per chi ha solo `reports.read`; card aggiunta a `/dashboard`.
- Motivazione: portare gli ordini ai fornitori dentro il ciclo reale del magazzino senza introdurre scritture dirette o stato duplicato; la ricezione e l'unico punto che modifica le giacenze, cosi restano ricostruibili dal registro movimenti. La ricezione parziale unica e una scelta esplicita: copre le consegne incomplete senza aprire la complessita di ricevimenti multipli o backorder non ancora necessari. Il costo unitario corrente viene allineato al costo effettivo ricevuto, cosi il food cost usa un valore aggiornato. Chi ha solo `reports.read` (es. commercialista) vede gli ordini in sola lettura, senza poterli modificare. Non esiste alcun invio automatico al fornitore: l'ordine e interno e la trasmissione reale (email/EDI) non e collegata.
- Stato: attiva. 18 migrazioni applicate; **61 test pgTAP** dedicati e **623 totali** superati; **6 unit test** su totali/ricevuto/differenze (62 totali); e2e acquisti verificato con creazione, invio, ricezione parziale, aggiornamento di giacenza e costo in magazzino e annullamento bozza; lint/typecheck puliti e build 55 route. Limiti dichiarati: una sola ricezione per ordine, nessun backorder, nessuna fattura o pagamento fornitore, nessun ordine suggerito automatico, nessuna conversione tra unita di misura e nessuna scansione barcode.

**D-044 - Piantina sala: geometria in mezze-celle, arredi e salvataggio atomico via RPC** (21/10/2026)
- Decisione:
  - Migrazione `20261021130000_floor_plan_layout.sql`: `restaurant_tables` riceve `shape` (`rect|round`), `pos_x`, `pos_y`, `width`, `height`; nuova tabella `floor_objects` per arredi (`wall`, `counter`, `door`, `plant`, `label`) con `label`, geometria, FK composite `(restaurant_id, organization_id)` e `(area_id, restaurant_id)`, RLS di lettura per i membri e scrittura solo con `reservations.manage`. La griglia e 48x32 mezze-celle (24x16 celle): coordinate intere, snap a mezza cella, nessun float; i check vincolano forma, dimensioni minime e permanenza nella piantina.
  - Le mutazioni del layout passano da `save_floor_layout`, RPC `security definer` atomica che riceve tavoli e arredi (con id nullo per i nuovi), elenchi espliciti di rimozioni, verifica area/tenant/permesso, valida le dimensioni e registra audit `floor.layout_saved`. Il salvataggio e idempotente per effetto: lo stesso payload produce lo stesso stato. Restano attive le policy RLS esistenti per la gestione puntuale dei tavoli.
  - La piantina e una vista grafica per area con tab, tavoli cliccabili, stato disponibile/sospeso e arredi decorativi; l'editor e un dialog "a comparsa" con trascinamento pointer (mouse e touch), resize dall'angolo, pannello proprieta con campi numerici accessibili, aggiunta/rimozione tavoli e oggetti, ripristino e conferma di scarto. L'elenco tabellare e i dialog di gestione tavolo/area restano per capienza, nome, area, sospensione ed eliminazione: nessuna funzionalita esistente e stata rimossa.
  - Difesa lato server: `saveFloorLayoutAction` valida il payload JSON con Zod (limiti, forme, bounds, massimo 200 elementi), autorizza con `reservations.manage` e mappa gli errori del database in messaggi italiani. I nuovi tavoli creati dal dialog classico ricevono una posizione libera calcolata dal server, cosi non si sovrappongono.
  - Parita demo: `/app/sala` usa la stessa griglia e lo stesso editor tramite `src/components/app/demo-floor-plan.tsx`; tavoli colorati per stato operativo e arredi sono salvati nello store demo persistito (seed v2) con la nuova azione `saveFloorLayout`, che valida nomi, limiti, forme e arredi e impedisce di eliminare un tavolo con conto aperto. Nessuna chiamata server: la demo resta locale al browser e non tocca Supabase.
  - Direzione estetica: canvas 3:2 con griglia leggera, tavoli rettangolari/rotondi con gradienti e stato sospeso tratteggiato, arredi distinti (muro, banco, ingresso, pianta, testo), tab area in brand e modalita chiara/scura coerenti con il design system. Nessuna nuova dipendenza.
- Motivazione: rendere la sala realmente manipolabile senza perdere l'accessibilita dell'elenco e senza fidarsi del client; la griglia a mezze-celle offre un buon compromesso tra precisione visiva e interi nel database, mentre il salvataggio atomico evita layout parziali. Gli arredi permettono di rappresentare muri, banco e ingressi senza introdurre un editor CAD generico.
- Stato: attiva. 19 migrazioni applicate; **33 test pgTAP** dedicati e **656 totali** superati; **2 e2e** dedicati (sala reale e demo: trascinamento, arredo, salvataggio e persistenza) e **25 e2e totali**; 62 unit; lint/typecheck puliti; build 55 route. Limiti dichiarati: nessuna rotazione libera degli elementi, nessun upload di planimetrie, nessun oggetto personalizzato oltre ai cinque tipi previsti e nessuna gestione di piÃ¹ piani dello stesso locale.

**D-045 - Sistema di sviluppo multi-agente OpenCode e salvataggio su GitHub** (21/10/2026)
- Decisione:
  - Configurazione permanente in `.opencode/`: agenti `backend`, `frontend`, `qa`, `security-reviewer` (Markdown con frontmatter V2, `mode: subagent`) e comando `/task` che orchestra analisi, piano di task, delega, QA, revisione di sicurezza, correzioni, rapporto finale e salvataggio.
  - Permessi per agente: `qa` e `security-reviewer` in sola lettura (`edit` negato; shell limitata ai comandi di verifica e a git di sola lettura); per tutti la lettura dei file `.env*` e negata salvo `.env.example`, nessun subagent annidato e `edit` negato sul repository storico sola lettura `Downloads\Sa-as-Ristoranti-main`.
  - `AGENTS.md` esteso con architettura (richiamo), comandi di verifica reali, standard TypeScript, sicurezza e regole di coordinamento (perimetri di file esclusivi per task, parallelismo solo su aree disgiunte, nessun commit da parte dei subagenti).
  - Regola 12 riscritta: autorizzazione permanente dell'utente (21/10/2026) a commit e push al termine di ogni modifica completata sul repository GitHub `ElCaloz/cmristoopencode`; restano ad approvazione esplicita push verso altri repository, cancellazioni, deploy, reset del database e ogni operazione distruttiva o verso l'esterno.
  - Verifica reale: riconoscimento di agenti e comando confermato via `opencode api get /api/agent` e `/api/command` con `location[directory]` sul progetto (OpenCode v2.1.2); delega disponibile via strumento `subagent` della sessione.
- Motivazione: rendere ripetibile e verificabile lo sviluppo con responsabilita separate (backend, frontend, QA, sicurezza), evitare conflitti su file condivisi e dare tracciabilita al lavoro tramite GitHub, senza simulare deleghe o esecuzioni non realmente disponibili.
- Stato: attiva. Configurazione riconosciuta da OpenCode; nessuna dipendenza aggiunta; nessun codice applicativo, database o migrazione toccato.

**D-046 - Integrazioni MCP: 23 server installati, autenticati e verificati** (21-22/10/2026)
- Decisione:
  - Configurazione MCP di progetto in `opencode.json` (schema V2 `mcp.servers`) con le 23 integrazioni richieste: server remoti ufficiali di Bird (`mcp.bird.com`, progetto `messagebird/bird-ai`, non il pacchetto npm omonimo), Canva (`mcp.canva.com`), Context7, Firecrawl, Google Docs/Sheets/Slides (tre server ufficiali distinti `*mcp.googleapis.com`, verificati separatamente), Linear, Notion, Resend, Sentry, Stripe, Supabase, Vercel, GitHub, Grafana Cloud, Zapier, Exa e Cloudflare; server locali per Figma (Dev Mode MCP su `127.0.0.1:3845`), Twilio (`@twilio-alpha/mcp`), Git (`mcp-server-git` ufficiale, non il git di sistema) e Chrome DevTools (`chrome-devtools-mcp`).
  - Scelte tecniche: GitHub configurato con PAT (`Authorization: Bearer {env:GITHUB_PAT}`) perché il server OAuth GitHub non supporta la registrazione dinamica del client (errore reale verificato: `Incompatible auth server: does not support dynamic client registration`); Twilio con pin `zod@3.25.76` perché il pacchetto `@twilio-alpha/mcp` non risolve `zod/v3` (errore `Cannot find module 'zod/v3'`); Google con OAuth client pre-registrato (`{env:GOOGLE_OAUTH_CLIENT_ID}` / `{env:GOOGLE_OAUTH_CLIENT_SECRET}`, redirect `http://127.0.0.1:19876/callback`) come richiesto dalla documentazione Google; nessun segreto in configurazione (solo riferimenti `{env:...}`).
  - Verifiche reali: `opencode mcp list`, API `/api/mcp`, probe MCP diretti non distruttivi (initialize + tools/list) e chiamate di sola lettura in sessione (Supabase `list_projects`, Vercel `list_projects`, Sentry `find_organizations`, Linear `list_teams`, Stripe `list_available_accounts_or_orgs`, Cloudflare `get_accounts`, Canva `search-designs`, Zapier `discover_zapier_actions`, Notion search, Exa search, Firecrawl scrape, Git `git_status`, Chrome DevTools `list_pages`). Nessun pagamento, invio email/SMS, pubblicazione, deploy o modifica DNS eseguito.
- Motivazione: dotare il progetto delle integrazioni richieste usando fonti ufficiali, autenticazione reale e collaudo documentato, senza dichiarare verificato ciò che non lo è e senza introdurre segreti nel repository.
- Stato: attiva. 23/23 configurate: **16 INSTALLATO E TESTATO**, **7 INSTALLATO, AUTENTICAZIONE PENDENTE** (Google Docs/Sheets/Slides, Resend, Twilio, Grafana, Figma), **0 CONFIGURATO, TEST BLOCCATO**. Dipendenze aggiunte solo `uv` e `mcp-server-git` via `pip install --user`; configurazione globale preesistente (`revit-2027`) non modificata. Dettaglio e istruzioni di completamento in `docs/MCP_INSTALLATION_REPORT.md`.

**D-047 - MCP: attivazione GitHub e passaggio di Figma al server hosted** (22/10/2026)
- Decisione:
  - GitHub: il server MCP richiede un token Bearer; poiché il flusso OAuth di GitHub non supporta la registrazione dinamica del client, è stato riutilizzato il token già presente nel credential store di `git` (lo stesso usato per i push del repository), iniettato nell'ambiente del servizio con `opencode service set env GITHUB_PAT ...`. Nessun token creato ex novo, nessun segreto in `opencode.json` o nel repository.
  - Figma: sostituito il server locale Dev Mode (`http://127.0.0.1:3845/mcp`, che richiedeva l'app desktop) con il server MCP ospitato ufficiale `https://mcp.figma.com/mcp` (OAuth), eliminando la dipendenza dall'app installata.
  - Verifiche: GitHub `get_me` → login `ElCaloz` (6 repo pubbliche); Figma risponde `401` con metadati OAuth validi e stato `needs_auth` in attesa del login.
- Motivazione: ridurre le dipendenze locali e attivare le integrazioni senza introdurre segreti nel repository.
- Stato: attiva. Conteggio aggiornato: 16 INSTALLATO E TESTATO, 7 INSTALLATO/AUTENTICAZIONE PENDENTE, 0 TEST BLOCCATO.
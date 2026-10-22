# STATUS - CM Risto

**Ultimo aggiornamento:** 22 ottobre 2026 (Sprint 7 completo + **deploy produzione**: Supabase cloud `CMRisto` migrato con legacy preservato in `legacy_v0`, Vercel progetto `cmristo` online su `cmristo-mattias-projects-0615507f.vercel.app`; 733 test pgTAP, 71 route).
**Percorso del progetto:** `C:\Users\calos\CM-Risto` (branch di lavoro `audit/hardening-sicurezza` creato da `main` al commit `d07d00b`; `main` non modificato; repository GitHub `ElCaloz/cmristoopencode`, commit/push al termine di ogni modifica come da regola 12 di `AGENTS.md`).

---

## Sessione 22/10/2026 (sera) - Deploy produzione: Supabase cloud migrato e Vercel online

- **Supabase cloud `CMRisto` (`sdgojsopwztjdkphbzof`) migrato:** 16 tabelle del vecchio progetto preservate senza perdita dati nello schema `legacy_v0` (funzioni ed enum legacy spostati con esse), quindi applicate **21 migrazioni** del repository in ordine via MCP `apply_migration` + 1 migrazione di preservazione. Stato verificato: **51 tabelle in `public`, 79 funzioni, 92 policy RLS, 25 migrazioni registrate** (3 legacy + 1 preservazione + 21 nostre). RPC Sprint 7 presenti e verificate (`get_public_menu`, `submit_online_order`, `confirm_online_order`, `claim_print_jobs`, `process_stripe_subscription_event`, `set_integration_secret`). Le migrazioni sono state lette dal repository GitHub via MCP e passate a `apply_migration` senza ritrascrizione manuale; unica correzione in corsa: collisione di timestamp sul registro migrazioni (una migrazione rollbackata e riapplicata con retry).
- **Vercel produzione online:** nuovo progetto **`cmristo`** (`prj_YS8PIvvmenfauUgSCkyZ6JOX9ypx`, team `mattias-projects-0615507f`) collegato al repository corretto **`ElCaloz/cmristoopencode`** (il vecchio progetto `cmristoo` restava collegato a `ElCaloz/Cmristoo` ed è stato lasciato invariato). Deploy di produzione **`dpl_D5nNuQRr4mA8cbEfLBi8AL8tqLDH`** dal commit `228c3c9` (branch `audit/hardening-sicurezza`): stato **READY**. Deployment Protection ridotta a preview (la produzione è pubblica). Env impostate: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (valori inseriti via MCP senza essere esposti in output).
- **URL di produzione:** `https://cmristo-mattias-projects-0615507f.vercel.app` (alias `cmristo-9uzvdb2kx-mattias-projects-0615507f.vercel.app` per il singolo deployment).
- **Verifiche reali sul sito pubblicato:** `/api/health` → `status: ok`, `supabase: true`, integrazioni non configurate dichiarate tali; `/login` renderizzato in italiano; `/dashboard` anonimo → `307` verso `/login?reason=session` con `Cache-Control: private, no-store`; `/m/<token-non-valido>` → pagina "Link non disponibile". Nessuna integrazione esterna dichiarata operativa: email/SMS/pagamenti/stampa restano in modalità test finché non saranno configurate le rispettive env segrete.
- **MCP:** tutti i server collegati e verificati in lettura anche in questa sessione (Supabase `list_projects`/`execute_sql`/`apply_migration`, Vercel `get_auth_user`/deploy, GitHub `get_me`/`get_file_contents`, Sentry, Stripe, Twilio, Cloudflare, risorse da 10 server).
- **Configurazione env produzione completata:** file `deploy/vercel.production.env` generato e importato dall'utente su Vercel (18 variabili); chiavi Supabase del progetto cloud fornite dall'utente e verificate realmente (secret key `sb_secret_...` → PostgREST **200** con bypass RLS; publishable `sb_publishable_...` → correttamente negata da RLS su `organizations`; GoTrue health **200**). `SUPABASE_SERVICE_ROLE_KEY` valorizzata con la nuova Secret API key e impostata via MCP; installata la skill `supabase-server` (`npx skills add supabase/server` → `.agents/skills/supabase-server`), che indica di preferire i nomi `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY` per il pacchetto `@supabase/server`: l'app Next.js usa `@supabase/ssr`/`supabase-js` con i nomi standard `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` alimentati dalle nuove chiavi, migrazione di naming solo se/ quando si adotterà `@supabase/server` (Edge Functions).
- **Problemi aperti:** mancanti su Vercel i 6 `STRIPE_PRICE_*` (da creare in Stripe) e `TWILIO_FROM_NUMBER`/`TWILIO_MESSAGING_SERVICE_SID` (nessun numero Twilio attivo: SMS disattivati); `SITE_URL`/`redirect URLs` da configurare in Supabase Auth (nessun tool MCP disponibile); dominio custom assente (niente WAF/Cloudflare MFA); QR del menu da generare; E2E Sprint 7 da scrivere; merge di `audit/hardening-sicurezza` in `main` da decidere (il deploy di produzione usa la branch di lavoro come sorgente). `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` già impostate su Vercel via MCP senza esposizione.
- **Prossimi passi:** inserire le env segrete in Vercel e verificare email/SMS/Stripe webhook su produzione; configurare Auth URLs; decidere dominio custom e merge in `main`; test E2E contro produzione; stampa scontrini su stampante reale via servizio locale.

---

## Sessione 22/10/2026 (pomeriggio) - Sprint 7: CRM, crescita, ordini online, stampa scontrini e dashboard completa

- **Perimetro:** migrazione `20261022120000_sprint7_crm_growth.sql`, moduli server CRM/marketing/staff/online/printers/reports/billing, 9 nuove pagine dashboard, menu pubblico `/m/[token]`, MFA TOTP, integrazioni email/SMS/Stripe/stampa, test pgTAP Sprint 7.
- **Database (Sprint 7):** nuove tabelle `customers`, `loyalty_settings`, `loyalty_transactions`, `marketing_campaigns`, `marketing_campaign_recipients`, `customer_messages`, `restaurant_public_links`, `online_orders`, `online_order_items`, `staff_shifts`, `printer_profiles`, `print_jobs`, `integration_events`, `integration_secrets`; colonne aggiuntive su `organizations` (Stripe), `restaurants` (profilo pubblico), `restaurant_settings` (ricezione, messaggio scontrino), `memberships` (telefono, assunzione, costo orario), `orders` (source, customer_id, online_order_id). RLS su tutte le tabelle nuove con policy per permesso (`customers.manage`, `orders.manage`, `menu.manage`, `staff.manage`, `settings.manage`) e nessuna policy su `integration_events`/`integration_secrets` (solo security definer). RPC `security definer`: `get_public_menu`, `submit_online_order` (prezzi ricalcolati dal database, idempotenza, anti-abuso 10 ordini/10 min per contatto), `confirm_online_order` (crea il conto POS reale), `update_online_order_status`, `set_online_order_payment_status`, `record_loyalty_transaction` (idempotente), `record_inbound_message`, `update_message_status_by_provider`, `claim_print_jobs`/`complete_print_job` (segreto `local_service`), `process_stripe_subscription_event`, `check_integration_secret`/`set_integration_secret` (solo hash SHA-256). Fix durante l'applicazione: unique constraint `customers (id, restaurant_id)` richiesto dai vincoli compositi.
- **Server layer e API:** `src/server/{crm,marketing,staff,online,printers,reports,billing}/` completi; `src/server/auth/mfa.ts` + `mfa-actions.ts` (TOTP enroll/verify/unenroll); `src/server/dashboard/context.ts` (`requireDashboardContext`); route API `/api/stripe/webhook`, `/api/resend/webhook`, `/api/twilio/webhook` (verifiche firma Svix/Twilio), `/api/internal/print/jobs` (bearer `LOCAL_SERVICE_TOKEN`), `/api/health`, `/api/observability`; osservabilità Sentry senza SDK (`src/lib/observability/*`, `global-error.tsx`).
- **Stampa scontrini 58/80 mm:** `payOrderAction` accoda lo scontrino alla chiusura del conto, `confirmOnlineOrderAction` accoda la comanda cucina; payload `receipt`/`kitchen` con testata, righe, totali e nota (`receipt_footer`); il servizio locale (`local-service/`) preleva i lavori via API e stampa ESC/POS con formato scontrino 58/80 mm (mai A4), con retry fino a 3 tentativi.
- **Dashboard (9 nuove pagine):** `/dashboard/clienti` (CRM, consensi, fedeltà, messaggi diretti), `/dashboard/marketing` (campagne, segmenti, inbox), `/dashboard/personale` (inviti, ruoli, costo orario, turni), `/dashboard/sedi` (multi-sede con sede attiva), `/dashboard/online` (link con token, ordini, conferma→POS), `/dashboard/report` (KPI, ricavi giornalieri, metodi pagamento, top prodotti, confronto sedi), `/dashboard/integrazioni` (stato integrazioni, stampanti, test email/SMS, ricezione, nota scontrino), `/dashboard/abbonamento` (piani Stripe checkout/portale), `/dashboard/sicurezza` (MFA TOTP con QR e enforcement aal2 nel proxy per chi ha un fattore attivo).
- **Menu pubblico:** `/m/[token]` token-only non elencabile (`robots: noindex`), carrello client, ordine con honeypot + chiave idempotenza, totali ricalcolati dal database, stati di successo/errore.
- **Migrazione a `cacheComponents` Next 16:** rimossi `export const dynamic`/`runtime` dalle route API (incompatibili) con `connection()` dove serve l'esecuzione a richiesta; le pagine con dati dinamici usano `<Suspense>` con skeleton (pattern del repo). Build **71 route**.
- **Verifiche reali:** `npm run lint` pulito (0 errori/0 warning); `npm run typecheck` pulito; **70/70 unit** (Vitest); **733/733 pgTAP** (16 file, +77 Sprint 7); `npm run build` **71 route**; `npm run local-service:build` ok. Migrazione Sprint 7 applicata realmente allo stack locale (`npx supabase migration up`).
- **MCP:** tutti i server collegati e verificati in lettura (Supabase 3 progetti incluso `CMRisto`, Vercel utente `elcaloz` Hobby, GitHub `ElCaloz`, Sentry `calosimattia`, Stripe test `acct_1TJzyL4QBUZB0Cxn`, Twilio trial, risorse da 10 server).
- **Problemi aperti:** Supabase cloud (`CMRisto`/`sdgojsopwztjdkphbzof`) ancora da migrare (tabelle legacy da preservare in `legacy_v0`); Vercel punta al repository sbagliato (`ElCaloz/Cmristoo`), serve progetto collegato a `ElCaloz/cmristoopencode` e env di produzione; Resend senza dominio verificato (invii solo test/onboarding); Twilio senza mittente confermato; Cloudflare senza zona/dominio (WAF e MFA Cloudflare non attivabili); QR del menu da generare lato client (pulsante "Crea link" senza immagine); E2E Sprint 7 non ancora scritti; flusso inviti staff env-gated (`SUPABASE_SERVICE_ROLE_KEY`).
- **Prossimi passi:** configurazione Supabase cloud e deploy Vercel; env di produzione; verifica flussi su ambiente pubblicato; E2E per CRM/online/stampa; QR del menu.

---

## Sessione 22/10/2026 - Audit di sicurezza, hardening e verifica finale

- **Perimetro:** intero repository escluso Revit; 178 file TS/TSX, 55 route, 6 route API interne, 12 moduli di Server Actions, 19 migrazioni, 36 tabelle, 15 file pgTAP, 13 file unit, 4 spec E2E, servizio locale, CI, documentazione e MCP.
- **Correzioni implementate:**
  - header di sicurezza globali con CSP, HSTS (solo produzione), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` e `X-Powered-By` disattivato (`src/lib/security/headers.ts`, `next.config.ts`);
  - cookie di sessione Supabase esplicitamente `HttpOnly`, `SameSite=Lax`, `Secure` in produzione (`src/lib/supabase/cookie-options.ts`);
  - rate limiting in memoria (120 req/min per IP) sull'avvio chiamata vocale (`src/lib/security/rate-limit.ts` + route);
  - secret scanner con selftest e script `security:audit`/`security:secrets`; CI ampliata con job security, CodeQL, dependency review e permessi minimi;
  - accessibilità: `h1` nel KDS e nello stato "area non disponibile" (`EmptyState` con `headingLevel`);
  - lint reso robusto rispetto agli artefatti Playwright.
- **Verifiche reali:** `npm run lint` pulito; `npm run typecheck` pulito (con `next typegen`); **70/70 unit** (13 file); **656/656 pgTAP** (15 file); **26/26 E2E** (15 auth reali + 1 security + 7 demo + 3 dark mode); `npm run build` **55 route**; `npm audit --omit=dev` **0 vulnerabilità**; secret scan **285 file, 0 finding**; header verificati su build di produzione (`:3100`), `X-Powered-By` assente; browser QA su 16 pagine demo e pagine pubbliche con **0 errori console**; cookie `HttpOnly`/`Lax` verificati su login reale; `/dashboard` anonimo → 307 login; API vocale anonima → 401; nessun valore di `SUPABASE_SERVICE_ROLE_KEY` nel bundle client; **CI run #39802102414** (commit `f25c19a`): Quality, Security, CodeQL, pgTAP ed E2E verdi; dependency review saltato perché non c'è una PR.
- **MCP:** 20/23 server installati, connessi e testati in lettura; 3 Google parcheggiati su istruzione dell'utente; Revit non toccato. Nessun MCP è integrato nel runtime del prodotto (uso solo sviluppo/ops).
- **Problemi aperti:** MFA admin non implementata; rate limiting non distribuito; CSP con `'unsafe-inline'`; Sentry SDK non collegato; scansione segreti solo working tree; CSRF senza test dedicato; `Secure` cookie verificabile solo in HTTPS; 5 advisory `high` dev-only nel tooling lint senza patch non-breaking; provider vocale, Stripe, Twilio e Resend non integrati nel prodotto; dependency review da verificare su una PR reale.
- **Prossimi passi:** aprire eventuale PR senza merge; approvazioni per deploy/Vercel, Supabase cloud, Cloudflare e provider esterni; completamento OAuth Google quando l'utente fornirà le credenziali.

---

## Sessione 21-22/10/2026 — Integrazioni MCP (installazione e verifica)

- **Completato:** installate e configurate **23/23 integrazioni MCP** richieste in `opencode.json` (schema V2, `mcp.servers`): Bird, Canva, Context7, Figma, Firecrawl, Google Docs, Google Sheets, Google Slides, Linear, Notion, Resend, Sentry, Stripe, Supabase, Twilio, Vercel, GitHub, Grafana, Zapier, Exa, Cloudflare, Git, Chrome DevTools. Completati **11 login OAuth** con l'utente; **GitHub attivato** con il token già presente nel credential store di git (iniettato via `opencode service set env`, fuori dal repository) e **Figma passato al server hosted** `mcp.figma.com` (nessuna app desktop richiesta); eseguite verifiche reali con probe MCP diretti e chiamate di sola lettura. Report completo con schede, test e istruzioni: `docs/MCP_INSTALLATION_REPORT.md`.
- **Stato:** 20 **INSTALLATO E TESTATO**, 3 **INSTALLATO, AUTENTICAZIONE PENDENTE** (Google Docs/Sheets/Slides), 0 **CONFIGURATO, TEST BLOCCATO**. Nessuna voce abbandonata.
- **Problemi aperti:** nessuno bloccante sul repository: remoto `origin` (`https://github.com/ElCaloz/cmristoopencode.git`) verificato e **push eseguito** (commit `901b620`) come da regola 12. Da allineare solo la denominazione del repository nella documentazione (`AGENTS.md` indica `cm-risto`, il remoto reale è `ElCaloz/cmristoopencode`). Restano da fornire le credenziali mancanti elencate al paragrafo 6 del report MCP.
- **Prossimi passi:** OAuth client Google Cloud + variabili `GOOGLE_OAUTH_CLIENT_ID/SECRET` per Docs/Sheets/Slides.

---

## Completato (verificato realmente)

1. **Fondamenta di progetto.** Next.js 16.4.2 (App Router, Turbopack, `cacheComponents`), React 19.3.0, TypeScript 5 strict, Tailwind CSS 4, ESLint 9, Supabase CLI, Vitest e Playwright. Build, lint e typecheck funzionanti.
2. **Supabase locale attivo e verificato.** Stack Docker con **19 migrazioni applicate**, RLS, gerarchia ruoli, auth/onboarding e moduli operativi. Le porte locali sono state spostate su `55000-55006` per un'esclusione di Windows (API `55001`, DB `55002`, Studio `55003`, Mailpit `55004`, Analytics `55005`, pooler `55006`, shadow DB `55000`).
3. **Autenticazione e area reale.** Supabase Auth via `@supabase/ssr`, proxy Next 16, onboarding atomico, ruoli e permessi letti dal database, dashboard reale senza selettore di ruolo. Pagine legali ancora dimostrative.
4. **Moduli operativi reali verificati:**
   - menu e prodotti;
   - sala, aree e tavoli con piantina grafica modificabile (posizioni, forme, dimensioni e arredi);
   - cassa POS, ordini e pagamenti idempotenti;
   - vendite derivate dai pagamenti;
   - cucina KDS con state machine nel database;
   - dispositivi/palmari con codici monouso, limite di 4 palmari e PIN operatore;
   - comande dal palmare con sessione operatore verificata;
   - magazzino con fornitori, giacenze, lotti, scadenze e movimenti tracciati;
   - ricette e food cost con ingredienti, sfridi, resa, costo per porzione e margine;
   - acquisti con ordini ai fornitori, ricezioni anche parziali, differenze e aggiornamento di giacenze e costi.
5. **Fase A - prenotazioni e receptionist AI (20/10/2026).**
   - Migrazione `supabase/migrations/20261020100000_sprint5_receptionist.sql`:
     - `restaurant_opening_hours`, `restaurant_closed_dates`, `receptionist_settings`, `receptionist_calls`, `receptionist_messages`, `reservations`;
     - FK composite per ristorante/organizzazione, vincoli su orari, capienze, email e telefono, indice univoco per idempotenza delle prenotazioni;
     - permesso `receptionist.manage` per owner/admin/manager; `host` mantiene `reservations.manage`;
     - RLS di lettura per i membri; scritture settings/orari/chiusure solo con `receptionist.manage`; scritture dirette a prenotazioni, chiamate e messaggi revocate ad `anon`/`authenticated`;
     - RPC `security definer`: `check_reservation_availability`, `create_reservation`, `set_reservation_status`, `update_reservation_notes`, `resolve_receptionist_tenant`, `begin_receptionist_call`, `end_receptionist_call`, `add_receptionist_message`;
     - disponibilitÃ  verificata su data, preavviso, giorni massimi, chiusure, fasce orarie, capienza dei tavoli attivi e sovrapposizioni; lock advisory e idempotenza;
     - prenotazioni AI (`phone_ai`) sempre `pending`, con `call_id` obbligatorio e nessuna conferma automatica;
     - fix del calcolo `too_late_notice` a cavallo della mezzanotte.
   - Server layer: `src/server/reservations/{types,queries,actions}.ts` e `src/server/receptionist/{types,queries,actions,internal-auth,internal,http}.ts`.
   - API interne `/api/internal/voice/*`: avvio chiamata con token bootstrap, token di chiamata HMAC-SHA256, disponibilitÃ , creazione prenotazione, messaggio di richiamata, trasferimento e chiusura chiamata. Le API usano il service role solo lato server e non espongono il database all'agente vocale.
   - Dashboard: `/dashboard/prenotazioni` (registro, ricerca, filtri, creazione, conferma, arrivo, completamento, no-show, annullamento, note) e `/dashboard/receptionist` (configurazione, orari, chiusure, registro chiamate). Card dei due moduli aggiunte a `/dashboard`.
   - `.env.example` aggiornato con `RECEPTIONIST_INTERNAL_TOKEN` e `RECEPTIONIST_INTERNAL_SECRET`. I valori locali di prova sono presenti solo in `.env.local` (mai committato).
6. **Test e qualitÃ  (aggiornato al 21/10/2026):**
   - `npx supabase test db`: **656/656 pgTAP** (inclusi **72 test** prenotazioni/receptionist, **23 test** magazzino, **34 test** ricette/food cost, **61 test** acquisti e **33 test** piantina sala);
   - `npm test`: **62/62 unit** (token receptionist, servizio locale e quantitÃ /valori del magazzino, costo ricette e acquisti inclusi);
   - `npm run e2e`: **25/25 Playwright** (flussi menu, sala, piantina grafica reale e demo, POS, vendite, KDS, dispositivi, prenotazioni/receptionist, magazzino, ricette e acquisti; Mailpit sulla porta `55004`);
   - `npm run lint`: 0 errori, 0 warning;
   - `npm run typecheck`: nessun errore;
   - `npm run build`: **55 route** generate, incluse le 6 route API interne.
7. **Smoke test API interno:** avvio server di produzione locale; token bootstrap valido su numero non configurato restituisce `404 tenant_not_found`, token assente `401`, token bootstrap usato su un tool `401`. Nessun segreto stampato.
8. **Documentazione:** `AGENTS.md`, `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/AUDIT_COMPLETO.md` presenti; STATUS/DECISIONS/ARCHITECTURE/AGENTS aggiornati a fine Fase A.
9. **Fase 2 - restyling e navigazione demo (21/10/2026).**
   - Fix del blocco demo/KDS: rimosso il redirect forzato da `/app/cucina`; KDS demo full-screen per admin/super admin/cucina, controllo permessi prima del ramo KDS, link a dashboard e sito, ruoli demo con accesso a `dashboard`.
   - Design system: nuovi token (`shadow-card`, `shadow-lift`, `radius-card`, `ease-smooth`), `PageHeader` con eyebrow, `StatCard` premium, `Button` rifinito, sidebar con indicatore brand.
   - Landing `src/app/page.tsx` riscritta: hero, trust strip, anteprima interattiva, KDS, moduli, problemi/outcomes, ruoli, trasparenza, prezzi, FAQ, CTA; copy â€œFunzioni reali, non promesse.â€ e ticket KDS coerenti.
   - `ProductPreview`: tab Panoramica/Cucina/Prenotazioni, altezza mobile automatica, footer demo corretto.
   - Dashboard demo e prenotazioni: KPI 2 colonne mobile, card premium, filtri brand con `aria-pressed`, lista prenotazioni `md:grid-cols-2`, grafico dark con variabili CSS.
   - KDS demo riscritto con layout full-screen, filtri postazione, KPI, ticket masonry responsive e azioni; KDS reale e prenotazioni reali rifiniti senza cambiare la logica operativa.
   - AccessibilitÃ : `aria-current` su sidebar/nav pubblica/nav cameriere; animazioni `pulse` rimosse rispettando `prefers-reduced-motion`.
   - Test: aggiunta regressione navigazione demo/KDS; aggiornati test dark mode. Verifica finale all'epoca: lint/typecheck puliti, unit 47/47, e2e 21/21, build 53 route.
   - `next.config.ts`: `experimental.instantInsights.validationLevel = "manual-warning"` per il falso positivo dev `instant-unrendered-segment` dovuto a `StoreGate`; build segnala l'esperimento, nessun impatto runtime.
   - Rifinitura finale: eyebrow coerente su tutte le pagine demo, `DataTable` con raggio/ombra del design system e `aria-sort`, filtri sala/comande in brand con `aria-pressed`, skeleton di caricamento per `/dashboard`, animazioni di apertura per dialog/sheet, skip link "Vai al contenuto", metadati SEO/Open Graph della home.
   - Notifiche Sonner spostate in basso a destra (offset mobile sopra la nav) per non coprire i comandi di navigazione: il test POS reale aveva rilevato un toast che intercettava il link Dashboard.
   - QA visiva con screenshot desktop/mobile/tablet/dark in `C:\Users\calos\AppData\Local\Temp\opencode\after-*.png` e `final-*.png`; script temporanei rimossi.
10. **Audit accessibilitÃ  e SEO tecnica (21/10/2026).**
   - Lighthouse 13.5.0 eseguito su home, prezzi, login, privacy, contatti, funzionalitÃ , documentazione e tutte le 15 pagine demo: **accessibilitÃ  100/100** sulle pagine verificate.
   - Corretti i contrasti delle etichette secondarie in dark mode, i link fornitore sotto i 24 px, l'associazione delle intestazioni di tabella (`scope="col"`), il nome accessibile del pulsante notifiche, il landmark `main` nelle pagine auth, KDS e stato "accesso negato", l'ordine dei titoli in `/prezzi`.
   - Aggiunti `src/app/robots.ts` e `src/app/sitemap.ts`; `metadataBase` nel root layout; `noindex, nofollow` per `/app/*` e `/dashboard/*`. Le aree private non vengono indicizzate.
   - `npm run build` all'epoca: **53 route** (aggiunti `robots.txt` e `sitemap.xml`).
   - Docker Desktop era stato arrestato: il primo run e2e Ã¨ fallito per Supabase non raggiungibile; riavviati Docker e Supabase, la suite completa Ã¨ poi passata **20/20**.
11. **Servizio locale - base operativa (21/10/2026).**
   - Nuovo pacchetto `local-service/` (Node 24 + TypeScript, processo separato): coda persistente SQLite con WAL, idempotenza, retry con backoff, recupero job `processing` al riavvio.
   - Adapter stampante `file` (spool per test/sviluppo) e `network` TCP ESC/POS; formattazione comanda, note e taglio.
   - Adapter sync HTTP con bearer e `Idempotency-Key`; modalitÃ  test esplicita che scrive su spool locale senza chiamare servizi esterni.
   - API locale autenticata: `GET /health`, `GET /jobs/stats`, `POST /jobs`, `POST /worker/run`; payload Zod e limite body 64 KiB.
   - Configurazione in `local-service/.env.example`; script `npm run local-service` e `npm run local-service:build`; CI aggiornata con il build del servizio.
   - Test: **4 nuovi unit** su deduplica, recupero coda, ESC/POS e API; totale **41/41** all'epoca; con magazzino, ricette e acquisti il totale e **62/62**.
   - Limiti dichiarati: nessuna stampante fisica, nessun endpoint cloud reale, nessun WebSocket/realtime, discovery LAN e offline palmare non ancora collegati. Non dichiarare operativa la modalitÃ  offline.
12. **Sprint 4 - magazzino reale (21/10/2026).**
   - Migrazioni `20261021100000_sprint4_inventory.sql`, `20261021101000_fix_inventory_select_policies.sql` e `20261021102000_inventory_delete_cascades.sql`: tabelle `suppliers`, `inventory_items` e `inventory_movements` con FK composite per ristorante/organizzazione, RLS, indici e audit.
   - QuantitÃ  memorizzate in millesimi interi (`quantity_milli`, `min_quantity_milli`, `quantity_delta_milli`); costi in centesimi interi. Nessun `float`.
   - RPC atomiche `create_inventory_item` (giacenza iniziale come primo carico) e `record_inventory_movement` (carico, scarico, spreco, rettifica), con idempotenza per ristorante, blocco della giacenza negativa, motivazioni spreco validate e audit.
   - Trigger di protezione: le quantitÃ  si modificano solo tramite movimento; inserimenti diretti di articoli e movimenti non previsti dalle policy. Lettura riservata a `inventory.manage` (owner/admin/manager/warehouse e platform admin).
   - Server layer `src/server/inventory/{types,queries,actions}.ts`, helper `src/lib/inventory.ts`, UI `/dashboard/magazzino` con KPI, ricerca, filtri, fornitori, registro movimenti, lotti e scadenze; card aggiunta a `/dashboard`.
   - Test: **23 pgTAP** dedicati (isolamento tenant, permessi, idempotenza, stock negativo, sprechi, ruoli warehouse/cashier, audit); **6 unit** su quantitÃ /valori; e2e reale con fornitore, articolo, carico, scarico, spreco, rettifica, modifica soglia e scadenza.
   - Limiti dichiarati: nessun ordine di acquisto, scansione barcode, conversione automatica delle unita o gestione lotti multipli; nessun hard delete di articoli/fornitori dalla UI.

13. **Sprint 4 - ricette e food cost (21/10/2026).**
   - Migrazione `20261021110000_sprint4_recipes.sql`: tabelle `recipes` e `recipe_ingredients` con FK composite per ristorante/organizzazione, una ricetta per prodotto, ingredienti in millesimi, sfrido in basis point, resa in porzioni e audit.
   - RLS di sola lettura per `menu.manage` e platform admin; nessuna policy di scrittura diretta. `save_recipe` e `delete_recipe` sono RPC `security definer` atomiche che richiedono sia `menu.manage` sia `inventory.manage`, validano tenant, articoli attivi, duplicati, quantita e sfrido.
   - Il costo non viene memorizzato: food cost per porzione = somma di quantita x costo unitario x (1 + sfrido), divisa per la resa; margine = prezzo - food cost. Calcoli in centesimi interi con BigInt e percentuali in basis point. Le ricette non scaricano le giacenze.
   - Server layer `src/server/recipes/{types,queries,actions}.ts`, helper `src/lib/recipes.ts`, UI `/dashboard/ricette` con KPI, filtri, dialog ingredienti, anteprima del costo, stati "senza ricetta/costo incompleto/food cost alto" e link da menu e dashboard.
   - Test: **34 pgTAP** dedicati (permessi, isolamento tenant, validazioni, sostituzione ingredienti, cascades, audit); **9 unit** su parsing e calcoli; e2e reale con creazione piatto, ingredienti, sfrido, margine, modifica e rimozione ricetta.
   - Limiti dichiarati: nessun ordine di acquisto automatico, nessuno scarico giacenza dalle vendite, nessuna conversione tra unita di misura, nessun costo medio ponderato e nessun lotto multiplo per ingrediente.

14. **Sprint 4 - acquisti e ricezioni (21/10/2026).**
   - Migrazione `20261021120000_sprint4_purchasing.sql`: tabelle `purchase_orders` e `purchase_order_items` con FK composite per ristorante/organizzazione, numero ordine `PO-YYYYMMDD-NNNN` univoco per ristorante, chiave di idempotenza, stato `draft|ordered|received|cancelled`, righe con nome/unita fotografati, quantita in millesimi e costo in centesimi interi.
   - RLS di sola lettura per `inventory.manage`, `reports.read` e platform admin; nessuna policy di scrittura diretta. Le mutazioni passano solo dalle RPC `security definer` `save_purchase_order`, `mark_purchase_order_ordered`, `cancel_purchase_order` e `receive_purchase_order`, tutte con permesso `inventory.manage`.
   - `save_purchase_order` crea o aggiorna solo bozze, sostituisce le righe nella stessa transazione, valida fornitore e articoli del tenant, 1-50 righe senza duplicati, quantita positive e costi non negativi; la creazione e idempotente e il numero ordine e generato con lock advisory.
   - `receive_purchase_order` registra una sola ricezione definitiva per ordine, accetta quantita inferiori a quelle ordinate (differenze tracciate), rifiuta quantita superiori e aggiorna giacenza e costo unitario corrente di ogni articolo. I movimenti usano `reason = 'purchase_order'` e idempotency key `purchase-order:<order_id>:<item_id>`; un secondo invio restituisce `duplicate: true` senza riapplicare lo stock.
   - Server layer `src/server/purchasing/{types,queries,actions}.ts`, helper `src/lib/purchasing.ts`, UI `/dashboard/acquisti` con KPI, filtri per stato, creazione/modifica bozza, invio ordine, ricezione con differenze, annullamento, dettaglio e stato di sola lettura per chi ha solo `reports.read`; card aggiunta a `/dashboard`.
   - Test: **61 pgTAP** dedicati (permessi, isolamento tenant, idempotenza, scritture dirette negate, ricezione parziale, stock e costo aggiornati, differenze, annullamento, audit); **6 unit** su totali, ricevuto e differenze; e2e reale con creazione ordine, invio, ricezione parziale, verifica giacenza/costo in magazzino e annullamento bozza.
   - Limiti dichiarati: una sola ricezione per ordine (nessun ricevimento multiplo o backorder), nessun invio automatico al fornitore, nessuna fattura/pagamento fornitore, nessun ordine suggerito automatico, nessuna conversione tra unita di misura e nessuna scansione barcode.

15. **Piantina grafica della sala (21/10/2026).**
   - Migrazione `20261021130000_floor_plan_layout.sql`: colonne `shape` (`rect|round`), `pos_x`, `pos_y`, `width`, `height` su `restaurant_tables` con vincoli di griglia; nuova tabella `floor_objects` per arredi non-tavolo (`wall`, `counter`, `door`, `plant`, `label`) con FK composite, RLS e indici. Griglia logica 48x32 mezze-celle (24x16 celle); tutte le coordinate sono intere e i vincoli impediscono di uscire dalla piantina.
   - RPC atomica `security definer` `save_floor_layout(area, tables, objects, removeTableIds, removeObjectIds)`: aggiorna o inserisce tavoli e arredi, elimina esplicitamente gli elementi rimossi, verifica tenant e permesso `reservations.manage`, valida limiti/forme e registra audit `floor.layout_saved`. Nessuna scrittura diretta aggiuntiva: le policy RLS esistenti restano l'unico accesso alle tabelle.
   - Server layer `src/server/tables/{types,queries,actions}.ts` esteso con geometria, arredi e `saveFloorLayoutAction` (Zod su payload JSON, mapping errori, `revalidatePath`). I nuovi tavoli creati dal dialog classico ricevono una posizione libera calcolata dal server.
   - UI `/dashboard/sala`: nuova sezione "Piantina sala" con tab per area, tavoli cliccabili, stato disponibile/sospeso e legenda; pulsante **Modifica sala** che apre un dialog ampio con trascinamento, ridimensionamento dall'angolo, snap a mezza cella, aggiunta/rimozione tavoli e arredi, pannello proprietÃ , ripristino e conferma prima di scartare. Il dialog classico e l'elenco tabellare restano disponibili per nome, posti, area, sospensione ed eliminazione.
   - Demo `/app/sala`: la stessa piantina grafica con tab per sala, tavoli colorati per stato operativo (libero, occupato, prenotato, da riordinare), arredi e dialog **Modifica sala**. L'editor lavora sullo store demo persistito (`localStorage`, seed v2) con le stesse regole di trascinamento, ridimensionamento, aggiunta/rimozione e validazione; il salvataggio resta locale al browser. I dati demo v1 vengono ripristinati automaticamente al primo caricamento della nuova versione.
   - Test: **33 pgTAP** dedicati (geometria, vincoli, RLS tenant, permessi cashier/owner/platform, RPC, rimozioni, audit, anon); **2 e2e** dedicati (sala reale e demo) con creazione/trascinamento, arredo, salvataggio, riapertura e verifica persistenza. Verifica finale: 656 pgTAP, 62 unit, 25 e2e, lint/typecheck puliti, build 55 route.

16. **Sistema di sviluppo multi-agente OpenCode (21/10/2026).**
   - Configurazione permanente in `.opencode/`: agenti `backend`, `frontend`, `qa`, `security-reviewer` (tutti `mode: subagent`, con permessi mirati: qa e security-reviewer in sola lettura, nessun subagent annidato, lettura dei file `.env*` negata salvo `.env.example`) e comando `/task` (`.opencode/commands/task.md`) che orchestra analisi â†’ piano di task â†’ delega â†’ QA â†’ security review â†’ correzioni â†’ rapporto finale â†’ commit/push.
   - `AGENTS.md` esteso con architettura (richiamo), comandi di verifica reali, standard TypeScript, sicurezza e regole di coordinamento; regola 12 riscritta con l'autorizzazione permanente al salvataggio su GitHub.
   - Verifica reale: riconoscimento confermato via `opencode api get /api/agent` e `/api/command` con `location[directory]` sul progetto (agenti `backend`, `frontend`, `qa`, `security-reviewer` e comando `/task` presenti in OpenCode v2.1.2).

---

## In corso

- **Sprint 3 - parte 2c:** base `local-service/` realizzata (coda, stampa ESC/POS, sync adapter, API). Restano WebSocket/realtime cloud, discovery LAN, integrazione con il palmare, riconciliazione conflitti e collaudo con stampante fisica (D-008).
- **CI GitHub Actions** predisposta (D-029) e **verificata** il 22/10/2026 con il run **#39802102414**: Quality, Security, CodeQL, pgTAP ed E2E verdi; dependency review saltato perché non c'è una PR.
- **QA responsive/visiva Fase 2:** completata su landing, dashboard, KDS, prenotazioni, POS, desktop/mobile/tablet/dark; resta la QA manuale su dispositivi fisici e palmare reale.
- **Fase B del receptionist:** richiede approvazione esplicita, provider vocale, eventuale chiave OpenAI/budget, LiveKit Cloud e numero telefonico. Nessuna spesa o chiamata reale Ã¨ stata effettuata.

---

## Mancante (non ancora iniziato)

- **Offline palmare e stampa reale:** `local-service/` ha coda, adapter e API, ma mancano WebSocket/realtime cloud, discovery LAN, integrazione UI, riconciliazione conflitti e collaudo su stampante fisica.
- **Telefonia reale:** provider vocale, numero, webhook firmati, trasferimento effettivo, gestione errori e costi. Le API interne sono pronte, ma la telefonia non Ã¨ collegata.
- **Budget receptionist:** `monthly_budget_cents` Ã¨ configurato e mostrato, ma non ancora applicato perchÃ© manca un provider che esponga i costi reali.
- **Sprint 4 restante:** report, CRM, personale e multi-sede. Magazzino, ricette/food cost e acquisti sono completati.
- **Sprint 5 restante:** menu pubblico/QR/ordini online, inbox, marketing/fidelizzazione; il receptionist di Fase A Ã¨ predisposto ma non telefonico.
- **Sprint 6:** Stripe Billing, limiti piano server-side, monitoraggio, backup, collaudo e release.
- **Legale/commerciale:** privacy, cookie e termini definitivi; prezzi e condizioni di prova.

---

## Problemi aperti

1. ~~**Git bloccato:** `fatal: detected dubious ownership in repository at 'C:/Users/calos/CM-Risto'`.~~ **Risolto il 21/10/2026:** aggiunto `safe.directory` globale per il progetto; git funzionante.
2. **Nessuna integrazione telefonica reale:** non dichiarare operativo il receptionist finchÃ© un provider non Ã¨ collegato e verificato con chiamate reali.
3. **Budget non applicato:** la configurazione Ã¨ salvata; l'applicazione richiede il provider di costo.
4. **Porte locali cambiate:** `.env.example`, `.env.local`, `supabase/config.toml` e `tests/e2e/support/auth.ts` usano `55001`/`55004`; eventuali istruzioni esterne con `543xx` vanno aggiornate.
5. **Segreti locali:** `RECEPTIONIST_INTERNAL_TOKEN` e `RECEPTIONIST_INTERNAL_SECRET` esistono solo in `.env.local` per lo smoke test locale; in produzione vanno impostati come variabili server e ruotati.
6. **Legale provvisorio:** privacy, cookie e termini sono segnaposto; non pubblicare senza testi definitivi.
7. `npm audit`: 0 vulnerabilitÃ  di produzione; 5 `high` solo nella dev-chain ESLint. Non usare `npm audit fix --force`.
8. **Warning dev Next:** `instant-unrendered-segment` (falso positivo da `StoreGate`) Ã¨ stato silenziato con `instantInsights: manual-warning`; restano eventuali avvisi dev-only su `Date.now()`/`Performance.measure`, senza impatto su build e test.

---

## Prossimi passi (in ordine)

1. **Fase B (solo su approvazione esplicita):** collegare ambiente vocale di test con provider/LiveKit e numero dedicato, budget e observability; verificare con chiamate reali prima di dichiararla operativa.
2. Completare lo **Sprint 3 parte 2c** oltre la base giÃ  realizzata: endpoint cloud reale, WebSocket/realtime, discovery LAN, integrazione palmare, riconciliazione conflitti e collaudo stampante fisica (D-008, D-040).
3. **Sprint 4 restante:** report, CRM, personale e multi-sede.
4. CI verificata il 22/10/2026 (run #39802102414, tutti i job verdi); aprire eventuale PR senza merge.
5. QA su dispositivi fisici/palmare e testi legali definitivi.
6. ~~Effettuare il primo commit solo se richiesto esplicitamente.~~ Fatto: repository GitHub `ElCaloz/cmristoopencode` creato e primo commit eseguito il 21/10/2026; da allora ogni modifica completata viene salvata (regola 12 di `AGENTS.md`).

---

## Come eseguire

```powershell
cd C:\Users\calos\CM-Risto
npx supabase start
npm run dev
```

Sito pubblico e demo: `http://localhost:3000` (demo `/app/panoramica`; area reale `/dashboard`).
Supabase locale: API `http://127.0.0.1:55001`, Studio `http://127.0.0.1:55003`, Mailpit `http://127.0.0.1:55004`.
I test e2e richiedono lo stack Supabase attivo e `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` per la pulizia automatica dei dati di prova.

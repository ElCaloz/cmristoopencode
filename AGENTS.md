# AGENTS.md — CM Risto: istruzioni permanenti per agenti AI

**Progetto:** CM Risto — SaaS multi-tenant per la gestione completa di ristoranti (POS, sala, cucina, palmari, prenotazioni, magazzino, CRM, receptionist AI, abbonamenti).

**Percorso canonico del progetto:** `C:\Users\calos\CM-Risto`

**Repository storico di riferimento (SOLA LETTURA):** `C:\Users\calos\Downloads\Sa-as-Ristoranti-main`
- Predecessore "CMRistorante" (Vite + React + Express + Supabase, ~46 componenti, schema SQL in `db/schema.sql`).
- Contiene UI e logiche riusabili per il porting. Non modificare, non spostare, non cancellare nulla in quella cartella.

## Protocollo di avvio sessione (obbligatorio)

1. Conferma la directory di lavoro (`Get-Location`): deve essere `C:\Users\calos\CM-Risto`.
2. Leggi `docs/STATUS.md` e individua l'ultima attività incompleta.
3. Leggi i documenti pertinenti al task: `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`; per il quadro completo usa `docs/AUDIT_COMPLETO.md`.
4. Verifica lo stato reale del repository: `git status`, `git log --oneline -10`, eventuali file modificati.
5. Se `docs/STATUS.md` contraddice il codice, la verità è nel codice: verifica e correggi STATUS.md.
6. Riprendi il lavoro dall'ultima attività incompleta senza attendere nuove istruzioni, entro i limiti del piano approvato.

## Protocollo di chiusura sessione (obbligatorio)

Alla fine di ogni sessione di lavoro significativa aggiorna:
- `docs/STATUS.md` — completato / in corso / mancante / problemi aperti / prossimi passi.
- `docs/DECISIONS.md` — ogni nuova decisione tecnica con motivazione.
- `docs/ARCHITECTURE.md` — solo se l'architettura è cambiata rispetto a quanto documentato.

## Comandi del progetto

| Comando | Stato |
|---|---|
| `npm run dev` | attivo |
| `npm run build` | attivo e verificato (55 route/pagine, proxy/middleware attivo, 6 route API interne, robots.txt e sitemap.xml) |
| `npm run lint` | attivo (0 errori, 0 warning) |
| `npm run typecheck` | attivo e verificato (`tsc --noEmit` app + `tsc -p local-service/tsconfig.json`) |
| `npm test` | attivo e verificato (Vitest, 62 test) |
| `npm run local-service:build` | attivo e verificato (compila `local-service/` in `dist/`) |
| `npm run local-service` | attivo; avvia il servizio locale su `127.0.0.1:4100`, richiede `local-service/.env` da `.env.example` |
| `npm run e2e` | attivo e verificato (Playwright, 25 test: 15 auth reali incl. menu, sala, piantina grafica, POS, vendite, cucina KDS, dispositivi, accesso col PIN, prenotazioni/receptionist, magazzino, ricette e acquisti, 7 demo incl. piantina grafica, 3 dark mode; dev server su :3000; richiede stack Supabase attivo e `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` per la pulizia dati di prova) |
| `npx supabase start` / `stop` | attivo; stack locale verificato il 20/10/2026. Porte locali: API `55001`, DB `55002`, Studio `55003`, Mailpit `55004`, Analytics `55005`, pooler `55006` (D-035) |
| `npx supabase migration up` | attivo; 19 migrazioni applicate (schema v1, gerarchia ruoli, auth/onboarding, fix RPC onboarding, sprint 2 menu, sprint 2 sala/tavoli, sprint 2 POS, sprint 2 KDS, sprint 3 dispositivi, sprint 3 operatori/palmare, fix hash token operatore, filtro lockout scaduto, sprint 5/Fase A prenotazioni e receptionist, sprint 4 magazzino, fix policy inventario, cascades inventario, sprint 4 ricette/food cost, sprint 4 acquisti, piantina sala/arredi) |
| `npx supabase test db` | attivo e verificato (pgTAP, 656 test: 30 RLS + 14 escalation + 28 auth/onboarding + 30 menu + 34 sala/tavoli + 33 piantina sala + 58 POS + 41 KDS + 59 dispositivi + 81 operatori/palmare + 72 prenotazioni/receptionist + 58 comande palmare + 23 magazzino + 34 ricette + 61 acquisti) |
| CI GitHub Actions | predisposta in `.github/workflows/ci.yml` (qualità, pgTAP, e2e su stack locale); prima esecuzione reale da verificare al primo push (D-029) |

Le API interne del receptionist richiedono `RECEPTIONIST_INTERNAL_TOKEN` e `RECEPTIONIST_INTERNAL_SECRET` (almeno 32 caratteri) in `.env.local`, mai committati. La telefonia reale e il budget provider non sono collegati: non dichiarare operativa l'integrazione vocale.

## Regole operative vincolanti

Derivano dal prompt master del prodotto e vanno rispettate in ogni task:

1. Migliorare in modo incrementale; non riscrivere da zero ciò che funziona.
2. Non cancellare funzionalità esistenti senza motivazione tecnica documentata.
3. Nessun pulsante, menu o filtro decorativo: ogni azione deve avere comportamento reale.
4. Dati demo sempre separati e chiaramente identificabili dai dati operativi.
5. Mai dichiarare completata o verificata un'integrazione esterna (fiscale, pagamenti, telefonia, WhatsApp, stampanti) senza riscontri reali. Predisporre adapter, configurazione e modalità test esplicite.
6. Autorizzazioni, prezzi e importi verificati sempre lato server; il frontend non è una fonte di verità.
7. Multi-tenancy: ogni record operativo appartiene a un tenant; i test di isolamento cross-tenant sono bloccanti per il rilascio.
8. Denaro: centesimi interi (`bigint`) nel database; helper condivisi per formattazione e aritmetica. Mai `float`/`real`.
9. Idempotenza obbligatoria per ordini, pagamenti, webhook e sincronizzazione offline.
10. Nessun segreto nel repository o nel frontend: solo variabili d'ambiente (`.env.local`, mai committato).
11. Dopo ogni modifica significativa: lint, typecheck e test pertinenti; correggere le regressioni prima di proseguire.
12. **Salvataggio su GitHub (autorizzazione permanente, 21/10/2026):** al termine di ogni modifica completata e verificata, esegui commit descrittivo e push sul repository GitHub del progetto (remoto `origin`, repository `ElCaloz/cmristoopencode`). Prima del commit controlla `git status` e verifica che nessun segreto o artefatto (`.env.local`, `local-service/.env`, `test-results/`, `.next/`, `node_modules/`) entri nel commit. Restano soggette ad approvazione esplicita dell'utente: push verso repository diversi, cancellazioni, deploy, reset del database e qualsiasi operazione distruttiva o verso l'esterno.
13. Lingua: documentazione e UI in italiano; codice, identificatori e schema database in inglese.
14. Non mostrare mai in output il contenuto di chiavi API, password o segreti.

## Architettura (richiamo)

- `src/app/**` — App Router Next.js 16 (pagine pubbliche, auth, `/dashboard/**`, demo `/app/**`, route API interne in `src/app/api/**`).
- `src/components/**` — componenti React (design system in `src/components/ui/**`).
- `src/lib/**` — logica condivisa e client Supabase (`src/lib/supabase/**`); demo separata in `src/lib/demo/**`.
- `src/server/**` — server layer organizzato per modulo (`types.ts`, `queries.ts`, `actions.ts`).
- `src/proxy.ts` — proxy Next 16 per sessioni e redirect: NON è l'autorizzazione.
- `supabase/migrations/**` — migrazioni SQL; `supabase/tests/**` — test pgTAP.
- `tests/unit/**` (Vitest), `tests/e2e/**` (Playwright).
- `local-service/**` — servizio locale Node/TypeScript (stampa, sync).
- `docs/` — STATUS, PRODUCT_SPEC, ARCHITECTURE, DECISIONS, AUDIT_COMPLETO. Il dettaglio architetturale è in `docs/ARCHITECTURE.md`.

## Comandi di verifica (usare solo questi, realmente presenti)

| Quando | Comando |
|---|---|
| Sempre dopo le modifiche | `npm run lint`, `npm run typecheck` |
| Logica applicativa | `npm test` |
| Migrazioni o RLS | `npx supabase test db` (stack locale attivo) |
| UI, pagine, route | `npm run build` |
| Flussi completi | `npm run e2e` (dev server su :3000 + stack Supabase) |
| Servizio locale | `npm run local-service:build` |

Mai dichiarare verificato un comando non eseguito. I numeri di test vanno riportati reali (es. `pgTAP 656/656`).

## Standard TypeScript

- TypeScript 5 in modalità `strict`; nessun `any` implicito o esplicito senza giustificazione.
- Alias `@/*` → `src/*`; import ordinati; `import type` per i soli tipi.
- Validazione degli input con `zod` lato server; nessun dato del client considerato affidabile.
- Denaro: `bigint` in centesimi interi; quantità in millesimi; percentuali in basis point; aritmetica solo con BigInt e helper condivisi. Mai `float`/`real`.
- Funzioni piccole e tipizzate; errori gestiti esplicitamente (stati pending/successo/errore nelle UI).
- Nomi di codice, identificatori e schema in inglese; documentazione e UI in italiano.
- File di configurazione (`tsconfig.json`, `eslint.config.mjs`, `next.config.ts`) modificati solo per necessità reale e documentata.

## Sicurezza

- Nessun segreto in repository, codice, log o output: solo variabili d'ambiente (`*.env*` esclusi da git, tranne `.env.example` con placeholder). Mai stampare valori di chiavi, token o password.
- Autorizzazioni, prezzi e importi verificati sempre lato server; RLS attiva e test di isolamento cross-tenant bloccanti.
- Nessun ruolo privilegiato assegnabile dal client; il Super Admin non è elevabile dal browser.
- Operazioni che richiedono approvazione esplicita dell'utente: cancellazioni rischiose, deploy, push verso repository diversi da `origin` del progetto, `supabase db reset`, migrazioni su ambienti non locali, modifica di credenziali, installazione di dipendenze, spese o chiamate verso servizi esterni a pagamento.
- Repository storico `C:\Users\calos\Downloads\Sa-as-Ristoranti-main`: sola lettura, mai modificare.

## Sistema multi-agente OpenCode (coordinamento)

Il sistema di sviluppo è definito in `.opencode/`:

| Ruolo | Definizione | Compito |
|---|---|---|
| COORDINATORE | agente primario della sessione (`build`) | analizza, pianifica, delega, integra, verifica e consegna il rapporto |
| BACKEND | `.opencode/agents/backend.md` | API, server layer, Supabase, schema, RLS, auth, pagamenti |
| FRONTEND | `.opencode/agents/frontend.md` | Next.js/React, componenti, dashboard, form, a11y, responsive |
| QA | `.opencode/agents/qa.md` | test e verifiche, sola lettura, mai modifica del codice |
| SECURITY REVIEWER | `.opencode/agents/security-reviewer.md` | revisione di sicurezza, sola lettura assoluta |

Regole di coordinamento:
1. Il comando `/task <richiesta>` (`.opencode/commands/task.md`) avvia il flusso completo: analisi → piano di task → delega ai subagenti → verifiche QA → revisione di sicurezza → correzioni → rapporto finale.
2. Ogni task delegato ha obiettivo, perimetro di file esclusivo e criteri di accettazione espliciti.
3. In parallelo solo task con aree di file disgiunte; in sequenza quelli con dipendenze (es. schema/RPC → server layer → UI → test).
4. Mai due agenti sullo stesso file contemporaneamente; i contratti condivisi (tipi, RPC, route) vanno comunicati prima di proseguire.
5. QA e SECURITY REVIEWER non modificano file: le correzioni sono dei rispettivi agenti di area o del coordinatore.
6. I subagenti non eseguono commit né push: se ne occupa il coordinatore al termine della modifica completata (regola 12).
7. Se uno strumento di delega non è disponibile, dichiararlo nel rapporto ed eseguire il task internamente, senza simulare esecuzioni.

## Stack (verificato il 20 ottobre 2026)

- Next.js 16.4.2 (Turbopack), React 19.3.0, TypeScript 5 (strict), Tailwind CSS 4, ESLint 9 + eslint-config-next 16.4.2.
- Supabase previsto: sviluppo locale via CLI + Docker, produzione su progetto cloud dedicato (in seguito).
- Node.js v24.19.0, npm 11.17.0, Docker 29.2.0, git 2.43.0 (ambiente Windows).

# Implementation Status — Audit, Hardening e Integrazione MCP

**Data:** 22 ottobre 2026
**Progetto:** CM Risto — `C:\Users\calos\CM-Risto`
**Repository:** `ElCaloz/cmristoopencode` (remote `origin`)
**Branch di lavoro:** `audit/hardening-sicurezza` (creato da `main`, base `d07d00b`)
**Stato Git iniziale:** albero pulito, `main` allineato a `origin/main`, nessuna modifica utente sovrascritta.
**Commit dell'audit:** creato al termine di questo lavoro sul branch dedicato (vedi `git log -1`); nessun merge su `main`, nessun deploy.

---

## 1. Legenda degli stati

| Stato | Significato |
|---|---|
| **COMPLETATO E VERIFICATO** | Implementato e provato con evidenza reale (test, HTTP, browser, pgTAP) |
| **IMPLEMENTATO, NON ANCORA VERIFICATO** | Codice/config pronto, ma manca l'esecuzione reale |
| **PARZIALE** | Copertura o implementazione solo in parte |
| **BLOCCATO DA ACCESSI O CREDENZIALI** | Serve un accesso, una credenziale o un'approvazione esterna |
| **NON IMPLEMENTATO** | Non esiste nel prodotto |
| **NON APPLICABILE** | Non pertinente allo stato attuale del prodotto |

---

## 2. Repository e aree esaminate

### 2.1 Verifica iniziale

- Directory confermata: `C:\Users\calos\CM-Risto`.
- `git status`: pulito; `main` = `origin/main` al commit `d07d00b`.
- Nessun file non committato dell'utente: nessun lavoro sovrascritto.
- Branch dedicato creato prima di ogni modifica.
- Nessun `git reset --hard`, nessuna cancellazione massiva, nessun force push.

### 2.2 Aree analizzate

| Area | Dettaglio |
|---|---|
| Configurazione | `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.mts`, `playwright.config.ts`, `.env.example` |
| App Router | 55 route/pagine: pubbliche, auth, `/dashboard/**`, `/app/**` demo, `/palmare` |
| API | 6 route interne `/api/internal/voice/**` + `/auth/callback` |
| Server Actions | 12 moduli (`auth`, `devices`, `inventory`, `kds`, `menu`, `palmare`, `pos`, `purchasing`, `receptionist`, `recipes`, `reservations`, `tables`) |
| Auth e sessioni | Supabase SSR, proxy, callback PKCE, recupero password, onboarding, ruoli |
| Database | 19 migrazioni, 36 tabelle, RLS, policy, RPC `security definer`, grant, trigger, `search_path` |
| Test | 13 file unit (70 test), 15 file pgTAP (656), 4 spec E2E (26) |
| Servizio locale | `local-service/**` (coda SQLite, stampa ESC/POS, sync, API bearer) |
| CI/CD | `.github/workflows/ci.yml` |
| Docs | STATUS, ARCHITECTURE, DECISIONS, PRODUCT_SPEC, AUDIT_COMPLETO, report MCP |
| MCP | `opencode.json`, report installazione, verifiche di lettura |

### 2.3 Dati quantitativi

- 178 file `.ts/.tsx` in `src`.
- 36/36 tabelle con RLS attiva.
- 19 migrazioni applicate solo sul database locale.
- 0 endpoint webhook Stripe/Twilio/Resend esistenti.
- 0 bucket Storage utilizzati.
- 0 utilizzi di `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`.

---

## 3. Problemi confermati, correzioni e test di regressione

| ID | Problema | Gravità | Correzione | Test di regressione | Stato |
|---|---|---|---|---|---|
| F-01 | Header di sicurezza assenti, `X-Powered-By` esposto | Media | `src/lib/security/headers.ts` + `next.config.ts` (CSP, HSTS prod, XFO, nosniff, Referrer, Permissions, poweredBy off) | `tests/unit/security-headers.test.ts` (3), `tests/e2e/security.spec.ts`, verifica HTTP produzione | COMPLETATO E VERIFICATO |
| F-02 | Cookie sessione senza `HttpOnly`/`SameSite` espliciti | Media | `src/lib/supabase/cookie-options.ts` applicato ai client server | E2E su login reale: cookie `HttpOnly`, `SameSite=Lax` | COMPLETATO E VERIFICATO (Secure solo prod: implementato, non testato su HTTPS) |
| F-03 | Nessun rate limit su avvio chiamata vocale | Bassa-media | `src/lib/security/rate-limit.ts` + 120 req/min per IP sulla route | `tests/unit/rate-limit.test.ts` (4); 401 anonimo verificato | PARZIALE (limiter in memoria, 429 non forzato E2E) |
| F-04 | CI senza audit dipendenze/secret scan/CodeQL | Bassa | Script `security:*`, job `security`, `codeql`, `dependency-review`, permessi minimi | Scanner 285 file 0 finding; selftest 6/6; audit 0 vuln | IMPLEMENTATO, NON ANCORA VERIFICATO (prima esecuzione CI fallita su typecheck e falso positivo scanner, corretti; seconda esecuzione in corso) |
| F-05 | `h1` mancante in KDS e stato accesso negato | Bassa (a11y) | `h1` sr-only nel KDS; `EmptyState` con `headingLevel` | E2E 25/25 + browser build produzione (1 `h1` per pagina) | COMPLETATO E VERIFICATO |
| F-06 | MFA assente per admin | Media | — | — | NON IMPLEMENTATO |
| F-07 | `audit_logs` inseribili da membri del tenant | Bassa | Accettato per MVP | — | PARZIALE (rischio documentato) |

Nessuna vulnerabilità critica o alta confermata. Nessun segreto esposto.

Dettaglio completo: `docs/SECURITY_AUDIT.md`.

---

## 4. Miglioramenti applicativi

| Intervento | File | Verifica |
|---|---|---|
| Header di sicurezza centralizzati e CSP | `src/lib/security/headers.ts`, `next.config.ts` | Unit + HTTP produzione + browser |
| Cookie di sessione rafforzati | `src/lib/supabase/cookie-options.ts`, `server.ts`, `proxy.ts` | E2E login reale |
| Rate limiting endpoint vocale | `src/lib/security/rate-limit.ts`, `src/app/api/internal/voice/calls/route.ts` | Unit; route compilata |
| Secret scanner + script sicurezza | `scripts/scan-secrets.mjs`, `package.json` | 285 file, 0 finding; selftest 6/6 |
| CI: security, CodeQL, dependency review, permessi minimi | `.github/workflows/ci.yml` | Config valida; prima esecuzione al push |
| Accessibilità: heading | `src/components/ui/empty-state.tsx`, `src/components/app/app-shell.tsx`, `src/app/app/cucina/page.tsx` | E2E + browser |
| ESLint ignora artefatti Playwright | `eslint.config.mjs` | Lint pulito |

Nessuna funzionalità esistente è stata rimossa o riscritta. Nessuna nuova dipendenza.

---

## 5. Test eseguiti (evidenza reale)

| Comando | Esito | Dettaglio |
|---|---|---|
| `npm run lint` | **PASS** | 0 errori, 0 warning (eseguito più volte) |
| `npm run typecheck` | **PASS** | `next typegen` + app + local-service, nessun errore (verificato anche senza `.next` preesistente) |
| `npm test` | **PASS** | **70/70** test, 13 file (62 preesistenti + 8 nuovi) |
| `npm run build` | **PASS** | **55 route**, proxy attivo, 6 route API |
| `npm run e2e` | **PASS** | **26/26** test, 4 spec (15 auth reali + 1 security + 7 demo + 3 dark mode), 2,2 min |
| `npx supabase test db` | **PASS** | **656/656** pgTAP, 15 file |
| `npm audit --omit=dev` | **PASS** | 0 vulnerabilità di produzione |
| `npm audit` (completo) | **PARZIALE** | 5 advisory `high` solo devDependencies (tooling lint), nessun fix non-breaking disponibile |
| `node scripts/scan-secrets.mjs --selftest` | **PASS** | 6/6 casi |
| `node scripts/scan-secrets.mjs` | **PASS** | 285 file, 0 findings |
| HTTP build produzione `:3100` | **PASS** | `/login`, `/`, `/prezzi` → 200; CSP/HSTS/XFO/nosniff/Referrer/Permissions presenti; `X-Powered-By` assente |
| Browser QA 16 pagine demo | **PASS** | 0 errori console; 0 immagini senza alt; 0 bottoni vuoti; 0 campi senza label; `h1` presente su tutte dopo il fix |
| Browser QA pagine pubbliche | **PASS** | `/`, `/prezzi`, `/login` → 0 errori console |
| API vocale anonima | **PASS** | `POST /api/internal/voice/calls` → 401 |
| `/dashboard` anonimo | **PASS** | 307 → login |
| Bundle client | **PASS** | Nessun valore di `SUPABASE_SERVICE_ROLE_KEY`; solo testo UI che nomina `RECEPTIONIST_INTERNAL_*` |
| MCP read smoke (6 servizi) | **PASS** | GitHub, Supabase, Vercel, Sentry, Linear, Notion |

### Test falliti durante il lavoro e risoluzione

1. **E2E, 2 test falliti** dopo l'aggiunta degli `h1`: strict mode violation per heading duplicato e per "Kitchen Display System". **Causa:** due heading con lo stesso nome accessibile. **Correzione:** `EmptyState` con `headingLevel` e `h1` KDS distinto. **Esito:** 25/25 al momento, **26/26** nella suite finale con il nuovo test di sicurezza.
2. **Lint fallito** durante un'esecuzione parallela a Playwright: race sui file temporanei `test-results/`. **Correzione:** aggiunti `test-results/**` e `playwright-report/**` a `globalIgnores`. **Riesito:** lint pulito.
3. **Docker spento** all'inizio: stack Supabase non disponibile. **Azione:** avviato Docker Desktop; pgTAP e E2E eseguiti con successo.
4. **Prima esecuzione CI (run #39799160801):** `quality` fallito su `typecheck` perché `LayoutProps`/`PageProps` sono tipi generati da Next e il runner pulito non aveva `.next`; `security` fallito perché lo scanner rilevava il proprio pattern `private-key` alla riga 143. **Correzione:** aggiunto `next typegen` allo script `typecheck` e auto-esclusione di `scripts/scan-secrets.mjs` (con caso di selftest dedicato). **Verifica locale:** typecheck verde anche senza `.next`, 285 file scansionati, 0 finding, selftest 6/6. **Seconda esecuzione CI:** da verificare.

### Test non eseguiti e motivi

| Test | Motivo |
|---|---|
| CI GitHub Actions (seconda esecuzione) | La prima è fallita su typecheck e falso positivo dello scanner, entrambi corretti; l'esito della seconda esecuzione è da verificare |
| Deploy preview/produzione Vercel | Richiede approvazione e configurazione progetto |
| Webhook Stripe/Twilio/Resend (firma, replay, duplicati) | **Nessuna integrazione webhook esiste nel codice** |
| Sandbox reale provider vocale | Mancano provider, numero e budget |
| MFA | Non implementata |
| Test di carico/performance | Non previsti nella suite attuale |
| DAST/fuzzing | Fuori perimetro di questa sessione |
| Scansione cronologia Git completa | Solo working tree scansionato (rischio residuo) |
| `Secure` cookie su HTTPS | Verificabile solo in produzione HTTPS |

---

## 6. Requisiti della missione — stato

### 6.1 Regole operative e inventario

| Requisito | Stato |
|---|---|
| Verifica directory, branch, stato Git, identità progetto | COMPLETATO E VERIFICATO |
| Confronto codice locale/remoto | COMPLETATO E VERIFICATO (`main` = `origin/main`) |
| Inventario completo di pagine, API, action, auth, DB, test, CI | COMPLETATO E VERIFICATO |
| Esclusione Revit | COMPLETATO E VERIFICATO |
| Nessuna dichiarazione senza verifica | COMPLETATO E VERIFICATO |
| Conservazione lavoro utente e branch dedicato | COMPLETATO E VERIFICATO |
| Nessuna operazione distruttiva | COMPLETATO E VERIFICATO (nessuna eseguita) |
| Nessun segreto in output/report | COMPLETATO E VERIFICATO |
| Nessuna modifica in produzione | COMPLETATO E VERIFICATO (nessuna eseguita) |

### 6.2 Architettura e qualità

| Requisito | Stato |
|---|---|
| TypeScript strict e typecheck | COMPLETATO E VERIFICATO |
| Lint attivo e non ignorato in CI | COMPLETATO E VERIFICATO |
| Build indipendente verificata | COMPLETATO E VERIFICATO |
| Riduzione duplicazioni/codice morto | PARZIALE (solo interventi mirati) |
| Gestione errori centralizzata e validazione input | COMPLETATO E VERIFICATO (Zod su action sensibili, errori API generici) |
| Accessibilità, responsive, loading, error state | PARZIALE (fix a11y e QA browser; Lighthouse non rieseguito) |
| Compatibilità funzionalità esistenti | COMPLETATO E VERIFICATO (E2E verdi) |
| Aggiornamento dipendenze | NON APPLICABILE (nessun aggiornamento; 0 vulnerabilità prod) |

### 6.3 Sicurezza applicativa

| Requisito | Stato |
|---|---|
| Login/logout/registrazione/recupero/conferma/sessione | COMPLETATO E VERIFICATO |
| Autorizzazioni server-side su endpoint/action | COMPLETATO E VERIFICATO |
| Ruoli non elevabili dal client | COMPLETATO E VERIFICATO |
| Minimo privilegio | COMPLETATO E VERIFICATO (grant e policy) |
| MFA admin | NON IMPLEMENTATO |
| Isolamento multi-tenant | COMPLETATO E VERIFICATO (RLS + pgTAP) |
| Policy SELECT/INSERT/UPDATE/DELETE | COMPLETATO E VERIFICATO |
| Ruoli PostgreSQL, grant, `SECURITY DEFINER`, `search_path` | COMPLETATO E VERIFICATO |
| `service_role` solo server | COMPLETATO E VERIFICATO |
| Storage policy | NON APPLICABILE (nessun bucket) |
| SQL injection | COMPLETATO E VERIFICATO (revisione statica, RPC parametrizzate) |
| XSS | COMPLETATO E VERIFICATO (nessun HTML non sanitizzato, CSP) |
| CSRF | PARZIALE (protezioni framework; nessun test dedicato) |
| SSRF | NON APPLICABILE (nessuna fetch di URL utente) |
| IDOR/BOLA | COMPLETATO E VERIFICATO (RLS + pgTAP) |
| Open redirect | COMPLETATO E VERIFICATO (E2E) |
| Rate limiting | PARZIALE (voice bootstrap; login delegato a Supabase) |
| CORS restrittivo | NON APPLICABILE (nessuna API cross-origin) |
| CSP/HSTS/nosniff/Referrer/Permissions | COMPLETATO E VERIFICATO |
| Cookie HttpOnly/Secure/SameSite | COMPLETATO E VERIFICATO (HttpOnly/Lax runtime; Secure prod-only) |
| Errori senza dettagli interni | COMPLETATO E VERIFICATO |
| Sicurezza upload file | NON APPLICABILE (nessun upload) |
| HTML/AI non sanitizzati | NON APPLICABILE (nessun runtime AI) |
| Segreti in codice/bundle/log | COMPLETATO E VERIFICATO (working tree) |
| Inventario credenziali senza valori | COMPLETATO E VERIFICATO |

### 6.4 Stripe, Twilio, Resend, AI

| Requisito | Stato |
|---|---|
| Webhook Stripe con firma raw + idempotenza | NON APPLICABILE (nessuna integrazione) |
| Prezzi/piani/stato abbonamento non dal client | COMPLETATO E VERIFICATO (piano solo richiesto, nessuna attivazione automatica) |
| Pagamenti/idempotenza/doppie attivazioni | NON APPLICABILE (nessun pagamento) |
| Test Stripe test mode | NON APPLICABILE (nessuna integrazione) |
| Webhook Twilio/Resend | NON APPLICABILE (nessuna integrazione) |
| Protezione abuso/costi invii | NON APPLICABILE (nessun invio) |
| Consenso/disiscrizione marketing | NON APPLICABILE |
| Protezione chiavi AI | NON APPLICABILE (nessun provider AI) |
| Prompt injection/tenant isolation nel modello | NON APPLICABILE (modello non collegato) |
| Limiti costo/timeout AI | PARZIALE (limiti a DB per chiamate vocali; provider non collegato) |
| Test sandbox provider | BLOCCATO DA ACCESSI O CREDENZIALI |

### 6.5 Penetration test autorizzato (solo locale)

| Test | Stato |
|---|---|
| Accesso anonimo endpoint protetti | COMPLETATO E VERIFICATO |
| Escalation privilegi | COMPLETATO E VERIFICATO (pgTAP) |
| IDOR/BOLA e isolamento tenant | COMPLETATO E VERIFICATO (pgTAP) |
| SQL injection | COMPLETATO E VERIFICATO (statico) |
| XSS | COMPLETATO E VERIFICATO (statico + CSP) |
| CSRF | PARZIALE |
| SSRF | NON APPLICABILE |
| Rate limiting/abuso | PARZIALE |
| Webhook Stripe/Twilio | NON APPLICABILE |
| Replay/duplicazione webhook | NON APPLICABILE (webhook); idempotenza app verificata |
| Esposizione segreti | COMPLETATO E VERIFICATO |
| Storage non autorizzato | NON APPLICABILE |
| Manipolazione prezzi/ruoli/tenant/abbonamento | COMPLETATO E VERIFICATO |
| Errori sicuri | COMPLETATO E VERIFICATO |

### 6.6 MCP

| Requisito | Stato |
|---|---|
| Verifica configurazione/connessione/tool | COMPLETATO E VERIFICATO (20/23; 3 Google parcheggiati) |
| Test di lettura non distruttivo | COMPLETATO E VERIFICATO |
| Documentazione prerequisiti | COMPLETATO E VERIFICATO |
| Integrazione nel prodotto | NON APPLICABILE (MCP = sviluppo/ops) |
| Google Docs/Sheets/Slides | BLOCCATO DA ACCESSI O CREDENZIALI (parcheggiato) |
| Inventario MCP | COMPLETATO E VERIFICATO |
| Revit | NON APPLICABILE (escluso, non toccato) |

### 6.7 Prodotto

| Requisito | Stato |
|---|---|
| Dashboard/navigazione/responsive/a11y | PARZIALE |
| POS, ordini, tavoli, KDS, magazzino, report | COMPLETATO E VERIFICATO (test esistenti + E2E) |
| Clienti/CRM reale | NON IMPLEMENTATO (esiste solo la demo) |
| Ruoli admin/manager/cassiere/cameriere/cucina | COMPLETATO E VERIFICATO |
| Onboarding/trial/piani | PARZIALE (richiesta piano; nessuna fatturazione) |
| Loading/empty/error state | PARZIALE |
| Performance | NON VERIFICATO |
| Design coerente e moderno | PARZIALE (verifica visiva campione, non sistematica) |
| Nessuna funzione finta | PARZIALE (le azioni coperte da E2E funzionano; non tutte le UI sono state provate) |
| QR menu | NON APPLICABILE (non richiesto) |

### 6.8 CI/CD e deploy

| Requisito | Stato |
|---|---|
| Installazione riproducibile | COMPLETATO E VERIFICATO in locale (`npm ci` implicito nel setup; lockfile presente) |
| Lint/typecheck/test/build in CI | IMPLEMENTATO, NON ANCORA VERIFICATO |
| pgTAP in CI | IMPLEMENTATO, NON ANCORA VERIFICATO |
| E2E in CI | IMPLEMENTATO, NON ANCORA VERIFICATO |
| Audit dipendenze/secret scan/CodeQL | IMPLEMENTATO, NON ANCORA VERIFICATO |
| Preview deploy | NON IMPLEMENTATO |
| Deploy produzione | NON ESEGUITO (richiede approvazione) |

---

## 7. MCP — sintesi

| Indicatore | Valore |
|---|---|
| Server configurati | 23 |
| Installati, connessi e testati | 20 |
| Parcheggiati (Google) | 3 |
| Test bloccati | 0 |
| Integrati nel runtime del prodotto | 0 (non applicabile) |
| Segreti nel repository | 0 |

Dettaglio: `docs/MCP_INVENTORY.md`; piano: `docs/MCP_INTEGRATION_PLAN.md`; evidenze: `docs/MCP_INSTALLATION_REPORT.md`.

---

## 8. Dipendenze vulnerabili residue

- `npm audit --omit=dev`: **0 vulnerabilità** di produzione (22/10/2026).
- `npm audit` completo: **5 advisory `high` solo in devDependencies**, catena `eslint-config-next@16.4.2` → `@next/eslint-plugin-next@16.4.2` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3` (stack-exhaustion DoS). `braces` è già all'ultima versione (3.0.3): non esiste una patch; l'unico fix proposto da npm è un downgrade breaking di `eslint-config-next` a 14.2.35, **non applicato** perché romperebbe la configurazione Next 16.
- Impatto: solo tooling di lint in sviluppo/CI, non incluso nel bundle di produzione.
- Nessuna dipendenza aggiunta da questo audit.
- Azione: monitorare un aggiornamento upstream di `fast-glob`/`micromatch`/`braces` o di `eslint-config-next`; non usare `npm audit fix --force`.

---

## 9. Migrazioni e configurazioni che richiedono approvazione

| Voce | Stato |
|---|---|
| Nuove migrazioni in questo audit | Nessuna |
| 19 migrazioni esistenti | Applicate **solo** al database locale |
| Migrazioni su Supabase cloud | **Da approvare** (credenziali e progetto non configurati) |
| Modifiche DNS/WAF Cloudflare | **Da approvare** |
| Deploy Vercel preview/produzione | **Da approvare** |
| Webhook/pagamenti Stripe, SMS Twilio, email Resend | **Da approvare** e da implementare |
| Rotazione chiavi esistenti | Non eseguita (nessuna compromissione accertata) |

Nessuna migrazione distruttiva è stata creata o eseguita.

---

## 10. Rischi ancora aperti

1. MFA assente per account amministrativi.
2. Rate limiting non distribuito (solo in memoria, solo voice bootstrap).
3. CSP con `'unsafe-inline'` per gli script Next.
4. Nessun monitoraggio errori runtime (Sentry SDK assente).
5. Scansione segreti limitata al working tree.
6. `audit_logs` inseribili da membri del tenant.
7. CSRF non coperto da test dedicati.
8. Nessun test di carico/performance.
9. Dipendenza della CSP dalla variabile Supabase in fase di build.
10. Integrazioni Stripe/Twilio/Resend/provider vocale non implementate: non dichiararle operative.
11. 5 advisory `high` dev-only (tooling lint) senza patch non-breaking: monitorare upstream, non forzare downgrade.

---

## 11. Modifiche in produzione non effettuate

- Nessun deploy (Vercel o altro).
- Nessuna modifica a DNS, WAF o risorse Cloudflare.
- Nessuna migrazione su database remoto.
- Nessun pagamento, rimborso o fattura Stripe.
- Nessun SMS o email reale.
- Nessuna pubblicazione su Canva/Figma/Notion/Linear/Zapier.
- Nessuna modifica al server globale `revit-2027`.

---

## 12. Passaggi manuali necessari

1. **Revisione del branch** `audit/hardening-sicurezza` e del diff; nessun merge automatico.
2. **Push** su `origin` (autorizzato da `AGENTS.md`, regola 12) e verifica della **prima esecuzione CI** (quality, security, CodeQL, pgTAP, E2E).
3. Se la CI fallisce: correggere e ripetere; non disattivare i controlli.
4. **Approvazione** per merge su `main`.
5. **Vercel:** collegare il progetto, impostare le env (inclusa `NEXT_PUBLIC_SUPABASE_URL` HTTPS) e autorizzare i preview deploy.
6. **Supabase cloud:** creare il progetto dedicato, applicare le migrazioni con backup e approvazione.
7. **Sentry:** aggiungere SDK/DSN e release.
8. **Cloudflare:** valutare WAF/rate limiting con approvazione.
9. **Google MCP:** fornire OAuth Client ID/Secret e completare i login (parcheggiato).
10. **Stripe/Twilio/Resend/provider vocale:** implementare le integrazioni prima di qualsiasi test reale; usare solo sandbox.
11. **MFA:** pianificare l'enrollment TOTP per owner/admin.
12. **Scansione storica Git:** eseguire gitleaks/trufflehog una tantum.

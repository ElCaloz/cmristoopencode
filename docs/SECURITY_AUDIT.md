# Security Audit — CM Risto

**Data:** 22 ottobre 2026
**Repository:** `C:\Users\calos\CM-Risto` — remote `ElCaloz/cmristoopencode`
**Branch audit:** `audit/hardening-sicurezza` (creato da `main`, commit base `d07d00b`)
**Ambito:** applicazione Next.js 16, route API interne, Server Actions, proxy, autenticazione, schema PostgreSQL/Supabase, migrazioni, RLS, RPC, test, CI/CD, documentazione.
**Escluso:** Revit e qualsiasi integrazione Revit (anche `revit-2027` MCP globale, non toccato).
**Riferimenti:** OWASP ASVS 4.0, OWASP Top 10 2021, Supabase RLS best practice.

---

## 1. Metodo e limiti

1. Inventario statico del repository (`package.json`, lockfile, configurazioni, 178 file TS/TSX, 19 migrazioni, 15 file pgTAP, 13 file unit, 4 spec Playwright).
2. Revisione manuale di: proxy/sessione, client Supabase server/admin, Server Actions dei 12 moduli, route API vocali, servizio locale, policy RLS, funzioni `security definer`, grant, trigger di gerarchia ruoli, onboarding, redirect.
3. Verifiche dinamiche **solo su copia locale**: stack Supabase Docker, build di produzione su `:3100`, browser automation, test pgTAP/E2E.
4. Nessuna modifica a produzione, nessun deploy, nessun pagamento/SMS/email reale, nessuna modifica DNS.
5. Nessun valore di segreto è stato letto, stampato o copiato nei report. Le verifiche sui bundle cercano **nomi di variabili**, non valori.

**Limiti dichiarati:** non è stata eseguita una revisione forense dell'intera cronologia Git; non sono stati eseguiti fuzzing/DAST, test di carico o penetration test infrastrutturali; il runtime di produzione (Vercel/Supabase cloud) non è stato testato perché non esiste un deploy autorizzato.

---

## 2. Sintesi esecutiva

| Esito | Numero |
|---|---|
| Problemi confermati corretti in questo audit | 5 |
| Problemi confermati ancora aperti (accettati o da pianificare) | 2 |
| Rischi potenziali documentati | 5 |
| Vulnerabilità critiche o alte confermate | 0 |
| Tabelle senza RLS | 0 su 36 |
| Segreti trovati nei file tracciati | 0 (285 file scansionati) |
| Vulnerabilità dipendenze di produzione | 0 (`npm audit --omit=dev`) |
| Vulnerabilità devDependencies (tooling lint) | 5 high, senza fix non-breaking (dettaglio §7 R-11) |

Lo stato di sicurezza è **buono per un MVP multi-tenant**: RLS presente su tutte le tabelle, autorizzazioni server-side, `service_role` confinato al server, token vocali HMAC con confronto timing-safe, onboarding che non attiva piani senza pagamento. Le lacune principali erano di **hardening perimetrale e processi CI**, non di isolamento dati.

---

## 3. Architettura e superfici d'attacco

| Superficie | File / area | Note |
|---|---|---|
| Proxy sessioni | `src/proxy.ts`, `src/lib/supabase/proxy.ts` | Redirect aree protette, refresh cookie; non è autorizzazione |
| Autenticazione | `src/server/auth/*`, `src/app/auth/callback/route.ts`, pagine auth | Supabase Auth SSR, PKCE, redirect con allowlist |
| Server Actions | `src/server/*/actions.ts` (12 moduli) | Zod + sessione + permessi + RPC |
| API interne vocali | `src/app/api/internal/voice/**` (6 route) | Bearer bootstrap + token HMAC per chiamata |
| Servizio locale | `local-service/**` | HTTP su `127.0.0.1`, bearer timing-safe, body 64 KiB |
| Database | `supabase/migrations/**` (19) | 36 tabelle, RLS, RPC `security definer` con `search_path` |
| Storage | — | Nessun bucket utilizzato dall'app |
| Webhook provider | — | Nessun endpoint Stripe/Twilio/Resend presente |
| Superfici client | pagine pubbliche, `/app/*` demo, `/dashboard/*` reale | Nessun `dangerouslySetInnerHTML`, nessun `eval` |

### Credenziali necessarie (solo nomi, nessun valore)

| Variabile | Dove | Tipo | Note |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | server + client | pubblica per design | origine inclusa nella CSP |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | server + client | pubblica per design | protetta da RLS |
| `NEXT_PUBLIC_SITE_URL` | server | pubblica | link email/SEO |
| `SUPABASE_SERVICE_ROLE_KEY` | solo server | **segreta** | usata da `src/lib/supabase/admin.ts`; mai nel bundle |
| `RECEPTIONIST_INTERNAL_TOKEN` | solo server | **segreta** | ≥32 caratteri, bootstrap API voce |
| `RECEPTIONIST_INTERNAL_SECRET` | solo server | **segreta** | ≥32 caratteri, firma HMAC token chiamata |
| `LOCAL_SERVICE_TOKEN` | local-service | **segreta** | ≥32 caratteri, bearer API locale |
| `LOCAL_SERVICE_CLOUD_TOKEN` | local-service | **segreta** | sync cloud (non collegato) |
| `GITHUB_PAT`, `RESEND_API_KEY`, credenziali Twilio/Stripe ecc. | solo credential store/ambiente | **segrete** | usate dagli MCP, non dal prodotto |

Rotazione consigliata: `RECEPTIONIST_INTERNAL_*` e `LOCAL_SERVICE_TOKEN` ogni 90 giorni o immediatamente in caso di sospetta esposizione; `SUPABASE_SERVICE_ROLE_KEY` dalla dashboard Supabase solo previa approvazione.

---

## 4. Problemi confermati e correzioni

### F-01 — Header di sicurezza HTTP assenti (severità: media) — CORRETTO

**Evidenza:** `next.config.ts` non definiva `headers()`; le risposte esponevano `X-Powered-By` e non avevano CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`.

**Correzione:** `src/lib/security/headers.ts` + `next.config.ts`:
- CSP con `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`, `connect-src` limitato a self + origine Supabase;
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrittiva, `X-DNS-Prefetch-Control: off`, `X-Permitted-Cross-Domain-Policies: none`;
- HSTS (`max-age=63072000; includeSubDomains; preload`) e `upgrade-insecure-requests` solo in produzione;
- `poweredByHeader: false`.

**Verifica:** server di produzione locale su `:3100` — `/login` HTTP 200 con tutti gli header attesi, `X-Powered-By` assente; `/`, `/prezzi`, `/login` senza errori console (CSP non bloccante). Test unit `tests/unit/security-headers.test.ts` (3 casi) e test E2E `tests/e2e/security.spec.ts`.

**Limite accettato:** la CSP usa `'unsafe-inline'` per script/stili (necessario al bootstrap inline di Next.js) e `'unsafe-eval'` solo in sviluppo. Una CSP strict con nonce richiederebbe refactoring del rendering e va valutata separatamente.

### F-02 — Cookie di sessione senza flag espliciti (severità: media) — CORRETTO

**Evidenza:** `createServerClient` in `src/lib/supabase/server.ts` e `src/lib/supabase/proxy.ts` non impostava `cookieOptions`; i cookie ereditavano i default della libreria, senza `HttpOnly` esplicito. Non esiste alcun browser client Supabase, quindi i cookie sono usati solo lato server.

**Correzione:** `src/lib/supabase/cookie-options.ts` con `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `secure` solo in produzione; passato a entrambi i client server.

**Verifica:** test E2E su login reale (`tests/e2e/auth.spec.ts`): i cookie `sb-*-auth-token*` hanno `httpOnly === true` e `sameSite === "Lax"`. Flussi di registrazione, conferma email, onboarding, logout, recupero password e sessione scaduta: tutti verdi. Il flag `Secure` è attivo solo con `NODE_ENV=production` e non è verificabile su HTTP locale: resta **implementato, non verificato a runtime in produzione**.

### F-03 — Nessun rate limiting sull'avvio chiamata vocale (severità: bassa-media) — MITIGATO

**Evidenza:** `POST /api/internal/voice/calls` richiede il token bootstrap ma poteva essere invocato senza limite di frequenza, con costo potenziale lato provider.

**Correzione:** `src/lib/security/rate-limit.ts` (finestra fissa in memoria, 10.000 chiavi max, pruning) applicato alla route: 120 richieste/minuto per IP (`x-forwarded-for`/`x-real-ip`), risposta 429 con `Retry-After`.

**Verifica:** test unit `tests/unit/rate-limit.test.ts` (4 casi); route compilata e verificata senza token (401). Il 429 reale non è stato forzato end-to-end.

**Limite:** in ambiente serverless la memoria è per istanza; non sostituisce un limiter distribuito o il WAF. `x-forwarded-for` è attendibile solo se l'infrastruttura lo sovrascrive (Vercel lo fa).

### F-04 — CI priva di audit dipendenze, secret scanning e analisi statica dedicata (severità: bassa) — CORRETTO

**Evidenza:** `.github/workflows/ci.yml` eseguiva qualità, pgTAP ed E2E, ma non `npm audit`, scansione segreti o CodeQL; nessun `permissions` minimale.

**Correzione:**
- `scripts/scan-secrets.mjs` (pattern per chiavi private, GitHub, Stripe live, Resend, AWS, Google, Slack, JWT; allowlist placeholder; selftest);
- script npm `security:audit` e `security:secrets`;
- job CI `security` (audit produzione + selftest + scansione), job `codeql` (`javascript-typescript`), `dependency-review` sulle PR, `permissions: contents: read` globale e permessi elevati solo dove necessario;
- trigger CI anche sui branch `audit/**`.

**Verifica:** `node scripts/scan-secrets.mjs --selftest` → 6/6; scansione → 285 file, 0 riscontri; `npm audit --omit=dev` → 0 vulnerabilità. **Prima esecuzione CI (22/10/2026):** fallita su `typecheck` (tipi `LayoutProps`/`PageProps` non generati su checkout pulito) e sul falso positivo dello scanner che rilevava il proprio pattern `private-key`. Entrambi corretti (`next typegen` nello script e auto-esclusione dello scanner). **Seconda esecuzione CI (run #39802102414): PASS** — Quality, Security, CodeQL, pgTAP ed E2E verdi; dependency review saltato perché non c'è una PR.

### F-05 — Heading `h1` mancante in due viste (severità: bassa, accessibilità) — CORRETTO

**Evidenza:** browser audit su 16 pagine demo: `/app/cucina` (KDS) e lo stato "Area non disponibile per questo ruolo" non avevano un `h1`.

**Correzione:** `h1` visually-hidden "Cucina demo" nel KDS; `EmptyState` ora accetta `headingLevel` (1 o 2) e lo stato negato usa `h1`. La prima iterazione ha introdotto un duplicato di heading rilevato dall'E2E (strict mode): corretto prima del commit.

**Verifica:** E2E 26/26; browser sulla build di produzione: `/app/cucina` → un solo `h1` "Cucina demo"; `/app/piattaforma` (ruolo senza accesso) → un solo `h1` "Area non disponibile per questo ruolo"; 0 errori console.

### F-06 — Nessun MFA per account amministrativi (severità: media) — APERTO

Supabase Auth supporta TOTP, ma il prodotto non ha enrollment/verifica MFA né policy di enforcement per owner/admin/platform admin. Richiede una migrazione/UX dedicata e test. **Stato: NON IMPLEMENTATO.**

### F-07 — Log di audit inseribili da qualsiasi membro del tenant (severità: bassa) — ACCETTATO

Le policy consentono a un membro autenticato di inserire righe `audit_logs` per la propria organizzazione con `actor = auth.uid()`. Non c'è isolamento cross-tenant, ma un membro può produrre eventi di audit arbitrari (log forging) nel proprio tenant. Rischio basso e accettato per l'MVP; mitigazione futura: insert solo via RPC privilegiate o trigger.

---

## 5. Controlli verificati (nessun problema confermato)

### 5.1 Autenticazione e sessioni

- Login, registrazione, conferma email, recupero/reimpostazione password, logout, sessione scaduta: coperti da **15 test E2E reali** con Mailpit e Supabase locale.
- `safeNextPath` (`src/lib/auth/redirect.ts`) accetta solo path relativi con prefissi allowlist (`/dashboard`, `/onboarding`, `/reimposta-password`), rifiuta URL assoluti, `//`, backslash e caratteri di controllo. Test E2E con `next=https://evil.example` → nessun redirect esterno.
- Messaggi di errore auth generici ("Email o password non corretti") per limitare l'enumerazione.
- `getSessionContext` usa `supabase.auth.getUser()` (verifica lato Auth), non solo il cookie.
- Nessuna elevazione a platform admin dal client: `platform_admins` non ha policy di insert/update; il flag è letto dalla tabella.
- Piano richiesto in onboarding (`requested_plan`) non attiva l'abbonamento: `plan_status` resta `requested` finché non interviene un processo amministrativo.

### 5.2 Multi-tenancy e database

- **36/36 tabelle con RLS attiva** (verifica statica su tutte le migrazioni).
- Policy `select/insert/update/delete` per ruolo/permesso; scritture dirette revocate su prenotazioni, chiamate, messaggi, movimenti di magazzino, ricette, acquisti; mutazioni solo via RPC atomiche.
- Funzioni `security definer` con `search_path = public, pg_temp`; grant limitati; `service_role` usato solo server-side.
- Trigger `enforce_membership_role_hierarchy` contro l'assegnazione di ruoli superiori; test pgTAP di escalation.
- **656/656 test pgTAP** superati, inclusi isolamento cross-tenant, escalation, idempotenza, stock negativo, ruoli e RLS.
- Nessun bucket Storage: controllo storage **non applicabile**.

### 5.3 API e browser

- SQL injection: nessuna SQL raw costruita in TypeScript; accesso via client Supabase e RPC parametrizzate.
- XSS: nessun `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`; React escaping + CSP.
- SSRF: nessuna fetch server-side di URL controllati dall'utente (le API vocali non scaricano URL).
- CSRF: Server Actions con controllo Origin/Host di Next.js; le API interne usano bearer token, non cookie di sessione, quindi non sono CSRF-sensitive. Nessun test CSRF dedicato: **parziale**.
- IDOR/BOLA: RLS + verifiche di membership/tenant nelle RPC; test pgTAP dedicati.
- Open redirect: bloccato e testato.
- Errori: le API vocali mappano gli errori DB su codici generici senza stack trace; il client non riceve dettagli interni.
- Upload file: nessuna funzione di upload nel prodotto → **non applicabile**.
- CORS: nessuna API cross-origin; CSP `connect-src` ristretta → **non applicabile** una policy CORS aggiuntiva.

### 5.4 Segreti e bundle

- Nessun `.env` tracciato (solo `.env.example` con placeholder); `.gitignore` copre `.env*`.
- `SUPABASE_SERVICE_ROLE_KEY` non compare nel bundle client; la ricerca in `.next/static` trova solo testo UI che nomina `RECEPTIONIST_INTERNAL_*` (nessun valore).
- Secret scanner: 285 file, 0 findings; selftest 6/6.
- Cronologia Git: non scansionata integralmente in questo audit (rischio residuo).

### 5.5 Servizio locale

- Bearer token con `timingSafeEqual`, body max 64 KiB, `nosniff`, `no-store`, errori JSON; health senza dati sensibili; ascolto di default su `127.0.0.1`. Nessuna esposizione pubblica prevista.

---

## 6. Stripe, Twilio, Resend, AI — stato reale

| Area | Stato nel codice | Verifica possibile | Esito |
|---|---|---|---|
| Stripe pagamenti/webhook | **Nessuna integrazione runtime**; solo testi marketing ("provider come Stripe") | Non applicabile | **NON APPLICABILE** |
| Twilio SMS/chiamate | **Nessuna integrazione runtime**; telefonia non collegata | Non applicabile | **NON APPLICABILE** (MCP Twilio connesso e testato in lettura) |
| Resend email | **Nessuna integrazione runtime**; email auth gestite da Supabase/Mailpit locale | Non applicabile | **NON APPLICABILE** (MCP Resend connesso, nessun dominio) |
| AI provider (LLM/voce) | **Nessun provider collegato**; API interne e token pronti | Non applicabile | **BLOCCATO DA ACCESSI O CREDENZIALI** |

Non esistono endpoint webhook da testare, quindi non è stata simulata alcuna verifica di firma, replay o idempotenza webhook. L'idempotenza è invece verificata per ordini, pagamenti POS, movimenti di magazzino, ricezioni e prenotazioni tramite pgTAP/E2E.

**AI / prompt injection:** il modello non è nel runtime, quindi non esiste una superficie di prompt injection applicativa. Le API vocali sono comunque confinate al tenant della chiamata tramite token firmato (call id, restaurant id, organization id, scadenza) e non accettano tenant id dal body. Limiti di costo previsti a DB (`max_daily_calls`, `max_call_seconds`) ma non esercitati con un provider reale.

---

## 7. Rischi residui

| ID | Rischio | Gravità | Stato / mitigazione |
|---|---|---|---|
| R-01 | MFA assente per admin | Media | Da pianificare; Supabase TOTP disponibile |
| R-02 | Rate limiting solo in memoria e solo su voice bootstrap | Bassa | Documentato; valutare Redis/WAF prima della produzione |
| R-03 | CSP permissiva su inline script (`'unsafe-inline'`) | Bassa | Accettata; valutare nonce/hash |
| R-04 | Scansione segreti solo working tree, non cronologia Git | Bassa | Eseguire una scansione storica una tantum (gitleaks/trufflehog) |
| R-05 | Nessun monitoraggio errori runtime (Sentry SDK assente) | Bassa | Collegare Sentry prima del deploy produzione |
| R-06 | `audit_logs` inseribili da membri del tenant | Bassa | Accettato per MVP |
| R-07 | HSTS `preload` non richiesto ufficialmente | Bassa | Token presente ma nessuna submission; verificare prima di preload |
| R-08 | CSP `connect-src` calcolata a build time da env | Media operativa | Assicurare `NEXT_PUBLIC_SUPABASE_URL` in build Vercel, altrimenti le chiamate Supabase vengono bloccate |
| R-09 | Nessun test CSRF/DAST/fuzzing automatizzato | Bassa | Framework protections + token API; aggiungere test mirati |
| R-10 | Segreti locali in `.env.local` non cifrati | Bassa | File ignorato; rotazione in caso di compromissione della macchina |
| R-11 | 5 advisory `high` in devDependencies (catena `eslint-config-next@16.4.2` → `@next/eslint-plugin-next` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`, stack-exhaustion DoS) | Bassa (solo tooling) | Nessuna versione patch di `braces` disponibile (latest 3.0.3); l'unico fix proposto è un downgrade breaking di `eslint-config-next` a 14.2.35, non applicato. Non entra nel bundle di produzione. Monitorare upstream |

---

## 8. Test di sicurezza eseguiti

| Controllo | Comando / modalità | Esito |
|---|---|---|
| Header di sicurezza (produzione) | HTTP su build `next start :3100`, `/login` | PASS — CSP, HSTS, XFO, nosniff, Referrer, Permissions; no `X-Powered-By` |
| Header + redirect + API anonima | `tests/e2e/security.spec.ts` | PASS |
| Cookie sessione HttpOnly/SameSite | E2E login reale, `auth.spec.ts` | PASS (`HttpOnly`, `Lax`) |
| Accesso anonimo `/dashboard` | HTTP + E2E | PASS — 307 → `/login` |
| API vocale senza token | `POST /api/internal/voice/calls` | PASS — 401 |
| Escalation ruoli / isolamento tenant | pgTAP | PASS — 656/656 |
| Open redirect | E2E `next=https://evil.example` | PASS |
| Segreti nei file tracciati | `node scripts/scan-secrets.mjs` | PASS — 285 file, 0 findings |
| Segreti nel bundle client | ricerca nomi in `.next/static` | PASS — nessun valore |
| Dipendenze di produzione | `npm audit --omit=dev` | PASS — 0 vulnerabilità |
| Dipendenze di sviluppo | `npm audit` | 5 high dev-only, senza fix non-breaking (R-11); non nel bundle |
| Unit security helpers | Vitest | PASS — 70/70 totali |
| Browser QA 16 pagine demo | console + DOM | PASS — 0 errori, 0 immagini senza alt, 0 campi senza label |

---

## 9. Requisiti di sicurezza — stato

| Requisito | Stato |
|---|---|
| Verifica login/logout/registrazione/recupero/sessione | COMPLETATO E VERIFICATO |
| Autorizzazioni server-side su action/API | COMPLETATO E VERIFICATO |
| Multi-tenancy e RLS su tutte le tabelle | COMPLETATO E VERIFICATO |
| Ruoli/gerarchia non elevabili dal client | COMPLETATO E VERIFICATO |
| `service_role` solo server | COMPLETATO E VERIFICATO |
| Storage policy | NON APPLICABILE (nessun bucket) |
| MFA admin | NON IMPLEMENTATO |
| Rate limiting endpoint sensibili | PARZIALE (voice bootstrap in memoria; login delegato a Supabase) |
| CORS restrittivo | NON APPLICABILE (nessuna API cross-origin) |
| Header/CSP/HSTS/cookie | COMPLETATO E VERIFICATO (Secure solo produzione: implementato, non verificato su HTTPS) |
| Webhook Stripe/Twilio/Resend | NON APPLICABILE (nessuna integrazione webhook) |
| Segreti assenti dal repository/client | COMPLETATO E VERIFICATO (working tree) |
| Scansione cronologia Git | NON IMPLEMENTATO |
| CI security gates | COMPLETATO E VERIFICATO (run #39802102414: Security e CodeQL verdi; dependency review configurato ma saltato perché non c'è una PR) |
| Dipendenze vulnerabili | PARZIALE — 0 in produzione; 5 high dev-only senza fix non-breaking |
| MCP verificati in lettura | COMPLETATO E VERIFICATO |
| Monitoraggio errori produzione | NON IMPLEMENTATO (Sentry non collegato al runtime) |

---

## 10. Azioni manuali consigliate prima della produzione

1. Configurare un progetto Supabase cloud dedicato e applicare le 19 migrazioni **con approvazione esplicita**; ruotare le chiavi locali.
2. Impostare su Vercel `NEXT_PUBLIC_SUPABASE_URL` (HTTPS), `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` prima della build (vincolo CSP).
3. Abilitare MFA TOTP per gli account owner/admin; definire procedura di recovery.
4. Valutare Cloudflare WAF/rate limiting sul dominio di produzione (richiede approvazione e accesso zona).
5. Collegare Sentry (DSN lato server/client) e release/source map.
6. Eseguire una scansione della cronologia Git con gitleaks/trufflehog e conservare l'esito.
7. Aggiungere test CSRF espliciti e, se possibile, un DAST leggero su staging.
8. Verificare HSTS/preload solo dopo aver confermato che tutti i sottodomini sono HTTPS.
9. Programmare la rotazione dei token `RECEPTIONIST_INTERNAL_*` e `LOCAL_SERVICE_TOKEN`.
10. Non abilitare pagamenti/telefonia reali finché non esistono integrazioni, webhook firmati, idempotenza e test sandbox dedicati.
11. Monitorare l'advisory dev-only su `braces`/`fast-glob`/`eslint-config-next`; applicare un aggiornamento upstream appena disponibile, senza `npm audit fix --force`.

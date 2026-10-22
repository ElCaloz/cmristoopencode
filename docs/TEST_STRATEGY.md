# Test Strategy — CM Risto

**Data:** 22 ottobre 2026
**Ambito:** applicazione Next.js 16, Server Actions, API interne, database Supabase/PostgreSQL, RLS, servizio locale, UI reale e demo.
**Obiettivo:** impedire regressioni funzionali e di sicurezza, con verifiche ripetibili in locale e in CI, senza dipendere da servizi a pagamento.

---

## 1. Principi

1. **La verità è nel codice e nei test eseguiti**, non nella documentazione.
2. Ogni correzione di sicurezza o bug significativo deve avere un test di regressione.
3. I test critici (RLS, autorizzazioni, denaro, idempotenza) sono **bloccanti**.
4. I test esterni (Stripe, Twilio, Resend, provider vocale) usano solo sandbox/mock; se l'integrazione non esiste, il test è dichiarato **non applicabile**, non simulato.
5. Nessun test contiene segreti o dati personali reali; dataset sintetici e cleanup automatico.
6. La pipeline fallisce se un controllo obbligatorio fallisce; non si disattivano test per ottenere una build verde.

---

## 2. Piramide e suite attuali

| Livello | Strumento | File | Test | Durata tipica |
|---|---|---|---|---|
| Unit | Vitest 5 | `tests/unit/**` | **70** | ~1 s |
| Database/RLS | pgTAP + Supabase CLI | `supabase/tests/**` (15 file) | **656** | ~20–40 s |
| End-to-end | Playwright | `tests/e2e/**` (4 spec) | **26** | ~2,5 min |
| Build | Next.js | — | 55 route | ~1 min |
| Statici | ESLint 9, TypeScript 5 strict | — | 0 errori | ~20–40 s |
| Sicurezza | npm audit, secret scanner, E2E security | — | 0 vuln prod / 0 segreti; 5 advisory high dev-only (lint) | ~1 min |

### Composizione E2E

| Spec | Test | Copertura |
|---|---|---|
| `auth.spec.ts` | 15 | registrazione + conferma email + onboarding, login/logout, sessione scaduta, open redirect, recupero password, menu, sala/piantina, POS, vendite, KDS, dispositivi, PIN operatore, prenotazioni/receptionist, magazzino, ricette, acquisti |
| `security.spec.ts` | 1 | header di sicurezza, redirect aree protette, API vocale anonima |
| `demo.spec.ts` | 7 | idratazione demo, POS demo, cambio ruolo/KDS, super admin, restrizioni ruoli, piantina demo, reset dati |
| `dark-mode.spec.ts` | 3 | tema di sistema, tema chiaro, contrasto home |

### Composizione unit

- token receptionist (HMAC, scadenza, confronto);
- servizio locale (coda, deduplica, ESC/POS, API bearer);
- quantità/valori magazzino, costo ricette, totali acquisti;
- redirect sicuri (`safeNextPath`);
- **nuovi:** header di sicurezza (3), rate limiter (4), selftest secret scanner (1).

---

## 3. Ambienti e prerequisiti

### Locale (verificato il 22/10/2026)

| Componente | Configurazione |
|---|---|
| Node.js | v24.19.0, npm 11.17.0 |
| Stack Supabase | Docker Desktop + `npx supabase start`; API `55001`, DB `55002`, Studio `55003`, Mailpit `55004`, Analytics `55005`, pooler `55006` |
| App E2E | dev server Next su `http://localhost:3000` (avviato da Playwright) |
| Build produzione | `npm start -- -p 3100` |
| Variabili | `.env.local` (non committato) con URL/anon key locali e `SUPABASE_SERVICE_ROLE_KEY` per il cleanup E2E |
| Mailpit | cattura email di conferma/recupero; nessun invio reale |

### CI (GitHub Actions)

- `quality`: `npm ci`, lint, typecheck, unit, build local-service, build Next con env placeholder.
- `security`: `npm ci`, `npm run security:audit`, selftest scanner, `npm run security:secrets`.
- `codeql`: analisi statica JavaScript/TypeScript.
- `dependency-review`: solo PR, fallisce su severità alta.
- `database`: `supabase start`, `supabase test db`, stop.
- `e2e`: `supabase start`, generazione `.env.local` da `supabase status -o env`, Playwright Chromium, suite completa, artifact `test-results/` in caso di errore, stop stack.

**Stato CI:** workflow predisposto e ampliato. **Prima esecuzione (22/10/2026):** CodeQL e pgTAP verdi; `quality` fallito su `typecheck` perché i tipi `LayoutProps`/`PageProps` di Next non erano generati su checkout pulito; `security` fallito per un falso positivo dello scanner sul proprio pattern `private-key`. Correzioni applicate (`next typegen` nello script `typecheck`, auto-esclusione dello scanner con selftest 6/6); **seconda esecuzione da verificare** dopo il push.

---

## 4. Comandi ufficiali

| Quando | Comando | Note |
|---|---|---|
| Sempre | `npm run lint` | ESLint, 0 warning tollerati |
| Sempre | `npm run typecheck` | `next typegen` + `tsc --noEmit` + `local-service/tsconfig.json` |
| Logica | `npm test` | Vitest, 70 test |
| Database | `npx supabase test db` | richiede stack attivo, 656 test |
| UI/route | `npm run build` | 55 route |
| Flussi | `npm run e2e` | richiede stack + `.env.local` + service role |
| Servizio locale | `npm run local-service:build` | compilazione TypeScript |
| Sicurezza | `npm run security:audit` | `npm audit --omit=dev --audit-level=high` |
| Segreti | `npm run security:secrets` | scansione file tracciati |
| Selftest scanner | `node scripts/scan-secrets.mjs --selftest` | 5 casi |

---

## 5. Matrice di copertura

| Area | Unit | pgTAP | E2E | Note |
|---|---|---|---|---|
| Auth (login/registrazione/recovery/logout) | — | 28 | 15 | Mailpit + Supabase locale |
| Ruoli e permessi | — | 14 escalation | ruoli demo + dashboard | gerarchia a DB |
| Multi-tenancy / RLS | — | 30 RLS + test per modulo | indiretto | 36/36 tabelle RLS |
| Menu | — | 30 | sì | |
| Sala/tavoli/piantina | — | 34 + 33 | sì (reale + demo) | geometria interi |
| POS/ordini/pagamenti | — | 58 | sì | idempotenza |
| KDS | — | 41 | sì | state machine |
| Dispositivi/PIN | — | 59 + 81 | sì | token hashati, lockout |
| Prenotazioni/receptionist | token (unit) | 72 | sì | HMAC, disponibilità |
| Magazzino | quantità/valori | 23 | sì | stock mai negativo |
| Ricette/food cost | costi | 34 | sì | BigInt |
| Acquisti | totali | 61 | sì | ricezione unica |
| API vocali | token (unit) | — | 401 anonimo | rate limit unit |
| Header/cookie sicurezza | 3 | — | 1 + cookie assert | produzione verificata via HTTP |
| Secret scanning | 1 | - | - | 285 file, 0 findings |
| Accessibilità base | — | — | browser QA 16 pagine | h1/alt/label/console |
| Stripe/Twilio/Resend webhook | — | — | — | **non applicabile** (nessuna integrazione) |
| Provider AI / prompt injection | — | — | — | **non applicabile** (modello non collegato) |

---

## 6. Test di sicurezza (autorizzati, solo locale)

1. **Accesso anonimo**: `/dashboard` → 307 login; API vocale → 401; `/onboarding`, `/reimposta-password` protetti.
2. **Escalation**: pgTAP su assegnazione ruoli, platform admin, policy di update.
3. **IDOR/BOLA**: pgTAP cross-tenant per ogni modulo; RLS su tutte le tabelle.
4. **SQL injection**: revisione statica (nessuna SQL concatenata); RPC parametrizzate.
5. **XSS**: nessun HTML non sanitizzato; CSP attiva; React escaping.
6. **CSRF**: Server Actions con Origin check; API a token. Test dedicato assente → parziale.
7. **SSRF**: nessuna fetch di URL utente → non applicabile.
8. **Open redirect**: E2E con URL esterno → bloccato.
9. **Rate limiting**: unit test; 429 non forzato end-to-end.
10. **Webhook/replay**: non applicabile finché non esistono webhook; idempotenza testata su ordini, stock, prenotazioni.
11. **Segreti**: scanner + selftest + bundle scan.
12. **Storage**: nessun bucket → non applicabile.
13. **Errori**: messaggi generici su API/auth; nessuno stack trace al client.

Ogni finding corretto ha un test di regressione dedicato (header, rate limit, scanner, h1, cookie E2E).

---

## 7. Dati di test e cleanup

- E2E auth crea un utente `e2e-owner-*@example.test` e un'organizzazione con nome univoco; il teardown elimina utenti/organizzazioni tramite `SUPABASE_SERVICE_ROLE_KEY` (solo locale).
- Email catturate da Mailpit (`55004`), mai inviate a indirizzi reali.
- Demo `/app/*` usa dati sintetici in `localStorage`, separati dai dati operativi; il reset è un'azione esplicita.
- pgTAP crea e rimuove dataset nel database locale; nessun dato reale.
- Nessun test tocca il progetto Supabase cloud o servizi di pagamento.

---

## 8. Criteri di accettazione

Una modifica è accettabile solo se:

1. `npm run lint` e `npm run typecheck` sono puliti.
2. `npm test` è verde (o i test nuovi coprono la modifica).
3. Se tocca schema/RLS: `npx supabase test db` verde.
4. Se tocca UI/flussi: `npm run build` verde e `npm run e2e` verde.
5. Se tocca dipendenze: `npm run security:audit` e `npm run security:secrets` verdi.
6. Nessun segreto o artefatto entra nel commit.
7. La documentazione di stato (`docs/STATUS.md`, `docs/IMPLEMENTATION_STATUS.md`) riflette i risultati reali.

---

## 9. Lacune e piano di miglioramento

| Lacuna | Impatto | Proposta |
|---|---|---|
| Nessun test CSRF dedicato | Basso | Test su Server Action cross-origin in staging |
| Rate limit 429 non testato E2E | Basso | Test con 121 richieste su istanza dedicata |
| Nessun test di carico/performance | Medio | k6/Artillery su staging; budget p95 |
| Nessuna visual regression | Basso | Playwright screenshot su pagine chiave |
| Nessun test MFA | Medio | Quando implementato: enrollment, challenge, recovery |
| Nessun test webhook provider | Alto quando integreranno | Fixture firmate Stripe/Twilio, replay, duplicati |
| Scansione cronologia Git assente | Basso | gitleaks/trufflehog una tantum + job periodico |
| 5 advisory high dev-only senza patch (braces/fast-glob) | Basso | Monitorare upstream; non usare `npm audit fix --force` |
| Nessun monitoraggio runtime | Medio | Sentry SDK + release + alert |
| E2E solo Chromium | Basso | Aggiungere WebKit/Firefox per le pagine pubbliche |

---

## 10. Reportistica

- Output test reali (data, comando, conteggio, esito) in `docs/IMPLEMENTATION_STATUS.md`.
- I fallimenti non vengono nascosti: causa, correzione e nuova esecuzione sono registrati.
- I test non eseguiti sono elencati con il motivo (credenziali, ambiente, integrazione assente).

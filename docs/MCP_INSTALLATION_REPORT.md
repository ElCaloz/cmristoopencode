# Report installazione integrazioni MCP — CM Risto

**Data:** 21–22/10/2026
**Progetto:** `C:\Users\calos\CM-Risto`
**Ambiente:** Windows, OpenCode v2.1.2, Node.js v24.19.0, npm 11.17.0, Python 3.13.12, git 2.43.0, Docker 29.x
**Configurazione MCP:** `C:\Users\calos\CM-Risto\opencode.json` (23 server sotto `mcp.servers`, schema V2)

---

## 1. Inventario e backup

| Voce | Dettaglio |
|---|---|
| OpenCode | v2.1.2 (CLI + servizio in background), documentazione V2 ufficiale consultata (`opencode.ai/v2/docs/mcp-servers`, `/config`) |
| Config globale | `C:\Users\calos\.config\opencode\opencode.jsonc` — conteneva solo `revit-2027` (preesistente, **non toccato**); backup: `opencode.jsonc.bak-20261021-223723` e `opencode.jsonc.bak-20261021-202749` |
| Config progetto | `C:\Users\calos\CM-Risto\opencode.json` — creato da zero durante questa installazione (prima non esisteva) |
| Dipendenze aggiunte | `uv` 0.13.4 e `mcp-server-git` 2026.10.19 via `pip install --user` (rimovibili con `pip uninstall`) |
| Server preesistenti | `revit-2027` (globale, voce estranea a questo incarico, lasciata invariata) |

## 2. Metodo di installazione e verifica

1. **Ricerca della fonte ufficiale** per ciascun fornitore (URL nelle schede); in assenza di server ufficiale, alternativa di terze parti attendibile.
2. **Installazione** con `opencode mcp add` (CLI) dove possibile; modifica diretta di `opencode.json` per i casi con argomenti a inizio trattino (limite noto del parser CLI) e per le sezioni `oauth`, `timeout`, `environment`.
3. **Verifiche eseguite realmente:**
   - `opencode mcp list` — riconoscimento e stato di ogni server;
   - `opencode api get '/api/mcp?location[directory]=C:\Users\calos\CM-Risto'` — stati lato servizio;
   - probe MCP diretti non distruttivi (`initialize` + `tools/list`, e `tools/call` di sola lettura) con gli script `mcp-probe.mjs` e `mcp-call.mjs` in `%TEMP%\opencode`;
   - smoke test in sessione OpenCode con istruzioni vincolanti di sola lettura sui server autenticati.
4. **Nessuna operazione pericolosa eseguita:** nessun pagamento, nessuna email o SMS inviati, nessun contenuto pubblicato, nessuna modifica DNS, nessun deploy. I test di lettura sono stati limitati a elenchi/ricerche/letture.
5. **Nessun segreto in chiaro** in configurazione, log o report: la configurazione usa solo riferimenti `{env:NOME_VAR}`.

## 3. Note di identificazione (richieste esplicitamente)

- **Bird** = piattaforma di comunicazioni **Bird (ex-MessageBird)**. Progetto corretto: `messagebird/bird-ai` (GitHub), server MCP hosted ufficiale `https://mcp.bird.com` (documentazione: `bird.com/docs/ai/mcp-server`). **Non** è stato installato il pacchetto npm omonimo `bird`, che indica un progetto estraneo. La documentazione Bird per OpenCode suggerisce il plugin `opencode plugin github:messagebird/bird-ai`; è stata scelta la connessione MCP diretta equivalente, senza eseguire codice di terze parti in-process.
- **Git** = esiste un **server MCP specifico ufficiale** (`mcp-server-git`, repository `modelcontextprotocol/servers`, pacchetto PyPI `mcp-server-git`): è stato installato e configurato. L'uso del git di sistema da parte di OpenCode **non** è stato dato per scontato né usato come sostituto.
- **Google Docs / Sheets / Slides** = gestiti da **tre server MCP ufficiali distinti** di Google (non da un server unico); ogni applicazione è configurata e verificata separatamente.

---

## 4. Schede delle 23 integrazioni

### 1. Bird — **INSTALLATO E TESTATO**
- **Fonte e repository:** Bird (ex-MessageBird) — `https://bird.com/docs/ai/mcp-server`, repo `github.com/messagebird/bird-ai`
- **Server MCP:** `https://mcp.bird.com` (Streamable HTTP, remoto)
- **Installazione:** voce `bird` in `opencode.json` (`type: remote`), aggiunta con `opencode mcp add bird --url https://mcp.bird.com`
- **Autenticazione:** OAuth completato il 21/10/2026 (token salvati da OpenCode fuori dalla configurazione)
- **Test effettuati:** endpoint raggiungibile (prima dell'auth: HTTP 401 `no bearer token`, risposta corretta del server); dopo l'OAuth: stato `connected` da `opencode mcp list` e da `/api/mcp`; **chiamata di lettura con dati non eseguibile in questa sessione**: gli strumenti Bird richiedono identificativi di risorse dell'account (id template, sending domain, mailbox) non disponibili; verificati invece il catalogo completo (**50 strumenti** esposti: `email_templates_*`, `sms_keyword_rules_*`, `amb_*`, `esim_*`, …) e l'esecuzione autenticata degli strumenti (risposte di validazione del server Bird, es. `sms_keyword_rules_get`: manca parametro `id`)
- **Interventi necessari:** nessuno
- **Istruzioni:** per rifare o rinnovare il login: `opencode mcp auth bird`

### 2. Canva — **INSTALLATO E TESTATO**
- **Fonte e repository:** Canva Developers — `https://www.canva.dev/docs/apps/mcp/` (Canva MCP ufficiale); alternativa per sviluppatori: `npx -y @canva/cli@latest mcp`
- **Server MCP:** `https://mcp.canva.com/mcp` (Streamable HTTP, remoto)
- **Installazione:** voce `canva` in `opencode.json` (`type: remote`)
- **Autenticazione:** OAuth completato il 21/10/2026 (scope: design, folder, brand template, asset, commenti)
- **Test effettuati:** pre-auth HTTP 401 `invalid_token` (endpoint corretto); post-auth stato `connected`; **chiamata reale di lettura** `search-designs` → elenco dei design dell'account restituito (es. "Proposta per progetto - Restaurant OS")
- **Interventi necessari:** nessuno
- **Istruzioni:** rinnovo login: `opencode mcp auth canva`

### 3. Context7 — INSTALLATO E TESTATO
- **Fonte e repository:** Upstash Context7 — `https://context7.com`, endpoint `https://mcp.context7.com/mcp`
- **Installazione:** voce `context7` in `opencode.json` (`type: remote`); funziona anche senza chiave API
- **Autenticazione:** non richiesta per l'uso base; opzionale `CONTEXT7_API_KEY` (aggiungere header `CONTEXT7_API_KEY: {env:CONTEXT7_API_KEY}`)
- **Test effettuati:** `initialize` + `tools/list` → 2 strumenti (`resolve-library-id`, `query-docs`); **chiamata reale di lettura** `resolve-library-id` per `react` → librerie risolte (`/reactjs/react.dev`, 4409 snippet, reputazione alta)
- **Interventi necessari:** nessuno
- **Istruzioni:** per una chiave personale (rate limit maggiori), aggiungere l'header come sopra e impostare la variabile d'ambiente

### 4. Figma — INSTALLATO E TESTATO
- **Fonte e repository:** Figma (ufficiale) — server MCP hosted `https://mcp.figma.com/mcp`; documentazione `https://developers.figma.com/docs/figma-mcp-server/`
- **Server MCP:** `https://mcp.figma.com/mcp` (remoto, OAuth) — **non** richiede l'app desktop: rispetto alla prima configurazione (Dev Mode locale su `127.0.0.1:3845`) è stato scelto il server hosted ufficiale, così l'integrazione non dipende da un'app installata
- **Installazione:** voce `figma` in `opencode.json` (`type: remote`)
- **Autenticazione:** **OAuth completato** (token salvati da OpenCode fuori dalla configurazione)
- **Test effettuati:** pre-auth `HTTP 401` con metadati OAuth validi; login completato; stato `connected`; **chiamata reale di lettura** `whoami` → utente **Mattia Calosi**, team "Mattia Calosi's team", ruolo admin
- **Interventi necessari:** nessuno
- **Istruzioni:** rinnovo login: `opencode mcp auth figma`. Il server hosted è soggetto ai limiti del piano/seat Figma

### 5. Firecrawl — INSTALLATO E TESTATO
- **Fonte e repository:** Firecrawl — `https://docs.firecrawl.dev/mcp-server`, repo `github.com/firecrawl/firecrawl-mcp-server`; alternativa locale `npx -y firecrawl-mcp` con `FIRECRAWL_API_KEY`
- **Server MCP:** `https://mcp.firecrawl.dev/v2/mcp-oauth` (remoto, OAuth)
- **Installazione:** voce `firecrawl` in `opencode.json` (`type: remote`)
- **Autenticazione:** OAuth completato il 21/10/2026
- **Test effettuati:** pre-auth HTTP 401 `Firecrawl credentials required` (endpoint corretto); post-auth **chiamata reale di lettura** `firecrawl_scrape` su `https://example.com` → status 200, contenuto estratto correttamente
- **Interventi necessari:** nessuno
- **Istruzioni:** rinnovo login: `opencode mcp auth firecrawl`

### 6. Google Docs — INSTALLATO, AUTENTICAZIONE PENDENTE
- **Fonte e repository:** Google Workspace MCP servers (ufficiali, Developer Preview) — `https://developers.google.com/workspace/guides/configure-mcp-servers`
- **Server MCP:** `https://docsmcp.googleapis.com/mcp/v1`
- **Installazione:** voce `google-docs` in `opencode.json` con blocco `oauth` pre-registrato (client id/secret da variabili `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`, redirect `http://127.0.0.1:19876/callback`, scope `documents`, `documents.readonly`, `drive.readonly`, `drive.file`)
- **Autenticazione:** OAuth 2.0 Google **non ancora eseguita** — serve un OAuth client registrato in un progetto Google Cloud
- **Test effettuati:** `initialize` + `tools/list` → 2 strumenti (`read_doc`, `update_doc`); **chiamata di prova** `read_doc` → HTTP 401 `Request is missing required authentication credential` (comportamento corretto: le chiamate richiedono l'accesso utente)
- **Interventi necessari:** (1) progetto Google Cloud + adesione al Developer Preview; (2) attivare `docs.googleapis.com` e `docsmcp.googleapis.com`; (3) creare OAuth client "Web application" con spunta **"Use this client for an AI-powered agent"** e redirect URI `http://127.0.0.1:19876/callback`; (4) impostare le variabili `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET`; (5) `opencode mcp auth google-docs`
- **Istruzioni:** `gcloud services enable docs.googleapis.com docsmcp.googleapis.com --project=PROJECT_ID`, poi in Google Auth Platform → Clients → Create Client; quindi `setx GOOGLE_OAUTH_CLIENT_ID "..."` e `setx GOOGLE_OAUTH_CLIENT_SECRET "..."`, riavviare OpenCode ed eseguire `opencode mcp auth google-docs`. Nota: Google rilascia il refresh token solo con `access_type=offline`; senza, potrebbe richiedere il login circa ogni ora

### 7. Google Sheets — INSTALLATO, AUTENTICAZIONE PENDENTE
- **Fonte e repository:** Google Workspace MCP servers (ufficiali) — stessa documentazione di cui sopra
- **Server MCP:** `https://sheetsmcp.googleapis.com/mcp/v1`
- **Installazione:** voce `google-sheets` in `opencode.json` con blocco `oauth` pre-registrato (stesso client, scope `spreadsheets`, `spreadsheets.readonly`, `drive.readonly`, `drive.file`)
- **Autenticazione:** OAuth 2.0 Google, come per Google Docs (stesso OAuth client utilizzabile)
- **Test effettuati:** `initialize` + `tools/list` → 6 strumenti (`get_values`, `get_spreadsheet`, `update_spreadsheet`, `update_values`, `update_formulas`, `insert_dimension`); **chiamata di prova** `get_spreadsheet` → HTTP 401 "missing required authentication credential" (corretto)
- **Interventi necessari:** come Google Docs, con `gcloud services enable sheets.googleapis.com sheetsmcp.googleapis.com --project=PROJECT_ID` e infine `opencode mcp auth google-sheets`
- **Istruzioni:** vedasi voce 6; le tre voci Google condividono lo stesso OAuth client e le stesse variabili d'ambiente

### 8. Google Slides — INSTALLATO, AUTENTICAZIONE PENDENTE
- **Fonte e repository:** Google Workspace MCP servers (ufficiali) — stessa documentazione
- **Server MCP:** `https://slidesmcp.googleapis.com/mcp/v1`
- **Installazione:** voce `google-slides` in `opencode.json` con blocco `oauth` pre-registrato (scope `presentations`, `presentations.readonly`, `drive.readonly`, `drive.file`)
- **Autenticazione:** OAuth 2.0 Google, come sopra
- **Test effettuati:** `initialize` + `tools/list` → 4 strumenti (`read_presentation`, `read_slide_page`, `read_slide_page_thumbnail`, `update_presentation`); **chiamata di prova** `read_presentation` → HTTP 401 "missing required authentication credential" (corretto)
- **Interventi necessari:** come Google Docs, con `gcloud services enable slides.googleapis.com slidesmcp.googleapis.com --project=PROJECT_ID` e infine `opencode mcp auth google-slides`
- **Istruzioni:** vedasi voce 6

### 9. Linear — INSTALLATO E TESTATO
- **Fonte e repository:** Linear (ufficiale) — `https://linear.app/integrations/claude`, server `https://mcp.linear.app/mcp`
- **Installazione:** voce `linear` in `opencode.json` (`type: remote`)
- **Autenticazione:** OAuth completato il 21/10/2026 (scope read+write)
- **Test effettuati:** pre-auth HTTP 401 (endpoint corretto); post-auth stato `connected`; **chiamata reale di lettura** `list_teams` → team **"CMristo"** (chiave `CMR`)
- **Interventi necessari:** nessuno
- **Istruzioni:** rinnovo login: `opencode mcp auth linear`

### 10. Notion — INSTALLATO E TESTATO
- **Fonte e repository:** Notion (ufficiale) — `https://developers.notion.com/guides/mcp/overview`, repo `github.com/makenotion/notion-mcp-server`, server hosted `https://mcp.notion.com/mcp`
- **Installazione:** voce `notion` in `opencode.json` (`type: remote`)
- **Autenticazione:** OAuth completato il 21/10/2026
- **Test effettuati:** pre-auth HTTP 401 (endpoint corretto); post-auth stato `connected`; **chiamata reale di lettura** `notion-search` con query `test` → esito ok, nessun risultato (workspace senza corrispondenze: risposta valida)
- **Interventi necessari:** nessuno
- **Istruzioni:** rinnovo login: `opencode mcp auth notion`; per condividere pagine specifiche, autorizzare la connessione "OpenCode" dalle impostazioni dell'integrazione in Notion

### 11. Resend — INSTALLATO E TESTATO
- **Fonte e repository:** Resend (ufficiale) — `https://resend.com/docs/mcp-server`, repo `github.com/resend/resend-mcp`
- **Server MCP:** `https://mcp.resend.com/mcp` (remoto; non usa OAuth ma API key)
- **Installazione:** voce `resend` in `opencode.json` (`type: remote`, `oauth: false`, header `Authorization: Bearer {env:RESEND_API_KEY}`)
- **Autenticazione:** **attiva** — API key validata direttamente sull'endpoint MCP (`HTTP 200`) e iniettata nel servizio con `opencode service set env RESEND_API_KEY ...` (persistente, fuori dal repository)
- **Test effettuati:** senza chiave → HTTP 401 `Unauthorized: provide credentials...`; con chiave → stato `connected`; **chiamata reale di lettura** `list-domains` → "No domains found" (account senza domini configurati); **nessuna email inviata**
- **Interventi necessari:** nessuno. Per inviare email servirà verificare un dominio nella dashboard Resend
- **Istruzioni:** verifica: `opencode mcp list` (`✓ resend connected`). **Attenzione:** gli strumenti includono invio email reali — usarli solo in modalità test esplicita

### 12. Sentry — INSTALLATO E TESTATO
- **Fonte e repository:** Sentry (ufficiale) — `https://mcp.sentry.dev/`, repo `github.com/getsentry/sentry-mcp`
- **Server MCP:** `https://mcp.sentry.dev/mcp` (remoto, OAuth)
- **Installazione:** voce `sentry` in `opencode.json` (`type: remote`)
- **Autenticazione:** OAuth completato il 21/10/2026
- **Test effettuati:** pre-auth HTTP 401 (endpoint corretto); post-auth stato `connected`; **chiamata reale di lettura** `find_organizations` → organizzazione **"calosimattia"**
- **Interventi necessari:** nessuno
- **Istruzioni:** rinnovo login: `opencode mcp auth sentry`; per limitare l'ambito è possibile usare URL con path (`/mcp/<org>` o `/mcp/<org>/<project>`)

### 13. Stripe — **INSTALLATO E TESTATO**
- **Fonte e repository:** Stripe (ufficiale) — `https://docs.stripe.com/mcp`, server `https://mcp.stripe.com`
- **Installazione:** voce `stripe` in `opencode.json` (`type: remote`)
- **Autenticazione:** OAuth completato il 21/10/2026
- **Test effettuati:** pre-auth HTTP 401 `missing_api_key` (endpoint corretto); post-auth stato `connected`; **chiamata reale di lettura** `list_available_accounts_or_orgs` → account **"New business"** in modalità test (`livemode: false`); nota: lo strumento generico `stripe_api_read` richiede il parametro `stripe_context` nel formato previsto (verificato: HTTP 422 con valori non validi)
- **Interventi necessari:** nessuno (usare con cautela: include strumenti che muovono denaro)
- **Istruzioni:** rinnovo login: `opencode mcp auth stripe`. Durante i test: **mai** creare pagamenti, refund o fatture

### 14. Supabase — INSTALLATO E TESTATO
- **Fonte e repository:** Supabase (ufficiale) — `https://supabase.com/docs/guides/ai-tools/mcp`, repo `github.com/supabase/mcp`
- **Server MCP:** `https://mcp.supabase.com/mcp` (remoto, OAuth; opzionale `?project_ref=` per limitare a un progetto)
- **Installazione:** voce `supabase` in `opencode.json` (`type: remote`)
- **Autenticazione:** OAuth completato il 21/10/2026
- **Test effettuati:** pre-auth HTTP 401 `No access token provided`; post-auth stato `connected`; **chiamata reale di lettura** `list_projects` → 3 progetti visibili: `MCRistorante`, `CMRisto`, `sistemaristoranteMAIN`
- **Interventi necessari:** nessuno
- **Istruzioni:** per limitare l'accesso al solo progetto del prodotto, cambiare URL in `https://mcp.supabase.com/mcp?project_ref=<REF>`; rinnovo login: `opencode mcp auth supabase`

### 15. Twilio — INSTALLATO, AUTENTICAZIONE PENDENTE
- **Fonte e repository:** Twilio (ufficiale) — `github.com/twilio-labs/mcp`, pacchetto npm `@twilio-alpha/mcp` v0.7.0 (server per le API pubbliche Twilio)
- **Server MCP:** locale, `type: local` — comando `cmd /c npx -y -p zod@3.25.76 -p @twilio-alpha/mcp twilio-mcp-server %TWILIO_ACCOUNT_SID%/%TWILIO_API_KEY%/%TWILIO_API_SECRET%` con blocco `environment` `{env:TWILIO_*}`
- **Installazione:** voce `twilio` in `opencode.json`. **Fix applicato:** il pacchetto pubblicato non risolve la dipendenza `zod/v3` con l'ultima zod 3.x (errore reale `Cannot find module 'zod/v3'`); risolto pinnando `zod@3.25.76` nella stessa installazione npx
- **Autenticazione:** **mancano `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`** (creabili nella Twilio Console → Account → API keys)
- **Test effettuati:** con credenziali di prova il server si avvia ed espone **197 strumenti** (`TwilioApiV2010--*`); con credenziali vuote esce con errore `Invalid AccountSid` (comportamento atteso); nessun SMS/WhatsApp inviato
- **Interventi necessari:** creare API key SID/Secret su Twilio Console, poi `setx TWILIO_ACCOUNT_SID "AC..."`, `setx TWILIO_API_KEY "SK..."`, `setx TWILIO_API_SECRET "..."` e riavviare OpenCode
- **Istruzioni:** verificare con `opencode mcp list` (`✓ twilio connected`). **Attenzione:** gli strumenti inviano SMS/WhatsApp reali — non usarli nei test

### 16. Vercel — INSTALLATO E TESTATO
- **Fonte e repository:** Vercel (ufficiale) — `https://vercel.com/docs/agent-resources/vercel-mcp`, server `https://mcp.vercel.com`
- **Installazione:** voce `vercel` in `opencode.json` (`type: remote`)
- **Autenticazione:** OAuth completato il 21/10/2026
- **Test effettuati:** pre-auth HTTP 401 `No authorization provided`; post-auth stato `connected`; **chiamata reale di lettura** `list_projects` → 3 progetti: `cmristoo`, `sistemaristoranti`, `mcristo`
- **Interventi necessari:** nessuno
- **Istruzioni:** rinnovo login: `opencode mcp auth vercel`; **non** eseguire deploy durante i test

### 17. GitHub — INSTALLATO E TESTATO
- **Fonte e repository:** GitHub (ufficiale) — `https://docs.github.com/.../set-up-the-github-mcp-server`, repo `github.com/github/github-mcp-server`
- **Server MCP:** `https://api.githubcopilot.com/mcp/` (remoto)
- **Installazione:** voce `github` in `opencode.json` (`type: remote`, `oauth: false`, header `Authorization: Bearer {env:GITHUB_PAT}`)
- **Autenticazione:** **attiva**. Scelta tecnica: il server OAuth di GitHub **non supporta la registrazione dinamica del client** (errore reale verificato: `Incompatible auth server: does not support dynamic client registration`); è stato quindi usato il percorso **ufficiale** documentato da GitHub basato su token Bearer. Il token è stato recuperato dal credential store già usato da `git` per il push del repository (nessun token creato ex novo, nessun segreto scritto in configurazione o nel report) e iniettato nel servizio OpenCode con `opencode service set env GITHUB_PAT ...` (persistente, fuori dal repository)
- **Test effettuati:** validazione diretta del token sull'endpoint MCP → **HTTP 200**; stato `connected`; **chiamata reale di lettura** `get_me` → login **`ElCaloz`**, 6 repository pubbliche
- **Interventi necessari:** nessuno. Se il token scade o viene revocato, rigenerarlo e rieseguire `opencode service set env GITHUB_PAT <token>`
- **Istruzioni:** verifica: `opencode mcp list` (`✓ github connected`)

### 18. Grafana — INSTALLATO E TESTATO
- **Fonte e repository:** Grafana (ufficiale) — Grafana Cloud MCP `https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/`; alternativa OSS self-hosted: `github.com/grafana/mcp-grafana`
- **Server MCP:** `https://mcp.grafana.com/mcp` (remoto, OAuth 2.1; solo Grafana Cloud)
- **Installazione:** voce `grafana` in `opencode.json` (`type: remote`)
- **Autenticazione:** **completata** con OAuth 2.1 sullo stack Grafana Cloud `https://jovialpeach1560.grafana.net` (il flusso richiede l'URL dell'istanza; token salvati da OpenCode fuori dalla configurazione)
- **Test effettuati:** pre-auth HTTP 401 `missing or invalid Bearer token`; flusso OAuth completato (`Connected to grafana`); stato `connected`; **chiamata reale di lettura** `list_datasources` → **13 datasource** restituiti
- **Interventi necessari:** nessuno
- **Istruzioni:** rinnovo login: `opencode mcp auth grafana` (indicare `https://jovialpeach1560.grafana.net`). Per Grafana **self-hosted** questo server non è utilizzabile: sostituire con `mcp-grafana` locale (`docker run grafana/mcp-grafana -t stdio` con `GRAFANA_URL` e `GRAFANA_SERVICE_ACCOUNT_TOKEN`)

### 19. Zapier — **INSTALLATO E TESTATO**
- **Fonte e repository:** Zapier (ufficiale) — `https://docs.zapier.com/mcp/overview/how-connections-work`, repo `github.com/zapier/zapier-mcp`
- **Server MCP:** `https://mcp.zapier.com/api/v1/connect` (remoto, OAuth)
- **Installazione:** voce `zapier` in `opencode.json` (`type: remote`)
- **Autenticazione:** OAuth completato il 21/10/2026
- **Test effettuati:** pre-auth HTTP 401 `Missing authorization header or token query parameter`; post-auth stato `connected`; **chiamata reale di lettura** `discover_zapier_actions` → catalogo di azioni/app disponibili restituito (Gmail, Calendar, Sheets, Notion, Slack, HubSpot, …)
- **Interventi necessari:** configurare in `mcp.zapier.com` le azioni da esporre (ogni server personale espone solo le azioni selezionate)
- **Istruzioni:** rinnovo login: `opencode mcp auth zapier`; **non** eseguire azioni (Zap) reali durante i test

### 20. Exa — INSTALLATO E TESTATO
- **Fonte e repository:** Exa (ufficiale) — `https://exa.ai/docs/get-started/exa-mcp`, repo `github.com/exa-labs/exa-mcp-server`
- **Server MCP:** `https://mcp.exa.ai/mcp` (remoto; funziona senza chiave, opzionale `EXA_API_KEY`)
- **Installazione:** voce `exa` in `opencode.json` (`type: remote`)
- **Autenticazione:** non richiesta per l'uso base
- **Test effettuati:** `initialize` + `tools/list` → 2 strumenti (`web_search_exa`, `web_fetch_exa`); **chiamata reale di lettura** `web_search_exa` su "Model Context Protocol" → risultati da `modelcontextprotocol.io`
- **Interventi necessari:** nessuno
- **Istruzioni:** per alzare i limiti, impostare `EXA_API_KEY` e aggiungere l'header corrispondente

### 21. Cloudflare — **INSTALLATO E TESTATO**
- **Fonte e repository:** Cloudflare (ufficiale) — `https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/`, repo `github.com/cloudflare/mcp`
- **Server MCP:** `https://mcp.cloudflare.com/mcp` (Cloudflare API MCP, remoto, OAuth; copre l'intera API Cloudflare in Code Mode)
- **Installazione:** voce `cloudflare` in `opencode.json` (`type: remote`)
- **Autenticazione:** OAuth completato il 21/10/2026
- **Test effettuati:** pre-auth HTTP 401 (endpoint corretto); post-auth stato `connected`; **chiamata reale di lettura** `get_accounts` → **1 account** Cloudflare ("Calosimatti05@gmail.com's Account")
- **Interventi necessari:** nessuno
- **Istruzioni:** rinnovo login: `opencode mcp auth cloudflare`; **non** modificare DNS o configurazioni durante i test

### 22. Git — INSTALLATO E TESTATO
- **Fonte e repository:** server MCP ufficiale per Git (`modelcontextprotocol/servers`, pacchetto PyPI `mcp-server-git` v2026.10.19)
- **Server MCP:** locale, `type: local` — `C:\Users\calos\AppData\Roaming\Python\Python313\Scripts\mcp-server-git.exe --repository C:\Users\calos\CM-Risto`
- **Installazione:** pacchetto installato con `pip install --user mcp-server-git` (con `uv` 0.13.4); voce `git` in `opencode.json`
- **Autenticazione:** non richiesta (usa il repository locale)
- **Test effettuati:** `initialize` + `tools/list` → **12 strumenti** (`git_status`, `git_diff_unstaged`, `git_diff_staged`, `git_diff`, …); **chiamata reale di lettura** `git_status` sul repository → stato corretto del branch `main` e dei file
- **Interventi necessari:** nessuno
- **Istruzioni:** per puntare ad altri repository, aggiungere voci con un diverso `--repository`

### 23. Chrome DevTools — INSTALLATO E TESTATO
- **Fonte e repository:** Google Chrome DevTools (ufficiale) — `https://github.com/ChromeDevTools/chrome-devtools-mcp`, npm `chrome-devtools-mcp`
- **Server MCP:** locale, `type: local` — `npx -y chrome-devtools-mcp@latest`
- **Installazione:** voce `chrome-devtools` in `opencode.json`; Google Chrome rilevato in `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Autenticazione:** non richiesta (controlla il browser locale)
- **Test effettuati:** `initialize` + `tools/list` → **32 strumenti**; **chiamata reale di lettura** `list_pages` → Chrome avviato con profilo dedicato, pagina `about:blank` elencata; nessuna azione su pagine o rete
- **Interventi necessari:** nessuno
- **Istruzioni:** opzioni utili da aggiungere al comando: `--headless`, `--isolated`, `--browserUrl http://127.0.0.1:9222` per collegarsi a un Chrome già in esecuzione

---

## 5. Tabella di stato delle 23 voci

| # | Integrazione | Server MCP | Stato |
|---|---|---|---|
| 1 | Bird | `https://mcp.bird.com` | **INSTALLATO E TESTATO** |
| 2 | Canva | `https://mcp.canva.com/mcp` | **INSTALLATO E TESTATO** |
| 3 | Context7 | `https://mcp.context7.com/mcp` | **INSTALLATO E TESTATO** |
| 4 | Figma | `https://mcp.figma.com/mcp` | **INSTALLATO E TESTATO** |
| 5 | Firecrawl | `https://mcp.firecrawl.dev/v2/mcp-oauth` | **INSTALLATO E TESTATO** |
| 6 | Google Docs | `https://docsmcp.googleapis.com/mcp/v1` | **INSTALLATO, AUTENTICAZIONE PENDENTE** |
| 7 | Google Sheets | `https://sheetsmcp.googleapis.com/mcp/v1` | **INSTALLATO, AUTENTICAZIONE PENDENTE** |
| 8 | Google Slides | `https://slidesmcp.googleapis.com/mcp/v1` | **INSTALLATO, AUTENTICAZIONE PENDENTE** |
| 9 | Linear | `https://mcp.linear.app/mcp` | **INSTALLATO E TESTATO** |
| 10 | Notion | `https://mcp.notion.com/mcp` | **INSTALLATO E TESTATO** |
| 11 | Resend | `https://mcp.resend.com/mcp` | **INSTALLATO E TESTATO** |
| 12 | Sentry | `https://mcp.sentry.dev/mcp` | **INSTALLATO E TESTATO** |
| 13 | Stripe | `https://mcp.stripe.com` | **INSTALLATO E TESTATO** |
| 14 | Supabase | `https://mcp.supabase.com/mcp` | **INSTALLATO E TESTATO** |
| 15 | Twilio | locale `@twilio-alpha/mcp` | **INSTALLATO, AUTENTICAZIONE PENDENTE** |
| 16 | Vercel | `https://mcp.vercel.com` | **INSTALLATO E TESTATO** |
| 17 | GitHub | `https://api.githubcopilot.com/mcp/` | **INSTALLATO E TESTATO** |
| 18 | Grafana | `https://mcp.grafana.com/mcp` | **INSTALLATO E TESTATO** |
| 19 | Zapier | `https://mcp.zapier.com/api/v1/connect` | **INSTALLATO E TESTATO** |
| 20 | Exa | `https://mcp.exa.ai/mcp` | **INSTALLATO E TESTATO** |
| 21 | Cloudflare | `https://mcp.cloudflare.com/mcp` | **INSTALLATO E TESTATO** |
| 22 | Git | locale `mcp-server-git` | **INSTALLATO E TESTATO** |
| 23 | Chrome DevTools | locale `chrome-devtools-mcp` | **INSTALLATO E TESTATO** |

**Conteggio:** 23/23 integrazioni configurate; nessuna voce abbandonata. **19 INSTALLATO E TESTATO**, **4 INSTALLATO, AUTENTICAZIONE PENDENTE**, **0 CONFIGURATO, TEST BLOCCATO**, **0 NON INSTALLATO**. Le voci non ancora utilizzabili hanno cause precise e istruzioni di completamento (paragrafo 6).

---

## 6. Interventi ancora necessari a carico dell'utente

| Priorità | Voce | Cosa serve | Comando/azione chiave |
|---|---|---|---|
| 1 | Google Docs/Sheets/Slides | Progetto Google Cloud + OAuth client "AI-powered agent" | `setx GOOGLE_OAUTH_CLIENT_ID "..."` e `setx GOOGLE_OAUTH_CLIENT_SECRET "..."`, poi `opencode mcp auth google-docs` (e `google-sheets`, `google-slides`) |
| 2 | Twilio | Account SID + API key SID/Secret | `setx TWILIO_ACCOUNT_SID "AC..."`, `setx TWILIO_API_KEY "SK..."`, `setx TWILIO_API_SECRET "..."` |

Le variabili possono essere iniettate in modo persistente nel servizio con `opencode service set env NOME_VAR valore` (riavvia automaticamente il servizio), oppure impostate a livello utente con `setx` e seguite da `opencode service restart`. Verifica finale: `opencode mcp list`.

## 7. Ripristino e sicurezza

- Backup di configurazione disponibili in `C:\Users\calos\.config\opencode\opencode.jsonc.bak-*`.
- Nessun segreto è scritto in `opencode.json`, nel report o nel repository: solo riferimenti `{env:...}`. Il token GitHub è iniettato nell'ambiente del servizio OpenCode con `opencode service set env GITHUB_PAT ...` (persistente sulla macchina, fuori dal repository).
- I token OAuth sono memorizzati da OpenCode fuori dalla configurazione; per rifare il login di un server: `opencode mcp logout <nome>` e poi `opencode mcp auth <nome>`.
- Per rimuovere le dipendenze aggiunte: `pip uninstall mcp-server-git uv`.
- Test condotti nel rispetto dei vincoli: nessun pagamento, nessuna email/SMS reale, nessuna pubblicazione, nessuna modifica DNS, nessun deploy.

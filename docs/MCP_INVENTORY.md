# MCP Inventory — CM Risto

**Data:** 22 ottobre 2026
**Configurazione:** `C:\Users\calos\CM-Risto\opencode.json` (schema V2, `mcp.servers`)
**Escluso:** Revit / `revit-2027` (server globale preesistente, non modificato)
**Legenda integrazione:**
- **A** = usata nel flusso di sviluppo/QA
- **B** = connessa e testata, disponibile ma non sfruttata
- **C** = bloccata (autenticazione o prerequisiti mancanti)
- **D** = solo sviluppo/ops, non applicabile al runtime del prodotto

> Nota: nessun MCP è integrato nel runtime dell'applicazione. "Integrazione realizzata" descrive l'uso effettivo nel workflow, non una funzionalità del prodotto.

---

## 1. Riepilogo

| Stato | Numero |
|---|---|
| Server configurati | 23 |
| Installati + connessi + testati (lettura reale) | 20 |
| Installati, autenticazione pendente (Google) — **parcheggiati** | 3 |
| Test bloccati | 0 |
| Server globali estranei non toccati | 1 (`revit-2027`) |
| Tool complessivamente esposti (report installazione) | ~5.501 |

Test di questa sessione (22/10/2026): GitHub `get_me`, Supabase `list_projects`, Vercel `list_projects`, Sentry `find_organizations`, Linear `list_teams`, Notion search — tutti riusciti.

---

## 2. Inventario dettagliato

| # | Servizio | Configurazione | Connessione verificata | Test eseguito | Integrazione realizzata | Prerequisiti mancanti |
|---|---|---|---|---|---|---|
| 1 | **Bird** | remoto `https://mcp.bird.com`, OAuth | Sì (`connected`) | Catalogo 50 tool verificato; chiamata dati non eseguibile senza ID risorsa | D — nessun uso nel prodotto | ID template/dominio/mailbox per letture reali |
| 2 | **Canva** | remoto `https://mcp.canva.com/mcp`, OAuth | Sì | `search-designs` → design account | D — materiali commerciali | Nessuno |
| 3 | **Context7** | remoto `https://mcp.context7.com/mcp` | Sì | `resolve-library-id` per React | B — documentazione librerie | Nessuno (chiave opzionale) |
| 4 | **Figma** | hosted `https://mcp.figma.com/mcp`, OAuth | Sì | `whoami` → utente admin | D — design system | Nessuno |
| 5 | **Firecrawl** | remoto `https://mcp.firecrawl.dev/v2/mcp-oauth`, OAuth | Sì | `firecrawl_scrape` su example.com → 200 | B — docs pubbliche | Nessuno |
| 6 | **Google Docs** | remoto `docsmcp.googleapis.com/mcp/v1`, OAuth pre-registrato | Trasporto sì, auth **no** | `tools/list` (2 tool); `read_doc` → 401 atteso | C — **parcheggiato** | OAuth Client ID/Secret Google Cloud, API abilitate, login |
| 7 | **Google Sheets** | remoto `sheetsmcp.googleapis.com/mcp/v1`, OAuth pre-registrato | Trasporto sì, auth **no** | `tools/list` (6 tool); `get_spreadsheet` → 401 atteso | C — **parcheggiato** | Come sopra (stesso client OAuth) |
| 8 | **Google Slides** | remoto `slidesmcp.googleapis.com/mcp/v1`, OAuth pre-registrato | Trasporto sì, auth **no** | `tools/list` (4 tool); `read_presentation` → 401 atteso | C — **parcheggiato** | Come sopra (stesso client OAuth) |
| 9 | **Linear** | remoto `https://mcp.linear.app/mcp`, OAuth | Sì | `list_teams` → team `CMristo` (`CMR`) | B — task tracking | Nessuno |
| 10 | **Notion** | remoto `https://mcp.notion.com/mcp`, OAuth | Sì | Search "CM Risto" → 0 risultati (risposta valida) | B — documentazione/runbook | Condivisione pagine con la connessione |
| 11 | **Resend** | remoto `https://mcp.resend.com/mcp`, API key | Sì | `list-domains` → nessun dominio; nessuna email inviata | D — email transazionali (non nel prodotto) | Dominio verificato, API key; integrazione applicativa |
| 12 | **Sentry** | remoto `https://mcp.sentry.dev/mcp`, OAuth | Sì | `find_organizations` → `calosimattia` | D — error tracking (SDK non presente) | Progetto/DSN, SDK Next.js, release/source map |
| 13 | **Stripe** | remoto `https://mcp.stripe.com`, OAuth | Sì (test mode) | `list_available_accounts_or_orgs` → account test `livemode: false` | D — pagamenti non implementati | Chiavi test/webhook secret, integrazione webhook, approvazione |
| 14 | **Supabase** | remoto `https://mcp.supabase.com/mcp`, OAuth | Sì | `list_projects` → 3 progetti | A — DB locale via CLI; MCP per letture | Project ref/credenziali per ambiente cloud |
| 15 | **Twilio** | locale `@twilio-alpha/mcp`, Account SID + API Key | Sì | `ListIncomingPhoneNumber` → 0 numeri; nessun SMS | D — telefonia non collegata | Numero, credenziali, budget, consenso, approvazione |
| 16 | **Vercel** | remoto, OAuth | Sì | `list_projects` → 3 progetti | D — deploy non eseguito | Progetto collegato, env, approvazione deploy |
| 17 | **GitHub** | remoto, PAT da credential store | Sì | `get_me` → `ElCaloz` | A — repository/branch/push via git | Scope repo (presente); admin per branch protection |
| 18 | **Grafana** | remoto Grafana Cloud, token | Sì | `list_datasources` → 13 datasource | D — nessuna metrica applicativa | Fonte dati/metriche, dashboard reali |
| 19 | **Zapier** | remoto, OAuth | Sì | `discover_zapier_actions` | D — nessuna automazione creata | Piano/approvazione, automazioni definite |
| 20 | **Exa** | remoto, API key/OAuth | Sì | Ricerca tecnica | B — ricerca mirata | Nessuno |
| 21 | **Cloudflare** | remoto, OAuth | Sì | `get_accounts`; nessuna modifica DNS/WAF | D — nessuna modifica infrastrutturale | Zona, piano WAF, approvazione |
| 22 | **Git** | locale `mcp-server-git` (uv/pip) | Sì | `git_status` | A — letture; operazioni git via CLI | Nessuno |
| 23 | **Chrome DevTools** | locale `chrome-devtools-mcp` | Sì | `list_pages` | B — QA browser (in questa sessione usato il browser OpenCode) | Chrome avviabile con debug |

---

## 3. Dettaglio per area

### Repository e delivery
- **Git**: disponibile per status/diff; commit e push eseguiti con git CLI secondo `AGENTS.md`.
- **GitHub**: connesso; push sul remoto `ElCaloz/cmristoopencode`. Branch protection e PR da approvare.
- **Vercel**: connesso in lettura; nessun deploy.

### Database
- **Supabase**: 3 progetti visibili; database locale con 19 migrazioni e 656 test pgTAP. Nessuna modifica remota.
- **Git**: storico locale leggibile; nessuna riscrittura.

### QA e browser
- **Chrome DevTools**: testato; disponibile per console/rete/performance.
- **Browser OpenCode**: usato per 16 pagine demo + pagine pubbliche, 0 errori console, controlli h1/alt/label.
- **Playwright**: 26 test E2E (non è un MCP, ma è la suite di regressione principale).

### Osservabilità
- **Sentry**: organizzazione visibile, ma nessun SDK nel prodotto → error tracking non attivo.
- **Grafana**: 13 datasource, nessuna dashboard applicativa.

### Comunicazioni e pagamenti
- **Stripe**: account test visibile, nessuna integrazione prodotto.
- **Twilio**: connesso, 0 numeri, nessun SMS.
- **Resend**: connesso, nessun dominio, nessuna email.
- **Bird**: connesso, catalogo tool, nessun invio.

### Documentazione e design
- **Context7**: documentazione aggiornata.
- **Exa / Firecrawl**: ricerca e raccolta docs.
- **Figma / Canva**: design e materiali.
- **Linear / Notion**: task e documentazione (letture; nessuna scrittura in questa sessione).
- **Zapier**: disponibile, nessuna automazione.

### Google Workspace
- Docs/Sheets/Slides configurati ma non autenticati, **parcheggiati su istruzione dell'utente**. Non sono state create credenziali Google.

---

## 4. Prerequisiti manuali

| Servizio | Cosa serve |
|---|---|
| Google Docs/Sheets/Slides | Progetto Google Cloud, API `docs/sheets/slides` + `*mcp.googleapis.com`, OAuth client "AI-powered agent", redirect `http://127.0.0.1:19876/callback`, variabili `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `opencode mcp auth` |
| Sentry | Progetto, DSN, SDK Next.js, release/source map |
| Grafana | Fonte dati e dashboard definite |
| Stripe | Integrazione prodotto, chiavi test, webhook secret, approvazione |
| Twilio | Numero, credenziali, budget, consenso, approvazione |
| Resend | Dominio verificato, API key, template |
| Vercel | Progetto collegato, env di preview, approvazione |
| Cloudflare | Accesso zona, piano WAF/rate limit, approvazione |
| GitHub | Permessi admin per branch protection; decisione su PR |
| Bird | ID risorsa per letture reali (solo se servirà) |

---

## 5. Sicurezza

- Nessun segreto è presente in `opencode.json` o nel repository: solo `{env:...}` o credenziali nel credential store di OpenCode.
- Nessun test ha inviato SMS/email, creato pagamenti, pubblicato contenuti, modificato DNS o eseguito deploy.
- I test MCP sono di sola lettura e su ambienti di test/sandbox.
- Il server globale `revit-2027` non è stato modificato né usato.

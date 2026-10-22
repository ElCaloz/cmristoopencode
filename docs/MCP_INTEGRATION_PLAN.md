# MCP Integration Plan — CM Risto

**Data:** 22 ottobre 2026
**Riferimenti:** `opencode.json`, `docs/MCP_INSTALLATION_REPORT.md`, `docs/MCP_INVENTORY.md`
**Esclusione:** Revit e `revit-2027` (server globale preesistente, non modificato).
**Nota di chiarezza:** gli MCP sono strumenti di **sviluppo, QA e operations**, non componenti del runtime del prodotto. Nessun server MCP è (o deve essere) chiamato dall'applicazione in produzione.

---

## 1. Obiettivi

1. Rendere verificabile ogni integrazione MCP: configurazione, autenticazione, tool realmente esposti, test di lettura.
2. Usare gli MCP per migliorare il ciclo di sviluppo: repository, database, browser QA, osservabilità, documentazione, task tracking.
3. Non introdurre dipendenze runtime, segreti nel repository o permessi amministrativi non necessari.
4. Distinguere chiaramente:
   - **installato** (voce presente in `opencode.json`);
   - **connesso** (handshake MCP riuscito);
   - **testato** (almeno una chiamata reale di lettura riuscita);
   - **integrato** (usato in un flusso ripetibile del progetto).
5. Preparare le integrazioni future (Stripe, Twilio, Resend, Sentry, Grafana) senza dichiararle operative finché mancano codice e credenziali.

---

## 2. Stato di partenza verificato

- **23 server configurati** in `opencode.json` (schema V2, `mcp.servers`).
- **20 installati e testati** con chiamate reali di sola lettura.
- **3 installati ma non autenticati**: Google Docs, Google Sheets, Google Slides — **parcheggiati su istruzione esplicita dell'utente** (richiedono OAuth Client ID/Secret Google Cloud).
- **0 server con test bloccato**.
- **Revit escluso** e non toccato.
- **Nessun segreto** in configurazione: solo riferimenti `{env:NOME_VAR}` o credenziali gestite dal credential store di OpenCode.
- Totale tool esposti dichiarato nel report di installazione: ~5.501.

Verifica di questa sessione (22/10/2026), chiamate reali di lettura:

| Servizio | Tool | Esito |
|---|---|---|
| GitHub | `get_me` | utente `ElCaloz` |
| Supabase | `list_projects` | 3 progetti visibili |
| Vercel | `list_projects` | 3 progetti |
| Sentry | `find_organizations` | organizzazione `calosimattia` |
| Linear | `list_teams` | team `CMristo` (`CMR`) |
| Notion | search | risposta valida, 0 risultati per "CM Risto" |

---

## 3. Architettura e guardrail

### 3.1 Modello

```
Sviluppatore / agente OpenCode
        │  (MCP, solo tool espliciti)
        ▼
Server MCP (locale o remoto) ──► API del fornitore
        │
        └── nessuna chiamata dal runtime Next.js
```

- Gli MCP girano nel processo OpenCode o come server remoti; non sono inclusi nel bundle Next.
- Le credenziali sono iniettate nell'ambiente del servizio (`opencode service set env`) o gestite via OAuth dal credential store.
- L'app usa esclusivamente le proprie variabili d'ambiente server-side.

### 3.2 Guardrail obbligatori

1. **Minimo privilegio:** usare scope di lettura dove possibile; niente token admin se basta un token di progetto.
2. **Nessun segreto versionato:** mai token in `opencode.json`, `.env.example`, docs o commit.
3. **Nessuna modifica di produzione senza approvazione:** deploy, DNS, WAF, pagamenti, SMS/email reali, modifiche a risorse cloud.
4. **Operazioni di scrittura solo se richieste e tracciate:** creare branch/issue/pagine solo con un obiettivo esplicito.
5. **Dati minimi:** non inviare dati personali o di tenant a servizi esterni non necessari.
6. **Verifica reale:** ogni nuovo tool usato deve avere una chiamata di prova non distruttiva documentata.
7. **Nessun doppione:** non installare server alternativi se esiste già quello ufficiale configurato.
8. **Revit escluso** da qualsiasi flusso.

---

## 4. Piano per servizio

Legenda integrazione:
- **A — operativa ora:** usata nel flusso di sviluppo/QA.
- **B — pronta, da usare al bisogno:** connessa e testata, non ancora sfruttata.
- **C — bloccata:** manca autenticazione o integrazione di prodotto.
- **D — non applicabile al runtime:** uso solo di sviluppo.

### 4.1 Git (locale, `mcp-server-git`)

- **Stato:** installato, connesso, testato (`git_status`).
- **Integrazione:** A/D — il flusso reale usa git CLI per branch, diff, commit, push; l'MCP è disponibile per letture strutturate.
- **Piano:** usare l'MCP per `git_status`/`git_diff` in revisioni automatiche; nessuna riscrittura di storia, nessun reset hard.
- **Prerequisiti:** nessuno.

### 4.2 GitHub (`mcp.github.com` / token PAT)

- **Stato:** installato, connesso, testato (`get_me` → `ElCaloz`).
- **Integrazione:** A — repository, branch e push tramite git CLI; MCP per letture e (in futuro) PR/review.
- **Piano:**
  1. push del branch `audit/hardening-sicurezza`;
  2. verifica della prima esecuzione CI (workflow aggiornato);
  3. PR verso `main` con review, senza merge automatico;
  4. branch protection su `main` (richiede permessi admin del repository: **da approvare**).
- **Prerequisiti:** token con scope `repo` (già presente nel credential store); permessi admin per branch protection.

### 4.3 Supabase (remoto, OAuth)

- **Stato:** installato, connesso, testato (`list_projects` → 3 progetti).
- **Integrazione:** A — database locale gestito via CLI (`supabase start`, `test db`); MCP per ispezione progetti.
- **Piano:**
  1. mantenere il locale come ambiente di test primario;
  2. collegare un progetto cloud dedicato solo con approvazione;
  3. usare l'MCP per leggere schema/advisor, mai per applicare migrazioni distruttive;
  4. migrazioni applicate solo via CLI versionata e con backup.
- **Prerequisiti:** project ref e credenziali del progetto cloud; approvazione per qualsiasi modifica remota.

### 4.4 Stripe (remoto, OAuth, test mode)

- **Stato:** installato, connesso, testato (`list_available_accounts_or_orgs` → account "New business", `livemode: false`).
- **Integrazione:** D — **nessuna integrazione di prodotto**: non esistono checkout, webhook o gestione abbonamenti nel codice.
- **Piano (quando il prodotto lo richiederà):**
  1. definire piani e prezzi nel server (mai fidarsi del client);
  2. creare prodotti/prezzi in test mode;
  3. implementare webhook con verifica firma sul payload raw, idempotenza e replay protection;
  4. test sandbox con carte di test, nessun pagamento reale;
  5. solo dopo approvazione, passare alla modalità live.
- **Prerequisiti:** chiavi test, webhook secret, endpoint applicativo, approvazione.

### 4.5 Vercel (remoto, OAuth)

- **Stato:** installato, connesso, testato (`list_projects` → 3 progetti).
- **Integrazione:** D — nessun deploy eseguito.
- **Piano:**
  1. collegare il repository al progetto Vercel;
  2. preview deployment su PR (senza produzione);
  3. variabili d'ambiente per preview/staging;
  4. deploy produzione solo con approvazione esplicita;
  5. usare i log runtime per diagnosi, senza esfiltrare dati.
- **Prerequisiti:** progetto Vercel, variabili, approvazione deploy.

### 4.6 Cloudflare (remoto, OAuth)

- **Stato:** installato, connesso, testato (`get_accounts`).
- **Integrazione:** D — **nessuna modifica DNS/WAF**.
- **Piano:**
  1. inventariare zone e record in sola lettura;
  2. valutare WAF e rate limiting sul piano attivo;
  3. applicare modifiche solo con approvazione e finestra concordata;
  4. documentare rollback DNS.
- **Prerequisiti:** accesso alla zona, piano con WAF/rate limiting, approvazione.

### 4.7 Chrome DevTools (locale)

- **Stato:** installato, connesso, testato (`list_pages`).
- **Integrazione:** B — in questa sessione la QA browser è stata eseguita con il browser integrato di OpenCode; l'MCP resta disponibile per console, rete, performance e accessibilità.
- **Piano:** usarlo per audit su staging (console, richieste fallite, CSP, performance) prima di ogni rilascio.
- **Prerequisiti:** Chrome/Chromium avviabile in modalità debug.

### 4.8 Sentry (remoto, OAuth)

- **Stato:** installato, connesso, testato (`find_organizations` → `calosimattia`).
- **Integrazione:** D — **Sentry SDK non presente nel runtime**; nessuna release/source map inviata.
- **Piano:**
  1. aggiungere SDK Next.js con DSN server/client;
  2. configurare release e source map in build;
  3. creare alert per errori 5xx e regressioni;
  4. verificare un errore sintetico in staging.
- **Prerequisiti:** progetto Sentry, DSN, approvazione per l'invio dati.

### 4.9 Grafana (Cloud)

- **Stato:** installato, connesso, testato (`list_datasources` → 13 datasource).
- **Integrazione:** D — nessuna metrica applicativa inviata.
- **Piano:** dashboard per latenza/errori/DB solo dopo aver collegato una fonte dati reale (Sentry/Prometheus/Vercel); nessuna dashboard finta.
- **Prerequisiti:** fonte dati e credenziali, piano Grafana adeguato.

### 4.10 Twilio (API key)

- **Stato:** installato, connesso, testato (`ListIncomingPhoneNumber` → 0 numeri); nessun SMS inviato.
- **Integrazione:** D — telefonia non collegata al prodotto; API vocali interne pronte ma senza provider.
- **Piano:**
  1. scegliere numero e provider solo con approvazione e budget;
  2. sandbox/test mode, limiti di spesa e consenso;
  3. webhook firmati e idempotenti;
  4. log senza contenuto sensibile.
- **Prerequisiti:** numero, credenziali, budget, approvazione, consenso.

### 4.11 Resend (API key)

- **Stato:** installato, connesso, testato (`list-domains` → nessun dominio); nessuna email inviata.
- **Integrazione:** D — email di autenticazione gestite da Supabase/Mailpit in locale.
- **Piano:** verificare un dominio, template transazionali, webhook firmati, unsubscribe per marketing; test solo sandbox.
- **Prerequisiti:** dominio verificato, API key, approvazione.

### 4.12 Canva (remoto, OAuth)

- **Stato:** installato, connesso, testato (`search-designs`).
- **Integrazione:** D — materiali commerciali, non runtime.
- **Piano:** usare per materiali di presentazione/documentazione visiva; nessun contenuto pubblicato automaticamente.
- **Prerequisiti:** nessuno.

### 4.13 Figma (hosted, OAuth)

- **Stato:** installato, connesso, testato (`whoami` → utente admin).
- **Integrazione:** D — design system e prototipi.
- **Piano:** esportare specifiche/design token per la UI; nessuna modifica automatica ai file di design senza richiesta.
- **Prerequisiti:** nessuno.

### 4.14 Linear (remoto, OAuth)

- **Stato:** installato, connesso, testato (`list_teams` → `CMristo`).
- **Integrazione:** B — task tracking disponibile, nessun ticket creato in questa sessione.
- **Piano:** creare ticket per i rischi aperti (MFA, WAF, webhook, Sentry) con priorità e link ai documenti.
- **Prerequisiti:** nessuno (scritture solo se richieste).

### 4.15 Notion (remoto, OAuth)

- **Stato:** installato, connesso, testato (search, 0 risultati).
- **Integrazione:** B — documentazione/runbook.
- **Piano:** pubblicare runbook operativi e decision log; condividere solo pagine necessarie.
- **Prerequisiti:** autorizzare la connessione sulle pagine desiderate.

### 4.16 Zapier (remoto, OAuth)

- **Stato:** installato, connesso, testato (`discover_zapier_actions`).
- **Integrazione:** D — nessuna automazione creata.
- **Piano:** valutare solo automazioni interne a basso rischio; niente trigger su pagamenti/email reali senza approvazione.
- **Prerequisiti:** piano Zapier e approvazione.

### 4.17 Context7 (remoto, senza chiave)

- **Stato:** installato, connesso, testato (`resolve-library-id` per React).
- **Integrazione:** B — documentazione aggiornata per Next.js/React/Supabase.
- **Piano:** consultarlo prima di aggiornamenti di dipendenze o uso di API Next 16.
- **Prerequisiti:** nessuno; chiave opzionale per rate limit più alti.

### 4.18 Exa (remoto)

- **Stato:** installato, connesso, testato (ricerca).
- **Integrazione:** B — ricerca tecnica mirata.
- **Piano:** usarlo per verifiche di sicurezza e best practice, citando le fonti.
- **Prerequisiti:** nessuno.

### 4.19 Firecrawl (remoto, OAuth)

- **Stato:** installato, connesso, testato (`firecrawl_scrape` su example.com).
- **Integrazione:** B — raccolta documentazione pubblica.
- **Piano:** rispettare robots/ToS e limiti; nessuno scraping di dati personali.
- **Prerequisiti:** nessuno.

### 4.20 Google Docs / Sheets / Slides — **PARCHEGGIATI**

- **Stato:** configurati, trasporto connesso, **non autenticati**; tools/list verificato; chiamate → 401.
- **Integrazione:** C — **parcheggiati su istruzione dell'utente**.
- **Piano:** riprendere solo quando l'utente fornirà OAuth Client ID/Secret e autorizzerà il login.
- **Prerequisiti:** progetto Google Cloud, API abilitate, OAuth client "AI-powered agent", redirect `http://127.0.0.1:19876/callback`, variabili d'ambiente.

### 4.21 Bird (extra, non richiesto esplicitamente)

- **Stato:** installato, connesso, catalogo 50 tool verificato; lettura dati bloccata da ID risorsa mancanti.
- **Integrazione:** D — nessun uso nel prodotto.
- **Piano:** mantenerlo disponibile per valutazioni future su comunicazioni; nessun invio.

---

## 5. Roadmap

| Fase | Attività | Dipendenze | Criterio di uscita |
|---|---|---|---|
| P0 (fatta) | Installazione, OAuth/token, test di lettura, inventario | — | 20/23 testati, 3 parcheggiati, report |
| P1 (fatta) | Audit security + CI gates + docs | repository | lint/typecheck/unit/pgTAP/E2E/build verdi |
| P2 | Push branch + verifica CI + PR | GitHub | CI verde, PR senza merge |
| P3 | Sentry SDK + release + alert | DSN/progetto | errore sintetico visibile |
| P4 | Vercel preview | progetto + env | preview su PR |
| P5 | WAF/rate limiting Cloudflare | zona + piano | regole testate su staging |
| P6 | Stripe/Twilio/Resend sandbox | integrazioni di prodotto | webhook firmati + idempotenza testati |
| P7 | Google Workspace MCP | OAuth client | login + lettura documento test |

---

## 6. Criteri di accettazione MCP

Un server è considerato **operativo** solo se:

1. la voce è presente nella configurazione del progetto;
2. l'handshake MCP riesce;
3. almeno un tool di lettura restituisce dati reali (o un errore di validazione atteso, documentato);
4. non richiede segreti nel repository;
5. il test è registrato in `docs/MCP_INVENTORY.md`;
6. i limiti/prerequisiti sono espliciti.

Un server **non** è integrato nel prodotto se non esiste codice applicativo che lo usa: la dicitura corretta è "MCP di sviluppo verificato", non "funzionalità del prodotto".

---

## 7. Sicurezza e privacy

- Non inviare a MCP dati di tenant reali, credenziali o dump del database.
- Preferire ambienti di test e dataset sintetici.
- Per i server con tool di scrittura (Stripe, Twilio, Resend, Cloudflare, Vercel, GitHub, Linear, Notion, Canva, Figma, Zapier): usare solo operazioni esplicitamente richieste.
- Conservare i token fuori dal repository; revocarli se sospetti.
- Rivedere periodicamente gli scope OAuth e rimuovere server non usati.

---

## 8. Azioni manuali richieste all'utente

1. **Google MCP:** fornire OAuth Client ID/Secret e completare i login (parcheggiato).
2. **GitHub:** confermare se attivare branch protection e aprire una PR.
3. **Vercel:** indicare il progetto da collegare e autorizzare i preview deploy.
4. **Cloudflare:** fornire accesso alla zona e approvare le regole WAF.
5. **Sentry/Grafana:** fornire DSN/progetto e fonte dati per il monitoraggio.
6. **Stripe/Twilio/Resend:** decidere quando implementare le integrazioni di prodotto; solo allora avranno senso webhook e test sandbox.

# AUDIT COMPLETO — CM Risto

**Data:** 17 ottobre 2026
**Percorso:** `C:\Users\calos\CM-Risto`
**Oggetto:** audit tecnico e funzionale della build demo, del sito pubblico, del layer dati demo e delle fondamenta Supabase.
**Metodo:** lettura del codice, esecuzione di test unitari/e2e/pgTAP, build di produzione, smoke test HTTP, controllo automatico di overflow e link, verifica SQL transazionale sui permessi membership.
**Vincolo:** la build è dimostrativa. Non sono integrate autenticazione reale, pagamenti, fiscalità, email, telefonia, stampanti o sincronizzazione offline.

---

## A. Executive summary

CM Risto è oggi un **frontend dimostrativo completo e coerente**, con 12 pagine pubbliche, 16 pagine gestionali, un design system riutilizzabile, un motore demo persistito e una base Supabase con schema multi-tenant e RLS. La navigazione, i ruoli demo e i principali flussi operativi funzionano; il flusso POS → comanda → incasso → vendite è coperto da test end-to-end.

Le fondamenta backend sono promettenti ma **non sono ancora collegate all'applicazione**: nessuna pagina usa Supabase Auth o le API del database, i ruoli sono solo client-side e non esistono ancora le tabelle del dominio ordini/pagamenti/dispositivi. La build non è quindi pronta per la produzione.

L'audit ha prodotto tre correzioni concrete:

1. **P0 sicurezza:** un manager poteva auto-promuoversi a owner tramite `members.manage`. Corretto con trigger database e 14 test pgTAP di regressione.
2. **P1 sicurezza:** le esportazioni CSV erano vulnerabili a CSV/formula injection. Corretto con neutralizzazione delle formule e test unitari.
3. **P1 responsive:** `/app/report` overflowava a 390px. Corretto con `min-w-0` sui contenitori delle card.

Sono inoltre emerse lacune note e dichiarate: pagine legali segnaposto, assenza di componenti `alert`/`progress`/`avatar`, editor varianti nel menu assente, auth/onboarding solo demo, nessun limite palmari lato server, nessuna CI. La documentazione è stata allineata alla realtà; restano da fare QA visiva manuale, accessibilità con strumenti dedicati e test di integrazione applicativa.

**Giudizio sintetico:** demo commerciale solida e onesta; fondamenta DB valide; prodotto non ancora utilizzabile in produzione.

**Conteggio requisiti censiti:** 86 individuali — 45 COMPLETO E VERIFICATO, 24 PARZIALE, 8 SOLO DEMO, 8 MANCANTE, 1 NON APPLICABILE, 0 PRESENTE MA DIFETTOSO dopo i fix, 0 NON VERIFICABILE nel perimetro demo. I requisiti che dipendono da servizi esterni sono classificati MANCANTE (non implementati), non come verificati.

---

## B. Tabella di conformità

Legenda stati:

- **COMPLETO E VERIFICATO** — implementato e verificato con test, esecuzione reale o ispezione puntuale del comportamento.
- **PARZIALE** — funzionalità presente ma con parti mancanti, non testate o volutamente limitate.
- **SOLO DEMO** — funziona esclusivamente con dati locali e non ha equivalente reale/server-side.
- **PRESENTE MA DIFETTOSO** — implementato ma con difetto noto (nessun caso residuo dopo i fix).
- **MANCANTE** — non implementato.
- **NON VERIFICABILE** — richiede servizi esterni o dispositivi non disponibili.
- **NON APPLICABILE** — fuori perimetro o vietato dalle regole del progetto.

| ID | Requisito | Stato | Evidenza / note | Priorità |
|---|---|---|---|---|
| PUB-01 | Home pubblica con hero, funzioni, piani, CTA | COMPLETO E VERIFICATO | `src/app/page.tsx`; HTTP 200; responsive | P1 |
| PUB-02 | Pagina prezzi con mensile/annuale, trial e 4 piani | COMPLETO E VERIFICATO | `prezzi` + `pricing-cards`; prezzi dichiarati provvisori | P2 |
| PUB-03 | Pagina funzionalità con limiti delle integrazioni dichiarati | COMPLETO E VERIFICATO | `funzionalita`; separa disponibile e “richiede integrazioni” | P2 |
| PUB-04 | Modulo contatti con validazione e recapito | PARZIALE | UI e validazione presenti; nessun invio email reale, indirizzi segnaposto | P2 |
| PUB-05 | Documentazione con guida a demo, ruoli, dati e integrazioni | COMPLETO E VERIFICATO | `documentazione`; descrive anche i limiti reali | P2 |
| PUB-06 | Login con validazione | SOLO DEMO | UI funzionante; backend non collegato, toast esplicito | P0 go-live |
| PUB-07 | Registrazione con validazione | SOLO DEMO | UI funzionante; nessuna creazione account reale | P0 go-live |
| PUB-08 | Recupero password | SOLO DEMO | UI funzionante; nessun invio email | P0 go-live |
| PUB-09 | Onboarding in 3 step | SOLO DEMO | UI completa; nessuna chiamata a `create_organization` | P0 go-live |
| PUB-10 | Privacy policy | PARZIALE | Testo dimostrativo/segnaposto, dichiarato | P1 go-live |
| PUB-11 | Cookie policy | PARZIALE | Testo dimostrativo/segnaposto, dichiarato | P1 go-live |
| PUB-12 | Termini di servizio | PARZIALE | Testo dimostrativo/segnaposto, dichiarato | P1 go-live |
| PUB-13 | Metadata SEO per pagina, sitemap, robots | PARZIALE | Metadata su home + 6 pagine pubbliche; `sitemap.ts` e `robots.ts` assenti | P3 |
| PUB-14 | Link interni e route pubbliche | COMPLETO E VERIFICATO | 27 link unici controllati; nessun link rotto; 29 route HTTP 200 | P1 |
| DS-01 | Token, palette brand e tipografia | COMPLETO E VERIFICATO | Tailwind 4 + CSS variables; `brand-600 #248455` | P2 |
| DS-02 | Button e Badge con varianti | COMPLETO E VERIFICATO | Varianti verificate; `subtle` sostituito da `muted` | P2 |
| DS-03 | Input, Textarea, Select, Field con errori | COMPLETO E VERIFICATO | Usati in auth, contatti, dialogo e POS | P2 |
| DS-04 | Dialog, Sheet, Dropdown, Confirm | COMPLETO E VERIFICATO | Radix; Sheet con titolo accessibile | P2 |
| DS-05 | DataTable con ricerca/ordinamento | COMPLETO E VERIFICATO | Usata in vendite, personale, dispositivi, piattaforma | P2 |
| DS-06 | Grafici responsive | COMPLETO E VERIFICATO | `ChartFrame` + recharts; client-only/hydration-safe | P2 |
| DS-07 | EmptyState, Skeleton, Tooltip | COMPLETO E VERIFICATO | Usati nelle pagine; titolo EmptyState reso come heading | P3 |
| DS-08 | PageHeader, StatCard, StatusBadge | COMPLETO E VERIFICATO | Usati nelle pagine gestionali | P3 |
| DS-09 | Toaster globale | COMPLETO E VERIFICATO | Sonner; messaggi verificati negli e2e | P3 |
| DS-10 | Alert, Progress, Avatar | MANCANTE | File assenti; non dichiarati più come presenti | P3 |
| SH-01 | Topbar con ricerca, notifiche, utente e reset | COMPLETO E VERIFICATO | Reset coperto da e2e; notifiche e badge presenti | P2 |
| SH-02 | Sidebar desktop e menu mobile | COMPLETO E VERIFICATO | Navigazione filtrata per ruolo; Sheet mobile | P2 |
| SH-03 | Command palette Ctrl/Cmd+K | COMPLETO E VERIFICATO | Filtra le aree accessibili al ruolo | P3 |
| SH-04 | Cambio ruolo demo | SOLO DEMO | Funziona e reindirizza alla home del ruolo; non è autorizzazione reale | P1 |
| SH-05 | Guardie di area per ruolo | SOLO DEMO | e2e cassette/cameriere verifica accesso e diniego; solo client-side | P1 |
| SH-06 | KDS dedicato e redirect cucina | COMPLETO E VERIFICATO | e2e: cambio ruolo → `/app/cucina`, link Esci visibile | P1 |
| SH-07 | Interfaccia cameriere mobile-first | COMPLETO E VERIFICATO | e2e + controllo a 390px; frame `max-w-lg` e bottom nav | P2 |
| SH-08 | StoreGate/idratazione senza mismatch | COMPLETO E VERIFICATO | e2e idratazione; nessun errore console nei flussi | P1 |
| PAG-01 | Panoramica con KPI, grafici, attività | COMPLETO E VERIFICATO | e2e “Buongiorno”; calcoli condivisi | P2 |
| PAG-02 | POS: conti, prodotti, varianti, comanda, incasso | COMPLETO E VERIFICATO | e2e asporto → comanda → carta → vendite | P1 |
| PAG-03 | Sala: mappa tavoli, stati, comanda | PARZIALE | UI e store presenti; interazioni non tutte coperte da test | P2 |
| PAG-04 | Comande: lista, stati, filtri | PARZIALE | UI presente; flusso indiretto coperto dal POS, non tutti i filtri | P2 |
| PAG-05 | Cucina KDS: colonne e avanzamento | PARZIALE | Accesso e rendering coperti da e2e; avanzamento non testato end-to-end | P2 |
| PAG-06 | Menu: categorie, prodotti, allergeni, disponibilità | PARZIALE | CRUD prodotti presente; **editor varianti assente** (solo preservate) | P2 |
| PAG-07 | Prenotazioni: lista, stati, nuova prenotazione | PARZIALE | UI/store presenti; azioni non coperte da e2e | P2 |
| PAG-08 | Clienti: ricerca, storico, note | PARZIALE | UI/store presenti; azioni non coperte da e2e | P3 |
| PAG-09 | Vendite: ricerca, filtri, dettaglio, CSV | COMPLETO E VERIFICATO | e2e ricerca scontrino #132; CSV ora neutralizzato | P1 |
| PAG-10 | Magazzino: scorte, rettifiche, fornitori | PARZIALE | UI/store presenti; azioni non coperte da e2e | P2 |
| PAG-11 | Report: KPI, grafici, export | PARZIALE | Overflow corretto e verifica a 390/1280; filtri non tutti testati | P2 |
| PAG-12 | Personale: ruoli, turni, inviti | PARZIALE | UI/store demo; nessun invito reale | P2 |
| PAG-13 | Dispositivi: registro, revoca, limite | PARZIALE | Limite 4 simulato; enforcement solo client-side | P1 |
| PAG-14 | Impostazioni: dati locali, preferenze | PARZIALE | Reset e UI presenti; copy reset incoerente con topbar | P3 |
| PAG-15 | Abbonamento: piano, uso, fatture demo | PARZIALE | UI completa; nessun billing reale | P2 |
| PAG-16 | Console piattaforma Super Admin | PARZIALE | e2e verifica accesso e distribuzione piani; azioni non tutte testate | P2 |
| DEM-01 | 4 ristoranti demo indipendenti | COMPLETO E VERIFICATO | Seed deterministico; dati coerenti | P2 |
| DEM-02 | Conteggi seed deterministici | COMPLETO E VERIFICATO | 72 ordini pagati, 11 attivi, 83 totali; test unitari | P2 |
| DEM-03 | Persistenza e reset demo | COMPLETO E VERIFICATO | localStorage + reset e2e con toast | P2 |
| DEM-04 | Stato condiviso tra pagine | PARZIALE | POS → vendite verificato; altri flussi solo per codice | P1 |
| DEM-05 | Incasso idempotente e sconto | COMPLETO E VERIFICATO | Guardia pagamento; 10% su 600 → 540; test unitari | P2 |
| DEM-06 | Isolamento demo, nessuna chiamata esterna | COMPLETO E VERIFICATO | Nessun client Supabase importato dal frontend | P2 |
| DEM-07 | Etichette “demo” e avvisi dati fittizi | COMPLETO E VERIFICATO | Topbar, KDS, viste ruolo, documentazione | P2 |
| DEM-08 | Limite 4 palmari nella demo | SOLO DEMO | 5° bloccato e revoca funzionante; solo client-side | P1 |
| DEM-09 | Flussi cross-page completi POS→KDS→Sala→Report | PARZIALE | e2e copre POS→Vendite; gli altri sono verificati a codice | P2 |
| DB-01 | Migrazioni applicate e verificabili | COMPLETO E VERIFICATO | v1 + gerarchia ruoli; `npx supabase migration up` | P1 |
| DB-02 | Schema multi-tenant con relazioni | COMPLETO E VERIFICATO | 11 tabelle, FK e indici; ispezione DB | P1 |
| DB-03 | RLS su tutte le tabelle | COMPLETO E VERIFICATO | 26 policy; 30 test pgTAP cross-tenant | P0 |
| DB-04 | Helper permessi e scope tenant | COMPLETO E VERIFICATO | Funzioni security definer con `search_path` fissato | P0 |
| DB-05 | Gerarchia ruoli membership | COMPLETO E VERIFICATO | Trigger + 14 test; escalation manager bloccata | P0 |
| DB-06 | Audit append-only e isolato per tenant | COMPLETO E VERIFICATO | Policy e test RLS dedicati | P2 |
| DB-07 | Platform admin isolati dalle organizzazioni | COMPLETO E VERIFICATO | Helper/policy e test pgTAP | P1 |
| DB-08 | `create_organization` atomica e sicura | COMPLETO E VERIFICATO | RPC SECURITY DEFINER; test onboarding/first owner | P1 |
| DB-09 | Creazione profilo su signup | COMPLETO E VERIFICATO | Trigger su `auth.users`; test pgTAP | P1 |
| DB-10 | Auth SSR, sessioni e protezione route | MANCANTE | Nessun middleware/client Supabase nell'app | P0 go-live |
| DB-11 | Limite 4 palmari enforcement server-side | MANCANTE | Solo simulazione demo | P1 go-live |
| DB-12 | Tabelle ordini, pagamenti, menu, dispositivi | MANCANTE | Nessun dominio operativo nello schema v1 | P0 go-live |
| DB-13 | Idempotenza server-side ordini/pagamenti | MANCANTE | Solo guardia demo in memoria | P1 go-live |
| DB-14 | Seed reale/ambiente Supabase | MANCANTE | Presente solo seed demo TypeScript | P2 |
| SEC-01 | CSV/formula injection | COMPLETO E VERIFICATO | `csvEscape` neutralizza `= + - @ TAB CR`; 3 test unitari | P1 |
| SEC-02 | Auto-promozione ruolo membership | COMPLETO E VERIFICATO | Pre-fix `UPDATE 1`; post-fix trigger e test | P0 |
| SEC-03 | Isolamento Super Admin demo | SOLO DEMO | Chiunque può selezionare il ruolo; accettabile solo in demo | P0 go-live |
| SEC-04 | Segreti fuori dal repository | PARZIALE | Nessun segreto trovato; `.env.example` assente | P1 go-live |
| OPS-01 | Test unitari Vitest | COMPLETO E VERIFICATO | 22/22: calcoli, seed, store, CSV | P1 |
| OPS-02 | Test end-to-end Playwright | COMPLETO E VERIFICATO | 5/5: idratazione, POS, ruoli, permessi, reset | P1 |
| OPS-03 | Test pgTAP schema/RLS | COMPLETO E VERIFICATO | 44/44: 30 RLS + 14 escalation | P0 |
| OPS-04 | Lint, typecheck e build | COMPLETO E VERIFICATO | Tutti puliti; 32 pagine statiche, 30 route | P1 |
| OPS-05 | CI GitHub Actions | MANCANTE | Nessun workflow | P1 |
| OPS-06 | Responsive automatico e QA visiva | PARZIALE | Overflow a 390px e link verificati; QA visiva manuale assente | P2 |
| OPS-07 | Accessibilità con strumenti dedicati | PARZIALE | Struttura semantica migliorata; nessun audit axe/Lighthouse | P2 |
| OPS-08 | Documentazione allineata al codice | COMPLETO E VERIFICATO | STATUS/ARCHITECTURE/AGENTS/DECISIONS corretti; questo report | P2 |
| OPS-09 | Testi legali definitivi | PARZIALE | Segnaposto espliciti; da validare legalmente | P1 go-live |
| OPS-10 | Commit git | NON APPLICABILE | 0 commit; per regola solo su richiesta esplicita | — |
| OPS-11 | Integrazioni esterne reali | MANCANTE | Pagamenti, fiscale, email, telefonia, stampa, offline | P1 go-live |

---

## C. Analisi per pagina

### Sito pubblico

| Pagina | Stato | Comportamento verificato | Limiti |
|---|---|---|---|
| `/` | COMPLETO | Hero, sezioni prodotto, piani, CTA, header/footer; HTTP 200; responsive | Nessun dato dinamico |
| `/prezzi` | COMPLETO | 4 piani, toggle mensile/annuale, trial 30 giorni, nota prezzi provvisori | Nessun checkout |
| `/funzionalita` | COMPLETO | Sezioni POS, sala, cucina, magazzino, report, multi-sede; limiti integrazioni dichiarati | Alcune funzioni sono progettate, non disponibili |
| `/contatti` | PARZIALE | Form validato, stato inviato, recapiti | Nessun servizio email; indirizzi `.example` |
| `/documentazione` | COMPLETO | Guida a demo, ruoli, dati, dispositivi, stato integrazioni | — |
| `/login` | SOLO DEMO | Validazione email/password, toast “backend non collegato” | Nessuna sessione reale |
| `/registrati` | SOLO DEMO | Validazione nome/email/password/termini | Nessuna creazione account |
| `/recupera-password` | SOLO DEMO | Validazione e conferma | Nessuna email |
| `/onboarding` | SOLO DEMO | 3 step: locale, sala, piano; link alla dashboard | Nessuna chiamata a Supabase |
| `/privacy` | PARZIALE | Struttura completa, data aggiornamento | Testo dimostrativo |
| `/cookie` | PARZIALE | Struttura completa | Testo dimostrativo, nessun banner cookie |
| `/termini` | PARZIALE | Struttura completa | Testo dimostrativo |

### Gestionale `/app`

| Pagina | Stato | Comportamento verificato | Limiti |
|---|---|---|---|
| `/app/panoramica` | COMPLETO | KPI, grafici, attività, notifiche; e2e idratazione | — |
| `/app/pos` | COMPLETO | Tavolo/asporto/delivery, ricerca, varianti, righe, comanda, sconto, incasso; e2e | Nessun pagamento reale |
| `/app/sala` | PARZIALE | Mappa tavoli, stati, comanda, trasferimento | Interazioni non tutte e2e |
| `/app/comande` | PARZIALE | Lista, stati, filtri | Non tutti i filtri testati |
| `/app/cucina` | PARZIALE | KDS a colonne, timer, avanzamento; accesso e2e | Avanzamento non e2e |
| `/app/menu` | PARZIALE | Categorie, prodotti, allergeni, disponibilità, CRUD | Editor varianti assente |
| `/app/prenotazioni` | PARZIALE | Lista, stati, nuova prenotazione | Azioni non e2e |
| `/app/clienti` | PARZIALE | Ricerca, storico, note | Azioni non e2e |
| `/app/vendite` | COMPLETO | Ricerca, filtri, dettaglio, export CSV; e2e | Export non testato su Excel reale |
| `/app/magazzino` | PARZIALE | Scorte, rettifiche, fornitori | Azioni non e2e |
| `/app/report` | PARZIALE | KPI, grafici, export; overflow corretto; 390/1280 verificati | Filtri non tutti testati |
| `/app/personale` | PARZIALE | Staff, ruoli, turni | Inviti solo demo |
| `/app/dispositivi` | PARZIALE | Registro, revoca, limite 4 simulato | Enforcement solo client-side |
| `/app/impostazioni` | PARZIALE | Preferenze, reset dati | Copy reset incoerente |
| `/app/abbonamento` | PARZIALE | Piano, uso, fatture demo | Nessun billing |
| `/app/piattaforma` | PARZIALE | Console, ristoranti, piani; accesso e2e | Azioni non tutte testate |

---

## D. Analisi per ruolo

| Ruolo | Aree | Stato | Note |
|---|---|---|---|
| `admin` | Tutte tranne piattaforma | COMPLETO DEMO | Vede 15 pagine gestionali; guardie client-side |
| `cassiere` | POS, vendite, clienti, sala, comande | COMPLETO DEMO | e2e: home `/app/pos`; `/app/report` negato con messaggio |
| `cameriere` | Sala, comande | COMPLETO DEMO | e2e: home `/app/sala`, testo “Cameriere · demo”; `/app/pos` negato; frame mobile |
| `cucina` | Cucina, comande | COMPLETO DEMO | Redirect forzato a `/app/cucina`; KDS scuro; link Esci |
| `super_admin` | Piattaforma, staff, abbonamenti | SOLO DEMO | Selezionabile da chiunque; nessuna identità o verifica server |
| `owner`/`admin`/`manager`/ruoli operativi (DB) | Membership e permessi reali | COMPLETO BACKEND | Gerarchia trigger; manager non può creare/promuovere owner o admin |

**Rischio residuo:** tutte le guardie dell'app sono client-side. In produzione il ruolo dovrà derivare dalla sessione Supabase e ogni server action/route handler dovrà verificare permessi e tenant. La console piattaforma non deve essere raggiungibile cambiando una variabile locale.

---

## E. Database, RLS e sicurezza

### Schema applicato

- Migrazione `20261017090000_sprint1_foundation.sql`: organizzazioni, ristoranti, membership, ruoli, permessi, profili, platform admin, audit log e RPC `create_organization`.
- Migrazione `20261017120000_membership_role_hierarchy.sql`: rank ruoli e trigger di gerarchia.
- 11 tabelle, 26 policy RLS, funzioni helper con `search_path` fissato, trigger profilo e audit.
- Test pgTAP: **44/44** (30 isolamento/RLS + 14 escalation membership).

### Fix P0: escalation membership

**Prima:** un utente con permesso `members.manage` poteva eseguire `UPDATE memberships SET role_id = owner` sulla propria membership. Verificato in transazione SQL con `UPDATE 1`.

**Dopo:** trigger `memberships_enforce_role_hierarchy` su INSERT/UPDATE/DELETE:

- bypass solo se `auth.uid()` è null (service role/superuser);
- primo membro di una nuova organizzazione obbligatoriamente `owner`;
- nessuno può modificare il proprio ruolo o rimuovere la propria membership;
- identità (`user_id`, `organization_id`) immutabile;
- un attore può gestire solo ruoli di rank inferiore; l'owner può assegnare anche owner;
- manager non può assegnare owner/admin, né modificare/eliminare un owner;
- admin non può promuovere a owner;
- un non-owner non può modificare ruoli pari o superiori.

**Test:** `supabase/tests/sprint1_membership_escalation.test.sql`, 14 asserzioni; incluso il caso manager → owner negato.

### Limiti backend

- Nessuna tabella per ordini, righe ordine, pagamenti, menu, modificatori, tavoli, dispositivi o turni.
- Nessun endpoint/route handler/server action applicativo.
- Nessuna sessione Supabase, middleware o protezione route.
- Limite palmari non enforceable lato server.
- Nessuna chiave di idempotenza per ordini/pagamenti.
- Nessun seed Supabase; il seed è solo TypeScript nel browser.

---

## F. Flussi end-to-end

| Flusso | Copertura | Esito |
|---|---|---|
| Idratazione demo e panoramica | Playwright | PASS |
| POS: nuovo conto asporto → prodotto → comanda → incasso carta → vendite | Playwright | PASS |
| Cambio ruolo Super Admin → piattaforma → Cucina → KDS | Playwright | PASS |
| Cassiere/cameriere: home corretta e area negata | Playwright | PASS |
| Reset dati demo dalla topbar | Playwright | PASS |
| Manager prova a promuoversi owner | pgTAP/SQL | PASS (negato) |
| RLS cross-tenant su tutte le tabelle | pgTAP | PASS (30/30) |
| POS → KDS → Sala → Report completo | Solo codice | PARZIALE |
| Menu: creazione varianti | Solo codice | MANCANTE |
| Login → onboarding → tenant reale | Non eseguibile | MANCANTE |

---

## G. Gap analysis e 10 problemi principali

1. **P0 — Nessuna autenticazione/autorizzazione reale.** Il frontend non usa Supabase; ruoli, Super Admin e tenant sono simulati. Blocca qualsiasi go-live.
2. **P0 — Dominio operativo assente nel database.** Ordini, pagamenti, menu, dispositivi e vendite esistono solo nello store demo. Nessuna persistenza reale.
3. **P1 — Pagine legali segnaposto.** Privacy, cookie e termini non sono pubblicabili senza revisione legale e banner cookie.
4. **P1 — Limite 4 palmari solo client-side.** Facilmente aggirabile; va imposto nel database/server.
5. **P1 — Nessuna idempotenza server-side.** Ordini, pagamenti e sync offline richiedono chiavi univoche e transazioni.
6. **P2 — Editor varianti menu assente.** Il POS seleziona varianti, ma il menu non consente di crearle/modificarle; il dato è solo preservato.
7. **P2 — QA visiva e accessibilità incomplete.** Overflow e link sono automatici; mancano revisione manuale, axe/Lighthouse e test tastiera/screen reader.
8. **P2 — CI e ambiente assenti.** Nessun workflow GitHub Actions, nessun `.env.example`, nessun test d'integrazione applicativo.
9. **P3 — Documentazione prima dell'audit non veritiera.** Dichiarava componenti inesistenti e test non presenti; ora corretta. Restano da mantenere allineati i conteggi.
10. **P3 — Piccole incoerenze UI/SEO.** Toast reset diverso tra topbar e impostazioni; metadata solo su 7 pagine; sitemap/robots assenti; warning dev `instant-unrendered-segment`.

### Difetti corretti durante l'audit

- Auto-promozione manager → owner (P0).
- CSV/formula injection nell'export (P1).
- Overflow `/app/report` a 390px (P1).
- EmptyState senza heading semantico (P3, emerso dal test ruoli).
- Documentazione con componenti/test inesistenti (P2 documentale).

---

## H. Roadmap consigliata

### P0 — prima di qualsiasi ambiente reale

1. Auth SSR Supabase: login, registrazione, recupero password, sessione, middleware e route protection.
2. Onboarding reale con `create_organization`; primo utente owner; test d'integrazione.
3. Schema dominio minimo: menu/prodotti/modificatori, sale/tavoli, ordini/righe, pagamenti, dispositivi; RLS e test cross-tenant.
4. Server action/route handler protetti con verifica ruolo, tenant e limiti piano.

### P1 — completamento MVP

5. Limite palmari e pairing lato server; revoca e audit.
6. Idempotenza e transazioni per ordini/pagamenti; stati ordine server-side.
7. Testi legali definitivi, banner cookie, condizioni di prova e prezzi approvati.
8. CI GitHub Actions: lint, typecheck, unit, e2e, pgTAP, build; `.env.example`.

### P2 — qualità e completezza

9. Editor varianti/modificatori nel menu; flussi POS→KDS→Sala→Report coperti da e2e.
10. QA responsive/visiva manuale su desktop, tablet, KDS e palmare; audit accessibilità axe/Lighthouse.
11. Email contatti/recovery, billing Stripe, integrazione fiscale solo dopo verifica reale.
12. Pulizia copy/SEO: toast coerenti, metadata completo, sitemap, robots.

### P3 — rifiniture

13. Componenti `alert`, `progress`, `avatar` solo quando serviranno davvero.
14. Warning dev `instant-unrendered-segment`; valutare wrapper server per pagina.
15. Documentazione e screenshot aggiornati a ogni fase.

---

## I. Test e verifiche eseguite

| Comando / verifica | Risultato |
|---|---|
| `npm run lint` | PASS, 0 errori/0 warning |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 4 file, **22/22** |
| `npm run e2e` | PASS, **5/5** (16.9s) |
| `npx supabase test db` | PASS, 2 file, **44/44** |
| `npm run build` | PASS, 32/32 pagine statiche, 30 route, TypeScript 6.4s |
| Smoke HTTP 29 route | 29/29 `200` |
| Overflow responsive 390px | Nessun overflow su tutte le route |
| Link interni | 27 unici, 0 rotti |
| Verifica SQL escalation | Pre-fix `UPDATE 1`; post-fix negato |
| QA visiva manuale | NON ESEGUITA |
| Audit accessibilità automatico | NON ESEGUITO |
| Pagamenti/fiscale/email/stampa reali | NON VERIFICABILI (assenti) |

Nota: `npx supabase test db` emette warning innocui su `grant_pg_net_access`/`grant_pg_cron_access`; i test passano.

---

## J. Correzioni applicate

| Correzione | File | Verifica |
|---|---|---|
| Gerarchia ruoli membership | `supabase/migrations/20261017120000_membership_role_hierarchy.sql` | 14 test pgTAP |
| Fixture RLS: claim azzerati dopo `reset role`; piano 14 | `supabase/tests/sprint1_rls.test.sql`, `sprint1_membership_escalation.test.sql` | 44/44 pgTAP |
| CSV injection | `src/lib/utils.ts`, `tests/unit/utils.test.ts` | 3 test unitari |
| Overflow report 390px | `src/app/app/report/page.tsx` | Playwright 390px, nessun overflow |
| Heading semantico EmptyState | `src/components/ui/empty-state.tsx` | e2e ruoli 5/5 |
| Documentazione allineata | `STATUS.md`, `ARCHITECTURE.md`, `AGENTS.md`, `DECISIONS.md`, `AUDIT_COMPLETO.md` | Ispezione |

Nessun commit git è stato creato.

---

## K. Prossimi 5 interventi

1. Collegare Supabase Auth SSR, middleware di protezione e onboarding reale; mantenere la demo dietro flag.
2. Creare lo schema dominio minimo (menu, tavoli, ordini, pagamenti, dispositivi) con RLS e test cross-tenant.
3. Implementare server action/route handler protetti, idempotenza e limite 4 palmari lato server.
4. Aggiungere CI completa e `.env.example`; mantenere verdi lint, typecheck, unit, e2e, pgTAP e build.
5. Sostituire i testi legali, approvare prezzi/condizioni e completare QA visiva/accessibilità prima del go-live.

---

## L. Limiti dell'audit

- La build è demo: non esistono dati reali, account reali, pagamenti, scontrini fiscali, email, telefonia, stampanti o sincronizzazione offline.
- Non sono stati usati dispositivi fisici (palmari, tablet, registratori telematici, stampanti) né servizi cloud.
- Non sono stati eseguiti test di carico, penetration test, fuzzing o audit legale.
- L'accessibilità è stata migliorata semanticamente ma non verificata con axe/Lighthouse o screen reader reali.
- La QA visiva manuale su desktop/tablet/KDS/palmare resta da fare; il controllo automatico copre solo overflow e link.
- Le pagine non coperte da e2e sono state verificate a codice e smoke test, non cliccando ogni singola azione.
- I prezzi sono provvisori e non approvati commercialmente; le pagine legali non sono utilizzabili in produzione.

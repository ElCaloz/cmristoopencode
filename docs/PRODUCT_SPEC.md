# PRODUCT_SPEC — CM Risto

Requisiti completi del prodotto. **Nessuna voce di questo documento è da considerarsi implementata salvo quanto indicato esplicitamente in `docs/STATUS.md`.**

## 1. Visione

CM Risto è una piattaforma SaaS multi-tenant che unifica in un unico ecosistema l'intera gestione di ristoranti, pizzerie, bar, trattorie, pub e bistrot: gestionale web, cassa POS, sala e tavoli, palmari, comande, cucina (KDS), menu digitale, prenotazioni, CRM, receptionist AI, ordini online, magazzino, ricette e food cost, fornitori, marketing, statistiche, personale, multi-sede, abbonamenti SaaS.

Tutti i moduli condividono lo stesso database e le stesse regole di business. Un ordine ricevuto online deve comparire nelle comande, influenzare il magazzino secondo le regole configurate, essere associato a un cliente e comparire nei report.

## 2. Tipologie di utenti

Proprietario, amministratore piattaforma, responsabile di sede, responsabile di sala, cassiere, cameriere, responsabile di cucina, cuoco, responsabile magazzino, addetto prenotazioni, addetto marketing, commercialista/consulente con accesso limitato, cliente finale, tecnico autorizzato. Permessi configurabili per ruolo; ogni ruolo vede solo ciò che gli compete.

## 3. Multi-tenancy

- Entità: organizations, restaurants, restaurant_locations, users, memberships, roles, permissions, user_sessions, devices, device_pairings, restaurant_settings, audit_logs.
- Un'organizzazione può avere più sedi; un utente può essere autorizzato su una o più sedi.
- Isolamento bloccante: nessun accesso incrociato tra tenant (lettura ordini altrui, modifica tavoli di altre sedi, export report altrui, uso dispositivi di tenant diversi).

## 4. Dashboard principale

Indicatori: incasso del giorno, ordini, coperti, scontrino medio, vendite per fascia oraria, stato tavoli, tempo medio di servizio, ordini in preparazione, prenotazioni (in arrivo/confermate/cancellate), prodotti più venduti, scorte basse, valore magazzino, food cost stimato, sprechi, confronti con periodi precedenti, avvisi operativi, stato integrazioni e sincronizzazione dispositivi. Filtri per data, sede, canale, categoria.

Distinzioni contabili obbligatorie: ordini creati ≠ ordini pagati ≠ fatturato contabilizzato. Definizioni coerenti per incasso, vendite nette, imposte, sconti, rimborsi, annullamenti.

Navigazione: Panoramica, Cassa, Sala e tavoli, Comande e cucina, Menu e prodotti, Prenotazioni, Clienti e CRM, Receptionist AI, Ordini online, Magazzino, Fornitori e acquisti, Marketing e fidelizzazione, Report e analytics, Personale e turni, Sedi e dispositivi, Impostazioni, Abbonamento e fatturazione. Menu adattato ai permessi.

## 5. Cassa e POS

- Interfaccia touchscreen: categorie, prodotti, ricerca rapida, varianti, modificatori, note, carrello, quantità, eliminazione con autorizzazioni, sconti autorizzati, coperti, associazione tavolo/cliente/asporto, canale di vendita, riepilogo imponibile/imposte/totale, metodi di pagamento, stato pagamento, riapertura controllata, annullamenti/resi/storni, ricevuta.
- Pagamenti: contanti, carta via terminale compatibile, pagamenti elettronici integrati, misti, crediti interni, conti separati, pagamento per persona, parziale. Ogni transazione: identificativo univoco, importo, metodo, timestamp, operatore, stato, collegamento all'ordine. Gestione di fallimenti, duplicati, rimborsi, disallineamenti, riconciliazione. Mai memorizzare dati completi delle carte.
- Divisione conto: unico, parti uguali, per articolo, per quantità, spostamento articoli, pagamenti separati, storico. Impedire doppie chiusure concorrenti.
- Fiscale italiano: livello separato con configurazione aliquote, corrispettivi/documenti secondo il caso d'uso, integrazione RT/provider, identificativi trasmissioni, esiti, errori e recupero, storico, permessi dedicati, audit non alterabile. **Nessuna dichiarazione di conformità senza verifica ufficiale, hardware e provider.**
- Periferiche: stampanti ricevute/cucina/reparto, cassetto contanti, scanner, terminali pagamento, registratori telematici (via driver/SDK/local service compatibili).

## 6. Palmari camerieri (requisito prioritario)

- Primo abbinamento tramite QR/codice monouso generato dall'amministratore, con scadenza; il QR non contiene segreti permanenti.
- Riconoscimento automatico della sede tramite servizio locale sulla rete Wi-Fi; verifica crittografica del servizio (mai fidarsi solo di SSID/IP).
- **Limite obbligatorio di 4 palmari per cassa/gruppo operativo, applicato dal backend e dal servizio locale.** Il quinto dispositivo viene bloccato anche se uno dei quattro è offline. Procedura di revoca e sostituzione.
- Stati dispositivo: in attesa, autorizzato, attivo, offline, revocato, bloccato.
- PIN rapido per operatore: hash, limitazione tentativi, blocco temporaneo, registrazione operatore per ogni azione, scadenza sessione, blocco manuale, logout per inattività, revoca, protezione da replay/impersonificazione. Il PIN non conferisce privilegi amministrativi.
- Interfaccia palmare: tavoli con stato, comande aperte, notifiche cucina, selezione tavolo, coperti, aggiunta prodotti/varianti/note, invio comanda, portate successive, stato preparazione, richiesta conto, sparecchiare, trasferimento tavolo. Uso a una mano, pulsanti grandi, pochi tocchi.

## 7. Servizio locale e modalità offline

Servizio locale leggero (Node.js + TypeScript): collega palmari e cassa in LAN, coda persistente, comunicazione stampanti, realtime, eventi non sincronizzati, ripresa sincronizzazione, segnalazione conflitti, registro eventi. Nessuna perdita di ordini confermati. Idempotenza per evitare duplicazioni. **La modalità offline è dichiarabile solo dopo test reali di disconnessione, riavvio e conflitto.**

## 8. Sale e tavoli

Editor piantina: nome sala, tavoli, posizione, dimensione, forma, coperti massimi, aree interne/esterne/terrazza/banco, zone riservate, tavoli combinabili, percorsi. Drag and drop con salvataggio.

Stati tavolo non ambigui: libero, prenotato, in attesa di arrivo, occupato, con ordine aperto, in attesa del conto, conto in pagamento, da sparecchiare, temporaneamente non disponibile. Aggiornamento realtime su cassa, palmari, dashboard.

Operazioni: apertura, assegnazione cameriere, coperti, più conti, trasferimento, unione/separazione tavoli, trasferimento articoli, chiusura, storico. Conflitti tra operatori gestiti esplicitamente (niente sovrascritture silenziose).

## 9. Comande e cucina (KDS)

Ciclo: bozza → inviata → ricevuta → in preparazione → pronta → consegnata → annullata (con autorizzazioni). Ogni transizione registrata con operatore, orario, motivazione.

KDS: numero comanda, tavolo/ordine, orario, tempo trascorso, prodotti e quantità, modificatori, allergeni, note, stato articoli, priorità, reparto. Azioni: accettare, avviare preparazione, contrassegnare pronti, segnalare ritardi/indisponibilità/problemi, richiedere chiarimenti.

Reparti configurabili (antipasti, primi, secondi, pizzeria, grill, dessert, bar...); instradamento automatico per prodotto; portate con invio immediato/programmato; sincronizzazione tra reparti; avvisi camerieri.

Stampanti di reparto con regole per reparto/categoria/prodotto/sede/tipo ordine; gestione errori, duplicati, ristampe identificabili (che non generano nuove comande).

## 10. Menu, prodotti, varianti, allergeni

Prodotto: nome, descrizione, categoria, prezzo, immagine, codice, stato, canali, reparto, aliquota, varianti, modificatori, allergeni, ingredienti, ricetta, tempo preparazione, disponibilità, visibilità menu digitale, ordine visualizzazione.

Varianti/modificatori: taglie, formati, cotture, aggiunte, rimozioni, contorni, extra, scelte obbligatorie/facoltative, min/max, gruppi. Ricalcolo prezzi coerente su backend, cassa e menu digitale.

Allergeni: gestione strutturata secondo i requisiti applicabili; inserimento e verifica da parte del ristoratore; l'AI non inventa allergeni o garanzie di assenza contaminazione; avvisi visibili a personale autorizzato e, quando appropriato, al cliente.

Disponibilità: esaurimento temporaneo, programmata, limitata a canali/sedi, nascosta dal menu digitale; propagazione in tempo reale a tutti i dispositivi.

## 11. Prenotazioni

Dati: cliente, telefono, email, persone, data, orario, durata prevista, preferenze, richieste, note interne, stato, fonte, storico, conferma, promemoria, caparra se configurata.

Calendario giornaliero/settimanale/mensile con confermate, in attesa, cancellazioni, ritardi, no-show, coperti previsti, occupazione per fascia, disponibilità tavoli.

Motore disponibilità: capienza, tavoli, coperti, durata, orari, turni, intervalli, tavoli non disponibili/combinabili, prenotazioni esistenti, anticipo minimo/massimo, limiti online. Mai due prenotazioni incompatibili.

Conferme/promemoria via email, SMS, WhatsApp Business (se configurato), con registrazione esiti.

## 12. Receptionist AI

Canali (adapter separati, attivabili per sede): telefonia, WhatsApp Business, SMS, email, chat sito, widget menu.

Funzioni: FAQ, orari/indirizzo, informazioni menu, disponibilità prenotazioni, raccolta richieste, proposta slot reali, modifica/cancellazione con verifica identità richiesta, richieste speciali, italiano e inglese, riconoscimento mancanza informazioni, passaggio a operatore, riepilogo conversazione, risposte da approvare, stato ordini solo con dati affidabili.

Prenotazioni via AI: flusso controllato (raccolta dati → verifica disponibilità → solo slot reali → recap → conferma diretta solo se le regole lo consentono, altrimenti richiesta in attesa → registrazione → conferma sul canale autorizzato). **L'AI non dichiara confermata una prenotazione che il database non registra.**

Approvazione umana per operazioni sensibili: prenotazioni particolari, fuori orario, messaggi commerciali, sconti, rimborsi, eccezioni, risposte non verificate.

Telefonate: ricezione, risposta vocale AI, lingua, raccolta dati, consultazione gestionale, creazione richieste, trasferimento operatore, metadati, riepilogo, gestione errori. Registrazione audio disabilitata di default (solo se lecita e trasparente).

Inbox centralizzata: canale, cliente, ultimo messaggio, data/ora, stato, operatore, intervento AI, richieste pendenti, collegamenti a prenotazioni/ordini; assegnazione, ricerca, filtri, note interne, archiviazione, passaggio AI↔personale.

Controllo costi AI: provider e modello configurabili, limiti e budget per ristorante, conteggio richieste, monitoraggio costi, rate limiting, timeout, retry controllati, fallback, log errori, protezione da loop. Nessun accesso a SQL arbitrario: solo strumenti applicativi autorizzati e validati.

## 13. CRM e anagrafica clienti

Scheda unificata: anagrafica, contatti, consensi, prenotazioni, storico ordini, frequenza, spesa, scontrino medio, preferenze, punti, voucher, comunicazioni, note autorizzate, fonte. Deduplica senza fusioni automatiche su dati ambigui.

Segmentazione: nuovi, abituali, inattivi, frequenza, spesa, preferenze, ultima visita, iscrizione fedeltà — nel rispetto dei consensi.

Privacy: dati minimi necessari, informative, consensi e revoche, richieste interessati, export, cancellazione/anonimizzazione, conservazione, controlli accesso, audit accessi sensibili.

## 14. Menu QR, sito del ristorante, ordini online

Pagina pubblica: nome, logo, indirizzo, orari, contatti, foto, menu, prezzi, allergeni, servizi, prenotazione, mappa, social, asporto/consegna. Mobile-first, veloce, indicizzabile.

QR distinti per tavolo/sala/menu/lingua/campagna; apertura senza app; ordine da QR associato al tavolo corretto solo tramite associazione verificata e sicura.

Ordini digitali: asporto, consegna, al tavolo, ritiro programmato, fasce orarie, disponibilità prodotti, pagamenti configurati, conferme, stato, annullamenti, note, tempi. Gli ordini entrano nello stesso sistema centrale delle comande.

Canali: attivazione per ristorante, prodotti disponibili per canale, orari, tempi, limiti ordini, regole conferma, pagamenti.

## 15. Magazzino e inventario

Ingredienti: nome, codice, unità, disponibile, minima, costo, fornitore preferito, scadenza, lotto, posizione, sede, storico; conversioni tra unità compatibili.

Movimenti tracciati: carichi, scarichi, consumi da ricetta, rettifiche, sprechi, scaduti, resi, trasferimenti tra sedi, rettifiche motivate. Ogni movimento: quantità, data, operatore, motivo, collegamento all'operazione origenante.

Scarico automatico su vendita secondo ricetta e politica esplicita (fase di conferma definita dal ristorante); annullamenti/rimborsi senza movimenti duplicati.

Inventario: manuale, periodico, per categoria, differenze teorico/reale, valorizzazione, storico rettifiche, avvisi scorte basse, prodotti in scadenza.

Sprechi con motivazioni (scadenza, errore, danno, reso, sovrapproduzione, altro) visibili nei report economici.

## 16. Ricette, food cost, margini

Ricetta: ingredienti, quantità, unità, resa, sfridi, semilavorati, costo aggiornato, costo per porzione. Calcoli: costo teorico, food cost %, margine lordo teorico, confronto con prezzo, variazioni costi nel tempo, impatto sprechi, differenze teorico/reale. Distinguere margine teorico da utile netto. Simulazioni prezzo/costo con impatto stimato.

## 17. Fornitori e acquisti

Anagrafica fornitori: ragione sociale, contatti, condizioni, prodotti, prezzi, tempi, ordini, documenti, note. Ordini di acquisto con stato, ricezione merce, verifica quantità, registrazione prezzi, aggiornamento magazzino, discrepanze, storico, confronto prezzi. Ordine suggerito distinto dall'invio effettivo; invio automatico solo con configurazione esplicita e controlli.

## 18. Marketing e fidelizzazione

Programma fedeltà: punti, regole, premi, voucher, soglie, scadenze, storico, protezione doppi accrediti, regole resi/annullamenti, configurabile per ristorante e sede.

Promozioni: sconti %, fissi, codici, a tempo, su categorie, premi, prodotti; condizioni/limiti/cumulabilità/validità definite lato server.

Campagne: email e WhatsApp Business, segmentazione, modelli, programmazione, anteprima, test, approvazione, report consegne, disiscrizioni, consensi. Mai comunicazioni promozionali senza autorizzazione.

## 19. Report e analytics

Vendite per giorno/settimana/mese/anno, fascia oraria, sede, canale, categoria, prodotto, operatore (con permessi), metodo di pagamento.

Operativi: ordini, coperti, scontrino medio, tempi (ordine→preparazione, attesa, servizio), tasso annullamento, no-show, occupazione e rotazione tavoli, prodotti più/meno venduti. Metodo di calcolo di ogni indicatore definito esplicitamente.

Economici: vendite lorde/netto, sconti, rimborsi, imposte, incassi per metodo, food cost teorico, sprechi, costi acquisto, margini teorici, confronti; mai presentare stime incomplete come bilanci ufficiali.

Export CSV/XLSX/PDF autorizzati, nel rispetto di filtri, permessi, tenant e privacy.

## 20. Personale, ruoli, turni

Anagrafica dipendenti, ruoli, permessi, sedi, turni, disponibilità, richieste cambio, assenze, note, storico, registro azioni, riepiloghi ore (se supportati dai dati). Pianificazione con sovrapposizioni, copertura minima, modifiche, richieste, calendario. **Non è un sistema paghe/presenze certificato.**

Audit azioni rilevanti: apertura/chiusura conti, sconti, annullamenti, rimborsi, modifiche prenotazioni/menu, rettifiche magazzino, operazioni dispositivi, modifiche permessi. Consultabile da autorizzati.

## 21. Multi-sede

Passaggio sede senza nuovo login; dashboard consolidata e per sede; menu condivisi o specifici; prezzi per sede; magazzini separati; dipendenti condivisi o locali; prenotazioni indipendenti; dispositivi associati alla sede corretta; report comparativi; permessi org/sede; configurazioni fiscali e operative per sede. Nessuna mescolanza implicita di inventario, ordini o dispositivi tra sedi.

## 22. Abbonamenti e fatturazione SaaS

Piani configurabili (es. Starter, Professional, Business, Enterprise — nomi e prezzi da decisione commerciale) con limiti su: sedi, utenti, palmari, moduli, utilizzo AI, conversazioni, canali, archiviazione, integrazioni, assistenza.

Ciclo: registrazione, onboarding, scelta piano, checkout (Stripe Billing), webhook verificati, attivazione, rinnovi, pagamenti falliti, periodo tolleranza, sospensione, cambio piano, disdetta, storico fatture servizio, portale gestione. **Limiti applicati dal backend**, mai dal frontend. Distinguere abbonamento del ristoratore a CM Risto dai pagamenti dei clienti del ristorante.

## 23. Onboarding

Procedura guidata: account proprietario, organizzazione, prima sede, dati ristorante, orari, sale, tavoli, menu, categorie, imposte/impostazioni, utenti, ruoli, cassa, palmari, stampanti, servizio locale, prenotazioni, canali digitali, receptionist AI, verifica finale. Checklist di completamento riprendibile; non obbligare ad attivare tutti i moduli prima dell'uso delle funzioni essenziali.

## 24. Design e qualità UI

Gerarchia chiara, tipografia leggibile, spaziatura coerente, palette sobria e identità CM Risto, contrasto accessibile, componenti riusabili, tabelle leggibili, conferme per azioni irreversibili, feedback immediato, layout adattivo. Dashboard desktop con sidebar/barra superiore/selettore sede/profilo/notifiche. POS e palmari con design operativo distinto (pulsanti grandi, pochi passaggi, feedback per ogni azione). Accessibilità: tastiera, etichette, contrasto, focus visibile, errori comprensibili. Ogni modulo gestisce: caricamento, errore, nessun risultato, dati iniziali, successo, fallimento, accesso negato, connessione interrotta, sincronizzazione in attesa, conflitto.

## 25. Sicurezza, privacy, GDPR

Sessioni sicure, endpoint protetti, autorizzazioni server-side, RLS, validazione input, anti SQL injection/XSS/CSRF, rate limiting, segreti sicuri, firme webhook, controllo dipendenze, audit, backup/ripristino, conservazione dati, consensi, richieste interessati, ambienti separati. Dati personali minimi e con finalità documentate. Nessun addestramento di modelli esterni sui dati dei ristoranti senza base giuridica e configurazione esplicita.

## 26. Logging, monitoraggio, affidabilità

Sentry + log strutturato: errori applicativi, eccezioni, fallimenti integrazioni, errori sincronizzazione/stampa/code, ritardi, errori AI, stato webhook, problemi auth, stato servizi locali. Mai password/token/chiavi/PII non necessari nei log. Health check, monitoraggio dipendenze, allarmi, retry controllati, dead-letter queue, procedure di recupero, metriche. Un errore in un canale secondario non blocca cassa o comande.

## 27. Test e qualità

- Unit: prezzi, modificatori, sconti, totali, imposte, divisione conti, regole prenotazioni, disponibilità, consumi magazzino, food cost, permessi, limiti dispositivi, stati comande.
- Integrazione: database, auth, RLS, API, webhook, pagamenti simulati in test, provider email, servizio locale, sincronizzazione, coda offline, stampe simulate/compatibili.
- E2E: Flusso A servizio al tavolo; Flusso B palmari (4 autorizzati, 5° rifiutato, revoca, sostituto, limite sempre server-side); Flusso C interruzione rete (nessuna duplicazione, conflitti segnalati); Flusso D receptionist AI (conferma solo se registrata); Flusso E magazzino (scarico, annullo, nessun duplicato, report coerente).
- Controlli automatici: lint, typecheck, unit, integration, build, e2e, migrazioni, vulnerabilità dipendenze.

## 28. Definizione di prodotto pronto al primo rilascio commerciale

Registrazione e configurazione sede; utenti e permessi; menu; tavoli; palmari con limite 4 server-side; comande in cucina; sincronizzazione; flusso cassa completo; pagamenti via integrazione verificata; funzioni fiscali dichiarate realmente supportate e verificate; prenotazioni; movimenti magazzino; report da dati reali; AI nel rispetto dei permessi; abbonamenti verificati server-side; tenant isolati; operazioni tracciate; test principali superati; backup e recupero documentati; nessun segreto esposto o vulnerabilità critica non gestita.

Per hardware, certificazioni, provider esterni e verifiche legali: requisito documentato, mai dichiarato pronto senza verifica.

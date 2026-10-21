---
description: Analizza, pianifica, delega ai subagenti (backend, frontend, qa, security-reviewer), verifica e consegna un rapporto per una richiesta di sviluppo di CM Risto
agent: build
---

Sei il COORDINATORE di CM Risto (`C:\Users\calos\CM-Risto`). Applica sempre le regole di `AGENTS.md`. Il tuo compito non è implementare tutto direttamente: è analizzare, spezzare il lavoro, delegare agli agenti giusti tramite lo strumento `subagent`, integrare i risultati e consegnare un rapporto verificato.

## Richiesta da eseguire

$ARGUMENTS

Stato git corrente:

!`git status --short`

## Procedura obbligatoria

1. **Analisi.** Leggi `docs/STATUS.md`, i documenti pertinenti (`docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`) e i file realmente coinvolti nella richiesta. Se serve un'esplorazione ampia, delegala al subagent `explore`. Individua lavoro necessario, vincoli già imposti dal codice esistente e possibili conflitti con modifiche in corso (`git status`).

2. **Piano di task.** Suddividi la richiesta in task piccoli e verificabili. Per ogni task scrivi: obiettivo, file di destinazione (perimetro esclusivo), criteri di accettazione misurabili e dipendenze dagli altri task.

3. **Assegnazione.** Delega ogni task con lo strumento `subagent` usando l'ID dell'agente:
   - `backend` — API, server action, Supabase, schema/RLS/migrazioni, autenticazione, logica di business;
   - `frontend` — pagine, componenti, form, dashboard, demo, accessibilità, e2e dei flussi UI;
   - `qa` — esecuzione di verifiche e test (sola lettura);
   - `security-reviewer` — revisione di sicurezza (sola lettura).
   Includi sempre nel prompt di ogni subagent: contesto del task, perimetro di file esclusivo, criteri di accettazione, divieto di toccare file fuori perimetro e il formato di rapporto atteso.

4. **Coordinamento.** Avvia in parallelo solo task con aree di file disgiunte; esegui in sequenza quelli con dipendenze tipiche (es. prima migrazione/RPC, poi server layer, poi UI, poi test). Mai due agenti contemporaneamente sullo stesso file. Se un task modifica un contratto condiviso (tipi, RPC, route), comunica il cambiamento ai task successivi prima di procedere.

5. **Verifiche QA.** A implementazione ultimata delega a `qa` i controlli pertinenti: `npm run lint`, `npm run typecheck`, `npm test`, `npx supabase test db` (se toccate migrazioni o SQL), `npm run build` (se toccate pagine/config), `npm run e2e` o `npx playwright test <file>` (se toccati flussi UI). Considera bloccante ogni test fallito.

6. **Revisione di sicurezza.** Delega a `security-reviewer` quando il lavoro tocca autenticazione, permessi, RLS, migrazioni, denaro, API interne, input utente o segreti. Per cambiamenti puramente cosmetici puoi ometterlo, dichiarandolo nel rapporto.

7. **Correzioni e re-test.** Correggi gli errori introdotti dal lavoro (tu direttamente oppure riassegnando il fix all'agente di area competente) e ripeti le verifiche fallite fino a esito verde oppure a gap esplicitamente dichiarati. Non nascondere mai i fallimenti e non modificare i test per farli passare.

8. **Rapporto finale.** Produci un rapporto con:
   - file modificati (percorso + sintesi);
   - test ed esiti reali (numeri: `pgTAP x/y`, `unit x/y`, `e2e x/y`, lint/typecheck/build);
   - esito della revisione di sicurezza (verdetto e problemi aperti);
   - problemi residui e limiti dichiarati;
   - decisioni richieste all'utente.
   Se il lavoro cambia lo stato del progetto, aggiorna `docs/STATUS.md` e `docs/DECISIONS.md` come da protocollo di chiusura.

9. **Salvataggio su GitHub.** Quando la modifica è completata e verificata (o quando l'utente lo richiede), esegui commit descrittivo e push sul repository GitHub del progetto (remoto `origin`, repository `cm-risto`) come da regola 12 di `AGENTS.md`. Prima del commit controlla `git status` e l'elenco dei file in staging: nessun segreto (`.env.local`, `local-service/.env`) e nessun artefatto (`test-results/`, `.next/`, `node_modules/`, `local-service/dist/`) deve entrare nel commit. Nel rapporto indica URL del repository, hash del commit e branch.

## Limiti assoluti
- Commit e push sono autorizzati in via permanente solo sul repository `origin` del progetto; push verso altri repository, deploy, `supabase db reset`/`push`, migrazioni su ambienti non locali, modifica di credenziali, installazione di dipendenze, cancellazioni rischiose e qualsiasi operazione verso l'esterno o in produzione richiedono approvazione esplicita dell'utente.
- Non esporre mai segreti, token o contenuti di `.env`.
- Se lo strumento `subagent` non accetta uno degli ID previsti in questa installazione, dichiaralo esplicitamente nel rapporto ed esegui quel task internamente, indicando che la delega non era disponibile. Non inventare esecuzioni.

# CM Risto

SaaS multi-tenant per la gestione di ristoranti: menu, sala, POS, cucina KDS, palmari, prenotazioni, receptionist AI e abbonamenti.

## Requisiti

- Node.js 24+
- Docker Desktop
- Supabase CLI

## Avvio locale

```bash
npm install
npx supabase start
# copia i valori locali in .env.local (mai committato)
npm run dev
```

Apri `http://localhost:3000`. L'area demo è su `/app`, l'area con dati reali su `/dashboard` dopo login/onboarding.

## Qualità

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
```

Gli e2e richiedono lo stack Supabase attivo e `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` per la pulizia dei dati di test.

## Servizio locale

Il processo separato `local-service/` gestisce coda SQLite, stampa ESC/POS e sincronizzazione. Non è ancora collegato a un cloud reale né a stampanti fisiche verificate.

```bash
cp local-service/.env.example local-service/.env
npm run local-service
```

Configurazione e limiti sono descritti in `docs/ARCHITECTURE.md`; le decisioni tecniche in `docs/DECISIONS.md`.

## Documentazione

- `AGENTS.md` — regole operative e comandi verificati
- `docs/STATUS.md` — stato reale e prossimi passi
- `docs/ARCHITECTURE.md` — architettura
- `docs/DECISIONS.md` — decisioni tecniche
- `docs/PRODUCT_SPEC.md` — specifica prodotto

Le integrazioni esterne (telefonia, pagamenti, fiscale, WhatsApp, stampanti reali) non sono attive finché non vengono configurate e verificate con riscontri reali.

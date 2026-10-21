import type { Metadata } from "next";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "Cookie policy dimostrativa di CM Risto: testo segnaposto da completare prima della pubblicazione.",
};

export default function CookiePage() {
  return (
    <LegalPage
      title="Cookie policy"
      updated="17 ottobre 2026"
      intro="Questa policy descrive, in forma dimostrativa, l'uso di cookie e tecnologie simili nel servizio CM Risto. Il testo è provvisorio e sarà completato con l'elenco definitivo dei cookie prima della pubblicazione."
      sections={[
        {
          title: "Cosa sono i cookie",
          paragraphs: [
            "Cookie e tecnologie simili (local storage, session storage) sono piccoli file o dati salvati dal browser per consentire il funzionamento di un sito, ricordare preferenze o raccogliere informazioni sull'utilizzo.",
          ],
        },
        {
          title: "Cookie tecnici necessari",
          paragraphs: [
            "Il servizio richiederà cookie tecnici per autenticazione, sicurezza delle sessioni e preferenze essenziali. Questi strumenti non richiedono consenso quando sono strettamente necessari al funzionamento.",
            "Nella build attuale la demo salva lo stato dimostrativo nel local storage del browser (chiave cm-risto-demo-v1). Non vengono impostati cookie di profilazione.",
          ],
        },
        {
          title: "Cookie analitici",
          paragraphs: [
            "Eventuali strumenti di analisi saranno introdotti solo con consenso o in forma anonimizzata secondo la normativa applicabile. Al momento non è attivo alcuno strumento di analisi.",
          ],
        },
        {
          title: "Cookie di marketing",
          paragraphs: [
            "Al momento non sono presenti cookie pubblicitari o di profilazione. Qualora venissero introdotti, sarà richiesto il consenso preventivo tramite un banner dedicato.",
          ],
        },
        {
          title: "Gestione delle preferenze",
          paragraphs: [
            "L'utente potrà gestire le preferenze dal pannello cookie, quando disponibile, oppure tramite le impostazioni del browser. La disattivazione dei cookie tecnici può compromettere il funzionamento del servizio.",
          ],
        },
        {
          title: "Aggiornamenti",
          paragraphs: [
            "La versione definitiva di questa policy sarà pubblicata prima del lancio del servizio, con l'elenco aggiornato di cookie, finalità e durata.",
          ],
        },
      ]}
    />
  );
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Informativa privacy",
  description:
    "Informativa privacy dimostrativa di CM Risto: testo segnaposto da completare prima della pubblicazione.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Informativa privacy"
      updated="17 ottobre 2026"
      intro="La presente informativa descrive, in forma dimostrativa, come CM Risto intende trattare i dati personali degli utenti del servizio. Il testo non è definitivo e sarà sostituito dalla versione approvata prima del lancio commerciale."
      sections={[
        {
          title: "Titolare del trattamento",
          paragraphs: [
            "Il titolare del trattamento sarà la società titolare del servizio CM Risto, con sede legale e dati di contatto da definire. Fino alla costituzione del soggetto giuridico, questo documento resta un modello dimostrativo.",
          ],
        },
        {
          title: "Dati raccolti",
          paragraphs: [
            "Il servizio intende raccogliere: dati identificativi e di contatto dell'utente (nome, email, telefono), dati del locale (denominazione, indirizzo, partita IVA), dati operativi (ordini, prenotazioni, clienti finali inseriti dal ristoratore) e dati tecnici di utilizzo necessari al funzionamento.",
            "La build dimostrativa attuale non invia dati a un server: le modifiche alla demo restano nel browser dell'utente e possono essere cancellate con il comando di ripristino.",
          ],
        },
        {
          title: "Finalità e basi giuridiche",
          paragraphs: [
            "I dati saranno trattati per erogare il servizio, gestire account e abbonamenti, fornire assistenza, adempiere a obblighi di legge e, con consenso separato, inviare comunicazioni commerciali. Le basi giuridiche previste sono l'esecuzione del contratto, l'adempimento di obblighi legali e il consenso ove richiesto.",
          ],
        },
        {
          title: "Conservazione",
          paragraphs: [
            "I periodi di conservazione saranno definiti in base alla finalità e agli obblighi fiscali e contabili applicabili. I dati demo non vengono conservati su server.",
          ],
        },
        {
          title: "Destinatari e trasferimenti",
          paragraphs: [
            "I dati potranno essere trattati da fornitori di servizi tecnici (hosting, database, pagamenti, email) nominati responsabili del trattamento. Eventuali trasferimenti extra-UE saranno gestiti con le garanzie previste dalla normativa applicabile.",
          ],
        },
        {
          title: "Diritti dell'interessato",
          paragraphs: [
            "Gli interessati potranno esercitare i diritti di accesso, rettifica, cancellazione, limitazione, opposizione e portabilità, nonché revocare il consenso, contattando il titolare. Resta fermo il diritto di reclamo all'autorità di controllo competente.",
          ],
        },
        {
          title: "Cookie e tecnologie simili",
          paragraphs: [
            "La demo utilizza esclusivamente memoria locale del browser per mantenere lo stato dimostrativo. Non sono attivi strumenti di tracciamento o profilazione. Maggiori dettagli nella pagina Cookie.",
          ],
        },
        {
          title: "Modifiche",
          paragraphs: [
            "Questa informativa potrà essere aggiornata. La versione definitiva sarà pubblicata prima dell'attivazione del servizio e riporterà la data di entrata in vigore.",
          ],
        },
      ]}
    />
  );
}

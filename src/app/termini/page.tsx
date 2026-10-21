import type { Metadata } from "next";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Termini di servizio",
  description:
    "Termini di servizio dimostrativi di CM Risto: testo segnaposto da completare prima della pubblicazione.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Termini di servizio"
      updated="17 ottobre 2026"
      intro="I presenti termini regolano, in forma dimostrativa, l'utilizzo della piattaforma CM Risto. Il testo è provvisorio e dovrà essere verificato prima dell'attivazione commerciale del servizio."
      sections={[
        {
          title: "Oggetto del servizio",
          paragraphs: [
            "CM Risto è una piattaforma software per la gestione di ristoranti e attività di ristorazione: cassa, sala, cucina, prenotazioni, menu, magazzino e analisi. Il servizio può essere erogato in modalità SaaS con piani differenti.",
            "La build attuale è dimostrativa: non eroga servizi fiscali, di pagamento o di comunicazione reale e non crea account utilizzabili in produzione.",
          ],
        },
        {
          title: "Account e sicurezza",
          paragraphs: [
            "L'utente sarà responsabile della correttezza dei dati forniti, della custodia delle credenziali e dell'uso dei dispositivi associati. La condivisione delle credenziali tra locali diversi è vietata.",
          ],
        },
        {
          title: "Prova gratuita e abbonamenti",
          paragraphs: [
            "La prova gratuita avrà durata e condizioni indicate al momento dell'attivazione. Eventuali rinnovi e addebiti saranno mostrati prima della conferma. In questa build nessun addebito viene effettuato.",
          ],
        },
        {
          title: "Uso consentito",
          paragraphs: [
            "L'utente si impegna a utilizzare il servizio nel rispetto della legge, a non tentare di eludere i limiti dei piani, a non accedere a dati di altri tenant e a non caricare contenuti illeciti.",
          ],
        },
        {
          title: "Disponibilità del servizio",
          paragraphs: [
            "Il servizio sarà erogato con ragionevole continuità, fatti salvi interventi di manutenzione e cause di forza maggiore. Eventuali livelli di servizio saranno definiti nei contratti dedicati, in particolare per i piani Business ed Enterprise.",
          ],
        },
        {
          title: "Proprietà intellettuale",
          paragraphs: [
            "Software, marchi e contenuti della piattaforma appartengono ai rispettivi titolari. I dati inseriti dal cliente restano del cliente, nei limiti necessari all'erogazione del servizio.",
          ],
        },
        {
          title: "Limitazione di responsabilità",
          paragraphs: [
            "Nei limiti consentiti dalla legge, la responsabilità del fornitore sarà limitata ai termini contrattuali. La versione definitiva definirà esclusioni e limiti in modo specifico.",
          ],
        },
        {
          title: "Cessazione e legge applicabile",
          paragraphs: [
            "Le modalità di cancellazione dell'account e di esportazione dei dati saranno definite nel contratto. Legge applicabile e foro competente saranno indicati nella versione definitiva.",
          ],
        },
      ]}
    />
  );
}

"use client";

import { Clock, Info, Mail, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Informazioni commerciali");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (name.trim().length < 2) nextErrors.name = "Inserisci il tuo nome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Inserisci un'email valida.";
    }
    if (message.trim().length < 10) {
      nextErrors.message = "Scrivi almeno qualche riga per aiutarci a rispondere.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSent(true);
    toast.info("Messaggio non inviato", {
      description:
        "Il servizio email non è collegato in questa build dimostrativa.",
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="border-b border-zinc-100 py-14 sm:py-20 dark:border-zinc-800">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                Contatti
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Parliamo del tuo locale.
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Domande su funzionalità, piani o multi-sede? Scrivici. Questa
                pagina è dimostrativa: i recapiti e il modulo saranno collegati
                ai canali reali in una fase successiva.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: Mail,
                    title: "Email",
                    value: "supporto@cm-risto.example",
                    note: "Indirizzo segnaposto, non attivo.",
                  },
                  {
                    icon: MessageSquare,
                    title: "Commerciale",
                    value: "commerciale@cm-risto.example",
                    note: "Per gruppi, sedi multiple e piano Enterprise.",
                  },
                  {
                    icon: Clock,
                    title: "Orari risposta previsti",
                    value: "Lun–Ven, 9:00–18:00",
                    note: "Orario indicativo del servizio futuro.",
                  },
                ].map((entry) => (
                  <div
                    key={entry.title}
                    className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                      <entry.icon className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {entry.title}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{entry.value}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{entry.note}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-300">
                <Info className="mt-0.5 size-4 shrink-0" />
                Nessun modulo di contatto reale è attivo. I messaggi inviati qui
                restano nel browser e non vengono trasmessi.
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Scrivi un messaggio
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                I campi sono validati, ma l&apos;invio non è collegato a un
                servizio email.
              </p>

              {sent ? (
                <div className="mt-5 rounded-lg border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-950/60">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Modulo compilato correttamente
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Il messaggio non è stato inviato: in questa build non esiste
                    un servizio di recapito. Quando sarà collegato, riceverai
                    una conferma reale e un numero di riferimento.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3 bg-white dark:bg-zinc-900"
                    onClick={() => {
                      setSent(false);
                      setName("");
                      setEmail("");
                      setMessage("");
                    }}
                  >
                    Scrivi un altro messaggio
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                  <Field label="Nome e cognome" htmlFor="name" error={errors.name}>
                    <Input
                      id="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Marco Bellini"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Email" htmlFor="email" error={errors.email}>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="marco@ristorante.it"
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Argomento" htmlFor="topic">
                    <Select
                      id="topic"
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                    >
                      <option>Informazioni commerciali</option>
                      <option>Demo e prova gratuita</option>
                      <option>Gruppi e multi-sede</option>
                      <option>Supporto tecnico</option>
                      <option>Altro</option>
                    </Select>
                  </Field>
                  <Field label="Messaggio" htmlFor="message" error={errors.message}>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Raccontaci del tuo locale e di cosa hai bisogno."
                      rows={5}
                    />
                  </Field>
                  <Button type="submit" className="w-full">
                    <Send />
                    Invia messaggio
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

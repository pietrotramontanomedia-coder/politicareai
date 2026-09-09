// Testi di interfaccia della sezione agenzie: modulo neutro, importabile sia da componenti server sia client.
/** Testi di interfaccia della sezione agenzie, fuori dai componenti. */
export const TESTI_AGENZIE = {
  titolo: "Ultim'ora agenzie",
  sottotitolo: 'I lanci delle agenzie di stampa sulla politica, in ordine di arrivo. Ogni lancio rimanda alla fonte originale.',
  tutte: 'Tutte',
  vuoto: 'Nessun lancio disponibile al momento.',
  caricamento: 'Caricamento dei lanci…',
  leggiSu: (agenzia: string) => `Leggi su ${agenzia}`,
  simulazione: {
    badge: 'Simulazione',
    avviso:
      'Feed di prova: i lanci qui sotto sono finti, generati per lo sviluppo. Non sono notizie reali e non provengono dalle agenzie.',
  },
  fonteNonDisponibile: (agenzia: string) => `${agenzia} non risponde al momento.`,
  anche: (agenzie: string[]) => `anche ${agenzie.join(' e ')}`,
  selezione: (mostrati: number, letti: number, scartati: number) =>
    `Selezione automatica per rilevanza: ${mostrati} lanci su ${letti} letti dai feed, ${scartati} esclusi perché non riguardano un fatto istituzionale o sono formati come video, foto e rassegne. La stessa notizia data da più agenzie compare una volta sola, con l'agenzia che l'ha data per prima.`,
  tornaAllaLista: 'Tutti i lanci',
} as const;

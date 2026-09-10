/** Testi delle grafiche da condividere e del pannello che le genera. */
export const TESTI_CONDIVISIONE = {
  pulsante: 'Condividi',
  titoloPannello: 'Condividi come immagine',
  formati: { post: 'Post 4:5', storia: 'Storia 9:16' },
  generazione: "Preparo l'immagine…",
  errore: "Non sono riuscito a creare l'immagine. Riprova.",
  condividi: 'Condividi',
  scarica: "Scarica l'immagine",
  chiudi: 'Chiudi',
  anteprima: "Anteprima dell'immagine da condividere",
  suDispositivo: "L'immagine viene creata sul tuo dispositivo.",

  test: {
    etichetta: 'Test partiti',
    titolo: 'La mia classifica',
    sottotitolo: (partiti: number, risposte: number, totale: number) =>
      `Accordo con ${partiti} partiti · ${risposte} risposte su ${totale}`,
    pariMerito: 'Pari merito in testa',
    esclusi: (sigle: string[]) => `Dati insufficienti per il confronto: ${sigle.join(', ')}`,
    nota: "Non è un verdetto: misura l'accordo con le posizioni documentate dei partiti, calcolato sul mio dispositivo.",
    invito: 'Fai il test anche tu',
    richiamo: 'Condividi la tua classifica',
    spiegazione: "Un'immagine pronta per storie e post, con la classifica completa. Viene creata sul tuo dispositivo: le tue risposte non lasciano il telefono.",
    testo: 'La mia classifica di accordo con i partiti, dal test di Politicare.',
    file: 'politicare-test-partiti',
  },

  quiz: {
    etichetta: 'Quiz della settimana',
    riepilogo: (corrette: number, totale: number) => `${corrette} risposte esatte su ${totale}`,
    /** Commento per l'immagine: a differenza della pagina, non rimanda alle spiegazioni "qui sotto". */
    commento: (percentuale: number): string => {
      if (percentuale === 100) return 'Settimana politica seguita alla perfezione.';
      if (percentuale >= 70) return 'Ho seguito bene i fatti politici della settimana.';
      if (percentuale >= 40) return 'Una buona base sui fatti politici della settimana.';
      return 'Settimana intensa: tocca ripassare.';
    },
    nota: (domande: number) => `${domande} domande sui fatti politici della settimana, con spiegazione e fonte per ogni risposta.`,
    invito: 'Batti il mio punteggio',
    pulsante: 'Sfida gli amici',
    testo: (percentuale: number) => `Ho fatto ${percentuale}% al quiz politico della settimana di Politicare. Riesci a fare meglio?`,
    file: 'politicare-quiz',
  },

  simulatore: {
    etichetta: 'Simulatore',
    titolo: 'La mia simulazione',
    seggi: 'Seggi Camera · Senato',
    altri: (n: number) => `+ altri ${n}`,
    nota: 'Seggi calcolati con la nuova legge elettorale: è una simulazione, non una previsione.',
    invito: 'Prova le tue percentuali',
    pulsante: 'Condividi la simulazione',
    testo: 'Ecco come si riempie il Parlamento con le mie percentuali, sul simulatore di Politicare.',
    file: 'politicare-simulazione',
  },

  confronto: {
    etichetta: 'Dove stanno i partiti',
    nessuno: 'Nessuno',
    senzaFonte: (sigle: string[]) => `Senza una fonte verificabile: ${sigle.join(', ')}`,
    nota: 'Ogni posizione ha la sua fonte: voto in Parlamento, programma o dichiarazione datata.',
    invito: 'Scopri tutte le fonti',
    testo: 'Dove stanno i partiti su questo tema, con le fonti, su Politicare.',
    file: 'politicare-confronto',
  },
};

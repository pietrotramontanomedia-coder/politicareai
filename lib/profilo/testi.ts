import type { IdTraguardo } from './regole';

/** Testi del profilo, della pagina di accesso e dei punti in cui l'app salva nel profilo. */
export const TESTI_PROFILO = {
  occhiello: 'Profilo',
  titolo: 'Il tuo profilo',
  senzaNome: 'Come vuoi chiamarti?',
  nome: 'Il tuo nome',
  colore: 'Colore',
  coloreN: (n: number) => `Colore ${n}`,
  suDispositivo: 'Salvato su questo dispositivo',
  conAccount: (email?: string) => (email ? `Accesso come ${email}` : 'Accesso effettuato'),
  apri: 'Il tuo profilo',

  account: {
    titolo: 'Ritrova il profilo ovunque',
    testo: "Con l'accesso il profilo si salva sul tuo account e lo ritrovi su tutti i dispositivi. Il risultato del test partiti resta comunque solo qui.",
    accedi: 'Accedi',
    esci: 'Esci',
    sincronizzato: 'Profilo, quiz e preferenze sono salvati sul tuo account. Il risultato del test partiti resta solo su questo dispositivo.',
    elimina: 'Elimina account',
    avvisoElimina: 'Account e dati sul server verranno cancellati.',
    confermaElimina: 'Sì, elimina',
  },

  sincronia: 'Sincronizzo…',

  anagrafica: {
    titolo: 'Chi sei',
    spiegazione:
      'Anno di nascita e città ci servono solo per capire, in forma aggregata, chi usa Politicare. Sono facoltativi e puoi cancellarli quando vuoi.',
    anno: 'Anno di nascita',
    annoSegnaposto: '1990',
    eta: (anni: number) => `${anni} anni`,
    minorenne: 'Sotto i 14 anni serve il consenso di un genitore per avere un account.',
    citta: 'Città',
    cittaSegnaposto: 'Roma',
  },

  quiz: {
    titolo: 'I tuoi quiz',
    completati: 'Completati',
    media: 'Media',
    serie: 'Settimane di fila',
    migliore: 'Migliore',
    vuoto: 'Non hai ancora completato un quiz: il primo risultato comparirà qui.',
    fai: 'Fai il quiz della settimana',
    barra: (numero: number, percentuale: number) => `Quiz ${numero}: ${percentuale}%`,
    etichetta: (numero: number) => `Q${numero}`,
  },

  traguardi: {
    titolo: 'Traguardi',
    voci: {
      'primo-quiz': { titolo: 'Primo quiz', descrizione: 'Hai completato il tuo primo quiz della settimana.' },
      'tre-di-fila': { titolo: 'Tre di fila', descrizione: 'Tre settimane consecutive con il quiz completato.' },
      'en-plein': { titolo: 'En plein', descrizione: 'Tutte le risposte giuste al primo tentativo.' },
      'cinque-quiz': { titolo: 'Costanza', descrizione: 'Cinque quiz completati.' },
      esperto: { titolo: 'Esperto', descrizione: 'Media sopra il 70% con almeno tre quiz.' },
    } satisfies Record<IdTraguardo, { titolo: string; descrizione: string }>,
    ottenuto: 'Ottenuto',
    daOttenere: 'Da ottenere',
  },

  test: {
    titolo: 'Il tuo test partiti',
    lucchetto: 'Solo su questo dispositivo',
    spiegazione:
      "Le opinioni politiche sono dati particolari: questo risultato non viene mai inviato a un server né salvato sull'account.",
    vuoto: 'Dopo il test puoi salvare qui la tua classifica, solo su questo dispositivo.',
    fai: 'Fai il test',
    salvatoIl: (data: string) => `Salvato il ${data}`,
    classifica: 'Vedi la classifica completa',
    cancella: 'Cancella il risultato',
  },

  temi: {
    titolo: 'Temi che segui',
    spiegazione: 'Serviranno ad avvisarti delle notizie e dei quiz sui temi che ti interessano.',
  },

  giocatori: {
    titolo: 'Il tuo gruppo per il gioco',
    spiegazione: 'Nomi da ritrovare già pronti quando apri Crisi di Governo.',
    segnaposto: 'Nome di un amico',
    aggiungi: 'Aggiungi',
    rimuovi: (nome: string) => `Rimuovi ${nome}`,
    vuoto: 'Nessun giocatore salvato.',
    usaSalvati: 'Usa il gruppo salvato',
    ricorda: 'Ricorda questi giocatori nel profilo',
  },

  dati: {
    titolo: 'I tuoi dati',
    spiegazione: 'Scarica tutto ciò che Politicare conserva su di te in questo dispositivo, o cancellalo.',
    scarica: 'Scarica i miei dati',
    cancella: 'Cancella tutto da questo dispositivo',
    conferma: 'Sì, cancella tutto',
    annulla: 'Annulla',
    avviso: 'Profilo, storico dei quiz e risultato del test verranno cancellati. Non si può annullare.',
    file: 'politicare-i-miei-dati.json',
  },

  salvataggio: {
    quiz: 'Risultato salvato nel tuo profilo',
    vediProfilo: 'Vedi il profilo',
    testTitolo: 'Salva nel profilo',
    testTesto: 'Solo su questo dispositivo: il risultato non va su nessun server.',
    testPulsante: 'Salva il risultato',
    testSalvato: 'Salvato sul dispositivo',
  },

  accesso: {
    occhiello: 'Accesso',
    titolo: 'Accedi a Politicare',
    sottotitolo: 'Ritrova profilo, quiz e traguardi su tutti i tuoi dispositivi.',
    inArrivo: 'Il login arriva a breve. Intanto il profilo funziona già e resta su questo dispositivo.',
    entrato: (email?: string) => (email ? `Sei dentro come ${email}.` : 'Sei dentro.'),
    vaiAlProfilo: 'Vai al profilo',
    email: 'La tua email',
    emailSegnaposto: 'nome@esempio.it',
    inviaLink: 'Invia il link di accesso',
    senzaPassword: 'Nessuna password: ti mandiamo un link per entrare.',
    linkInviato: (email: string) => `Ti abbiamo mandato un link a ${email}: aprilo da questo dispositivo per entrare.`,
    errore: 'Non è stato possibile inviare il link. Riprova tra poco.',
    erroreRitorno: "L'accesso non è andato a buon fine. Riprova, oppure usa il link via email.",
    oppure: 'oppure',
    google: 'Continua con Google',
    salviamo: "Cosa salviamo con l'account",
    salviamoVoci: ['Nome e colore del profilo', 'Storico dei quiz e traguardi', 'Temi che segui', 'Il tuo gruppo per il gioco'],
    maiSalviamo: 'Cosa non salviamo mai',
    maiSalviamoVoci: [
      'Le risposte e il risultato del test partiti: restano solo sul tuo dispositivo',
      'Le simulazioni elettorali che fai',
      'Nessun dato venduto o usato per pubblicità',
    ],
  },
};

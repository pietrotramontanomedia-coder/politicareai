import type { Ruolo, StatoContenuto, TipoCommento, TipoContenuto, VoceAttivita } from './tipi';

/** Testi del portale della redazione. */
export const TESTI_REDAZIONE = {
  marchio: 'Redazione',
  sottomarchio: 'Palestra social',

  accesso: {
    titolo: 'Entra in redazione',
    sottotitolo: 'Qui pubblichi i post e le storie che fai col generatore, come su Instagram. Chi coordina vede tutto e ti lascia correzioni e consigli.',
    nome: 'Il tuo nome',
    nomeSegnaposto: 'Nome e cognome',
    nomeAiuto: 'Usa sempre lo stesso: è così che ritrovi i tuoi contenuti.',
    codice: 'Password',
    codiceAiuto: 'La tua password personale: te la dà chi coordina. Chi corregge usa il codice dei revisori.',
    entra: 'Entra',
    entrando: 'Entro…',
    nonConfigurato: 'Il portale non è ancora attivo: mancano i codici di accesso sul server (REDAZIONE_CODICE e REDAZIONE_CODICE_REVISORI).',
    riservato: 'Area riservata alla redazione. I contenuti restano qui e non vengono pubblicati da nessuna parte.',
  },

  ruolo: { redattore: 'Redattore', revisore: 'Revisore' } satisfies Record<Ruolo, string>,
  esci: 'Esci',

  schede: {
    feed: 'Feed',
    profilo: 'Il mio profilo',
    revisione: 'Da rivedere',
    attivita: 'Attività',
    squadra: 'Squadra',
  },

  attivita: {
    titolo: 'Tutte le attività',
    spiegazione:
      'Ogni pubblicazione, versione, commento, cambio di stato ed eliminazione delle ultime tre settimane, dal più recente. Non si cancella niente: le attività più vecchie sono nella scheda di ognuno.',
    tutti: 'Tutta la redazione',
    filtro: 'Persona',
    vuota: 'Ancora nessuna attività.',
    altre: 'Mostra le precedenti',
    /** «ha pubblicato un post», «ha scritto Correzione sul post di Giulia», … (chi lo fa è a parte). */
    frase: (v: VoceAttivita, stati: Record<StatoContenuto, string>, commenti: Record<TipoCommento, string>): string => {
      const post = v.tipoContenuto === 'post';
      const suo = post ? 'il suo post' : 'la sua storia';
      const di = `${post ? 'il post' : 'la storia'} di ${v.autore}`;
      const proprio = v.chi === v.autore;
      switch (v.tipo) {
        case 'pubblicato':
          return `ha pubblicato ${post ? 'un post' : 'una storia'}`;
        case 'nuova_versione':
          return `ha pubblicato la versione ${v.versione} ${post ? 'del suo post' : 'della sua storia'}`;
        case 'commento':
          return `ha scritto «${commenti[v.tipoCommento ?? 'consiglio']}» ${proprio ? (post ? 'sul suo post' : 'sulla sua storia') : `${post ? 'sul post' : 'sulla storia'} di ${v.autore}`}`;
        case 'stato':
          return `ha segnato «${stati[v.stato ?? 'da_rivedere']}» ${proprio ? suo : di}`;
        case 'eliminato':
          return `ha eliminato ${proprio ? suo : di}`;
        case 'ripristinato':
          return `ha ripristinato ${di}`;
      }
    },
  },

  scheda: {
    indietro: '← Torna alla squadra',
    giorni: 'Ultimi 14 giorni',
    legenda: 'Barre: storie (chiaro) e post (giallo) pubblicati; ✓ = obiettivo del giorno raggiunto.',
    giorniInPari: 'Giorni in pari',
    primoColpo: 'Approvati al primo colpo',
    versioniMedie: 'Versioni per contenuto',
    ultimoInvio: 'Ultimo invio',
    mai: 'mai',
    contenuti: 'Tutti i contenuti, con versioni e commenti',
    nessunContenuto: 'Non ha ancora pubblicato niente.',
    versioni: (n: number) => (n === 1 ? '1 versione' : `${n} versioni`),
    nessunCommento: 'Nessun commento',
    apri: 'Apri',
    attivita: 'Le sue attività',
  },

  persone: {
    titolo: 'Ragazzi della redazione',
    spiegazione:
      'Con l\'elenco, il codice della redazione vale solo per questi nomi: ognuno entra scrivendo il suo nome esattamente così. Chi non c\'è più si disattiva: il suo lavoro resta.',
    nome: 'Nome',
    password: 'Password',
    aggiungi: 'Aggiungi',
    cambiaPassword: 'Nuova password',
    chiediPassword: (nome: string) => `Nuova password per ${nome}:`,
    passwordCambiata: 'Password cambiata.',
    conPassword: 'password personale',
    senzaPassword: 'entra con il codice comune',
    disattiva: 'Disattiva',
    riattiva: 'Riattiva',
    disattivata: 'disattivato',
    vuoto: 'Nessuno in elenco: per ora entra chiunque abbia il codice.',
  },

  nuovo: 'Nuovo',
  tipo: { post: 'Post', storia: 'Storia' } satisfies Record<TipoContenuto, string>,
  piuPost: '+ Post',
  piuStoria: '+ Storia',
  miniatura: (tipo: TipoContenuto, autore: string) => `Apri ${tipo === 'post' ? 'il post' : 'la storia'} di ${autore}`,
  nuovoPost: 'Nuovo post',
  nuovaStoria: 'Nuova storia',
  laTuaStoria: 'La tua storia',

  stato: {
    da_rivedere: 'Da rivedere',
    da_correggere: 'Da correggere',
    approvato: 'Approvato',
    non_va_bene: 'Non va bene',
  } satisfies Record<StatoContenuto, string>,
  coloreStato: {
    da_rivedere: '#60A5FA',
    da_correggere: '#F59E0B',
    approvato: '#22C55E',
    non_va_bene: '#EF4444',
  } satisfies Record<StatoContenuto, string>,

  tipoCommento: {
    correzione: 'Correzione',
    consiglio: 'Consiglio',
    complimento: 'Bravo!',
    risposta: 'Risposta',
    bocciatura: 'Non va bene',
  } satisfies Record<TipoCommento, string>,
  coloreCommento: {
    correzione: '#F59E0B',
    consiglio: '#60A5FA',
    complimento: '#22C55E',
    risposta: '#A3A3A3',
    bocciatura: '#EF4444',
  } satisfies Record<TipoCommento, string>,

  feed: {
    vuoto: 'Ancora nessun post. Rompi il ghiaccio!',
    errore: 'Non riesco a caricare i contenuti.',
    riprova: 'Riprova',
    aggiorna: 'Aggiorna',
    caricamento: 'Carico i contenuti…',
    apri: 'Apri',
    commenti: (n: number) => (n === 1 ? '1 commento' : `${n} commenti`),
    versione: (n: number) => `Versione ${n}`,
    altro: 'altro',
    altriPost: 'Mostra altri post',
    finestra: 'Qui ci sono le ultime tre settimane: i post più vecchi sono nel profilo di chi li ha pubblicati.',
  },

  profilo: {
    post: 'post',
    storie: 'storie',
    contaStorie: (n: number) => (n === 1 ? 'storia' : 'storie'),
    contaApprovati: (n: number) => (n === 1 ? 'approvato' : 'approvati'),
    daCorreggere: 'da correggere',
    vuotoPost: 'Nessun post per ora.',
    vuotoStorie: 'Nessuna storia per ora.',
    indietro: '← Torna alla squadra',
    tuoi: 'I tuoi contenuti',
    generatore: 'Apri il generatore ↗',
    generatoreAiuto: 'Card e storie si fanno lì: scaricale e pubblicale qui.',
    di: (nome: string) => `I contenuti di ${nome}`,
    precedenti: 'Mostra i contenuti precedenti',
    caricando: 'Carico i contenuti…',
    errore: 'Non riesco a caricare tutti i contenuti.',
    avvisoCorrezioni: (n: number) =>
      n === 1 ? 'Hai 1 contenuto con correzioni da fare.' : `Hai ${n} contenuti con correzioni da fare.`,
  },

  revisione: {
    titolo: 'Coda delle correzioni',
    spiegazione: 'Prima chi aspetta da più tempo. Ogni nuova versione di un contenuto torna qui.',
    vuota: 'Tutto rivisto. Ottimo lavoro!',
    inAttesaDa: (quando: string) => `inviato ${quando}`,
  },

  squadra: {
    titolo: 'La squadra',
    spiegazione: 'Quanto pubblica ognuno e a che punto sono le correzioni.',
    vuota: 'Nessuno ha ancora pubblicato.',
    colonne: {
      persona: 'Persona',
      settimana: 'Ultimi 7 giorni',
      post: 'Post',
      storie: 'Storie',
      daRivedere: 'Da rivedere',
      daCorreggere: 'Da correggere',
      approvati: 'Approvati',
      ultimo: 'Ultimo invio',
      oggi: 'Oggi',
      nonVaBene: 'Non va bene',
      eliminati: 'Eliminati',
    },
    apri: (nome: string) => `Apri i contenuti di ${nome}`,
  },

  andamento: {
    oggi: 'Obiettivi di oggi',
    weekend: 'Obiettivi di oggi (weekend)',
    storie: 'Storie',
    post: 'Post',
    approvati: 'Approvati',
    daCorreggere: 'Da correggere',
    nonVaBene: 'Non va bene',
    eliminati: 'Eliminati',
    base: (n: number) => (n === 1 ? 'Su 1 contenuto pubblicato' : `Su ${n} contenuti pubblicati`),
  },

  obiettivi: {
    titolo: 'Obiettivi giornalieri',
    spiegazione: 'Quanto pubblica ognuno ogni giorno. Ogni sera verso le 21 arriva il resoconto nel gruppo Telegram.',
    feriali: 'Da lunedì a venerdì',
    weekend: 'Sabato e domenica',
    storie: 'Storie',
    post: 'Post',
    salva: 'Salva',
    salvato: 'Salvato',
    errore: 'Non sono riuscito a salvare, riprova.',
  },

  cestino: {
    titolo: (n: number) => `Cestino (${n})`,
    spiegazione: 'I contenuti eliminati non spariscono: restano qui, con foto, versioni e correzioni. Aprili per ripristinarli.',
  },

  dettaglio: {
    chiudi: 'Chiudi',
    versioni: 'Versioni',
    versioneCorta: (n: number) => `v${n}`,
    correzioni: 'Correzioni e consigli',
    nessunCommento: 'Ancora nessun commento.',
    commentiPrivati: 'Le correzioni le vedono solo l\'autore e chi coordina.',
    suVersione: (n: number) => `sulla versione ${n}`,
    correggi: 'Correggi: pubblica una nuova versione',
    elimina: 'Elimina',
    confermaElimina: 'Eliminare? Sparisce dal feed, ma resta salvato nel cestino di chi coordina.',
    eliminatoDa: (nome: string, quando: string) => `Eliminato da ${nome} ${quando}.`,
    ripristina: 'Ripristina',
    scriviCommento: 'Scrivi una correzione o un consiglio',
    scriviRisposta: 'Rispondi',
    segnapostoRevisore: 'Cosa funziona, cosa cambiare, come riscriverlo…',
    segnapostoAutore: 'Una domanda o un chiarimento per chi ti corregge',
    tipo: 'Tipo di commento',
    invia: 'Invia',
    inviaECorreggi: 'Invia e chiedi correzione',
    approva: 'Approva',
    nonVaBene: 'Non va bene',
    nonVaBeneAiuto: 'Per «Non va bene» scrivi prima il perché.',
    riapri: 'Rimetti da rivedere',
    invio: 'Invio…',
    errore: 'Non sono riuscito a salvare, riprova.',
    nelCestino: 'Nel cestino non si commenta: ripristinalo per riprendere le correzioni.',
  },

  compositore: {
    titoloPost: 'Nuovo post',
    titoloStoria: 'Nuova storia',
    titoloVersione: (n: number) => `Nuova versione (v${n})`,
    annulla: 'Annulla',
    pubblica: 'Pubblica',
    pubblicaVersione: 'Pubblica la nuova versione',
    caricamento: (fatte: number, totale: number) => `Carico le immagini (${fatte}/${totale})…`,
    salvataggio: 'Pubblico…',
    dalGeneratorePost: 'Fai le card nel generatore, scaricale e caricale qui con il copy.',
    dalGeneratoreStoria: 'Fai la storia nel generatore, scaricala e caricala qui.',
    apriGeneratore: 'Apri il generatore ↗',
    foto: 'Card',
    fotoPost: 'Card del post (fino a 10, la prima è la copertina)',
    fotoStoria: 'Immagine della storia (9:16)',
    aggiungiFoto: 'Carica card',
    caricaStoria: 'Carica storia',
    cambiaFoto: 'Cambia immagine',
    togliFoto: 'Togli',
    spostaPrima: 'Sposta prima',
    spostaDopo: 'Sposta dopo',
    didascalia: 'Copy',
    didascaliaSegnaposto: 'Scrivi il copy: gancio nella prima riga, poi il contenuto, poi gli hashtag.',
    caratteri: (n: number, max: number) => `${n}/${max} caratteri`,
    hashtag: (n: number, max: number) => `${n}/${max} hashtag`,
    anteprima: 'Anteprima',
    erroreFoto: 'Questa immagine non si apre: prova con un JPEG o un PNG.',
    erroreInvio: 'Pubblicazione non riuscita, riprova.',
    confermaChiudi: 'Chiudere? Le card e il copy non pubblicati vanno persi (il copy resta salvato come bozza).',
    bozzaRipresa: 'Ho ripreso il copy che avevi lasciato a metà.',
  },

  storie: {
    chiudi: 'Chiudi le storie',
    precedente: 'Storia precedente',
    successiva: 'Storia successiva',
    pausa: 'Metti in pausa',
    riprendi: 'Riprendi',
    apri: 'Apri correzioni',
    di: (nome: string, n: number) => `Storie di ${nome}, ${n} ${n === 1 ? 'storia' : 'storie'}`,
    elenco: 'Storie delle ultime 24 ore',
  },
};

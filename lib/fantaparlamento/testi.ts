/** Testi del Fantaparlamento. */
export const TESTI_FANTA = {
  occhiello: 'Fantaparlamento',
  titolo: 'La tua rosa di deputati',
  sottotitolo:
    'Undici deputati, un budget di crediti e i punti che arrivano dalle votazioni vere della Camera. Il prezzo di ognuno è quanto ha reso in media nelle giornate passate.',
  chip: {
    titolari: (n: number) => `${n} deputati`,
    crediti: (n: number) => `${n} crediti`,
    capitano: 'Capitano ×1,5',
  },

  rosa: {
    titolo: 'La tua rosa',
    crediti: (spesi: number, totale: number) => `${spesi} / ${totale} crediti`,
    rimasti: (n: number) => (n >= 0 ? `${n} rimasti` : `${-n} oltre il budget`),
    conteggio: (maggioranza: number, opposizione: number) => `${maggioranza} di maggioranza · ${opposizione} di opposizione`,
    vuoto: "Scegli i deputati dal listone qui sotto. Servono almeno 4 di maggioranza e 4 di opposizione: la rosa non è una tifoseria.",
    mancano: (n: number) => (n === 1 ? 'Manca 1 deputato' : `Mancano ${n} deputati`),
    scegliCapitano: 'Scegli il capitano: tocca la stella accanto a un deputato.',
    capitano: 'Capitano',
    rendiCapitano: (nome: string) => `Rendi capitano ${nome}`,
    togli: (nome: string) => `Togli ${nome} dalla rosa`,
    salva: 'Salva la rosa',
    salvata: 'Rosa salvata nel tuo profilo',
    modifiche: 'Modifiche non salvate',
  },

  listone: {
    titolo: 'Il listone',
    cerca: 'Cerca un deputato',
    filtri: { tutti: 'Tutti', maggioranza: 'Maggioranza', opposizione: 'Opposizione', misto: 'Misto' },
    ordina: 'Ordina per',
    ordini: { prezzo: 'Prezzo', media: 'Media punti', cognome: 'Cognome' },
    prezzo: 'crediti',
    media: 'media',
    aggiungi: (nome: string) => `Aggiungi ${nome}`,
    inRosa: 'In rosa',
    nessuno: 'Nessun deputato con questi filtri.',
    mostraAltri: (n: number) => `Mostra altri ${n}`,
  },

  giornata: {
    titolo: 'Ultima giornata',
    etichetta: (settimana: string, votazioni: number) => `${settimana} · ${votazioni} votazioni`,
    punti: 'punti',
    senzaRosa: 'Salva una rosa per vedere quanti punti avrebbe fatto nell\'ultima giornata.',
    nessuna: "Nessuna giornata disponibile: l'Aula non ha ancora votato.",
  },

  regole: {
    titolo: 'Come si fanno punti',
    voci: [
      '1 punto per ogni voto espresso: favorevole, contrario o astensione',
      'Le votazioni finali valgono il doppio, le fiducie il triplo',
      '+3 punti per ogni voto diverso dalla linea chiara del proprio gruppo',
      '+5 punti a chi partecipa ad almeno il 90% delle votazioni della settimana',
      'Il capitano vale una volta e mezzo',
      "Chi non vota non perde punti: un'assenza può avere ragioni istituzionali",
    ],
    fonti: 'Fonti dei dati',
    aggiornamento: (giornate: number) => `Prezzi calcolati su ${giornate} giornate con votazioni.`,
  },

  schieramento: { maggioranza: 'Magg.', opposizione: 'Opp.', misto: 'Misto' },
};

/** "CAFIERO DE RAHO" -> "Cafiero De Raho", "D'ALESSIO" -> "D'Alessio". */
export function nomeProprio(testo: string): string {
  return testo.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, lettera: string) => sep + lettera.toUpperCase());
}

/** Punti all'italiana: "122,1". */
export function formattaPunti(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 1 });
}

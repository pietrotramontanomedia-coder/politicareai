import type { DifficoltaQuiz, DomandaQuiz, QuizSettimanale } from './tipi';
import type { ErroreValidazione } from './validazione';

/**
 * Distribuzione di difficoltà richiesta per ogni quiz (vedi CLAUDE.md):
 * 2 facili, 3 medie, 2 difficili.
 */
export const DISTRIBUZIONE_DIFFICOLTA: Record<DifficoltaQuiz, number> = {
  facile: 2,
  media: 3,
  difficile: 2,
};

export const DIFFICOLTA_ORDINATE: DifficoltaQuiz[] = ['facile', 'media', 'difficile'];

const MIN_OPZIONI = 3;
const MAX_OPZIONI = 4;

/** Metadati minimi obbligatori per ogni pack di quiz. */
function validaMetadatiQuiz(quiz: QuizSettimanale): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  const campi: Array<[string, unknown]> = [
    ['id', quiz.id],
    ['versione', quiz.versione],
    ['data', quiz.data],
    ['titolo', quiz.titolo],
    ['sottotitolo', quiz.sottotitolo],
  ];
  for (const [campo, valore] of campi) {
    if (typeof valore !== 'string' || valore.trim().length === 0) {
      errori.push({ regola: 'metadati-obbligatori', messaggio: `Campo "${campo}" mancante.` });
    }
  }
  if (!Number.isInteger(quiz.numero) || quiz.numero < 1) {
    errori.push({ regola: 'metadati-obbligatori', messaggio: 'Il campo "numero" deve essere un intero >= 1.' });
  }
  if (!quiz.periodo || !quiz.periodo.dal || !quiz.periodo.al || quiz.periodo.dal > quiz.periodo.al) {
    errori.push({ regola: 'metadati-obbligatori', messaggio: 'Il campo "periodo" deve avere "dal" <= "al".' });
  }
  if (!quiz.autori || quiz.autori.length === 0) {
    errori.push({ regola: 'metadati-obbligatori', messaggio: 'Almeno un autore è obbligatorio.' });
  }
  if (!quiz.changelog || quiz.changelog.length === 0) {
    errori.push({ regola: 'metadati-obbligatori', messaggio: 'Il changelog deve avere almeno una voce.' });
  }
  return errori;
}

/** Ogni sezione dichiarata è usata e ogni domanda punta a una sezione dichiarata. */
function validaSezioni(quiz: QuizSettimanale): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  if (!quiz.sezioni || quiz.sezioni.length === 0) {
    return [{ regola: 'sezioni', messaggio: 'Il quiz deve dichiarare almeno una sezione.' }];
  }
  const ids = new Set<string>();
  for (const sezione of quiz.sezioni) {
    if (ids.has(sezione.id)) {
      errori.push({ regola: 'sezioni', messaggio: `Sezione "${sezione.id}" dichiarata due volte.` });
    }
    ids.add(sezione.id);
    if (!sezione.titolo || sezione.titolo.trim().length === 0) {
      errori.push({ regola: 'sezioni', messaggio: `Sezione "${sezione.id}" senza titolo.` });
    }
  }
  const usate = new Set(quiz.domande.map((d) => d.sezione));
  for (const domanda of quiz.domande) {
    if (!ids.has(domanda.sezione)) {
      errori.push({
        regola: 'sezioni',
        messaggio: `Domanda "${domanda.id}" riferisce la sezione "${domanda.sezione}" non dichiarata.`,
        affermazioneId: domanda.id,
      });
    }
  }
  for (const id of ids) {
    if (!usate.has(id)) {
      errori.push({ regola: 'sezioni', messaggio: `Sezione "${id}" dichiarata ma senza domande.` });
    }
  }
  return errori;
}

/** Ogni domanda ha testo, 3-4 opzioni distinte, indice corretto valido, spiegazione e fonte con URL. */
function validaDomande(quiz: QuizSettimanale): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  const ids = new Set<string>();

  for (const domanda of quiz.domande) {
    if (ids.has(domanda.id)) {
      errori.push({ regola: 'domande', messaggio: `Domanda "${domanda.id}" duplicata.`, affermazioneId: domanda.id });
    }
    ids.add(domanda.id);

    if (!domanda.testo || domanda.testo.trim().length === 0) {
      errori.push({ regola: 'domande', messaggio: `Domanda "${domanda.id}" senza testo.`, affermazioneId: domanda.id });
    }

    const n = domanda.opzioni?.length ?? 0;
    if (n < MIN_OPZIONI || n > MAX_OPZIONI) {
      errori.push({
        regola: 'domande',
        messaggio: `Domanda "${domanda.id}": ${n} opzioni, ammesse da ${MIN_OPZIONI} a ${MAX_OPZIONI}.`,
        affermazioneId: domanda.id,
      });
    }
    if (new Set(domanda.opzioni?.map((o) => o.trim())).size !== n) {
      errori.push({ regola: 'domande', messaggio: `Domanda "${domanda.id}": opzioni duplicate.`, affermazioneId: domanda.id });
    }
    if (!Number.isInteger(domanda.rispostaCorretta) || domanda.rispostaCorretta < 0 || domanda.rispostaCorretta >= n) {
      errori.push({
        regola: 'domande',
        messaggio: `Domanda "${domanda.id}": indice della risposta corretta fuori intervallo.`,
        affermazioneId: domanda.id,
      });
    }
    if (!domanda.spiegazione || domanda.spiegazione.trim().length === 0) {
      errori.push({ regola: 'domande', messaggio: `Domanda "${domanda.id}" senza spiegazione.`, affermazioneId: domanda.id });
    }
    if (!DIFFICOLTA_ORDINATE.includes(domanda.difficolta)) {
      errori.push({
        regola: 'domande',
        messaggio: `Domanda "${domanda.id}": difficoltà "${String(domanda.difficolta)}" non valida.`,
        affermazioneId: domanda.id,
      });
    }

    const fonteValida =
      domanda.fonte &&
      typeof domanda.fonte.citazione === 'string' &&
      domanda.fonte.citazione.trim().length > 0 &&
      typeof domanda.fonte.url === 'string' &&
      /^https?:\/\//.test(domanda.fonte.url.trim());
    if (!fonteValida) {
      errori.push({
        regola: 'fonte-obbligatoria',
        messaggio: `Domanda "${domanda.id}" senza fonte valida (citazione + URL).`,
        affermazioneId: domanda.id,
      });
    }
  }
  return errori;
}

/** La distribuzione di difficoltà deve essere esattamente 2 facili / 3 medie / 2 difficili. */
function validaDistribuzioneDifficolta(quiz: QuizSettimanale): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  const conteggi = contaPerDifficolta(quiz.domande);
  for (const difficolta of DIFFICOLTA_ORDINATE) {
    const attese = DISTRIBUZIONE_DIFFICOLTA[difficolta];
    const trovate = conteggi[difficolta];
    if (trovate !== attese) {
      errori.push({
        regola: 'distribuzione-difficolta',
        messaggio: `Difficoltà "${difficolta}": attese ${attese} domande, trovate ${trovate}.`,
      });
    }
  }
  return errori;
}

/**
 * Esegue tutte le regole di qualità sul quiz settimanale. Pensata per girare in
 * CI e bloccare la merge: un array non vuoto significa build rossa.
 */
export function validaQuiz(quiz: QuizSettimanale): ErroreValidazione[] {
  return [
    ...validaMetadatiQuiz(quiz),
    ...validaSezioni(quiz),
    ...validaDomande(quiz),
    ...validaDistribuzioneDifficolta(quiz),
  ];
}

export function contaPerDifficolta(domande: DomandaQuiz[]): Record<DifficoltaQuiz, number> {
  const conteggi: Record<DifficoltaQuiz, number> = { facile: 0, media: 0, difficile: 0 };
  for (const d of domande) {
    if (d.difficolta in conteggi) conteggi[d.difficolta] += 1;
  }
  return conteggi;
}

export function contaPerSezione(domande: DomandaQuiz[]): Record<string, number> {
  const conteggi: Record<string, number> = {};
  for (const d of domande) {
    conteggi[d.sezione] = (conteggi[d.sezione] ?? 0) + 1;
  }
  return conteggi;
}

/** Una risposta data dall'utente a una domanda del quiz. */
export interface RispostaQuiz {
  domandaId: string;
  /** Indice scelto rispetto all'ordine editoriale di `opzioni` (non a quello mescolato). */
  rispostaSelezionata: number;
  corretta: boolean;
}

export interface RiepilogoGruppo {
  id: string;
  corrette: number;
  totale: number;
}

export interface RiepilogoQuiz {
  corrette: number;
  totale: number;
  /** Percentuale intera 0-100. */
  percentuale: number;
  perSezione: RiepilogoGruppo[];
  perDifficolta: RiepilogoGruppo[];
}

/** Aggrega le risposte per sezione e per difficoltà. Deterministico, senza stato. */
export function riepilogaQuiz(quiz: QuizSettimanale, risposte: RispostaQuiz[]): RiepilogoQuiz {
  const corretteDi = new Map(risposte.map((r) => [r.domandaId, r.corretta]));
  const totale = quiz.domande.length;
  let corrette = 0;

  const perSezione = quiz.sezioni.map<RiepilogoGruppo>((s) => ({ id: s.id, corrette: 0, totale: 0 }));
  const perDifficolta = DIFFICOLTA_ORDINATE.map<RiepilogoGruppo>((d) => ({ id: d, corrette: 0, totale: 0 }));

  for (const domanda of quiz.domande) {
    const giusta = corretteDi.get(domanda.id) === true;
    if (giusta) corrette += 1;

    const s = perSezione.find((g) => g.id === domanda.sezione);
    if (s) {
      s.totale += 1;
      if (giusta) s.corrette += 1;
    }
    const d = perDifficolta.find((g) => g.id === domanda.difficolta);
    if (d) {
      d.totale += 1;
      if (giusta) d.corrette += 1;
    }
  }

  return {
    corrette,
    totale,
    percentuale: totale > 0 ? Math.round((corrette / totale) * 100) : 0,
    perSezione,
    perDifficolta: perDifficolta.filter((g) => g.totale > 0),
  };
}

/**
 * Restituisce una permutazione degli indici delle opzioni (Fisher-Yates).
 * `casuale` è iniettabile per rendere il risultato riproducibile nei test.
 * L'ordine editoriale nel JSON non va mai mostrato così com'è: la posizione
 * della risposta corretta non deve essere prevedibile.
 */
export function mescolaIndici(quante: number, casuale: () => number = Math.random): number[] {
  const indici = Array.from({ length: quante }, (_, i) => i);
  for (let i = indici.length - 1; i > 0; i--) {
    const j = Math.floor(casuale() * (i + 1));
    [indici[i], indici[j]] = [indici[j], indici[i]];
  }
  return indici;
}

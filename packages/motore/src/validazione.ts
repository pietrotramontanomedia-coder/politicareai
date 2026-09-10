import type { TestPartitoPack } from './tipi';

const TIPI_FONTE_AMMESSI = new Set(['questionario', 'programma', 'voto', 'dichiarazione']);
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
/** Ogni partito deve avere una posizione documentata su almeno questa quota di affermazioni. */
export const COPERTURA_MINIMA_PACK = 0.5;

export interface ErroreValidazione {
  regola: string;
  messaggio: string;
  affermazioneId?: string;
}

const SOGLIA_SBILANCIAMENTO_VERSO = 0.1; // 10%
const SOGLIA_NON_DISCRIMINANTE = 0.85; // 85%

/**
 * Ogni posizione ha una fonte con citazione. Se il valore è documentato (non
 * null) servono anche URL http(s) e tipo ammesso; una dichiarazione deve avere
 * la data; con confidenza bassa il valore non può essere ±2.
 */
function validaFonti(pack: TestPartitoPack): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  for (const partito of pack.partiti) {
    for (const posizione of partito.posizioni) {
      const dove = `Posizione di "${partito.nome}" su "${posizione.affermazioneId}"`;
      const fonte = posizione.fonte;
      if (!fonte || typeof fonte.citazione !== 'string' || fonte.citazione.trim().length === 0) {
        errori.push({ regola: 'fonte-obbligatoria', messaggio: `${dove} senza citazione.`, affermazioneId: posizione.affermazioneId });
        continue;
      }
      if (fonte.data !== undefined && !DATA_ISO.test(fonte.data)) {
        errori.push({ regola: 'fonte-obbligatoria', messaggio: `${dove}: data "${fonte.data}" non in formato YYYY-MM-DD.`, affermazioneId: posizione.affermazioneId });
      }
      if (posizione.valore === null) continue;

      if (!TIPI_FONTE_AMMESSI.has(fonte.tipo)) {
        errori.push({ regola: 'fonte-obbligatoria', messaggio: `${dove}: tipo di fonte "${fonte.tipo}" non ammesso nel test partito.`, affermazioneId: posizione.affermazioneId });
      }
      if (typeof fonte.url !== 'string' || !/^https?:\/\/\S+$/.test(fonte.url.trim())) {
        errori.push({ regola: 'fonte-obbligatoria', messaggio: `${dove} senza URL verificabile.`, affermazioneId: posizione.affermazioneId });
      }
      if (fonte.tipo === 'dichiarazione' && !fonte.data) {
        errori.push({ regola: 'fonte-obbligatoria', messaggio: `${dove}: una dichiarazione deve avere la data.`, affermazioneId: posizione.affermazioneId });
      }
      if (posizione.confidenza === 'bassa' && Math.abs(posizione.valore) === 2) {
        errori.push({ regola: 'confidenza-valore', messaggio: `${dove}: con confidenza bassa il valore non può essere ±2.`, affermazioneId: posizione.affermazioneId });
      }
    }
  }
  return errori;
}

/**
 * Ogni partito deve avere una voce per ogni affermazione (anche null, con la
 * spiegazione di cosa si è cercato) e nessuna voce su affermazioni inesistenti.
 */
function validaCompletezza(pack: TestPartitoPack): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  const ids = new Set(pack.affermazioni.map((a) => a.id));
  const idsAffermazioni = pack.affermazioni.map((a) => a.id);
  if (new Set(idsAffermazioni).size !== idsAffermazioni.length) {
    errori.push({ regola: 'posizioni-complete', messaggio: 'Id di affermazione duplicati.' });
  }
  for (const partito of pack.partiti) {
    const viste = new Set<string>();
    for (const posizione of partito.posizioni) {
      if (!ids.has(posizione.affermazioneId)) {
        errori.push({ regola: 'posizioni-complete', messaggio: `"${partito.nome}" ha una posizione su "${posizione.affermazioneId}", che non esiste.`, affermazioneId: posizione.affermazioneId });
      }
      if (viste.has(posizione.affermazioneId)) {
        errori.push({ regola: 'posizioni-complete', messaggio: `"${partito.nome}" ha due posizioni su "${posizione.affermazioneId}".`, affermazioneId: posizione.affermazioneId });
      }
      viste.add(posizione.affermazioneId);
    }
    for (const id of ids) {
      if (!viste.has(id)) {
        errori.push({ regola: 'posizioni-complete', messaggio: `"${partito.nome}" non ha alcuna voce su "${id}".`, affermazioneId: id });
      }
    }
  }
  return errori;
}

/**
 * Un partito con troppe posizioni non documentate non è confrontabile con gli
 * altri: sotto COPERTURA_MINIMA_PACK il pack non passa. Meglio cercare ancora
 * o togliere il partito, che classificarlo su pochi punti.
 */
function validaCoperturaPartiti(pack: TestPartitoPack): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  const totale = pack.affermazioni.length;
  if (totale === 0) return errori;
  for (const partito of pack.partiti) {
    const documentate = partito.posizioni.filter((p) => p.valore !== null).length;
    if (documentate / totale < COPERTURA_MINIMA_PACK) {
      errori.push({
        regola: 'copertura-minima',
        messaggio: `"${partito.nome}" ha posizioni documentate su ${documentate}/${totale} affermazioni, sotto il ${COPERTURA_MINIMA_PACK * 100}%.`,
      });
    }
  }
  return errori;
}

/**
 * Lo squilibrio fra affermazioni "verso cambiamento" (+1) e "verso status quo"
 * (-1) non deve superare il 10%, per contrastare l'acquiescence bias.
 */
function validaBilanciamentoVerso(pack: TestPartitoPack): ErroreValidazione[] {
  const totale = pack.affermazioni.length;
  if (totale === 0) return [];

  const positive = pack.affermazioni.filter((a) => a.verso === 1).length;
  const quotaPositive = positive / totale;
  const sbilanciamento = Math.abs(quotaPositive - 0.5);

  if (sbilanciamento > SOGLIA_SBILANCIAMENTO_VERSO) {
    return [
      {
        regola: 'bilanciamento-verso',
        messaggio: `Sbilanciamento verso ${(sbilanciamento * 100).toFixed(1)}%, oltre la soglia del 10% (${positive}/${totale} affermazioni con verso +1).`,
      },
    ];
  }
  return [];
}

/**
 * Se più dell'85% dei partiti condivide la stessa posizione su un'affermazione,
 * questa non discrimina e va rimossa dal pack.
 */
function validaPotereDiscriminante(pack: TestPartitoPack): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  const numPartiti = pack.partiti.length;
  if (numPartiti === 0) return errori;

  for (const affermazione of pack.affermazioni) {
    const conteggi = new Map<number | null, number>();
    for (const partito of pack.partiti) {
      const posizione = partito.posizioni.find((p) => p.affermazioneId === affermazione.id);
      if (!posizione) continue;
      conteggi.set(posizione.valore, (conteggi.get(posizione.valore) ?? 0) + 1);
    }
    const massimo = Math.max(0, ...conteggi.values());
    if (numPartiti > 0 && massimo / numPartiti > SOGLIA_NON_DISCRIMINANTE) {
      errori.push({
        regola: 'potere-discriminante',
        messaggio: `Affermazione "${affermazione.id}" condivisa da oltre l'85% dei partiti: non discrimina.`,
        affermazioneId: affermazione.id,
      });
    }
  }
  return errori;
}

/** Le quote per area dichiarate nel manifest devono corrispondere al conteggio reale. */
function validaQuotePerArea(pack: TestPartitoPack): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  const conteggiReali = new Map<string, number>();
  for (const a of pack.affermazioni) {
    conteggiReali.set(a.area, (conteggiReali.get(a.area) ?? 0) + 1);
  }

  for (const [area, quotaDichiarata] of Object.entries(pack.quotePerArea)) {
    const reale = conteggiReali.get(area) ?? 0;
    if (reale !== quotaDichiarata) {
      errori.push({
        regola: 'quote-per-area',
        messaggio: `Area "${area}": dichiarate ${quotaDichiarata}, trovate ${reale}.`,
      });
    }
  }
  for (const area of conteggiReali.keys()) {
    if (!(area in pack.quotePerArea)) {
      errori.push({
        regola: 'quote-per-area',
        messaggio: `Area "${area}" presente nelle affermazioni ma non dichiarata nel manifest.`,
      });
    }
  }
  return errori;
}

/** Metadati minimi obbligatori per ogni pack. */
function validaMetadati(pack: TestPartitoPack): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  const campiObbligatori: Array<[keyof TestPartitoPack, string]> = [
    ['id', pack.id],
    ['versione', pack.versione],
    ['data', pack.data],
  ] as Array<[keyof TestPartitoPack, string]>;

  for (const [campo, valore] of campiObbligatori) {
    if (!valore || String(valore).trim().length === 0) {
      errori.push({ regola: 'metadati-obbligatori', messaggio: `Campo "${String(campo)}" mancante.` });
    }
  }
  if (!pack.autori || pack.autori.length === 0) {
    errori.push({ regola: 'metadati-obbligatori', messaggio: 'Almeno un autore è obbligatorio.' });
  }
  return errori;
}

/**
 * Esegue tutte le regole di qualità sul content pack. Pensata per girare in CI
 * e bloccare la merge: un array non vuoto significa build rossa.
 */
export function validaPack(pack: TestPartitoPack): ErroreValidazione[] {
  return [
    ...validaMetadati(pack),
    ...validaCompletezza(pack),
    ...validaFonti(pack),
    ...validaCoperturaPartiti(pack),
    ...validaBilanciamentoVerso(pack),
    ...validaPotereDiscriminante(pack),
    ...validaQuotePerArea(pack),
  ];
}

import type { TestPartitoPack } from './tipi';

export interface ErroreValidazione {
  regola: string;
  messaggio: string;
  affermazioneId?: string;
}

const SOGLIA_SBILANCIAMENTO_VERSO = 0.1; // 10%
const SOGLIA_NON_DISCRIMINANTE = 0.85; // 85%

/** Ogni posizione deve avere una fonte non vuota (citazione + url). */
function validaFonti(pack: TestPartitoPack): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  for (const partito of pack.partiti) {
    for (const posizione of partito.posizioni) {
      const fonteValida =
        posizione.fonte &&
        posizione.fonte.citazione.trim().length > 0 &&
        posizione.fonte.url.trim().length > 0;
      if (!fonteValida) {
        errori.push({
          regola: 'fonte-obbligatoria',
          messaggio: `Posizione di "${partito.nome}" su "${posizione.affermazioneId}" senza fonte valida.`,
          affermazioneId: posizione.affermazioneId,
        });
      }
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
    const conteggi = new Map<number, number>();
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
    ...validaFonti(pack),
    ...validaBilanciamentoVerso(pack),
    ...validaPotereDiscriminante(pack),
    ...validaQuotePerArea(pack),
  ];
}

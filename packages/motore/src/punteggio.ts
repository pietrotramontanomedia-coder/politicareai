import type {
  Affermazione,
  Classifica,
  DettaglioAffermazione,
  Partito,
  Risposta,
  RisultatoPartito,
  Valore,
} from './tipi';

/** Soglia di pari merito: 3 punti percentuali di punteggio (scala 0-1 -> 0.03). */
export const SOGLIA_PARI_MERITO = 0.03;

/**
 * Copertura minima perché un partito entri in classifica: deve avere una
 * posizione documentata su almeno il 60% delle affermazioni a cui l'utente ha
 * risposto. Sotto, il punteggio poggia su troppo poche affermazioni per essere
 * confrontabile con gli altri e viene mostrato a parte.
 */
export const SOGLIA_COPERTURA = 0.6;

/**
 * Grado di accordo fra una risposta e una posizione, in [0, 1].
 * Distanza massima possibile su scala -2..+2 è 4, quindi si normalizza su 4.
 */
export function accordo(rispostaUtente: Valore, posizionePartito: Valore): number {
  return 1 - Math.abs(rispostaUtente - posizionePartito) / 4;
}

export interface OpzioniPunteggio {
  /** Serve per il punteggio per area; senza, `perArea` resta vuoto. */
  affermazioni?: Affermazione[];
}

/**
 * Calcola il punteggio di un singolo partito rispetto alle risposte dell'utente.
 * Le risposte saltate (valore null) sono escluse dal calcolo, così come le
 * affermazioni per cui il partito non ha una posizione registrata.
 */
export function calcolaPunteggio(
  risposte: Risposta[],
  partito: Partito,
  opzioni: OpzioniPunteggio = {},
): RisultatoPartito {
  const areaDi = new Map((opzioni.affermazioni ?? []).map((a) => [a.id, a.area]));
  let sommaPonderata = 0;
  let sommaPesi = 0;
  let risposteDate = 0;
  const dettaglio: DettaglioAffermazione[] = [];
  const perAreaAccumulo = new Map<string, { ponderata: number; pesi: number }>();

  for (const risposta of risposte) {
    if (risposta.valore === null) continue;
    risposteDate += 1;

    const posizione = partito.posizioni.find(
      (p) => p.affermazioneId === risposta.affermazioneId,
    );
    if (!posizione || posizione.valore === null) continue;

    const peso = risposta.importante ? 2 : 1;
    const gradoAccordo = accordo(risposta.valore, posizione.valore);

    sommaPonderata += peso * gradoAccordo;
    sommaPesi += peso;

    const area = areaDi.get(risposta.affermazioneId);
    if (area) {
      const acc = perAreaAccumulo.get(area) ?? { ponderata: 0, pesi: 0 };
      acc.ponderata += peso * gradoAccordo;
      acc.pesi += peso;
      perAreaAccumulo.set(area, acc);
    }

    dettaglio.push({
      affermazioneId: risposta.affermazioneId,
      accordo: gradoAccordo,
      rispostaUtente: risposta.valore,
      posizionePartito: posizione.valore,
    });
  }

  const punteggio = sommaPesi > 0 ? sommaPonderata / sommaPesi : 0;
  const perArea: Record<string, number> = {};
  for (const [area, acc] of perAreaAccumulo) perArea[area] = acc.ponderata / acc.pesi;

  return {
    partitoId: partito.id,
    nome: partito.nome,
    punteggio,
    copertura: risposteDate > 0 ? dettaglio.length / risposteDate : 0,
    confrontate: dettaglio.length,
    perArea,
    dettaglio,
  };
}

export interface OpzioniClassifica extends OpzioniPunteggio {
  /** Sovrascrive SOGLIA_COPERTURA (utile nei test). */
  sogliaCopertura?: number;
}

/**
 * Calcola la classifica completa, ordinata dal punteggio più alto al più basso.
 * Non restituisce mai un solo vincitore: il chiamante deve sempre mostrare
 * l'intera classifica (vincolo di prodotto, non solo di calcolo).
 * I partiti con copertura sotto soglia finiscono in `esclusi`, a parte.
 */
export function calcolaClassifica(
  risposte: Risposta[],
  partiti: Partito[],
  opzioni: OpzioniClassifica = {},
): Classifica {
  const soglia = opzioni.sogliaCopertura ?? SOGLIA_COPERTURA;
  // A parità di punteggio esatta, l'ordine non deve dipendere dalla posizione
  // del partito nel content pack (che riflette la sua rilevanza attuale):
  // il tie-break è alfabetico, l'unico criterio neutro rispetto alla dimensione del partito.
  const ordina = (a: RisultatoPartito, b: RisultatoPartito) =>
    b.punteggio - a.punteggio || a.nome.localeCompare(b.nome);

  const tutti = partiti.map((partito) => calcolaPunteggio(risposte, partito, opzioni));
  const risultati = tutti.filter((r) => r.copertura >= soglia).sort(ordina);
  const esclusi = tutti.filter((r) => r.copertura < soglia).sort(ordina);

  const pariMerito =
    risultati.length >= 2 &&
    Math.abs(risultati[0].punteggio - risultati[1].punteggio) <= SOGLIA_PARI_MERITO;

  return { risultati, esclusi, pariMerito };
}

/**
 * Affermazioni su cui la risposta dell'utente diverge di più dalla posizione
 * del partito indicato (utile per il dettaglio "dove non sei d'accordo").
 * Ordinate da minore a maggiore accordo.
 */
export function principaliDivergenze(
  risultato: RisultatoPartito,
  n = 3,
): DettaglioAffermazione[] {
  return [...risultato.dettaglio].sort((a, b) => a.accordo - b.accordo).slice(0, n);
}

/** Speculare a principaliDivergenze: le affermazioni di massimo accordo. */
export function principaliConvergenze(
  risultato: RisultatoPartito,
  n = 3,
): DettaglioAffermazione[] {
  return [...risultato.dettaglio].sort((a, b) => b.accordo - a.accordo).slice(0, n);
}

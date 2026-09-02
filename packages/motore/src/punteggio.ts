import type {
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
 * Grado di accordo fra una risposta e una posizione, in [0, 1].
 * Distanza massima possibile su scala -2..+2 è 4, quindi si normalizza su 4.
 */
export function accordo(rispostaUtente: Valore, posizionePartito: Valore): number {
  return 1 - Math.abs(rispostaUtente - posizionePartito) / 4;
}

/**
 * Calcola il punteggio di un singolo partito rispetto alle risposte dell'utente.
 * Le risposte saltate (valore null) sono escluse dal calcolo, così come le
 * affermazioni per cui il partito non ha una posizione registrata.
 */
export function calcolaPunteggio(risposte: Risposta[], partito: Partito): RisultatoPartito {
  let sommaPonderata = 0;
  let sommaPesi = 0;
  const dettaglio: DettaglioAffermazione[] = [];

  for (const risposta of risposte) {
    if (risposta.valore === null) continue;

    const posizione = partito.posizioni.find(
      (p) => p.affermazioneId === risposta.affermazioneId,
    );
    if (!posizione) continue;

    const peso = risposta.importante ? 2 : 1;
    const gradoAccordo = accordo(risposta.valore, posizione.valore);

    sommaPonderata += peso * gradoAccordo;
    sommaPesi += peso;

    dettaglio.push({
      affermazioneId: risposta.affermazioneId,
      accordo: gradoAccordo,
      rispostaUtente: risposta.valore,
      posizionePartito: posizione.valore,
    });
  }

  const punteggio = sommaPesi > 0 ? sommaPonderata / sommaPesi : 0;

  return { partitoId: partito.id, nome: partito.nome, punteggio, dettaglio };
}

/**
 * Calcola la classifica completa, ordinata dal punteggio più alto al più basso.
 * Non restituisce mai un solo vincitore: il chiamante deve sempre mostrare
 * l'intera classifica (vincolo di prodotto, non solo di calcolo).
 */
export function calcolaClassifica(risposte: Risposta[], partiti: Partito[]): Classifica {
  const risultati = partiti
    .map((partito) => calcolaPunteggio(risposte, partito))
    .sort((a, b) => b.punteggio - a.punteggio);

  const pariMerito =
    risultati.length >= 2 &&
    Math.abs(risultati[0].punteggio - risultati[1].punteggio) <= SOGLIA_PARI_MERITO;

  return { risultati, pariMerito };
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

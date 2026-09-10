import {
  GIOCATORI_MASSIMO,
  GIOCATORI_MINIMO,
  PENALITA_MASSIMA,
  type Carta,
  type CartaInGioco,
  type LeggeInVigore,
  type PaccoCarte,
} from './tipi';

/**
 * Generatore pseudocasuale con seme: a parità di seme la partita è identica.
 * Serve a rendere la logica verificabile nei test senza dipendere da Math.random.
 */
export function generatore(seme: number): () => number {
  let stato = seme >>> 0;
  return () => {
    stato = (stato + 0x6d2b79f5) >>> 0;
    let t = Math.imul(stato ^ (stato >>> 15), 1 | stato);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mescola<T>(elementi: readonly T[], rnd: () => number): T[] {
  const copia = [...elementi];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Estrae `quanti` giocatori diversi fra loro. */
function estraiGiocatori(giocatori: readonly string[], quanti: number, rnd: () => number): string[] {
  return mescola(giocatori, rnd).slice(0, Math.min(quanti, giocatori.length));
}

function segnapostiRichiesti(testo: string): number {
  return testo.includes('{g2}') ? 2 : testo.includes('{g1}') ? 1 : 0;
}

/** Sostituisce {g1} e {g2} con i nomi estratti. */
export function componiCarta(carta: Carta, giocatori: readonly string[], rnd: () => number): CartaInGioco {
  const protagonisti = estraiGiocatori(giocatori, segnapostiRichiesti(carta.testo), rnd);
  const testo = carta.testo
    .replace(/\{g1\}/g, protagonisti[0] ?? '')
    .replace(/\{g2\}/g, protagonisti[1] ?? '');
  return { carta, testo, protagonisti };
}

/**
 * L'ordine delle carte di una partita: i pacchi scelti vengono uniti e mescolati.
 * Le carte che richiedono due protagonisti sono escluse se i giocatori non bastano.
 */
export function preparaPartita(
  pacchi: readonly PaccoCarte[],
  giocatori: readonly string[],
  rnd: () => number,
): Carta[] {
  const utilizzabili = pacchi
    .flatMap((p) => p.carte)
    .filter((c) => segnapostiRichiesti(c.testo) <= giocatori.length);
  return mescola(utilizzabili, rnd);
}

/**
 * Scala di una carta la durata delle leggi in vigore e ne aggiunge una se la
 * carta appena pescata è una `legge`. Le leggi scadute escono dalla lista.
 */
export function aggiornaLeggi(leggi: readonly LeggeInVigore[], pescata: CartaInGioco): LeggeInVigore[] {
  const ancoraVive = leggi
    .map((l) => ({ ...l, carteRimaste: l.carteRimaste - 1 }))
    .filter((l) => l.carteRimaste > 0);

  if (pescata.carta.tipo !== 'legge' || !pescata.carta.durataCarte) return ancoraVive;

  return [
    ...ancoraVive,
    {
      id: pescata.carta.id,
      titolo: pescata.carta.titolo,
      testo: pescata.testo,
      carteRimaste: pescata.carta.durataCarte,
    },
  ];
}

export function nomiValidi(nomi: readonly string[]): string[] {
  const puliti = nomi.map((n) => n.trim()).filter(Boolean);
  return [...new Set(puliti)].slice(0, GIOCATORI_MASSIMO);
}

export function partitaAvviabile(nomi: readonly string[]): boolean {
  return nomiValidi(nomi).length >= GIOCATORI_MINIMO;
}

/**
 * Controlli di qualità sui pacchi di carte, applicati in CI.
 * Restituisce la lista degli errori: vuota se il pacco è valido.
 */
export function validaPacco(pacco: PaccoCarte): string[] {
  const errori: string[] = [];
  const visti = new Set<string>();

  if (pacco.carte.length === 0) errori.push('il pacco non contiene carte');

  for (const carta of pacco.carte) {
    const dove = `${pacco.id}/${carta.id}`;

    if (visti.has(carta.id)) errori.push(`${dove}: id duplicato`);
    visti.add(carta.id);

    if (!carta.titolo.trim()) errori.push(`${dove}: titolo vuoto`);
    if (!carta.testo.trim()) errori.push(`${dove}: testo vuoto`);

    if (!Number.isInteger(carta.penalita) || carta.penalita < 0) {
      errori.push(`${dove}: penalità non valida`);
    }
    // Tetto invalicabile: nessuna carta può spingere a bere oltre tre sorsi.
    if (carta.penalita > PENALITA_MASSIMA) {
      errori.push(`${dove}: penalità ${carta.penalita} oltre il massimo di ${PENALITA_MASSIMA}`);
    }

    if (carta.tipo === 'legge' && !carta.durataCarte) {
      errori.push(`${dove}: una legge deve dichiarare durataCarte`);
    }
    if (carta.tipo === 'duello' && !carta.testo.includes('{g2}')) {
      errori.push(`${dove}: un duello deve nominare due giocatori con {g1} e {g2}`);
    }
    if (carta.testo.includes('{g2}') && !carta.testo.includes('{g1}')) {
      errori.push(`${dove}: usa {g2} senza {g1}`);
    }
    // Le carte che citano fatti reali devono essere verificabili.
    if (pacco.mazzo === 'attualita' && carta.fonte && !carta.fonte.url.startsWith('https://')) {
      errori.push(`${dove}: la fonte deve avere un URL https`);
    }
  }

  return errori;
}

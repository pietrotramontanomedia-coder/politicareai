import {
  GIOCATORI_MASSIMO,
  GIOCATORI_MINIMO,
  PENALITA_MASSIMA,
  SEGNAPOSTI,
  type Carta,
  type CartaInGioco,
  type LeggeInVigore,
  type PaccoCarte,
  type PartitoGioco,
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

function giocatoriRichiesti(testo: string): number {
  return testo.includes('{g2}') ? 2 : testo.includes('{g1}') ? 1 : 0;
}

function partitiRichiesti(testo: string): number {
  if (/\{(partito2|sigla2|leader2)\}/.test(testo)) return 2;
  if (/\{(partito|sigla|leader)\}/.test(testo)) return 1;
  return 0;
}

function sostituisciPartito(testo: string, partito: PartitoGioco | undefined, suffisso: '' | '2'): string {
  if (!partito) return testo;
  return testo
    .replaceAll(`{partito${suffisso}}`, partito.nome)
    .replaceAll(`{sigla${suffisso}}`, partito.sigla ?? partito.nome)
    .replaceAll(`{leader${suffisso}}`, partito.leader ?? partito.nome);
}

/** Sostituisce i segnaposto con giocatori e partiti estratti, sempre diversi fra loro. */
export function componiCarta(
  carta: Carta,
  giocatori: readonly string[],
  rnd: () => number,
  partiti: readonly PartitoGioco[] = [],
): CartaInGioco {
  const protagonisti = mescola(giocatori, rnd).slice(0, giocatoriRichiesti(carta.testo));
  const estratti = mescola(partiti, rnd).slice(0, partitiRichiesti(carta.testo));

  let testo = carta.testo.replaceAll('{g1}', protagonisti[0] ?? '').replaceAll('{g2}', protagonisti[1] ?? '');
  testo = sostituisciPartito(testo, estratti[0], '');
  testo = sostituisciPartito(testo, estratti[1], '2');

  return { carta, testo, protagonisti };
}

/**
 * L'ordine delle carte di una partita: i pacchi scelti vengono uniti e mescolati.
 * Le carte che richiedono più giocatori o partiti di quelli disponibili vengono escluse.
 */
export function preparaPartita(
  pacchi: readonly PaccoCarte[],
  giocatori: readonly string[],
  rnd: () => number,
  partiti: readonly PartitoGioco[] = [],
): Carta[] {
  const utilizzabili = pacchi
    .flatMap((p) => p.carte)
    .filter((c) => giocatoriRichiesti(c.testo) <= giocatori.length && partitiRichiesti(c.testo) <= partiti.length);
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

/** Quante carte su misura ha ogni partito: devono essere lo stesso numero per tutti. */
export function cartePerPartito(pacco: PaccoCarte): Map<string, number> {
  const conteggi = new Map<string, number>();
  for (const carta of pacco.carte) {
    if (carta.riguarda) conteggi.set(carta.riguarda, (conteggi.get(carta.riguarda) ?? 0) + 1);
  }
  return conteggi;
}

/**
 * Controlli di qualità sui pacchi di carte, applicati in CI.
 * Restituisce la lista degli errori: vuota se il pacco è valido.
 */
export function validaPacco(pacco: PaccoCarte): string[] {
  const errori: string[] = [];
  const visti = new Set<string>();
  const ammessi = new Set<string>(SEGNAPOSTI);

  if (pacco.carte.length === 0) errori.push('il pacco non contiene carte');

  for (const carta of pacco.carte) {
    const dove = `${pacco.id}/${carta.id}`;

    if (visti.has(carta.id)) errori.push(`${dove}: id duplicato`);
    visti.add(carta.id);

    if (!carta.titolo.trim()) errori.push(`${dove}: titolo vuoto`);
    if (!carta.testo.trim()) errori.push(`${dove}: testo vuoto`);

    for (const [, nome] of carta.testo.matchAll(/\{([^}]+)\}/g)) {
      if (!ammessi.has(nome)) errori.push(`${dove}: segnaposto sconosciuto {${nome}}`);
    }

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
    if (/\{(partito2|sigla2|leader2)\}/.test(carta.testo) && !/\{(partito|sigla|leader)\}/.test(carta.testo)) {
      errori.push(`${dove}: usa un secondo partito senza il primo`);
    }
    // Le carte che citano fatti reali devono essere verificabili.
    if (pacco.mazzo === 'attualita' && carta.fonte && !carta.fonte.url.startsWith('https://')) {
      errori.push(`${dove}: la fonte deve avere un URL https`);
    }
  }

  return errori;
}

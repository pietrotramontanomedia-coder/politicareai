const MAX_TITOLO = 110;

export function troncaAParola(testo: string, max: number): string {
  if (testo.length <= max) return testo;
  const taglio = testo.lastIndexOf(' ', max);
  return testo.substring(0, taglio > max / 2 ? taglio : max).replace(/[,;:\s]+$/, '') + '…';
}

export function pulisci(testo: string): string {
  return testo.replace(/#(\p{L})/gu, '$1').replace(/[ \t]+/g, ' ').trim();
}

export function senzaEmojiIniziali(testo: string): string {
  return testo.replace(/^[\p{Extended_Pictographic}\p{Regional_Indicator}️‍\s]+/u, '');
}

/** Stile agenzia: la prima frase diventa il titolo, il resto del testo il corpo. */
export function titoloETesto(grezzo: string): { titolo: string; testo: string } {
  const righe = grezzo
    .split('\n')
    .map((r) => pulisci(r))
    .filter(Boolean);
  const prima = righe[0] ?? '';

  const frase = prima.match(/^(.{20,}?[.!?:])(?:\s+(.*))?$/s);
  const titoloGrezzo = senzaEmojiIniziali(frase ? frase[1] : prima).replace(/[.:]$/, '');
  const restoPrima = frase?.[2] ?? '';
  const troncato = titoloGrezzo.length > MAX_TITOLO;

  const testo = [troncato ? prima : restoPrima, ...righe.slice(1)].filter(Boolean).join('\n');

  return { titolo: troncaAParola(titoloGrezzo, MAX_TITOLO), testo };
}

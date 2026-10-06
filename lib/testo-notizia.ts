export function troncaAParola(testo: string, max: number): string {
  if (testo.length <= max) return testo;
  const taglio = testo.lastIndexOf(' ', max);
  return testo.substring(0, taglio > max / 2 ? taglio : max).replace(/[,;:\s]+$/, '') + '…';
}

/** Telegram a volte lascia lettere vietnamite (Ạ, Ị…) al posto delle emoji personalizzate: in italiano non esistono. */
export function pulisci(testo: string): string {
  return testo
    .replace(/[\u1EA0-\u1EF9]+/g, ' ')
    .replace(/#(\p{L})/gu, '$1')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function senzaEmojiIniziali(testo: string): string {
  return testo.replace(/^[\p{Extended_Pictographic}\p{Regional_Indicator}️‍\s]+/u, '');
}

/** Parole con cui comincia una frase nuova: dopo un a capo segnano un titolo finito, non una riga spezzata. */
const INIZI_DI_FRASE = new Set(
  (
    'il lo la i gli le l un una uno del della dello dei degli delle dell al alla allo ai agli alle all nel nella nello nei negli nelle nell ' +
    'sul sulla sullo sui sugli sulle sull dal dalla dallo dai dagli dalle dall di da a in con per tra fra su e ed o ma però tuttavia ' +
    'inoltre anche intanto secondo dopo prima oggi ieri domani questo questa questi queste quello quella già non ci si se che come ' +
    'quando dove mentre poi infatti invece così ecco ora è c'
  ).split(' '),
);

function iniziaUnaFrase(riga: string): boolean {
  const parola = riga.match(/^["«“]?([\p{L}]+)/u)?.[1];
  return !!parola && /^\p{Lu}/u.test(parola) && INIZI_DI_FRASE.has(parola.toLowerCase());
}

/**
 * Chi scrive sul canale a volte va a capo a metà frase: una riga che non chiude la frase continua nella successiva.
 * Sono a capo voluti invece: una riga vuota, una riga che finisce con un'emoji, e una riga che comincia
 * come una frase nuova («Il…», «L'ipotesi…», «Tuttavia…»), come dopo un titolo senza punto.
 */
export function unisciRigheSpezzate(righeGrezze: string[]): string[] {
  const unite: string[] = [];
  let chiusa = true;
  for (const grezza of righeGrezze) {
    const riga = pulisci(grezza);
    if (!riga) {
      chiusa = true; // una riga vuota separa sempre due paragrafi
      continue;
    }
    if (!chiusa && unite.length > 0 && !iniziaUnaFrase(riga)) {
      unite[unite.length - 1] = `${unite[unite.length - 1]} ${riga}`;
    } else {
      unite.push(riga);
    }
    const finale = unite[unite.length - 1];
    chiusa =
      /[.!?…:;"»”)\]]$/.test(finale) ||
      finale.startsWith('@') ||
      /[\u1EA0-\u1EF9\p{Extended_Pictographic}]\s*$/u.test(grezza);
  }
  return unite;
}

/** Oltre questa lunghezza la prima frase non sta bene come titolo: chi la mostra la tiene nel testo (vedi `titoloLungo`). */
export const MAX_TITOLO_PIENO = 150;

export function titoloLungo(titolo: string): boolean {
  return titolo.length > MAX_TITOLO_PIENO;
}

/** Il titolo rimesso in testa al testo come frase, quando è troppo lungo per stare da solo. */
export function fraseDiApertura(titolo: string): string {
  return /[.!?…"»”)]$/.test(titolo) ? titolo : `${titolo}.`;
}

/**
 * Stile agenzia: la prima frase diventa il titolo, il resto del testo il corpo.
 * La frase finisce solo a un punto (o ! ?) seguito da una maiuscola: i due punti e le abbreviazioni
 * («ecc.)») non la spezzano. Il titolo non viene mai tagliato e non si ripete nel corpo.
 */
export function titoloETesto(grezzo: string): { titolo: string; testo: string } {
  const righe = unisciRigheSpezzate(grezzo.split('\n'));
  const prima = senzaEmojiIniziali(righe[0] ?? '');

  const frase = prima.match(/^(.{20,}?[.!?…]+)(?=\s+["«“'(]?[A-ZÀ-ÖØ-Þ]|$)\s*(.*)$/su);
  const titolo = (frase ? frase[1] : prima).replace(/(?<![.])\.$/, '').trim();
  const restoPrima = frase?.[2]?.trim() ?? '';

  const testo = [restoPrima, ...righe.slice(1)].filter(Boolean).join('\n');
  return { titolo, testo };
}

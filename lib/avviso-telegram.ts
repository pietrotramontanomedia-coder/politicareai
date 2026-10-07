/**
 * Testo libero → messaggi HTML di Telegram per gli avvisi privati a Pietro (proposte di notizie, promemoria).
 * Il testo arriva semplice: si fa l'escape dell'HTML, **grassetto** diventa <b>, e si spezza sotto il limite di Telegram.
 */

/** Telegram accetta 4096 caratteri: si resta sotto, con margine per i tag. */
export const MASSIMO_MESSAGGIO = 3800;

export function testoInHtml(testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
}

/** Spezza ai paragrafi (riga vuota); un paragrafo troppo lungo viene spezzato alle righe, poi a forza. */
export function spezzaMessaggi(testo: string, massimo = MASSIMO_MESSAGGIO): string[] {
  const pezzi: string[] = [];
  let corrente = '';
  const aggiungi = (blocco: string, separatore: string) => {
    if (!corrente) corrente = blocco;
    else if (corrente.length + separatore.length + blocco.length <= massimo) corrente += separatore + blocco;
    else {
      pezzi.push(corrente);
      corrente = blocco;
    }
  };
  for (const paragrafo of testo.trim().split(/\n{2,}/)) {
    if (paragrafo.length <= massimo) {
      aggiungi(paragrafo, '\n\n');
      continue;
    }
    for (const riga of paragrafo.split('\n')) {
      for (let i = 0; i < riga.length; i += massimo) aggiungi(riga.slice(i, i + massimo), '\n');
    }
  }
  if (corrente) pezzi.push(corrente);
  return pezzi;
}

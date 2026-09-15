import Anthropic from '@anthropic-ai/sdk';
import type { Riscrittore } from './telegram-x';

/**
 * Riscrittura di una notizia troppo lunga per X: stessi fatti, meno parole.
 * Il modello riassume, non decide: non aggiunge nulla che non sia nel testo.
 */

const MODELLO = 'claude-opus-5';

const ISTRUZIONI = `Sei il redattore di Politicare, pagina italiana di informazione politica, e prepari il testo per X.
Ricevi una notizia già scritta. Devi restituirla pronta per X: entro il numero massimo di caratteri indicato
e con alcune parole del testo trasformate in hashtag.

Regole sul testo:
- se la notizia entra già nel limite, lasciala com'è parola per parola; altrimenti accorciala mantenendo
  tutti i fatti essenziali: chi, cosa, dove, numeri, date, cariche, e le parti decisive delle citazioni virgolettate;
- non aggiungere nulla che non sia nel testo, nessun commento, nessuna valutazione;
- frasi intere e complete, mai una frase spezzata o chiusa con puntini;
- stile agenzia, italiano corretto, tono neutro; mantieni le emoji e le bandiere iniziali se ci sono;
- se la prima frase funziona da titolo, tienila come prima frase;
- niente link, niente firma.

Regole sugli hashtag:
- metti il cancelletto davanti alle parole più rilevanti già presenti nel testo, nel punto in cui stanno:
  cognomi di politici, partiti, luoghi, istituzioni, il tema centrale (es. #Meloni, #Svezia, #Manovra);
- esattamente il numero di hashtag richiesto, mai in coda al testo, mai su parole con apostrofo o trattino,
  mai su articoli, preposizioni o parole generiche;
- i nomi composti diventano un hashtag unico nella forma usata su X (Regno Unito → #RegnoUnito,
  Partito Democratico → #PD, Fratelli d'Italia → #FdI, Movimento 5 Stelle → #M5S, Unione europea → #UE).

Rispondi solo con il testo pronto, senza spiegazioni.`;

export function riscritturaDisponibile(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.X_RISCRITTURA !== '0';
}

export const riscriviPerX: Riscrittore = async (testo, massimo, hashtag) => {
  const client = new Anthropic();
  const risposta = await client.beta.messages.create({
    model: MODELLO,
    max_tokens: 1024,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: ISTRUZIONI,
    messages: [{ role: 'user', content: `Massimo ${massimo} caratteri (le emoji contano doppio). Hashtag richiesti: ${hashtag}.\n\nNotizia:\n${testo}` }],
  });
  if (risposta.stop_reason === 'refusal') throw new Error('riscrittura rifiutata dal modello');
  return risposta.content
    .filter((blocco): blocco is Anthropic.Beta.BetaTextBlock => blocco.type === 'text')
    .map((blocco) => blocco.text)
    .join('')
    .trim();
};

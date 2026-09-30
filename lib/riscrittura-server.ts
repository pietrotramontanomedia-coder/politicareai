import Anthropic from '@anthropic-ai/sdk';
import type { Riscrittore, SceltaHashtag } from './telegram-x';

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
- metti il cancelletto davanti alle parole più rilevanti già presenti nel testo, nel punto in cui stanno;
- scegli, in quest'ordine: cognomi dei protagonisti (#Meloni, #Bonelli), partiti e sigle (#Lega, #M5S, #FdI),
  istituzioni e luoghi (#Senato, #Veneto, #UE), e per ultimo il tema della notizia solo se è un argomento
  riconoscibile su X (#BolloAuto, #Manovra, #LeggeElettorale);
- mai su parole generiche o astratte da sole (abolizione, commento, proposta, governo, ministro, premier, sondaggio),
  mai su articoli o preposizioni, mai su parole con apostrofo o trattino, mai sul nome di battesimo;
- per un tema di due parole vicine puoi unirle in un hashtag solo (bollo auto → #BolloAuto);
- se la notizia entra già nel limite non sostituire parole con sigle: aggiungi solo cancelletti;
  se la stai accorciando puoi usare la forma di X (Partito Democratico → #PD, Fratelli d'Italia → #FdI,
  Movimento 5 Stelle → #M5S, Unione europea → #UE, Regno Unito → #RegnoUnito);
- esattamente il numero di hashtag richiesto (meno solo se il testo non ha abbastanza parole adatte),
  ciascuno sulla prima occorrenza, mai in coda al testo, mai due hashtag attaccati.

Rispondi solo con il testo pronto, senza spiegazioni.`;

const ISTRUZIONI_HASHTAG = `Sei il redattore di Politicare, pagina italiana di informazione politica, e prepari i post per X.
Ricevi una notizia già scritta e devi solo dire quali parole del testo trasformare in hashtag.

Scegli, in quest'ordine di preferenza:
1. cognomi dei protagonisti della notizia (Meloni, Bonelli, Di Cesare: se il cognome ha una particella includila);
2. partiti, sigle e istituzioni (Lega, M5S, Fratelli d'Italia, Senato, Corte costituzionale);
3. luoghi e organizzazioni rilevanti (Veneto, Bruxelles, Emirati Arabi Uniti, New York);
4. il tema della notizia, solo se è un argomento riconoscibile su X (bollo auto, manovra, legge elettorale).

Non scegliere mai: verbi e parole di servizio (sto, ecco, leggi), parole generiche o astratte
(aggiornamento, commento, dichiarazione, risultato, parole, nazionale), cariche da sole (ministro,
premier, presidente, sindaco), nomi di testate (Il Fatto Quotidiano, Corriere, Ansa), mesi e giorni,
nomi di battesimo da soli, parole dentro un link.

Regole di forma:
- restituisci le parole ESATTAMENTE come stanno nel testo, comprese maiuscole e accenti;
- un nome di più parole va restituito intero in una sola voce ("Emirati Arabi Uniti", "Di Battista", "bollo auto");
- se le parole adatte sono meno di quelle richieste, restituiscine meno: meglio poche e giuste;
- rispondi solo con un array JSON di stringhe, senza spiegazioni. Esempio: ["Meloni","Manovra","Senato"]`;

/** Chiede a Claude quali parole marcare. Il testo non gli passa mai: torna solo l'elenco. */
export const scegliHashtag: SceltaHashtag = async (testo, quanti) => {
  const client = new Anthropic();
  const risposta = await client.beta.messages.create({
    model: MODELLO,
    max_tokens: 300,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: ISTRUZIONI_HASHTAG,
    messages: [{ role: 'user', content: `Quante parole: ${quanti}\n\nNotizia:\n${testo}` }],
  });
  if (risposta.stop_reason === 'refusal') return [];
  const grezzo = risposta.content
    .filter((blocco): blocco is Anthropic.Beta.BetaTextBlock => blocco.type === 'text')
    .map((blocco) => blocco.text)
    .join('')
    .trim();
  const array = grezzo.slice(grezzo.indexOf('['), grezzo.lastIndexOf(']') + 1);
  try {
    const scelte: unknown = JSON.parse(array);
    if (!Array.isArray(scelte)) return [];
    return scelte.filter((voce): voce is string => typeof voce === 'string' && voce.trim().length > 1).slice(0, quanti);
  } catch {
    console.error('[telegram-x] Claude non ha restituito un elenco leggibile di hashtag');
    return [];
  }
};

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

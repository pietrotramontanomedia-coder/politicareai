/**
 * Ultim'ora delle agenzie di stampa: tipi condivisi fra server e client.
 * Modulo separato dall'ultim'ora redazionale (Instagram/Telegram di Politicare).
 */

export type Agenzia = 'ansa' | 'adnkronos';

export const AGENZIE: Agenzia[] = ['ansa', 'adnkronos'];

export interface DescrizioneAgenzia {
  id: Agenzia;
  nome: string;
  /** Sigla corta per badge e ticker. */
  sigla: string;
  colore: string;
  sito: string;
  /** Feed RSS reale della sezione politica. Sovrascrivibile da variabile d'ambiente. */
  feedPredefinito: string;
  variabileAmbiente: string;
}

export const DESCRIZIONI_AGENZIE: Record<Agenzia, DescrizioneAgenzia> = {
  ansa: {
    id: 'ansa',
    nome: 'ANSA',
    sigla: 'ANSA',
    colore: '#2f6fed',
    sito: 'https://www.ansa.it/sito/notizie/politica/politica.shtml',
    feedPredefinito: 'https://www.ansa.it/sito/notizie/politica/politica.rss',
    variabileAmbiente: 'AGENZIE_FEED_ANSA',
  },
  adnkronos: {
    id: 'adnkronos',
    nome: 'Adnkronos',
    sigla: 'ADN',
    colore: '#d94a2b',
    sito: 'https://www.adnkronos.com/politica',
    feedPredefinito: 'https://www.adnkronos.com/RSS_Politica.xml',
    variabileAmbiente: 'AGENZIE_FEED_ADNKRONOS',
  },
};

/** Un singolo lancio, normalizzato qualunque sia il feed di origine. */
export interface LancioAgenzia {
  /** Stabile fra un aggiornamento e l'altro: `${agenzia}-${hash(guid o link)}`. */
  id: string;
  agenzia: Agenzia;
  titolo: string;
  /** Sommario in testo semplice, senza HTML. Può essere vuoto. */
  testo: string;
  /** ISO 8601. */
  data: string;
  /** Link al lancio originale sul sito dell'agenzia. */
  link: string;
  categoria?: string;
  /** true quando il lancio viene da un feed finto di sviluppo: la UI lo dichiara sempre. */
  simulato: boolean;
}

export type StatoFonte = 'ok' | 'simulato' | 'vuoto' | 'errore';

export interface StatoAgenzia {
  agenzia: Agenzia;
  stato: StatoFonte;
  /** Numero di lanci letti da questa fonte. */
  lanci: number;
  /** Messaggio d'errore breve, solo quando stato = 'errore'. */
  dettaglio?: string;
}

export interface RispostaAgenzie {
  success: boolean;
  lanci: LancioAgenzia[];
  fonti: StatoAgenzia[];
  /** true se almeno una fonte è simulata. */
  simulazione: boolean;
  timestamp: string;
}

export function eAgenzia(valore: string): valore is Agenzia {
  return (AGENZIE as string[]).includes(valore);
}

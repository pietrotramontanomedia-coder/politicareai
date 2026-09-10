import type { FonteUltimOra } from '@/lib/ultimora-server';

/** Testi e identità delle fonti delle ultim'ora: condivisi da ticker, sezione in home e pagina della notizia. */

export interface InfoFonte {
  nome: string;
  etichetta: string;
  url: string;
  colore: string;
  segui: string;
}

export const FONTI_ULTIMORA: Record<FonteUltimOra, InfoFonte> = {
  telegram: {
    nome: 'Telegram',
    etichetta: 'canale ufficiale Telegram @politicare',
    url: 'https://t.me/politicare',
    colore: '#2AABEE',
    segui: 'Segui su Telegram',
  },
  instagram: {
    nome: 'Instagram',
    etichetta: 'profilo ufficiale @politicareit',
    url: 'https://www.instagram.com/politicareit/',
    colore: '#E1306C',
    segui: 'Segui su Instagram',
  },
};

export const TESTI_ULTIMORA = {
  live: 'Live',
  inDiretta: 'In diretta',
  titolo: "Ultim'ora",
  sottotitolo: 'Le notizie del nostro canale Telegram e del profilo Instagram, in ordine di arrivo.',
  apertura: 'Apertura',
  leggi: 'Leggi la notizia',
  mostraAltre: (n: number) => `Mostra altre ${n}`,
  mostraMeno: 'Mostra meno',
  notizia: (i: number, n: number) => `Notizia ${i} di ${n}`,
  precedente: 'Notizia precedente',
  successiva: 'Notizia successiva',
  torna: "Ultim'ora",
  agenzia: 'Politicare · Agenzia',
  fonte: 'Fonte',
  apriFonte: (nome: string) => `Apri su ${nome}`,
  altre: "Altre ultim'ora",
  condividi: 'Condividi',
  copiato: 'Link copiato',
};

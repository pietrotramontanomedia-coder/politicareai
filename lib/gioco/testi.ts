import type { TipoCarta } from './tipi';

/** Testi di interfaccia del gioco, tenuti fuori dai componenti. */
export const TESTI_GIOCO = {
  titolo: 'Crisi di Governo',
  sottotitolo: 'Il gioco di società della politica italiana',
  etichetta: 'Gioco',
  descrizione:
    'Carte di sfide, leggi e mozioni di sfiducia da giocare in gruppo. Si passa il telefono, si legge la carta, si fa quello che dice.',

  eta: {
    titolo: 'Solo per maggiorenni',
    testo:
      'Il gioco prevede penalità da bere. Confermando dichiari di avere almeno 18 anni e di giocare con persone maggiorenni.',
    conferma: 'Ho 18 anni o più',
  },

  setup: {
    giocatori: 'Chi gioca',
    aggiungiGiocatore: 'Aggiungi giocatore',
    nomeGiocatore: (n: number) => `Giocatore ${n}`,
    rimuovi: 'Rimuovi',
    minimo: 'Servono almeno due giocatori.',
    opzioni: 'Opzioni',
    mazzoAttualita: 'Carte di attualità',
    mazzoAttualitaNota: 'Aggiunge carte sui fatti politici delle ultime settimane, ognuna con la sua fonte.',
    analcolico: 'Modalità analcolica',
    analcolicoNota: 'Le penalità diventano penitenze: niente alcol, stesse carte.',
    inizia: 'Apri la seduta',
  },

  gioco: {
    carta: (corrente: number, totale: number) => `Carta ${corrente} di ${totale}`,
    prossima: 'Prossima carta',
    leggiInVigore: 'Leggi in vigore',
    restano: (n: number) => (n === 1 ? 'ancora 1 carta' : `ancora ${n} carte`),
    fonte: 'Fonte',
    tempo: (secondi: number) => `${secondi} secondi`,
    astensione: 'Chiunque può astenersi da una carta, senza spiegazioni.',
    esci: 'Chiudi la seduta',
  },

  fine: {
    titolo: 'Fine della legislatura',
    testo: 'Il mazzo è finito. Bevete un bicchiere d’acqua e, se volete, si ricomincia.',
    rigioca: 'Nuova legislatura',
    home: 'Torna alla home',
  },

  penalita: {
    /** "2 sorsi" oppure "2 penitenze", secondo la modalità scelta. */
    etichetta: (n: number, analcolico: boolean): string => {
      if (n === 0) return analcolico ? 'nessuna penitenza' : 'nessun sorso';
      if (analcolico) return n === 1 ? '1 penitenza' : `${n} penitenze`;
      return n === 1 ? '1 sorso' : `${n} sorsi`;
    },
    spiegazione: (analcolico: boolean) =>
      analcolico
        ? 'Chi "paga" fa una penitenza a scelta del gruppo.'
        : 'Chi "paga" beve il numero di sorsi indicato. Un sorso è un sorso, non un bicchiere.',
  },

  avvisi: {
    responsabile: 'Bevi responsabilmente: acqua fra un giro e l’altro, e nessuno si mette alla guida.',
    astensione: 'L’astensione è sempre legittima: si può passare qualsiasi carta.',
    fatti: 'Le carte di attualità citano fatti pubblici con la fonte: si gioca sulle notizie, non sulle persone.',
  },
} as const;

export const ETICHETTE_TIPO: Record<TipoCarta, { label: string; icona: string; colore: string; sfondo: string }> = {
  sfida: { label: 'Sfida', icona: '🎤', colore: '#fbbf24', sfondo: 'rgba(251,191,36,0.14)' },
  duello: { label: 'Duello', icona: '⚔️', colore: '#f87171', sfondo: 'rgba(248,113,113,0.14)' },
  votazione: { label: 'Votazione', icona: '🗳️', colore: '#60a5fa', sfondo: 'rgba(96,165,250,0.14)' },
  legge: { label: 'Legge', icona: '📜', colore: '#a78bfa', sfondo: 'rgba(167,139,250,0.14)' },
  minigioco: { label: 'Aula', icona: '🏛️', colore: '#34d399', sfondo: 'rgba(52,211,153,0.14)' },
  tutti: { label: 'Tutti', icona: '👥', colore: '#f0abfc', sfondo: 'rgba(240,171,252,0.14)' },
};

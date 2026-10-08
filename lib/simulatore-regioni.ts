/**
 * Seggi del Senato regione per regione con la legge elettorale approvata l'8 ottobre 2026 (A.C. 2822-B).
 * Fonte: dossier dei Servizi Studi di Camera e Senato n. 666/4 del 16 settembre 2026, Tabella 8
 * (popolazione del censimento 2021). I numeri veri li fisserà il decreto di convocazione dei comizi.
 */

export interface RegioneSenato {
  id: string;
  nome: string;
  /** Seggi della regione senza premio (riparto proporzionale su 189). */
  seggi: number;
  /** Quota dei 35 seggi di premio assegnata alla regione (Tabella 7). */
  premio: number;
  /** Seggi proporzionali della regione quando scatta il premio (154 in tutto). */
  proporzionaliConPremio: number;
}

export const REGIONI_SENATO: readonly RegioneSenato[] = [
  { id: 'piemonte', nome: 'Piemonte', seggi: 14, premio: 3, proporzionaliConPremio: 11 },
  { id: 'lombardia', nome: 'Lombardia', seggi: 32, premio: 6, proporzionaliConPremio: 26 },
  { id: 'veneto', nome: 'Veneto', seggi: 16, premio: 3, proporzionaliConPremio: 13 },
  { id: 'friuli', nome: 'Friuli-Venezia Giulia', seggi: 4, premio: 1, proporzionaliConPremio: 3 },
  { id: 'liguria', nome: 'Liguria', seggi: 5, premio: 1, proporzionaliConPremio: 4 },
  { id: 'emilia', nome: 'Emilia-Romagna', seggi: 14, premio: 3, proporzionaliConPremio: 11 },
  { id: 'toscana', nome: 'Toscana', seggi: 12, premio: 2, proporzionaliConPremio: 10 },
  { id: 'umbria', nome: 'Umbria', seggi: 3, premio: 1, proporzionaliConPremio: 2 },
  { id: 'marche', nome: 'Marche', seggi: 5, premio: 1, proporzionaliConPremio: 4 },
  { id: 'lazio', nome: 'Lazio', seggi: 18, premio: 3, proporzionaliConPremio: 15 },
  { id: 'abruzzo', nome: 'Abruzzo', seggi: 4, premio: 1, proporzionaliConPremio: 3 },
  { id: 'molise', nome: 'Molise', seggi: 2, premio: 0, proporzionaliConPremio: 2 },
  { id: 'campania', nome: 'Campania', seggi: 18, premio: 3, proporzionaliConPremio: 15 },
  { id: 'puglia', nome: 'Puglia', seggi: 13, premio: 2, proporzionaliConPremio: 11 },
  { id: 'basilicata', nome: 'Basilicata', seggi: 3, premio: 0, proporzionaliConPremio: 3 },
  { id: 'calabria', nome: 'Calabria', seggi: 6, premio: 1, proporzionaliConPremio: 5 },
  { id: 'sicilia', nome: 'Sicilia', seggi: 15, premio: 3, proporzionaliConPremio: 12 },
  { id: 'sardegna', nome: 'Sardegna', seggi: 5, premio: 1, proporzionaliConPremio: 4 },
];

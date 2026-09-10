import type { ArchivioProfilo } from './archivio';

/*
 * Accesso con account, indipendente dal servizio scelto (Supabase, Clerk, Auth.js…).
 * Per collegare il login basta implementare FornitoreAccesso e assegnarlo a
 * FORNITORE_ACCESSO: pagine, profilo e navigazione non cambiano. Vedi docs/PROFILO.md.
 */

export interface UtenteAccesso {
  id: string;
  email?: string;
  nome?: string;
}

export type Sessione = { stato: 'ospite' } | { stato: 'autenticato'; utente: UtenteAccesso };

export interface FornitoreAccesso {
  readonly nome: string;
  /** false finché il servizio di login non è collegato: l'interfaccia mostra "in arrivo". */
  readonly attivo: boolean;
  sessioneIniziale(): Promise<Sessione>;
  /** Link magico via email, senza password. */
  inviaLinkEmail(email: string): Promise<void>;
  accediConGoogle(): Promise<void>;
  esci(): Promise<void>;
  /** Archivio del profilo sul server, per l'utente autenticato. Non riceve mai il risultato del test. */
  archivioAccount(utente: UtenteAccesso): ArchivioProfilo;
  /** Cancella account e dati sul server (diritto all'oblio). */
  eliminaAccount(): Promise<void>;
}

export class AccessoNonAttivo extends Error {
  constructor() {
    super('Il login non è ancora attivo');
    this.name = 'AccessoNonAttivo';
  }
}

const nonAttivo = async (): Promise<never> => {
  throw new AccessoNonAttivo();
};

export const fornitoreNonConfigurato: FornitoreAccesso = {
  nome: 'non configurato',
  attivo: false,
  sessioneIniziale: async () => ({ stato: 'ospite' }),
  inviaLinkEmail: nonAttivo,
  accediConGoogle: nonAttivo,
  esci: async () => undefined,
  archivioAccount: () => {
    throw new AccessoNonAttivo();
  },
  eliminaAccount: nonAttivo,
};

/** Punto unico da cambiare quando si sceglie il servizio di login. */
export const FORNITORE_ACCESSO: FornitoreAccesso = fornitoreNonConfigurato;

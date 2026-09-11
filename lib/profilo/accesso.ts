import type { ArchivioProfilo } from './archivio';
import { fornitoreSupabase, supabaseConfigurato } from './accesso-supabase';

/*
 * Accesso con account, indipendente dal servizio scelto.
 * Oggi: Supabase (regione UE) se le variabili NEXT_PUBLIC_SUPABASE_* sono presenti,
 * altrimenti l'app resta in modalità ospite, con il profilo sul dispositivo.
 */

export interface UtenteAccesso {
  id: string;
  email?: string;
  nome?: string;
}

export type Sessione = { stato: 'ospite' } | { stato: 'autenticato'; utente: UtenteAccesso };

export interface FornitoreAccesso {
  readonly nome: string;
  /** false se il servizio di login non è collegato: l'interfaccia mostra "in arrivo". */
  readonly attivo: boolean;
  sessioneIniziale(): Promise<Sessione>;
  /** Avvisa quando l'utente entra o esce (anche al ritorno dal link via email). Restituisce la funzione per smettere. */
  osserva(callback: (sessione: Sessione) => void): () => void;
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
  osserva: () => () => undefined,
  inviaLinkEmail: nonAttivo,
  accediConGoogle: nonAttivo,
  esci: async () => undefined,
  archivioAccount: () => {
    throw new AccessoNonAttivo();
  },
  eliminaAccount: nonAttivo,
};

export const FORNITORE_ACCESSO: FornitoreAccesso = supabaseConfigurato ? fornitoreSupabase : fornitoreNonConfigurato;

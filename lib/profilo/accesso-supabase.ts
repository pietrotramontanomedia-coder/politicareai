import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ArchivioProfilo } from './archivio';
import type { FornitoreAccesso, Sessione, UtenteAccesso } from './accesso';
import { datiSincronizzabili, normalizzaProfilo, profiloVuoto } from './regole';
import { VERSIONE_PROFILO, type Profilo } from './tipi';

/*
 * Accesso con Supabase (progetto in regione UE): link magico via email e Google.
 * Il profilo vive in due tabelle protette da row level security; il test partiti non ha
 * tabelle e non arriva mai qui. Schema completo in supabase/schema.sql.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHIAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true quando il progetto Supabase è configurato: altrimenti l'app resta in modalità ospite. */
export const supabaseConfigurato = Boolean(URL && CHIAVE);

let cliente: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (!cliente) {
    if (!URL || !CHIAVE) throw new Error('Supabase non configurato');
    cliente = createClient(URL, CHIAVE, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    });
  }
  return cliente;
}

export interface RigaProfilo {
  id: string;
  nome: string;
  colore: string;
  anno_nascita: number | null;
  citta: string;
  temi_seguiti: string[];
  giocatori: string[];
  creato_il: string;
  aggiornato_il: string;
}

export interface RigaQuiz {
  utente: string;
  numero: number;
  percentuale: number;
  corrette: number;
  totale: number;
  migliore_percentuale: number;
  tentativi: number;
  completato_il: string;
}

/** Dalle righe del database al profilo dell'app (passando dalla normalizzazione). */
export function daRighe(riga: RigaProfilo | null, quiz: RigaQuiz[]): Profilo | null {
  if (!riga) return null;
  return normalizzaProfilo({
    versione: VERSIONE_PROFILO,
    nome: riga.nome,
    colore: riga.colore,
    annoNascita: riga.anno_nascita,
    citta: riga.citta,
    creatoIl: riga.creato_il,
    aggiornatoIl: riga.aggiornato_il,
    temiSeguiti: riga.temi_seguiti,
    giocatori: riga.giocatori,
    storicoQuiz: quiz.map((q) => ({
      numero: q.numero,
      percentuale: q.percentuale,
      corrette: q.corrette,
      totale: q.totale,
      migliorePercentuale: q.migliore_percentuale,
      tentativi: q.tentativi,
      completatoIl: q.completato_il,
    })),
  });
}

export function aRigaProfilo(id: string, profilo: Profilo): RigaProfilo {
  const p = datiSincronizzabili(profilo);
  return {
    id,
    nome: p.nome,
    colore: p.colore,
    anno_nascita: p.annoNascita,
    citta: p.citta,
    temi_seguiti: p.temiSeguiti,
    giocatori: p.giocatori,
    creato_il: p.creatoIl,
    aggiornato_il: p.aggiornatoIl,
  };
}

export function aRigheQuiz(id: string, profilo: Profilo): RigaQuiz[] {
  return datiSincronizzabili(profilo).storicoQuiz.map((q) => ({
    utente: id,
    numero: q.numero,
    percentuale: q.percentuale,
    corrette: q.corrette,
    totale: q.totale,
    migliore_percentuale: q.migliorePercentuale,
    tentativi: q.tentativi,
    completato_il: q.completatoIl,
  }));
}

function utenteDa(utente: { id: string; email?: string } | null | undefined): UtenteAccesso | null {
  return utente ? { id: utente.id, email: utente.email } : null;
}

function archivioAccount(utente: UtenteAccesso): ArchivioProfilo {
  return {
    dove: 'account',
    async leggi() {
      const db = client();
      const [profilo, quiz] = await Promise.all([
        db.from('profili').select('*').eq('id', utente.id).maybeSingle(),
        db.from('storico_quiz').select('*').eq('utente', utente.id),
      ]);
      if (profilo.error) throw profilo.error;
      return daRighe(profilo.data as RigaProfilo | null, (quiz.data ?? []) as RigaQuiz[]);
    },
    async salva(profilo) {
      const db = client();
      const { error } = await db.from('profili').upsert(aRigaProfilo(utente.id, profilo));
      if (error) throw error;
      const righe = aRigheQuiz(utente.id, profilo);
      if (righe.length > 0) {
        const esito = await db.from('storico_quiz').upsert(righe, { onConflict: 'utente,numero' });
        if (esito.error) throw esito.error;
      }
    },
    async cancella() {
      const db = client();
      await db.from('storico_quiz').delete().eq('utente', utente.id);
      await db.from('profili').delete().eq('id', utente.id);
    },
  };
}

export const fornitoreSupabase: FornitoreAccesso = {
  nome: 'Supabase',
  attivo: true,

  async sessioneIniziale(): Promise<Sessione> {
    const { data } = await client().auth.getSession();
    const utente = utenteDa(data.session?.user);
    return utente ? { stato: 'autenticato', utente } : { stato: 'ospite' };
  },

  osserva(callback) {
    const { data } = client().auth.onAuthStateChange((_evento, sessione) => {
      const utente = utenteDa(sessione?.user);
      callback(utente ? { stato: 'autenticato', utente } : { stato: 'ospite' });
    });
    return () => data.subscription.unsubscribe();
  },

  async inviaLinkEmail(email) {
    const { error } = await client().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/accedi` },
    });
    if (error) throw error;
  },

  async accediConGoogle() {
    const { error } = await client().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/accedi` },
    });
    if (error) throw error;
  },

  async esci() {
    await client().auth.signOut();
  },

  archivioAccount,

  async eliminaAccount() {
    const db = client();
    const { error } = await db.rpc('elimina_account');
    if (error) throw error;
    await db.auth.signOut();
  },
};

/** Profilo di partenza per un account nuovo. */
export function profiloIniziale(): Profilo {
  return profiloVuoto();
}

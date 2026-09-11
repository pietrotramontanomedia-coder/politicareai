'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { archivioDispositivo, type ArchivioProfilo } from '@/lib/profilo/archivio';
import { FORNITORE_ACCESSO, type Sessione, type UtenteAccesso } from '@/lib/profilo/accesso';
import { profiloVuoto, registraQuiz as registraQuizNelProfilo, unisciProfili } from '@/lib/profilo/regole';
import { cancellaRisultatoTest } from '@/lib/profilo/risultato-test-locale';
import type { EsitoQuiz, Profilo } from '@/lib/profilo/tipi';

interface ContestoProfilo {
  /** false finché il profilo non è stato letto (sul server e al primo render è sempre false). */
  pronto: boolean;
  profilo: Profilo | null;
  sessione: Sessione;
  dove: 'dispositivo' | 'account';
  /** true mentre si sta leggendo o scrivendo sull'account. */
  inSincronia: boolean;
  aggiorna: (modifica: (profilo: Profilo) => Profilo) => void;
  registraQuiz: (esito: EsitoQuiz) => void;
  cancellaTutto: () => Promise<void>;
  esci: () => Promise<void>;
  eliminaAccount: () => Promise<void>;
}

const Contesto = createContext<ContestoProfilo | null>(null);

function archivioPer(sessione: Sessione): ArchivioProfilo {
  return sessione.stato === 'autenticato' ? FORNITORE_ACCESSO.archivioAccount(sessione.utente) : archivioDispositivo;
}

/**
 * Carica il profilo dall'archivio giusto (dispositivo o account) e lo salva a ogni modifica.
 * Al primo accesso unisce il profilo del dispositivo con quello dell'account e poi libera il dispositivo.
 */
export function ProfiloProvider({ children }: { children: React.ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [sessione, setSessione] = useState<Sessione>({ stato: 'ospite' });
  const [inSincronia, setInSincronia] = useState(false);
  const daSalvare = useRef(false);
  // undefined = profilo non ancora letto. Non può partire da null: null è anche l'ospite, e al
  // primo caricamento l'ospite non risulterebbe "cambiato", quindi il profilo del dispositivo
  // non verrebbe mai letto (e la modifica successiva lo sovrascriverebbe con uno vuoto).
  const utenteCorrente = useRef<string | null | undefined>(undefined);

  const archivio = useMemo(() => archivioPer(sessione), [sessione]);

  const entra = useCallback(async (utente: UtenteAccesso) => {
    setInSincronia(true);
    try {
      const account = FORNITORE_ACCESSO.archivioAccount(utente);
      const [locale, remoto] = await Promise.all([archivioDispositivo.leggi(), account.leggi()]);
      let unito = remoto;
      if (locale) {
        unito = unisciProfili(locale, remoto ?? profiloVuoto(new Date(locale.creatoIl)));
        await account.salva(unito);
        await archivioDispositivo.cancella();
      }
      setProfilo(unito ?? null);
    } catch {
      // Account non raggiungibile: si continua con quello che c'è, senza perdere dati locali.
    } finally {
      setInSincronia(false);
    }
  }, []);

  // Primo caricamento e cambi di sessione (anche al ritorno dal link ricevuto via email).
  useEffect(() => {
    let attivo = true;

    const applica = async (nuova: Sessione) => {
      if (!attivo) return;
      const id = nuova.stato === 'autenticato' ? nuova.utente.id : null;
      const cambiata = id !== utenteCorrente.current;
      utenteCorrente.current = id;
      setSessione(nuova);
      if (!cambiata) return;
      if (nuova.stato === 'autenticato') await entra(nuova.utente);
      else setProfilo(await archivioDispositivo.leggi());
      if (attivo) setPronto(true);
    };

    (async () => {
      const iniziale = await FORNITORE_ACCESSO.sessioneIniziale();
      await applica(iniziale);
      if (attivo) setPronto(true);
    })();

    const smetti = FORNITORE_ACCESSO.osserva((nuova) => void applica(nuova));
    return () => {
      attivo = false;
      smetti();
    };
  }, [entra]);

  // Salva dopo ogni modifica fatta dall'utente (non al caricamento).
  useEffect(() => {
    if (!daSalvare.current || !profilo) return;
    daSalvare.current = false;
    void archivio.salva(profilo);
  }, [profilo, archivio]);

  const aggiorna = useCallback((modifica: (profilo: Profilo) => Profilo) => {
    daSalvare.current = true;
    setProfilo((precedente) => modifica(precedente ?? profiloVuoto()));
  }, []);

  const registraQuiz = useCallback((esito: EsitoQuiz) => aggiorna((p) => registraQuizNelProfilo(p, esito)), [aggiorna]);

  const cancellaTutto = useCallback(async () => {
    daSalvare.current = false;
    await archivio.cancella();
    cancellaRisultatoTest();
    setProfilo(null);
  }, [archivio]);

  const esci = useCallback(async () => {
    await FORNITORE_ACCESSO.esci();
  }, []);

  const eliminaAccount = useCallback(async () => {
    daSalvare.current = false;
    await FORNITORE_ACCESSO.eliminaAccount();
    cancellaRisultatoTest();
    setProfilo(null);
  }, []);

  const valore = useMemo<ContestoProfilo>(
    () => ({ pronto, profilo, sessione, dove: archivio.dove, inSincronia, aggiorna, registraQuiz, cancellaTutto, esci, eliminaAccount }),
    [pronto, profilo, sessione, archivio.dove, inSincronia, aggiorna, registraQuiz, cancellaTutto, esci, eliminaAccount],
  );

  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useProfilo(): ContestoProfilo {
  const contesto = useContext(Contesto);
  if (!contesto) throw new Error('useProfilo va usato dentro ProfiloProvider');
  return contesto;
}

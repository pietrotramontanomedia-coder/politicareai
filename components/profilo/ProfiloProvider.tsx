'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { archivioDispositivo } from '@/lib/profilo/archivio';
import { FORNITORE_ACCESSO, type Sessione } from '@/lib/profilo/accesso';
import { profiloVuoto, registraQuiz as registraQuizNelProfilo } from '@/lib/profilo/regole';
import { cancellaRisultatoTest } from '@/lib/profilo/risultato-test-locale';
import type { EsitoQuiz, Profilo } from '@/lib/profilo/tipi';

interface ContestoProfilo {
  /** false finché il profilo non è stato letto (sul server e al primo render è sempre false). */
  pronto: boolean;
  profilo: Profilo | null;
  sessione: Sessione;
  dove: 'dispositivo' | 'account';
  aggiorna: (modifica: (profilo: Profilo) => Profilo) => void;
  registraQuiz: (esito: EsitoQuiz) => void;
  cancellaTutto: () => Promise<void>;
}

const Contesto = createContext<ContestoProfilo | null>(null);

/** Carica il profilo dall'archivio giusto (dispositivo o account) e lo tiene salvato a ogni modifica. */
export function ProfiloProvider({ children }: { children: React.ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [sessione, setSessione] = useState<Sessione>({ stato: 'ospite' });
  const daSalvare = useRef(false);

  const archivio = useMemo(
    () => (sessione.stato === 'autenticato' ? FORNITORE_ACCESSO.archivioAccount(sessione.utente) : archivioDispositivo),
    [sessione],
  );

  useEffect(() => {
    let attivo = true;
    (async () => {
      const iniziale = FORNITORE_ACCESSO.attivo ? await FORNITORE_ACCESSO.sessioneIniziale() : ({ stato: 'ospite' } as const);
      const origine = iniziale.stato === 'autenticato' ? FORNITORE_ACCESSO.archivioAccount(iniziale.utente) : archivioDispositivo;
      const letto = await origine.leggi();
      if (!attivo) return;
      setSessione(iniziale);
      setProfilo(letto);
      setPronto(true);
    })();
    return () => {
      attivo = false;
    };
  }, []);

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

  const valore = useMemo<ContestoProfilo>(
    () => ({ pronto, profilo, sessione, dove: archivio.dove, aggiorna, registraQuiz, cancellaTutto }),
    [pronto, profilo, sessione, archivio.dove, aggiorna, registraQuiz, cancellaTutto],
  );

  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useProfilo(): ContestoProfilo {
  const contesto = useContext(Contesto);
  if (!contesto) throw new Error('useProfilo va usato dentro ProfiloProvider');
  return contesto;
}

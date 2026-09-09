'use client';

import { useEffect, useState } from 'react';
import type { Agenzia, RispostaAgenzie } from '@/lib/agenzie/tipi';

export type { Agenzia, LancioAgenzia, RispostaAgenzie, StatoAgenzia } from '@/lib/agenzie/tipi';
export { AGENZIE, DESCRIZIONI_AGENZIE } from '@/lib/agenzie/tipi';
export { TESTI_AGENZIE } from '@/lib/agenzie/testi';

const VUOTA: RispostaAgenzie = { success: false, lanci: [], fonti: [], simulazione: false, timestamp: '' };
const richieste = new Map<string, Promise<RispostaAgenzie>>();

function richiestaCondivisa(url: string): Promise<RispostaAgenzie> {
  if (!richieste.has(url)) {
    richieste.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? (r.json() as Promise<RispostaAgenzie>) : VUOTA))
        .catch(() => VUOTA),
    );
  }
  return richieste.get(url)!;
}

/** Lanci d'agenzia dall'API interna; `agenzia` assente = tutte. */
export function useLanciAgenzie(agenzia?: Agenzia) {
  const [risposta, setRisposta] = useState<RispostaAgenzie>(VUOTA);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    let attivo = true;
    const url = agenzia ? `/api/agenzie?agenzia=${agenzia}` : '/api/agenzie';
    richiestaCondivisa(url).then((r) => {
      if (!attivo) return;
      setRisposta(r);
      setCaricamento(false);
    });
    return () => {
      attivo = false;
    };
  }, [agenzia]);

  return { ...risposta, caricamento };
}

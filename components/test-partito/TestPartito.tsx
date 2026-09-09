'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calcolaClassifica } from '@politicare/motore';
import type { Risposta, TestPartitoPack, Valore } from '@politicare/motore';
import SchermataIntro from './SchermataIntro';
import SchermataDomanda from './SchermataDomanda';
import SchermataRisultati from './SchermataRisultati';
import BarraProgresso from './BarraProgresso';

type Fase = 'intro' | 'quiz' | 'risultati';

interface StatoRisposta {
  valore: Valore | null;
  importante: boolean;
}

function chiaveStorage(packId: string) {
  return `politicare:test-partito:${packId}`;
}

/** Legge lo stato salvato in sessionStorage. Non tocca mai il server. */
function leggiStatoSalvato(packId: string): { risposte: Record<string, StatoRisposta>; indice: number } | null {
  try {
    const grezzo = sessionStorage.getItem(chiaveStorage(packId));
    return grezzo ? JSON.parse(grezzo) : null;
  } catch {
    return null;
  }
}

function salvaStato(packId: string, risposte: Record<string, StatoRisposta>, indice: number) {
  try {
    sessionStorage.setItem(chiaveStorage(packId), JSON.stringify({ risposte, indice }));
  } catch {
    // storage non disponibile: il test funziona comunque, solo senza resume
  }
}

function pulisciStato(packId: string) {
  try {
    sessionStorage.removeItem(chiaveStorage(packId));
  } catch {
    // ignorato
  }
}

export default function TestPartito({ pack }: { pack: TestPartitoPack }) {
  const [fase, setFase] = useState<Fase>('intro');
  const [indice, setIndice] = useState(0);
  const [risposte, setRisposte] = useState<Record<string, StatoRisposta>>({});

  // Ripristina un test in corso, se presente, così un reload accidentale non
  // costringe a ricominciare da capo. Resta comunque tutto locale al device.
  useEffect(() => {
    const salvato = leggiStatoSalvato(pack.id);
    if (salvato && Object.keys(salvato.risposte).length > 0) {
      // Lettura da sessionStorage dopo il mount: non può stare nell'inizializzatore
      // di useState perché il server renderizza sempre l'intro (idratazione coerente).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRisposte(salvato.risposte);
      setIndice(salvato.indice);
      setFase('quiz');
    }
  }, [pack.id]);

  useEffect(() => {
    if (fase === 'quiz') salvaStato(pack.id, risposte, indice);
  }, [fase, pack.id, risposte, indice]);

  const affermazioneCorrente = pack.affermazioni[indice];
  const ultima = indice === pack.affermazioni.length - 1;

  // Impedisce che due risposte ravvicinate (doppio tap, tasti premuti in
  // rapida successione) accodino più avanzamenti: senza questo guard, il
  // secondo "vaiAvanti" scatta quando l'indice è già cambiato e salta una
  // domanda senza registrarne la risposta.
  const avanzamentoInCorsoRef = useRef(false);
  const timeoutAvanzamentoRef = useRef<number | null>(null);

  useEffect(() => {
    avanzamentoInCorsoRef.current = false;
    return () => {
      if (timeoutAvanzamentoRef.current !== null) {
        window.clearTimeout(timeoutAvanzamentoRef.current);
      }
    };
  }, [indice]);

  const vaiAvanti = useCallback(() => {
    if (ultima) {
      setFase('risultati');
    } else {
      setIndice((i) => Math.min(i + 1, pack.affermazioni.length - 1));
    }
  }, [ultima, pack.affermazioni.length]);

  const rispondi = useCallback(
    (valore: Valore) => {
      if (avanzamentoInCorsoRef.current) return;
      avanzamentoInCorsoRef.current = true;

      const id = affermazioneCorrente.id;
      setRisposte((prev) => ({
        ...prev,
        [id]: { valore, importante: prev[id]?.importante ?? false },
      }));
      // piccolo respiro prima di avanzare: dà il tempo di vedere la selezione
      timeoutAvanzamentoRef.current = window.setTimeout(vaiAvanti, 220);
    },
    [affermazioneCorrente, vaiAvanti],
  );

  const salta = useCallback(() => {
    if (avanzamentoInCorsoRef.current) return;
    avanzamentoInCorsoRef.current = true;

    const id = affermazioneCorrente.id;
    setRisposte((prev) => ({ ...prev, [id]: { valore: null, importante: prev[id]?.importante ?? false } }));
    vaiAvanti();
  }, [affermazioneCorrente, vaiAvanti]);

  const toggleImportante = useCallback(() => {
    const id = affermazioneCorrente.id;
    setRisposte((prev) => ({
      ...prev,
      [id]: { valore: prev[id]?.valore ?? null, importante: !prev[id]?.importante },
    }));
  }, [affermazioneCorrente]);

  const indietro = useCallback(() => {
    setIndice((i) => Math.max(0, i - 1));
  }, []);

  const ricomincia = useCallback(() => {
    pulisciStato(pack.id);
    setRisposte({});
    setIndice(0);
    setFase('intro');
  }, [pack.id]);

  // scorciatoie da tastiera durante il quiz: 1-5 per rispondere, freccia sx per tornare indietro
  useEffect(() => {
    if (fase !== 'quiz') return;
    function onKeyDown(e: KeyboardEvent) {
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const valore = (Number(e.key) - 3) as Valore; // 1→-2 ... 5→+2
        rispondi(valore);
      } else if (e.key === 'ArrowLeft' && indice > 0) {
        indietro();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fase, indice, rispondi, indietro]);

  const classifica = useMemo(() => {
    if (fase !== 'risultati') return null;
    const listaRisposte: Risposta[] = pack.affermazioni.map((a) => ({
      affermazioneId: a.id,
      valore: risposte[a.id]?.valore ?? null,
      importante: risposte[a.id]?.importante ?? false,
    }));
    return { risultati: calcolaClassifica(listaRisposte, pack.partiti), listaRisposte };
  }, [fase, pack, risposte]);

  if (fase === 'intro') {
    return <SchermataIntro pack={pack} onInizia={() => setFase('quiz')} />;
  }

  if (fase === 'risultati' && classifica) {
    const risposteDate = classifica.listaRisposte.filter((r) => r.valore !== null).length;
    return (
      <SchermataRisultati
        pack={pack}
        classifica={classifica.risultati}
        numeroRisposte={risposteDate}
        numeroSaltate={pack.affermazioni.length - risposteDate}
        onRicomincia={ricomincia}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
      <BarraProgresso corrente={indice} totale={pack.affermazioni.length} />
      <div className="mt-6">
        <SchermataDomanda
          affermazione={affermazioneCorrente}
          valore={risposte[affermazioneCorrente.id]?.valore ?? null}
          importante={risposte[affermazioneCorrente.id]?.importante ?? false}
          puoTornareIndietro={indice > 0}
          onRispondi={rispondi}
          onSalta={salta}
          onToggleImportante={toggleImportante}
          onIndietro={indietro}
        />
      </div>
    </div>
  );
}

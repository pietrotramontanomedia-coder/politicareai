'use client';

import { useEffect, useState } from 'react';
import { formattaDataRelativa } from '@/lib/data-ora';
import { urlMedia } from '@/lib/redazione/client';
import { puoVedereCommenti, versioneCorrente } from '@/lib/redazione/regole';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { Contenuto, SessioneRedazione } from '@/lib/redazione/tipi';
import AnteprimaStoria from './AnteprimaStoria';
import { BadgeStato } from './Distintivi';
import Finestra from './Finestra';

const T = TESTI_REDAZIONE.storie;
const DURATA_MS = 6000;
const PASSO_MS = 100;

export interface GruppoStorie {
  autore: string;
  chiave: string;
  storie: Contenuto[];
}

/** Le storie a schermo intero, una persona dopo l'altra, come su Instagram. Frecce, spazio ed Esc da tastiera. */
export default function VisoreStorie({
  gruppi,
  iniziale,
  sessione,
  onApri,
  onChiudi,
}: {
  gruppi: GruppoStorie[];
  iniziale: number;
  sessione: SessioneRedazione;
  onApri: (c: Contenuto) => void;
  onChiudi: () => void;
}) {
  const [posizione, setPosizione] = useState({ g: iniziale, s: 0, trascorso: 0 });
  const [pausa, setPausa] = useState(false);
  const gruppo = gruppi[posizione.g];
  const storia = gruppo?.storie[posizione.s];

  function vai(verso: 1 | -1) {
    setPosizione(({ g, s }) => {
      const prossima = s + verso;
      if (prossima >= 0 && prossima < gruppi[g].storie.length) return { g, s: prossima, trascorso: 0 };
      const altroGruppo = g + verso;
      if (altroGruppo < 0) return { g, s: 0, trascorso: 0 };
      if (altroGruppo >= gruppi.length) return { g: gruppi.length, s: 0, trascorso: 0 };
      return { g: altroGruppo, s: verso === 1 ? 0 : gruppi[altroGruppo].storie.length - 1, trascorso: 0 };
    });
  }

  // Avanzamento automatico, fermo in pausa.
  useEffect(() => {
    if (pausa) return;
    const t = window.setInterval(() => {
      setPosizione((p) => {
        if (p.trascorso + PASSO_MS < DURATA_MS) return { ...p, trascorso: p.trascorso + PASSO_MS };
        const prossima = p.s + 1;
        if (prossima < (gruppi[p.g]?.storie.length ?? 0)) return { g: p.g, s: prossima, trascorso: 0 };
        return { g: p.g + 1, s: 0, trascorso: 0 };
      });
    }, PASSO_MS);
    return () => window.clearInterval(t);
  }, [pausa, gruppi]);

  // Finite tutte le storie si chiude.
  const finite = posizione.g >= gruppi.length;
  useEffect(() => {
    if (finite) onChiudi();
  }, [finite, onChiudi]);

  useEffect(() => {
    function tasto(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') vai(1);
      else if (e.key === 'ArrowLeft') vai(-1);
      else if (e.key === ' ' && (e.target as HTMLElement).tagName !== 'BUTTON') {
        e.preventDefault();
        setPausa((p) => !p);
      }
    }
    document.addEventListener('keydown', tasto);
    return () => document.removeEventListener('keydown', tasto);
  });

  if (!gruppo || !storia) return null;
  const versione = versioneCorrente(storia);

  return (
    <Finestra titolo={T.di(gruppo.autore, gruppo.storie.length)} onChiudi={onChiudi} scura>
      <div className="relative mx-auto flex h-dvh w-full max-w-[min(100%,calc(92dvh*9/16))] flex-col justify-center sm:h-auto">
        <div className="relative">
          {versione.storia && (
            <AnteprimaStoria
              storia={versione.storia}
              immagine={versione.immagini[0] ? urlMedia(versione.immagini[0]) : null}
              autore={gruppo.autore}
              quando={formattaDataRelativa(versione.inviataIl)}
              className="w-full"
              sopra={
                <div className="flex gap-1" aria-hidden>
                  {gruppo.storie.map((s, i) => (
                    <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }}>
                      <span
                        className="block h-full bg-white"
                        style={{ width: i < posizione.s ? '100%' : i === posizione.s ? `${(posizione.trascorso / DURATA_MS) * 100}%` : '0%', transition: 'none' }}
                      />
                    </span>
                  ))}
                </div>
              }
            />
          )}
          {/* Metà sinistra e destra della storia per andare indietro e avanti, come nell'app. */}
          <button type="button" onClick={() => vai(-1)} className="absolute inset-y-0 left-0 w-1/3" aria-label={T.precedente} />
          <button type="button" onClick={() => vai(1)} className="absolute inset-y-0 right-0 w-2/3" aria-label={T.successiva} />
        </div>

        <div className="flex items-center gap-2 px-3 py-3">
          <button type="button" onClick={onChiudi} data-autofocus className="rounded-full px-3 py-1.5 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>
            {T.chiudi}
          </button>
          <button type="button" onClick={() => setPausa((p) => !p)} aria-pressed={pausa} className="rounded-full px-3 py-1.5 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>
            {pausa ? T.riprendi : T.pausa}
          </button>
          {puoVedereCommenti(sessione, storia) && (
            <>
              <span className="ml-auto">
                <BadgeStato stato={storia.stato} piccola />
              </span>
              <button type="button" onClick={() => onApri(storia)} className="rounded-full px-3 py-1.5 text-sm font-bold" style={{ background: 'var(--accento)', color: '#0a0a0a' }}>
                {T.apri}
              </button>
            </>
          )}
        </div>
      </div>
    </Finestra>
  );
}

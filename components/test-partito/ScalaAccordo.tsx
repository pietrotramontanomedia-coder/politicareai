'use client';

import type { Valore } from '@politicare/motore';

const OPZIONI: Array<{ valore: Valore; label: string; colore: string }> = [
  { valore: -2, label: 'Molto contrario', colore: 'var(--color-scala-1)' },
  { valore: -1, label: 'Contrario', colore: 'var(--color-scala-2)' },
  { valore: 0, label: 'Neutro', colore: 'var(--color-scala-3)' },
  { valore: 1, label: 'Favorevole', colore: 'var(--color-scala-4)' },
  { valore: 2, label: 'Molto favorevole', colore: 'var(--color-scala-5)' },
];

interface Props {
  valoreSelezionato: Valore | null;
  onSeleziona: (valore: Valore) => void;
}

export default function ScalaAccordo({ valoreSelezionato, onSeleziona }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Quanto sei d'accordo"
      className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-3"
    >
      {OPZIONI.map((opzione, indice) => {
        const selezionata = valoreSelezionato === opzione.valore;
        return (
          <button
            key={opzione.valore}
            type="button"
            role="radio"
            aria-checked={selezionata}
            onClick={() => onSeleziona(opzione.valore)}
            className="flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-transform hover:scale-[1.03] active:scale-[0.97]"
            style={{
              borderColor: selezionata ? opzione.colore : 'var(--bordo)',
              borderWidth: selezionata ? 2 : 1,
              background: selezionata ? opzione.colore + '22' : 'var(--bg-card)',
            }}
          >
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: opzione.colore, color: '#fff' }}
            >
              {indice + 1}
            </span>
            <span className="text-sm font-medium text-balance">{opzione.label}</span>
          </button>
        );
      })}
    </div>
  );
}

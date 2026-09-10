'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Classifica, TestPartitoPack } from '@politicare/motore';
import { creaRisultatoTest, salvaRisultatoTest } from '@/lib/profilo/risultato-test-locale';
import { TESTI_PROFILO as T } from '@/lib/profilo/testi';

/** Salvataggio esplicito, solo sul dispositivo, della classifica del test (mai sul server né sull'account). */
export default function SalvaRisultatoTest({ pack, classifica, numeroRisposte }: { pack: TestPartitoPack; classifica: Classifica; numeroRisposte: number }) {
  const [salvato, setSalvato] = useState(false);

  return (
    <div
      className="mt-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'var(--bg-card)' }}
    >
      <div>
        <p className="flex items-center gap-2 font-semibold">
          <span aria-hidden>🔒</span>
          {T.salvataggio.testTitolo}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
          {T.salvataggio.testTesto}
        </p>
      </div>
      {salvato ? (
        <span className="flex items-center gap-3 text-sm font-semibold" aria-live="polite">
          <span style={{ color: '#22c55e' }}>✓ {T.salvataggio.testSalvato}</span>
          <Link href="/profilo" className="underline underline-offset-2" style={{ color: 'var(--accento)' }}>
            {T.salvataggio.vediProfilo}
          </Link>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setSalvato(salvaRisultatoTest(creaRisultatoTest(pack, classifica, numeroRisposte)))}
          className="inline-flex shrink-0 items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--accento)]"
          style={{ borderColor: 'rgba(255,255,255,0.16)' }}
        >
          {T.salvataggio.testPulsante}
        </button>
      )}
    </div>
  );
}

import { obiettiviDiOggi, percentuale } from '@/lib/redazione/regole';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { Obiettivi, StatistichePersona } from '@/lib/redazione/tipi';

const T = TESTI_REDAZIONE.andamento;

function Barra({ etichetta, fatti, obiettivo }: { etichetta: string; fatti: number; obiettivo: number }) {
  const pieno = obiettivo === 0 || fatti >= obiettivo;
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold">{etichetta}</span>
        <span style={{ color: pieno ? '#22C55E' : 'var(--fg-muta)' }}>
          {fatti}/{obiettivo}
          {pieno && ' ✓'}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)' }}
        role="progressbar"
        aria-label={etichetta}
        aria-valuemin={0}
        aria-valuemax={obiettivo}
        aria-valuenow={Math.min(fatti, obiettivo)}
      >
        <div className="h-full rounded-full" style={{ width: `${obiettivo === 0 ? 100 : Math.min(100, (fatti / obiettivo) * 100)}%`, background: pieno ? '#22C55E' : 'var(--accento)' }} />
      </div>
    </div>
  );
}

/** Obiettivi di oggi e percentuali di una persona: approvati, da correggere, eliminati. */
export default function Andamento({ persona, obiettivi, conPercentuali = true }: { persona: StatistichePersona | undefined; obiettivi: Obiettivi; conPercentuali?: boolean }) {
  const p = persona;
  const oggi = obiettiviDiOggi(obiettivi, new Date());
  const totale = p?.totale ?? 0;
  const voci = [
    { etichetta: T.approvati, valore: p?.approvati ?? 0, colore: TESTI_REDAZIONE.coloreStato.approvato },
    { etichetta: T.daCorreggere, valore: p?.daCorreggere ?? 0, colore: TESTI_REDAZIONE.coloreStato.da_correggere },
    { etichetta: T.nonVaBene, valore: p?.nonVaBene ?? 0, colore: TESTI_REDAZIONE.coloreStato.non_va_bene },
    { etichetta: T.eliminati, valore: p?.eliminati ?? 0, colore: '#F87171' },
  ];
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--bordo)' }}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muta)' }}>
        {oggi.weekend ? T.weekend : T.oggi}
      </p>
      <div className="flex gap-4">
        <Barra etichetta={T.storie} fatti={p?.storieOggi ?? 0} obiettivo={oggi.storie} />
        <Barra etichetta={T.post} fatti={p?.postOggi ?? 0} obiettivo={oggi.post} />
      </div>
      {conPercentuali && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {voci.map((v) => (
              <div key={v.etichetta} className="rounded-xl py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="text-lg font-bold" style={{ color: v.valore ? v.colore : undefined }}>
                  {percentuale(v.valore, totale)}%
                </div>
                <div className="text-[11px]" style={{ color: 'var(--fg-muta)' }}>
                  {v.etichetta} · {v.valore}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--fg-muta)' }}>
            {T.base(totale)}
          </p>
        </>
      )}
    </div>
  );
}

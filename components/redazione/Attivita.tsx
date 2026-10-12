'use client';

import { useMemo, useState } from 'react';
import Avatar from '@/components/profilo/Avatar';
import { formattaOra } from '@/lib/data-ora';
import { coloreDaNome, urlMedia } from '@/lib/redazione/client';
import { chiaveNome, giornoRoma, versioneCorrente } from '@/lib/redazione/regole';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { Contenuto, VoceAttivita } from '@/lib/redazione/tipi';

const T = TESTI_REDAZIONE.attivita;
const PAGINA = 150;

function giornoEsteso(giorno: string): string {
  return new Date(`${giorno}T12:00:00Z`).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long' });
}

/** La cronologia di chi coordina: ogni cosa successa in redazione, divisa per giorno. */
export default function Attivita({
  voci,
  contenuti,
  persone,
  filtroIniziale = null,
  conFiltro = true,
  onApri,
}: {
  voci: VoceAttivita[];
  contenuti: Contenuto[];
  /** Nomi per il filtro: [chiave, nome]. */
  persone: [string, string][];
  filtroIniziale?: string | null;
  conFiltro?: boolean;
  onApri: (id: string) => void;
}) {
  const [filtro, setFiltro] = useState<string | null>(filtroIniziale);
  const [quante, setQuante] = useState(PAGINA);
  const perId = useMemo(() => new Map(contenuti.map((c) => [c.id, c])), [contenuti]);
  // Il filtro per persona mostra quello che ha fatto lei e quello che è successo ai suoi contenuti.
  const filtrate = filtro ? voci.filter((v) => v.chiaveAutore === filtro || chiaveNome(v.chi) === filtro) : voci;
  const mostrate = filtrate.slice(0, quante);

  const giorni: { giorno: string; voci: VoceAttivita[] }[] = [];
  for (const v of mostrate) {
    const g = giornoRoma(v.quando);
    if (giorni.at(-1)?.giorno !== g) giorni.push({ giorno: g, voci: [] });
    giorni.at(-1)!.voci.push(v);
  }

  return (
    <div>
      {conFiltro && (
        <label className="mb-4 flex items-center gap-2 text-sm">
          <span style={{ color: 'var(--fg-muta)' }}>{T.filtro}</span>
          <select
            value={filtro ?? ''}
            onChange={(e) => setFiltro(e.target.value || null)}
            className="rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--bordo)', background: 'var(--bg)', color: 'var(--fg)' }}
          >
            <option value="">{T.tutti}</option>
            {persone.map(([chiave, nome]) => (
              <option key={chiave} value={chiave}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      )}
      {giorni.length === 0 && (
        <p className="py-8 text-center" style={{ color: 'var(--fg-muta)' }}>
          {T.vuota}
        </p>
      )}
      {giorni.map(({ giorno, voci: delGiorno }) => (
        <section key={giorno} className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muta)' }}>
            {giornoEsteso(giorno)}
          </h3>
          <ol className="divide-y rounded-2xl border" style={{ borderColor: 'var(--bordo)' }}>
            {delGiorno.map((v, i) => {
              const c = perId.get(v.contenutoId);
              const immagine = c ? versioneCorrente(c).immagini[0] : undefined;
              const colore = v.tipo === 'stato' && v.stato ? TESTI_REDAZIONE.coloreStato[v.stato] : v.tipo === 'commento' && v.tipoCommento ? TESTI_REDAZIONE.coloreCommento[v.tipoCommento] : undefined;
              return (
                <li key={`${v.contenutoId}-${v.quando}-${i}`} style={{ borderColor: 'var(--bordo)' }}>
                  <button type="button" onClick={() => onApri(v.contenutoId)} className="flex w-full items-start gap-3 p-3 text-left hover:bg-white/5">
                    <Avatar nome={v.chi} colore={coloreDaNome(chiaveNome(v.chi))} className="mt-0.5 h-8 w-8 shrink-0 text-[10px]" />
                    <span className="min-w-0 flex-1 text-sm">
                      <strong>{v.chi}</strong>{' '}
                      <span style={{ color: colore }}>{T.frase(v, TESTI_REDAZIONE.stato, TESTI_REDAZIONE.tipoCommento)}</span>
                      {v.testo && (
                        <span className="mt-1 block whitespace-pre-line break-words rounded-lg px-2 py-1 text-[13px]" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          {v.testo}
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs" style={{ color: 'var(--fg-muta)' }}>
                        {formattaOra(v.quando)}
                      </span>
                    </span>
                    {immagine && (
                      // eslint-disable-next-line @next/next/no-img-element -- foto private servite dalle API del portale
                      <img src={urlMedia(immagine)} alt="" loading="lazy" className="h-14 w-11 shrink-0 rounded-md object-cover" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {filtrate.length > quante && (
        <button type="button" onClick={() => setQuante(quante + PAGINA)} className="w-full rounded-full py-2 text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {T.altre}
        </button>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Avatar from '@/components/profilo/Avatar';
import { coloreDaNome } from '@/lib/redazione/client';
import { chiaveNome } from '@/lib/redazione/regole';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { FormatoPost } from '@/lib/redazione/tipi';

const T = TESTI_REDAZIONE.feed;

/** Hashtag e menzioni in evidenza, come nell'app. */
export function TestoSocial({ testo }: { testo: string }) {
  const parti = testo.split(/([#@][\p{L}\p{N}_.]+)/gu);
  return (
    <>
      {parti.map((p, i) =>
        /^[#@]/.test(p) ? (
          <span key={i} style={{ color: '#93C5FD' }}>
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

function Icona({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Un post come appare nel feed di Instagram: intestazione, carosello, azioni, didascalia. */
export default function AnteprimaPost({
  autore,
  immagini,
  didascalia,
  formato,
  extraIntestazione,
  piede,
}: {
  autore: string;
  immagini: string[];
  didascalia: string;
  formato: FormatoPost;
  extraIntestazione?: React.ReactNode;
  piede?: React.ReactNode;
}) {
  const [indice, setIndice] = useState(0);
  const [aperta, setAperta] = useState(false);
  const corrente = Math.min(indice, Math.max(0, immagini.length - 1));
  const lunga = didascalia.length > 125 || didascalia.split('\n').length > 2;

  return (
    <article className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}>
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Avatar nome={autore} colore={coloreDaNome(chiaveNome(autore))} className="h-8 w-8 text-xs" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{autore}</span>
        {extraIntestazione}
      </header>

      <div className="relative w-full bg-black" style={{ aspectRatio: formato === '1:1' ? '1 / 1' : '4 / 5' }}>
        {immagini.length > 0 && (
          // eslint-disable-next-line @next/next/no-img-element -- foto private servite dalle API del portale
          <img src={immagini[corrente]} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {immagini.length > 1 && (
          <>
            <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.6)' }}>
              {corrente + 1}/{immagini.length}
            </span>
            {corrente > 0 && (
              <button
                type="button"
                onClick={() => setIndice(corrente - 1)}
                className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-black"
                style={{ background: 'rgba(255,255,255,0.85)' }}
                aria-label="Foto precedente"
              >
                ‹
              </button>
            )}
            {corrente < immagini.length - 1 && (
              <button
                type="button"
                onClick={() => setIndice(corrente + 1)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-black"
                style={{ background: 'rgba(255,255,255,0.85)' }}
                aria-label="Foto successiva"
              >
                ›
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-4 px-3 pt-3" aria-hidden>
        <Icona d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        <Icona d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        <Icona d="M22 3 11 13M22 3l-7 19-4-9-9-4 20-6z" />
        {immagini.length > 1 && (
          <span className="flex flex-1 justify-center gap-1">
            {immagini.map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i === corrente ? '#60A5FA' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </span>
        )}
        <span className="ml-auto">
          <Icona d="M6 3h12v18l-6-4-6 4z" />
        </span>
      </div>

      {didascalia && (
        <div className="px-3 pt-2 text-sm leading-relaxed">
          <p className={`whitespace-pre-line break-words ${aperta || !lunga ? '' : 'line-clamp-2'}`}>
            <span className="mr-1.5 font-semibold">{autore}</span>
            <TestoSocial testo={didascalia} />
          </p>
          {lunga && !aperta && (
            <button type="button" onClick={() => setAperta(true)} className="text-sm" style={{ color: 'var(--fg-muta)', opacity: 0.7 }}>
              {T.altro}
            </button>
          )}
        </div>
      )}
      <div className="px-3 pb-3 pt-2">{piede}</div>
    </article>
  );
}

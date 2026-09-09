'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Autore, SocialAutore } from '@/app/api/articolo/route';

const ICONE: Record<SocialAutore['tipo'], string> = {
  email: '✉',
  sito: '🌐',
  instagram: '◎',
  x: '𝕏',
  linkedin: 'in',
  facebook: 'f',
  link: '↗',
};

function iniziali(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function Avatar({ autore }: { autore: Autore }) {
  const [errore, setErrore] = useState(false);
  const mostraImmagine = Boolean(autore.avatar) && !errore;

  return (
    <div
      className="shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden flex items-center justify-center font-bold text-lg"
      style={{
        background: mostraImmagine ? 'var(--bordo)' : 'rgba(255,221,0,0.12)',
        color: 'var(--accento)',
        border: '2px solid var(--accento)',
      }}
    >
      {mostraImmagine ? (
        <img
          src={autore.avatar}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setErrore(true)}
        />
      ) : (
        <span aria-hidden>{iniziali(autore.nome)}</span>
      )}
    </div>
  );
}

export default function BoxAutore({ autore }: { autore: Autore }) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4 }}
      aria-label={`Autore: ${autore.nome}`}
      className="mt-12 rounded-2xl border p-5 sm:p-6 flex gap-4 sm:gap-5 items-start"
      style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
    >
      <Avatar autore={autore} />

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--accento)' }}>
          Scritto da
        </p>
        <h3 className="text-lg sm:text-xl font-bold leading-tight">{autore.nome}</h3>

        {autore.bio && (
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
            {autore.bio}
          </p>
        )}

        {autore.social.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {autore.social.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target={s.tipo === 'email' ? undefined : '_blank'}
                  rel={s.tipo === 'email' ? undefined : 'noopener noreferrer'}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[rgba(255,221,0,0.12)]"
                  style={{ border: '1px solid var(--bordo)', color: 'var(--fg)' }}
                >
                  <span aria-hidden style={{ color: 'var(--accento)' }}>{ICONE[s.tipo]}</span>
                  {s.etichetta}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.aside>
  );
}

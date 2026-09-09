'use client';

import { motion } from 'framer-motion';
import { useInstagram, type PostInstagram } from '@/lib/instagram';

const PROFILO = 'https://www.instagram.com/politicareit/';
const LIMITE = 6;

function IconaTipo({ tipo }: { tipo: PostInstagram['tipo'] }) {
  if (tipo === 'IMAGE') return null;
  return (
    <span
      className="absolute top-2 right-2 rounded-full p-1.5 text-xs"
      style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
      aria-label={tipo === 'VIDEO' ? 'Video' : 'Carosello'}
    >
      {tipo === 'VIDEO' ? '▶' : '⧉'}
    </span>
  );
}

export default function InstagramFeed() {
  const { post: tutti } = useInstagram();
  const post = tutti.slice(0, LIMITE);

  if (post.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
      className="mt-16"
    >
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Dal nostro Instagram</h2>
          <a
            href={PROFILO}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm hover:underline"
            style={{ color: 'var(--fg-muta)' }}
          >
            @politicareit
          </a>
        </div>
        <a
          href={PROFILO}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--accento)', color: '#000' }}
        >
          Seguici
        </a>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {post.map((p, idx) => (
          <motion.a
            key={p.id}
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.03 }}
            className="group relative aspect-square overflow-hidden rounded-xl border"
            style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
            title={p.titolo}
          >
            <img
              src={p.immagine}
              alt={p.titolo || 'Post Instagram di Politicare'}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <IconaTipo tipo={p.tipo} />
            <div
              className="absolute inset-x-0 bottom-0 p-2 text-[11px] leading-snug line-clamp-2 opacity-0 transition-opacity group-hover:opacity-100"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', color: '#fff' }}
            >
              {p.titolo}
            </div>
          </motion.a>
        ))}
      </div>
    </motion.section>
  );
}

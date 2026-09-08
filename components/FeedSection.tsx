'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface FeedArticle {
  id: string;
  titolo: string;
  descrizione: string;
  immagine?: string;
  link: string;
  data?: string;
}

export default function FeedSection() {
  const [articoli, setArticoli] = useState<FeedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await fetch('/api/feed');
        const data = await response.json();
        setArticoli(data.articoli || []);
      } catch (error) {
        console.error('Feed fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  if (loading) {
    return (
      <div className="mt-24 py-12 text-center" style={{ color: 'var(--fg-muta)' }}>
        <p>📰 Caricamento articoli da Politicare...</p>
      </div>
    );
  }

  if (articoli.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="mt-24 py-12"
    >
      {/* Header */}
      <div className="mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold">Ultimi Articoli</h2>
        <p className="mt-2 text-base" style={{ color: 'var(--fg-muta)' }}>
          {articoli.length} articoli dalle principali notizie politiche italiane
        </p>
      </div>

      {/* Masonry Grid - Mobile Friendly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {articoli.map((articolo, idx) => (
          <motion.a
            key={articolo.id}
            href={articolo.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (idx % 8) * 0.05 }}
            className="group relative overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:scale-[1.05] flex flex-col h-full"
            style={{
              borderColor: 'var(--bordo)',
              background: 'var(--bg-card)',
            }}
          >
            {/* Immagine con overlay */}
            {articolo.immagine ? (
              <div className="relative h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                <img
                  src={articolo.immagine}
                  alt={articolo.titolo}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-125"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-100 group-hover:opacity-90 transition-opacity duration-300" />
              </div>
            ) : (
              <div className="relative h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-4xl">
                📰
              </div>
            )}

            {/* Contenuto */}
            <div className="flex flex-col flex-1 p-4 sm:p-5">
              {articolo.data && (
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--accento)' }}>
                  {articolo.data}
                </p>
              )}

              <h3 className="mt-2 sm:mt-3 text-sm sm:text-base font-bold leading-snug line-clamp-3 group-hover:underline">
                {articolo.titolo}
              </h3>

              <p className="mt-2 text-xs sm:text-sm leading-relaxed line-clamp-2 flex-1" style={{ color: 'var(--fg-muta)' }}>
                {articolo.descrizione}
              </p>

              {/* CTA */}
              <div className="mt-auto pt-3 flex items-center gap-1 text-xs sm:text-sm font-semibold transition-all"
                style={{ color: 'var(--accento)' }}>
                <span>Leggi</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Load More */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <button
          className="px-8 py-3 rounded-full font-bold text-sm sm:text-base transition-all hover:shadow-lg active:scale-95"
          style={{ background: 'var(--accento)', color: '#000' }}
        >
          Carica altri articoli →
        </button>
      </motion.div>
    </motion.section>
  );
}

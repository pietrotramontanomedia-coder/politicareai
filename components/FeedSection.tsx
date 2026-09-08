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
      <div className="mt-24 text-center" style={{ color: 'var(--fg-muta)' }}>
        Caricamento news...
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
      <div className="mb-12">
        <h2 className="text-4xl font-bold">Ultimi Articoli</h2>
        <p className="mt-2" style={{ color: 'var(--fg-muta)' }}>
          Le notizie politiche più importanti della settimana
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articoli.map((articolo, idx) => (
          <motion.a
            key={articolo.id}
            href={articolo.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group flex flex-col h-full overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
            style={{
              borderColor: 'var(--bordo)',
              background: 'var(--bg-card)',
            }}
          >
            {/* Immagine con overlay */}
            {articolo.immagine && (
              <div className="relative h-56 md:h-64 overflow-hidden bg-gray-900">
                <img
                  src={articolo.immagine}
                  alt={articolo.titolo}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* Overlay gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            )}

            {/* Contenuto */}
            <div className="flex flex-col flex-1 p-6">
              {articolo.data && (
                <p className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
                  {articolo.data}
                </p>
              )}

              <h3 className="mt-3 text-xl font-bold leading-tight line-clamp-3 group-hover:underline">
                {articolo.titolo}
              </h3>

              <p className="mt-3 text-sm leading-relaxed line-clamp-3 flex-1" style={{ color: 'var(--fg-muta)' }}>
                {articolo.descrizione}
              </p>

              {/* CTA */}
              <div className="mt-6 pt-4 border-t flex items-center gap-2 text-sm font-semibold"
                style={{ borderColor: 'var(--bordo)', color: 'var(--accento)' }}>
                Leggi l'articolo
                <span className="transition-transform duration-300 group-hover:translate-x-2">→</span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </motion.section>
  );
}

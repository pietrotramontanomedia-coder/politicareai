'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
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
      <div className="mt-20 text-center" style={{ color: 'var(--fg-muta)' }}>
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
      className="mt-20"
    >
      <h2 className="text-3xl font-bold mb-8">Ultimi Articoli</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articoli.map((articolo, idx) => (
          <motion.a
            key={articolo.id}
            href={articolo.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-lg border transition-all hover:shadow-lg"
            style={{
              borderColor: 'var(--bordo)',
              background: 'var(--bg-card)',
            }}
          >
            {articolo.immagine && (
              <div className="relative h-48 overflow-hidden bg-gray-900">
                <img
                  src={articolo.immagine}
                  alt={articolo.titolo}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
            )}

            <div className="p-5">
              {articolo.data && (
                <p className="text-xs" style={{ color: 'var(--fg-muta)' }}>
                  {articolo.data}
                </p>
              )}
              <h3 className="mt-2 font-bold line-clamp-3 group-hover:underline" style={{ color: 'var(--accento)' }}>
                {articolo.titolo}
              </h3>
              <p className="mt-2 text-sm line-clamp-2" style={{ color: 'var(--fg-muta)' }}>
                {articolo.descrizione}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--accento)' }}>
                Leggi <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </motion.section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import NewsCarousel from './NewsCarousel';
import ArticoliWidget from './ArticoliWidget';
import AgenziaStampa from './AgenziaStampa';
import FeedSkeleton from './FeedSkeleton';

interface FeedArticle {
  id: string;
  slug: string;
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

  const inEvidenza = articoli.slice(0, 5);
  const resto = articoli.slice(5);

  return (
    <>
      {(loading || articoli.length > 0) && (
        <section className="banda banda-notizie px-4 sm:px-6 py-14">
          <div className="mx-auto max-w-6xl w-full">
            {loading ? (
              <FeedSkeleton />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-8">
                  <span className="occhiello">Dal sito</span>
                  <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Ultimi Articoli</h2>
                  <p className="mt-2 text-base" style={{ color: 'var(--fg-muta)' }}>
                    {articoli.length} articoli dalle principali notizie politiche italiane
                  </p>
                </div>

                <div className="mb-12">
                  <NewsCarousel articoli={inEvidenza} />
                </div>

                <ArticoliWidget articoli={resto} />
              </motion.div>
            )}
          </div>
        </section>
      )}

      <section className="banda banda-live px-4 sm:px-6 py-14">
        <div className="mx-auto max-w-6xl w-full">
          <AgenziaStampa />
        </div>
      </section>
    </>
  );
}

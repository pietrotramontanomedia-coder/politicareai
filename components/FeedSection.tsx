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

  if (loading) {
    return <FeedSkeleton />;
  }

  if (articoli.length === 0) {
    return null;
  }

  const inEvidenza = articoli.slice(0, 5);
  const resto = articoli.slice(5);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="mt-24 py-12"
    >
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold">Ultimi Articoli</h2>
        <p className="mt-2 text-base" style={{ color: 'var(--fg-muta)' }}>
          {articoli.length} articoli dalle principali notizie politiche italiane
        </p>
      </div>

      {/* Hero Carousel */}
      <div className="mb-12">
        <NewsCarousel articoli={inEvidenza} />
      </div>

      {/* Widget articoli a rotazione */}
      <div className="mb-16">
        <ArticoliWidget articoli={resto} />
      </div>

      {/* Agenzia stampa - flusso ultim'ora */}
      <AgenziaStampa articoli={articoli} />
    </motion.section>
  );
}

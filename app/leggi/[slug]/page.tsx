'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { slugToUrl } from '@/lib/slug';

interface ArticoloCompleto {
  titolo: string;
  immagine?: string;
  data?: string;
  autore?: string;
  contenuto: string[];
  link: string;
}

export default function LeggiArticoloPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [articolo, setArticolo] = useState<ArticoloCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(false);
  const [urlOriginale, setUrlOriginale] = useState('');

  useEffect(() => {
    let url = '';
    try {
      url = slugToUrl(slug);
      setUrlOriginale(url);
    } catch {
      setErrore(true);
      setLoading(false);
      return;
    }

    fetch(`/api/articolo?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setArticolo(data.articolo);
        } else {
          setErrore(true);
        }
      })
      .catch(() => setErrore(true))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <main className="min-h-dvh px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--fg-muta)' }}
        >
          <span>←</span> Indietro
        </button>

        {loading && (
          <div className="py-24 text-center" style={{ color: 'var(--fg-muta)' }}>
            <p>📰 Caricamento articolo...</p>
          </div>
        )}

        {errore && !loading && (
          <div className="py-24 text-center">
            <p className="text-lg font-bold mb-2">Impossibile caricare l&apos;articolo</p>
            <p className="mb-6" style={{ color: 'var(--fg-muta)' }}>
              Il contenuto non è disponibile in questo momento.
            </p>
            {urlOriginale && (
              <a
                href={urlOriginale}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold"
                style={{ background: 'var(--accento)', color: '#000' }}
              >
                Apri su politicare.it →
              </a>
            )}
          </div>
        )}

        {articolo && !loading && (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {articolo.data && (
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--accento)' }}>
                {articolo.data}
              </p>
            )}

            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-6">
              {articolo.titolo}
            </h1>

            {articolo.autore && (
              <p className="text-sm mb-6" style={{ color: 'var(--fg-muta)' }}>
                di {articolo.autore}
              </p>
            )}

            {articolo.immagine && (
              <div className="mb-8 rounded-2xl overflow-hidden">
                <img src={articolo.immagine} alt={articolo.titolo} className="w-full h-auto" />
              </div>
            )}

            <div className="space-y-4 text-base leading-relaxed">
              {articolo.contenuto.map((paragrafo, idx) => (
                <p key={idx}>{paragrafo}</p>
              ))}
            </div>

            <div className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--bordo)' }}>
              <a
                href={articolo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium underline"
                style={{ color: 'var(--accento)' }}
              >
                Vedi articolo originale su politicare.it →
              </a>
            </div>
          </motion.article>
        )}
      </div>
    </main>
  );
}

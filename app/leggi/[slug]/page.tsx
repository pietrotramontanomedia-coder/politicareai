'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { slugToUrl } from '@/lib/slug';
import ArticoloSkeleton from '@/components/ArticoloSkeleton';

interface BloccoContenuto {
  tipo: 'titolo' | 'paragrafo' | 'lista';
  testo: string;
  voci?: string[];
}

interface ArticoloCompleto {
  titolo: string;
  immagine?: string;
  data?: string;
  autore?: string;
  contenuto: BloccoContenuto[];
  link: string;
}

const OCRA = '#BF9000';

const SIGLE_PARTITI =
  'FdI|Fratelli d’Italia|Pd|Partito Democratico|M5S|Movimento 5 Stelle|Lega|Forza Italia|Azione|Iv|Italia Viva|Avs|Alleanza Verdi e Sinistra|Noi Moderati|Terzo Polo';

// Evidenzia in grassetto ocra i dati salienti del testo: numeri/percentuali/orari,
// citazioni dirette fra virgolette e sigle di partiti - per dare risalto visivo
// senza dover marcare a mano il contenuto scrapato.
function evidenziaDati(testo: string): React.ReactNode[] {
  const pattern = new RegExp(
    `\\d+([.,]\\d+)?\\s?%|\\d{1,2}:\\d{2}|\\b\\d+\\s?(milion[ei]|miliard[oi]|ann[oi]|vot[oi]|euro)\\b` +
      `|[«"“][^»"”]{4,80}[»"”]` +
      `|\\b(${SIGLE_PARTITI})\\b`,
    'gi',
  );
  const nodi: React.ReactNode[] = [];
  let ultimoIndice = 0;
  let match: RegExpExecArray | null;
  let chiave = 0;

  while ((match = pattern.exec(testo)) !== null) {
    if (match.index > ultimoIndice) {
      nodi.push(testo.slice(ultimoIndice, match.index));
    }
    nodi.push(
      <strong key={chiave++} style={{ color: OCRA, fontWeight: 700 }}>
        {match[0]}
      </strong>,
    );
    ultimoIndice = match.index + match[0].length;
    if (match.index === pattern.lastIndex) pattern.lastIndex++;
  }

  if (ultimoIndice < testo.length) {
    nodi.push(testo.slice(ultimoIndice));
  }

  return nodi;
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

  const numParagrafo = { i: 0 };

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

        {loading && <ArticoloSkeleton />}

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
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: OCRA }}
                />
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: OCRA }}>
                  {articolo.data}
                </p>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-6 tracking-tight">
              {articolo.titolo}
            </h1>

            {articolo.autore && (
              <p className="text-sm mb-6 font-medium" style={{ color: 'var(--fg-muta)' }}>
                di <span style={{ color: 'var(--fg)' }}>{articolo.autore}</span>
              </p>
            )}

            {articolo.immagine && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-8 rounded-2xl overflow-hidden shadow-2xl"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
              >
                <img src={articolo.immagine} alt={articolo.titolo} className="w-full h-auto" />
              </motion.div>
            )}

            <div className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--fg)' }}>
              {articolo.contenuto.map((blocco, idx) => {
                if (blocco.tipo === 'titolo') {
                  return (
                    <motion.h2
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.4 }}
                      className="text-xl sm:text-2xl font-bold mt-10 mb-4 pl-4 border-l-4"
                      style={{ borderColor: OCRA, color: OCRA }}
                    >
                      {blocco.testo}
                    </motion.h2>
                  );
                }

                if (blocco.tipo === 'lista') {
                  return (
                    <motion.ul
                      key={idx}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true, margin: '-50px' }}
                      className="my-5 space-y-3 rounded-xl p-5"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--bordo)' }}
                    >
                      {blocco.voci?.map((voce, vIdx) => (
                        <li key={vIdx} className="flex gap-3 items-start">
                          <span
                            className="mt-2 h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ background: 'var(--accento)' }}
                          />
                          <span>{voce}</span>
                        </li>
                      ))}
                    </motion.ul>
                  );
                }

                numParagrafo.i += 1;
                const isLead = numParagrafo.i === 1;

                return (
                  <motion.p
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.35 }}
                    className={isLead ? 'mb-5 font-semibold text-lg sm:text-xl leading-snug' : 'mb-5'}
                    style={isLead ? { color: 'var(--fg)' } : { color: 'var(--fg-muta)' }}
                  >
                    {evidenziaDati(blocco.testo)}
                  </motion.p>
                );
              })}
            </div>

            <div className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--bordo)' }}>
              <a
                href={articolo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold"
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

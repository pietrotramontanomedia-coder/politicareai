'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { Formato } from '@/lib/condivisione/dati';
import { TESTI_CONDIVISIONE as T } from '@/lib/condivisione/testi';
import { conAlfa } from '@/lib/strumenti';
import { IconaCondividi } from '@/components/ultimora/IconaFonte';
import { IconaStrumento } from '@/components/strumenti/IconaStrumento';

interface Props {
  /** Disegna l'immagine nel formato scelto. Gira solo sul dispositivo dell'utente. */
  genera: (formato: Formato) => Promise<HTMLCanvasElement>;
  nomeFile: string;
  /** Titolo e testo che accompagnano la condivisione. */
  titolo: string;
  testo: string;
  /** Pagina da linkare nel testo condiviso. */
  percorso: string;
  colore: string;
  etichetta?: string;
  nota?: string;
  compatto?: boolean;
}

interface Immagine {
  url: string;
  file: File;
}

/** Pulsante che apre il pannello: anteprima, scelta del formato, condivisione nativa o download. */
export default function PannelloCondivisione({ genera, nomeFile, titolo, testo, percorso, colore, etichetta = T.pulsante, nota, compatto }: Props) {
  const [aperto, setAperto] = useState(false);
  const [formato, setFormato] = useState<Formato>('post');
  const [immagine, setImmagine] = useState<Immagine | null>(null);
  const [stato, setStato] = useState<'generazione' | 'pronta' | 'errore'>('generazione');
  const [puoCondividere, setPuoCondividere] = useState(false);
  const richiesta = useRef(0);
  const urlCorrente = useRef<string | null>(null);
  const pulsante = useRef<HTMLButtonElement>(null);
  const chiudiRef = useRef<HTMLButtonElement>(null);

  async function prepara(f: Formato) {
    const numero = ++richiesta.current;
    setStato('generazione');
    try {
      const canvas = await genera(f);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Immagine vuota');
      if (numero !== richiesta.current) return; // Nel frattempo è stato scelto un altro formato.
      const file = new File([blob], `${nomeFile}-${f}.png`, { type: 'image/png' });
      if (urlCorrente.current) URL.revokeObjectURL(urlCorrente.current);
      const url = URL.createObjectURL(blob);
      urlCorrente.current = url;
      setImmagine({ url, file });
      setPuoCondividere(Boolean(navigator.canShare?.({ files: [file] })));
      setStato('pronta');
    } catch {
      if (numero === richiesta.current) setStato('errore');
    }
  }

  function apri() {
    setAperto(true);
    void prepara(formato);
  }

  function scegli(f: Formato) {
    if (f === formato) return;
    setFormato(f);
    void prepara(f);
  }

  function chiudi() {
    setAperto(false);
    pulsante.current?.focus();
  }

  async function condividi() {
    if (!immagine) return;
    const link = `${window.location.origin}${percorso}`;
    try {
      await navigator.share({ files: [immagine.file], title: titolo, text: `${testo} ${link}` });
    } catch {
      // Condivisione annullata: nessuna azione.
    }
  }

  // Pannello aperto: niente scroll sotto, focus sul pulsante di chiusura, Esc per chiudere.
  useEffect(() => {
    if (!aperto) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    chiudiRef.current?.focus();
    const suTasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAperto(false);
        pulsante.current?.focus();
      }
    };
    window.addEventListener('keydown', suTasto);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', suTasto);
    };
  }, [aperto]);

  // All'uscita dalla pagina libera la memoria dell'ultima immagine.
  useEffect(
    () => () => {
      if (urlCorrente.current) URL.revokeObjectURL(urlCorrente.current);
    },
    [],
  );

  return (
    <MotionConfig reducedMotion="user">
      <button
        ref={pulsante}
        type="button"
        onClick={apri}
        aria-haspopup="dialog"
        className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-bold transition-transform hover:-translate-y-0.5 active:scale-[0.97] ${
          compatto ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm'
        }`}
        style={{ background: colore, color: '#0a0a0a', boxShadow: `0 6px 20px ${conAlfa(colore, 0.25)}` }}
      >
        <IconaCondividi className={compatto ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {etichetta}
      </button>

      <AnimatePresence>
        {aperto && (
          <motion.div
            key="velo"
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={chiudi}
            aria-hidden
          />
        )}
        {aperto && (
          <motion.div
            key="pannello"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titolo-condivisione"
            className="fixed inset-x-3 z-[61] mx-auto flex max-h-[calc(100dvh-1.5rem)] max-w-lg flex-col rounded-[1.75rem] border p-4 sm:inset-x-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:p-5"
            style={{
              bottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
              borderColor: 'rgba(255,255,255,0.08)',
              background: 'rgba(22,22,22,0.94)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="titolo-condivisione" className="text-base font-bold">
                {T.titoloPannello}
              </h2>
              <button
                ref={chiudiRef}
                type="button"
                onClick={chiudi}
                aria-label={T.chiudi}
                className="flex h-9 w-9 items-center justify-center rounded-full border"
                style={{ borderColor: 'rgba(255,255,255,0.12)' }}
              >
                <IconaStrumento id="chiudi" className="h-4 w-4" spessore={2.2} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1 rounded-full border p-1" style={{ borderColor: 'rgba(255,255,255,0.1)' }} role="radiogroup">
              {(['post', 'storia'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={formato === f}
                  onClick={() => scegli(f)}
                  className="relative rounded-full py-1.5 text-sm font-semibold"
                  style={{ color: formato === f ? '#0a0a0a' : 'var(--fg-muta)' }}
                >
                  {formato === f && (
                    <motion.span layoutId="formato-condivisione" className="absolute inset-0 rounded-full" style={{ background: colore }} transition={{ type: 'spring', stiffness: 500, damping: 36 }} />
                  )}
                  <span className="relative">{T.formati[f]}</span>
                </button>
              ))}
            </div>

            <div className="relative mt-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl" style={{ background: 'rgba(0,0,0,0.35)', height: '52dvh' }}>
              {immagine && (
                // eslint-disable-next-line @next/next/no-img-element -- immagine generata sul dispositivo (blob URL)
                <img
                  src={immagine.url}
                  alt={T.anteprima}
                  className="h-full w-auto max-w-full rounded-xl object-contain transition-opacity"
                  style={{ opacity: stato === 'generazione' ? 0.35 : 1 }}
                />
              )}
              {stato === 'generazione' && (
                <p className="absolute inset-x-0 bottom-3 text-center text-sm font-medium" aria-live="polite">
                  {T.generazione}
                </p>
              )}
              {stato === 'errore' && (
                <p className="px-6 text-center text-sm" role="alert">
                  {T.errore}
                </p>
              )}
            </div>

            <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
              {nota ?? T.suDispositivo}
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {puoCondividere && (
                <button
                  type="button"
                  onClick={condividi}
                  disabled={stato !== 'pronta'}
                  className="inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold disabled:opacity-50"
                  style={{ background: colore, color: '#0a0a0a' }}
                >
                  <IconaCondividi />
                  {T.condividi}
                </button>
              )}
              <a
                href={immagine && stato === 'pronta' ? immagine.url : undefined}
                download={immagine?.file.name}
                aria-disabled={stato !== 'pronta'}
                className={`inline-flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-semibold ${
                  puoCondividere ? '' : 'sm:col-span-2'
                } ${stato !== 'pronta' ? 'pointer-events-none opacity-50' : ''}`}
                style={puoCondividere ? { borderColor: 'rgba(255,255,255,0.14)' } : { background: colore, color: '#0a0a0a', borderColor: colore }}
              >
                ↓ {T.scarica}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

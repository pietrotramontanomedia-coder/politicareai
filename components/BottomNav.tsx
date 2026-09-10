'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { IconaStrumento, type IdIcona } from '@/components/strumenti/IconaStrumento';
import { conAlfa, ORDINE_PANNELLO, STRUMENTI, TESTI_NAV as T } from '@/lib/strumenti';

interface Voce {
  href: string;
  etichetta: string;
  icona: IdIcona;
}

const SINISTRA: Voce[] = [
  { href: '/', etichetta: T.home, icona: 'home' },
  { href: STRUMENTI.test.href, etichetta: T.test, icona: 'test' },
];
const DESTRA: Voce[] = [
  { href: STRUMENTI.quiz.href, etichetta: T.quiz, icona: 'quiz' },
  { href: STRUMENTI.gioco.href, etichetta: T.gioco, icona: 'gioco' },
];
/** Pagine raggiungibili solo dal pannello: quando ci sei, il pulsante centrale lo segnala. */
const ROTTE_PANNELLO = [STRUMENTI.confronta.href, STRUMENTI.simulatore.href, STRUMENTI.metodologia.href];

const VETRO = {
  borderColor: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
};

function corrisponde(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/** Barra flottante per mobile: quattro voci, un pulsante centrale e il pannello con tutti gli strumenti. */
export default function BottomNav() {
  const pathname = usePathname();
  const [aperto, setAperto] = useState(false);
  const pannello = useRef<HTMLDivElement>(null);
  const pulsante = useRef<HTMLButtonElement>(null);

  // Con il pannello aperto: niente scroll sotto, focus sulla prima voce, Esc per chiudere.
  useEffect(() => {
    if (!aperto) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    pannello.current?.querySelector<HTMLElement>('a')?.focus();
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

  const chiudi = () => setAperto(false);
  const inPannello = ROTTE_PANNELLO.some((r) => pathname.startsWith(r));

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {aperto && (
          <motion.div
            key="velo"
            className="fixed inset-0 z-40 sm:hidden"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
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
            id="pannello-strumenti"
            ref={pannello}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titolo-pannello-strumenti"
            className="fixed inset-x-3 z-50 rounded-[1.75rem] border p-4 sm:hidden"
            style={{
              ...VETRO,
              bottom: 'calc(5.75rem + env(safe-area-inset-bottom))',
              background: 'rgba(22,22,22,0.9)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 70 || info.velocity.y > 500) chiudi();
            }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} aria-hidden />
            <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
              <h2 id="titolo-pannello-strumenti" className="text-base font-bold">
                {T.titoloPannello}
              </h2>
              <span className="text-[11px]" style={{ color: 'var(--fg-muta)' }}>
                {T.notaPannello}
              </span>
            </div>
            <motion.ul
              className="grid grid-cols-2 gap-2"
              initial="nascosto"
              animate="visibile"
              variants={{ visibile: { transition: { staggerChildren: 0.04 } } }}
            >
              {ORDINE_PANNELLO.map((id) => {
                const s = STRUMENTI[id];
                const qui = pathname.startsWith(s.href);
                return (
                  <motion.li key={id} variants={{ nascosto: { opacity: 0, y: 12 }, visibile: { opacity: 1, y: 0 } }}>
                    <Link
                      href={s.href}
                      onClick={chiudi}
                      aria-current={qui ? 'page' : undefined}
                      className="flex h-full flex-col gap-2 rounded-2xl border p-3 transition-transform active:scale-[0.97]"
                      style={{
                        borderColor: qui ? conAlfa(s.colore, 0.6) : 'rgba(255,255,255,0.06)',
                        background: `linear-gradient(160deg, ${conAlfa(s.colore, 0.14)}, transparent 70%), rgba(255,255,255,0.02)`,
                      }}
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ background: conAlfa(s.colore, 0.18), color: s.colore }}
                      >
                        <IconaStrumento id={id} className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-semibold leading-tight">{s.nome}</span>
                      <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-muta)' }}>
                        {s.breve}
                      </span>
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-3 z-50 sm:hidden"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div
          className="flex h-16 items-stretch rounded-[1.75rem] border px-1.5"
          style={{
            ...VETRO,
            background: 'rgba(18,18,18,0.78)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {SINISTRA.map((v) => (
            <VoceNav key={v.href} voce={v} attiva={!aperto && corrisponde(pathname, v.href)} onClick={chiudi} />
          ))}

          <div className="flex flex-1 items-start justify-center">
            <motion.button
              ref={pulsante}
              type="button"
              onClick={() => setAperto((a) => !a)}
              aria-expanded={aperto}
              aria-controls="pannello-strumenti"
              aria-label={aperto ? T.chiudi : T.apri}
              whileTap={{ scale: 0.88 }}
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background: 'var(--accento)',
                color: '#0a0a0a',
                boxShadow: `0 8px 24px rgba(254,220,1,0.35), 0 0 0 4px ${inPannello && !aperto ? 'rgba(254,220,1,0.35)' : 'rgba(10,10,10,0.92)'}`,
              }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={aperto ? 'chiudi' : 'griglia'}
                  initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="flex"
                >
                  <IconaStrumento id={aperto ? 'chiudi' : 'griglia'} className="h-6 w-6" spessore={2.2} />
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>

          {DESTRA.map((v) => (
            <VoceNav key={v.href} voce={v} attiva={!aperto && corrisponde(pathname, v.href)} onClick={chiudi} />
          ))}
        </div>
      </nav>
    </MotionConfig>
  );
}

function VoceNav({ voce, attiva, onClick }: { voce: Voce; attiva: boolean; onClick: () => void }) {
  const colore = attiva ? 'var(--accento)' : 'rgba(255,255,255,0.58)';
  return (
    <Link
      href={voce.href}
      onClick={onClick}
      aria-current={attiva ? 'page' : undefined}
      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl"
    >
      {attiva && (
        <motion.span
          layoutId="voce-attiva"
          className="absolute inset-x-0.5 inset-y-2 rounded-2xl"
          style={{ background: 'rgba(254,220,1,0.12)', boxShadow: 'inset 0 0 0 1px rgba(254,220,1,0.22)' }}
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}
      <motion.span
        className="relative flex"
        animate={{ y: attiva ? -1 : 0, scale: attiva ? 1.08 : 1 }}
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ color: colore }}
      >
        <IconaStrumento id={voce.icona} className="h-[22px] w-[22px]" spessore={attiva ? 2.2 : 1.8} />
      </motion.span>
      <span className="relative text-[10.5px] font-semibold" style={{ color: colore }}>
        {voce.etichetta}
      </span>
    </Link>
  );
}

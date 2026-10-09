'use client';

import { useEffect, useRef } from 'react';

/**
 * Finestra sopra la pagina: Esc chiude, il focus entra e resta dentro con Tab,
 * alla chiusura torna dove era. Il fondo non scorre finché è aperta.
 */
export default function Finestra({
  titolo,
  onChiudi,
  children,
  larga = false,
  scura = false,
}: {
  titolo: string;
  onChiudi: () => void;
  children: React.ReactNode;
  larga?: boolean;
  /** Sfondo nero pieno, per le storie. */
  scura?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chiudi = useRef(onChiudi);
  useEffect(() => {
    chiudi.current = onChiudi;
  });

  useEffect(() => {
    const prima = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const primo = ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current;
    primo?.focus();

    function tasto(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        chiudi.current();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const focalizzabili = [...ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])')];
      if (focalizzabili.length === 0) return;
      const [inizio, fine] = [focalizzabili[0], focalizzabili[focalizzabili.length - 1]];
      if (e.shiftKey && document.activeElement === inizio) {
        e.preventDefault();
        fine.focus();
      } else if (!e.shiftKey && document.activeElement === fine) {
        e.preventDefault();
        inizio.focus();
      }
    }
    document.addEventListener('keydown', tasto);
    return () => {
      document.removeEventListener('keydown', tasto);
      document.body.style.overflow = overflow;
      prima?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center sm:p-6"
      style={{ background: scura ? '#000' : 'rgba(0,0,0,0.75)', backdropFilter: scura ? undefined : 'blur(6px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onChiudi();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={titolo}
        tabIndex={-1}
        className={`relative flex w-full flex-col overflow-y-auto outline-none ${scura ? '' : 'sm:rounded-3xl sm:border'} ${larga ? 'sm:max-w-5xl' : 'sm:max-w-2xl'} sm:max-h-[92dvh]`}
        style={{ background: scura ? '#000' : 'var(--bg-elevated)', borderColor: 'var(--bordo)' }}
      >
        {children}
      </div>
    </div>
  );
}

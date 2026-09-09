'use client';

import { useRef, type TouchEvent } from 'react';

const SOGLIA_PX = 40;

/** Gesti touch orizzontali: dito verso sinistra → avanti, verso destra → indietro. */
export function useSwipe({ avanti, indietro }: { avanti: () => void; indietro: () => void }) {
  const inizio = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0];
      inizio.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: TouchEvent) => {
      if (!inizio.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - inizio.current.x;
      const dy = t.clientY - inizio.current.y;
      inizio.current = null;
      if (Math.abs(dx) < SOGLIA_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) avanti();
      else indietro();
    },
    style: { touchAction: 'pan-y' as const },
  };
}

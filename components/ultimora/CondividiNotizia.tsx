'use client';

import { useState } from 'react';
import { IconaCondividi } from './IconaFonte';
import { TESTI_ULTIMORA as T } from '@/lib/ultimora-testi';

/** Condivisione nativa del telefono; dove non c'è, copia il link. */
export default function CondividiNotizia({ titolo }: { titolo: string }) {
  const [copiato, setCopiato] = useState(false);

  async function condividi() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: titolo, url });
      } catch {
        // Condivisione annullata dall'utente: nessuna azione.
      }
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={condividi}
      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors hover:border-[rgba(239,68,68,0.5)]"
      style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(20,20,20,0.6)' }}
    >
      <IconaCondividi />
      <span aria-live="polite">{copiato ? T.copiato : T.condividi}</span>
    </button>
  );
}

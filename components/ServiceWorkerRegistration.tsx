'use client';

import { useEffect } from 'react';
import { IN_APP } from '@/lib/piattaforma';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (IN_APP) return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Registrazione service worker fallita:', err);
    });
  }, []);

  return null;
}

'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ArticoloSkeleton from '@/components/ArticoloSkeleton';
import { apiUrl } from '@/lib/piattaforma';

interface Props<T> {
  /** Nome del parametro in query che porta l'id, es. "id". */
  parametro: string;
  /** Endpoint da chiamare con l'id, es. (id) => `/api/agenzie/${id}`. */
  endpoint: (valore: string) => string;
  /** Estrae il dato dalla risposta JSON; null se la risposta non lo contiene. */
  estrai: (json: unknown, valore: string) => T | null;
  mostra: (dato: T) => ReactNode;
}

type Stato<T> = { tipo: 'caricamento' } | { tipo: 'ok'; dato: T } | { tipo: 'errore' };

function Errore() {
  return (
    <main className="min-h-dvh px-4 py-24 text-center sm:px-6">
      <p className="mb-2 text-lg font-bold">Contenuto non disponibile</p>
      <p className="mb-6" style={{ color: 'var(--fg-muta)' }}>
        Controlla la connessione e riprova. Test, quiz e gioco funzionano anche offline.
      </p>
      <Link href="/" className="inline-flex rounded-full px-6 py-3 font-semibold" style={{ background: 'var(--accento)', color: '#0a0a0a' }}>
        Torna alla home
      </Link>
    </main>
  );
}

function Caricamento() {
  return (
    <main className="min-h-dvh px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <ArticoloSkeleton />
      </div>
    </main>
  );
}

function Contenuto<T>({ parametro, endpoint, estrai, mostra }: Props<T>) {
  const valore = useSearchParams().get(parametro);
  const [stato, setStato] = useState<Stato<T>>({ tipo: 'caricamento' });

  useEffect(() => {
    if (!valore) return;
    let annullato = false;
    fetch(apiUrl(endpoint(valore)))
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (annullato) return;
        const dato = json ? estrai(json, valore) : null;
        setStato(dato ? { tipo: 'ok', dato } : { tipo: 'errore' });
      })
      .catch(() => {
        if (!annullato) setStato({ tipo: 'errore' });
      });
    return () => {
      annullato = true;
    };
    // endpoint ed estrai sono funzioni stabili definite a livello di modulo nelle pagine
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valore]);

  if (!valore || stato.tipo === 'errore') return <Errore />;
  if (stato.tipo === 'caricamento') return <Caricamento />;
  return <>{mostra(stato.dato)}</>;
}

/**
 * Pagina di dettaglio dell'app: legge l'id dalla query (?id=...), chiama l'API del
 * sito in produzione e mostra il risultato con lo stesso componente del web.
 */
export default function DaApi<T>(props: Props<T>) {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto {...props} />
    </Suspense>
  );
}

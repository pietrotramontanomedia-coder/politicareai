'use client';

import DaApi from '@/components/app/DaApi';
import DettaglioUltimora from '@/components/ultimora/DettaglioUltimora';
import type { NotiziaDettaglio, NotiziaUltimOra } from '@/lib/ultimora-server';

interface Risposta {
  id: string;
  notizia: NotiziaDettaglio;
  altre: NotiziaUltimOra[];
}

const endpoint = (id: string) => `/api/ultimora/${encodeURIComponent(id)}`;
const estrai = (json: unknown, id: string): Risposta | null => {
  const r = json as { notizia?: NotiziaDettaglio; altre?: NotiziaUltimOra[] };
  return r.notizia ? { id, notizia: r.notizia, altre: r.altre ?? [] } : null;
};
const mostra = (r: Risposta) => <DettaglioUltimora id={r.id} notizia={r.notizia} altre={r.altre} />;

/** Solo app: /ultimora/?id=... */
export default function UltimoraApp() {
  return <DaApi parametro="id" endpoint={endpoint} estrai={estrai} mostra={mostra} />;
}

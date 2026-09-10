'use client';

import { useEffect, useState } from 'react';
import flashData from '@/content/agenzia/flash.json';
import type { PostInstagram } from '@/lib/instagram-server';
import type { FonteUltimOra, NotiziaUltimOra } from '@/lib/ultimora-server';
import { scegliPostRecenti, type PostRecente } from '@/lib/post-recenti';

export type { PostInstagram };

export interface VoceUltimOra {
  id: string;
  orario: string;
  titolo: string;
  testo: string;
  href: string;
  immagine?: string;
  fonte?: FonteUltimOra;
}

function usaRichiestaCondivisa<T>(url: string, estrai: (d: unknown) => T[]) {
  const cache = richieste as Map<string, Promise<T[]>>;
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((r) => r.json())
        .then(estrai)
        .catch(() => []),
    );
  }
  return cache.get(url)!;
}

const richieste = new Map<string, Promise<unknown[]>>();

export function useInstagram() {
  const [post, setPost] = useState<PostInstagram[]>([]);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    usaRichiestaCondivisa<PostInstagram>('/api/instagram', (d) => (d as { post?: PostInstagram[] }).post ?? []).then(
      (p) => {
        setPost(p);
        setCaricamento(false);
      },
    );
  }, []);

  return { post, caricamento };
}

/** Ultimi post con immagine per il carosello della home (Instagram, altrimenti Telegram). */
export function usePostRecenti() {
  const [post, setPost] = useState<PostRecente[]>([]);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    Promise.all([
      usaRichiestaCondivisa<PostInstagram>('/api/instagram', (d) => (d as { post?: PostInstagram[] }).post ?? []),
      usaRichiestaCondivisa<NotiziaUltimOra>('/api/ultimora', (d) => (d as { voci?: NotiziaUltimOra[] }).voci ?? []),
    ]).then(([instagram, notizie]) => {
      setPost(scegliPostRecenti(instagram, notizie));
      setCaricamento(false);
    });
  }, []);

  return { post, caricamento };
}

/** Ultim'ora da Instagram e Telegram; se nessuna fonte risponde usa il flash redazionale. */
export function useUltimOra() {
  const [voci, setVoci] = useState<VoceUltimOra[]>([]);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    usaRichiestaCondivisa<NotiziaUltimOra>('/api/ultimora', (d) => (d as { voci?: NotiziaUltimOra[] }).voci ?? []).then(
      (notizie) => {
        const daFonti = notizie.map((n) => ({
          id: n.id,
          orario: n.data,
          titolo: n.titolo,
          testo: n.testo,
          href: `/ultimora/${n.id}`,
          immagine: n.immagine,
          fonte: n.fonte,
        }));
        setVoci(
          daFonti.length > 0 ? daFonti : flashData.voci.map((v) => ({ ...v, href: `/ultimora/${v.id}` })),
        );
        setCaricamento(false);
      },
    );
  }, []);

  return { voci, caricamento };
}

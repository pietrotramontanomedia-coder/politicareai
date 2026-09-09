'use client';

import { useEffect, useState } from 'react';
import flashData from '@/content/agenzia/flash.json';
import type { PostInstagram } from '@/lib/instagram-server';

export type { PostInstagram };

export interface VoceUltimOra {
  id: string;
  orario: string;
  titolo: string;
  testo: string;
  href: string;
}

let richiesta: Promise<PostInstagram[]> | null = null;

function caricaPost(): Promise<PostInstagram[]> {
  if (!richiesta) {
    richiesta = fetch('/api/instagram')
      .then((r) => r.json())
      .then((d) => (d.post ?? []) as PostInstagram[])
      .catch(() => []);
  }
  return richiesta;
}

export function useInstagram() {
  const [post, setPost] = useState<PostInstagram[]>([]);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    caricaPost().then((p) => {
      setPost(p);
      setCaricamento(false);
    });
  }, []);

  return { post, caricamento };
}

/** Ultim'ora dai post Instagram; se il feed non è disponibile usa il flash redazionale. */
export function useUltimOra() {
  const { post, caricamento } = useInstagram();

  const voci: VoceUltimOra[] = post
    .filter((p) => p.titolo)
    .map((p) => ({ id: p.id, orario: p.data, titolo: p.titolo, testo: p.testo, href: `/ultimora/${p.id}` }));

  if (voci.length === 0 && !caricamento) {
    return {
      voci: flashData.voci.map((v) => ({ ...v, href: `/ultimora/${v.id}` })),
      caricamento,
    };
  }
  return { voci, caricamento };
}

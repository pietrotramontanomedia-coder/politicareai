'use client';

import { useCallback, useEffect, useState } from 'react';
import notificheData from '@/content/notifiche/notifiche.json';

export interface Notifica {
  id: string;
  data: string;
  tipo: 'quiz' | 'aggiornamento' | 'generale';
  titolo: string;
  testo: string;
  link: string;
}

const STORAGE_KEY = 'politicare:notifiche-lette';

function leggiLette(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvaLette(lette: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lette));
  } catch {
    // storage non disponibile, ignora
  }
}

export function useNotifiche() {
  const notifiche = notificheData.notifiche as Notifica[];
  const [lette, setLette] = useState<string[]>([]);
  const [idratato, setIdratato] = useState(false);

  useEffect(() => {
    // Lettura da localStorage dopo il mount, per non divergere dal markup del server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLette(leggiLette());
    setIdratato(true);
  }, []);

  const nonLette = idratato ? notifiche.filter((n) => !lette.includes(n.id)).length : 0;

  const segnaComeLetta = useCallback((id: string) => {
    setLette((prev) => {
      if (prev.includes(id)) return prev;
      const aggiornate = [...prev, id];
      salvaLette(aggiornate);
      return aggiornate;
    });
  }, []);

  const segnaTutteLette = useCallback(() => {
    const tutteId = notifiche.map((n) => n.id);
    setLette(tutteId);
    salvaLette(tutteId);
  }, [notifiche]);

  return {
    notifiche,
    lette,
    nonLette,
    segnaComeLetta,
    segnaTutteLette,
  };
}

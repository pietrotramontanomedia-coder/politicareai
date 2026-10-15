import { describe, expect, it } from 'vitest';
import { aggiungiCommento, nuovoContenuto } from '@/lib/redazione/regole';
import type { Contenuto } from '@/lib/redazione/tipi';
import { unisci } from '../strumenti/sostituisci-recuperati';

const ID = 'b326ca5b1a3748e580b44358f9ac449f';
const QUANDO = new Date('2026-10-14T07:28:00Z');
const originale = (): Contenuto => {
  const c = nuovoContenuto(ID, 'post', 'Pasquale', { immagini: ['1'.repeat(32)], didascalia: 'Copy vero', formato: '4:5' }, QUANDO);
  return aggiungiCommento(c, { nome: 'Pietro', ruolo: 'revisore' }, { tipo: 'correzione', testo: 'Accorcia', stato: 'da_correggere' }, '9'.repeat(32), new Date('2026-10-14T09:00:00Z'));
};
const ricostruito = (): Contenuto => ({
  ...nuovoContenuto(ID, 'post', 'Pasquale', { immagini: ['2'.repeat(32)], didascalia: 'Copy vero', formato: '4:5' }, QUANDO),
  recuperatoDa: 'telegram',
  rev: 12,
});

describe('originali al posto dei ricostruiti', () => {
  it('senza novità rimette l\'originale com\'era', () => {
    const { contenuto, aggiunte } = unisci(originale(), ricostruito());
    expect(aggiunte).toBe(0);
    expect(contenuto).toEqual(originale());
    expect(contenuto.recuperatoDa).toBeUndefined();
  });

  it('tiene i commenti e il cambio di stato arrivati dopo il recupero', () => {
    const oggi = aggiungiCommento(ricostruito(), { nome: 'Jacopo', ruolo: 'revisore' }, { tipo: 'complimento', testo: 'Ottimo', stato: 'approvato' }, '8'.repeat(32), new Date('2026-10-15T10:00:00Z'));
    const { contenuto, aggiunte } = unisci(originale(), oggi);
    expect(aggiunte).toBeGreaterThan(0);
    expect(contenuto.commenti.map((c) => c.testo)).toEqual(['Accorcia', 'Ottimo']);
    expect(contenuto.stato).toBe('approvato');
    expect(contenuto.versioni[0].immagini).toEqual(['1'.repeat(32)]);
    expect(contenuto.aggiornatoIl).toBe('2026-10-15T10:00:00.000Z');
  });
});

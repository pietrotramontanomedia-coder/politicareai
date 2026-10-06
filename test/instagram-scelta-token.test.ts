import { describe, expect, it } from 'vitest';
import { impronta, scegliToken, type TokenSalvato } from '@/lib/instagram-token';

const salvato = (token: string, origine?: string): TokenSalvato => ({
  token,
  rinnovatoIl: '2026-10-01T00:00:00.000Z',
  scadeIl: '2026-11-30T00:00:00.000Z',
  origineAmbiente: origine,
});

describe('scelta del token Instagram', () => {
  it('usa il token salvato se discende dal token d’ambiente attuale', () => {
    expect(scegliToken(salvato('rinnovato', impronta('ambiente')), 'ambiente')).toBe('rinnovato');
  });

  it('usa il token d’ambiente se è stato cambiato su Vercel', () => {
    expect(scegliToken(salvato('rinnovato', impronta('vecchio')), 'nuovo')).toBe('nuovo');
  });

  it('usa il token d’ambiente se il salvato non ha impronta (salvataggi precedenti)', () => {
    expect(scegliToken(salvato('rinnovato'), 'ambiente')).toBe('ambiente');
  });

  it('senza token d’ambiente usa il salvato', () => {
    expect(scegliToken(salvato('rinnovato'), undefined)).toBe('rinnovato');
  });

  it('senza nulla restituisce null', () => {
    expect(scegliToken(null, undefined)).toBeNull();
  });

  it('l’impronta non contiene il token', () => {
    expect(impronta('segreto-123')).not.toContain('segreto');
    expect(impronta('segreto-123')).toHaveLength(16);
  });
});

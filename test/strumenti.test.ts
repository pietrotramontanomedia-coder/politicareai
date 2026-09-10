import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import pack from '@/content/test-partito/politiche-2027.v1.json';
import { conAlfa, NUMERI, ORDINE_PANNELLO, STRUMENTI } from '@/lib/strumenti';

describe('strumenti della home e del menu', () => {
  it('i numeri citati nei testi coincidono con il pack del test', () => {
    expect(NUMERI.partiti).toBe(pack.partiti.length);
    expect(NUMERI.affermazioni).toBe(pack.affermazioni.length);
    expect(NUMERI.temi).toBe(Object.keys(pack.quotePerArea).length);
  });

  it('ogni quiz pubblicato ha il numero di domande dichiarato', () => {
    const cartella = path.join(process.cwd(), 'content/quiz');
    for (const file of readdirSync(cartella).filter((f) => f.endsWith('.json'))) {
      const quiz = JSON.parse(readFileSync(path.join(cartella, file), 'utf8'));
      expect(quiz.domande, file).toHaveLength(NUMERI.domandeQuiz);
    }
  });

  it('ogni strumento punta a una pagina esistente e compare nel pannello', () => {
    for (const s of Object.values(STRUMENTI)) {
      expect(existsSync(path.join(process.cwd(), 'app', s.href, 'page.tsx')), s.href).toBe(true);
      expect(ORDINE_PANNELLO).toContain(s.id);
    }
  });

  it('conAlfa converte un esadecimale in rgba', () => {
    expect(conAlfa('#FEDC01', 0.5)).toBe('rgba(254, 220, 1, 0.5)');
  });
});

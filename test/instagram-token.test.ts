import { describe, expect, it } from 'vitest';
import { autorizzatoCron } from '@/lib/cron';
import { calcolaScadenza } from '@/lib/instagram-token';

describe('autorizzatoCron', () => {
  it('accetta la chiave giusta', () => {
    expect(autorizzatoCron('Bearer segreto-123', 'segreto-123')).toBe(true);
  });

  it('rifiuta una chiave sbagliata o di lunghezza diversa', () => {
    expect(autorizzatoCron('Bearer segreto-124', 'segreto-123')).toBe(false);
    expect(autorizzatoCron('Bearer x', 'segreto-123')).toBe(false);
  });

  it('rifiuta se manca l’intestazione o il segreto non è configurato', () => {
    expect(autorizzatoCron(null, 'segreto-123')).toBe(false);
    expect(autorizzatoCron('Bearer ', undefined)).toBe(false);
  });
});

describe('calcolaScadenza', () => {
  it('somma i 60 giorni di validità restituiti da Instagram', () => {
    expect(calcolaScadenza(60 * 24 * 60 * 60, new Date('2026-09-10T00:00:00Z'))).toBe('2026-11-09T00:00:00.000Z');
  });
});

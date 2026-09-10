import { afterEach, describe, expect, it, vi } from 'vitest';

/* Il rinnovo del token non si ripete a breve distanza: Instagram non allunga la scadenza e troppi rinnovi insospettiscono Meta. */

const rinnovatoIl = '2026-09-10T17:46:17.629Z';
const scadeIl = '2026-11-09T17:12:31.629Z';

vi.mock('@vercel/blob', () => ({
  get: async () => ({
    statusCode: 200,
    stream: new Response(JSON.stringify({ token: 'token-salvato', rinnovatoIl, scadeIl })).body,
  }),
  put: vi.fn(async () => ({})),
}));

describe('rinnovo del token Instagram', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('se il token è stato rinnovato meno di 24 ore fa non chiama Instagram', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'blob-di-prova');
    const fetchFinto = vi.fn();
    vi.stubGlobal('fetch', fetchFinto);
    const { rinnovaToken } = await import('@/lib/instagram-token');

    const esito = await rinnovaToken(new Date('2026-09-11T08:00:00Z'));

    expect(esito).toEqual({ scadeIl, partitoDa: 'storage', saltato: true });
    expect(fetchFinto).not.toHaveBeenCalled();
  });
});

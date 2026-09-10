import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Regole di prudenza verso Instagram: meno chiamate possibili, sempre dallo stesso server. */

vi.mock('@/lib/instagram-token', () => ({ leggiToken: async () => 'token-di-prova' }));

const mediaDiProva = [
  { id: '111', caption: 'Primo post. Testo', media_type: 'IMAGE', media_url: 'https://cdn/1.jpg', permalink: 'https://instagram.com/p/1', timestamp: '2026-09-10T10:00:00+0000' },
  { id: '222', caption: 'Secondo post. Testo', media_type: 'IMAGE', media_url: 'https://cdn/2.jpg', permalink: 'https://instagram.com/p/2', timestamp: '2026-09-10T09:00:00+0000' },
];

describe('chiamate a Instagram', () => {
  const fetchFinto = vi.fn(async (url: URL | string) => {
    const percorso = new URL(String(url)).pathname;
    if (percorso.endsWith('/me/media')) return Response.json({ data: mediaDiProva });
    return Response.json({ ...mediaDiProva[0], id: percorso.split('/').pop() });
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchFinto);
    fetchFinto.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('in sviluppo non chiama Instagram senza attivazione esplicita', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { leggiPost, leggiPostSingolo } = await import('@/lib/instagram-server');
    expect(await leggiPost()).toEqual([]);
    expect(await leggiPostSingolo('111')).toBeNull();
    expect(fetchFinto).not.toHaveBeenCalled();
  });

  it('la pagina di un post recente usa la lista, senza una chiamata in più', async () => {
    vi.stubEnv('INSTAGRAM_IN_SVILUPPO', '1');
    const { leggiPostSingolo } = await import('@/lib/instagram-server');
    const post = await leggiPostSingolo('222');
    expect(post?.id).toBe('222');
    expect(fetchFinto).toHaveBeenCalledTimes(1);
    expect(new URL(String(fetchFinto.mock.calls[0][0])).pathname).toMatch(/\/me\/media$/);
  });

  it('solo un post fuori dalla lista richiede la chiamata singola, con cache di un giorno', async () => {
    vi.stubEnv('INSTAGRAM_IN_SVILUPPO', '1');
    const { leggiPostSingolo } = await import('@/lib/instagram-server');
    await leggiPostSingolo('999');
    expect(fetchFinto).toHaveBeenCalledTimes(2);
    const opzioni = fetchFinto.mock.calls[1] as unknown as [URL, { next: { revalidate: number } }];
    expect(opzioni[1].next.revalidate).toBe(86_400);
  });
});

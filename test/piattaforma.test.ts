import { afterEach, describe, expect, it, vi } from 'vitest';

// IN_APP e l'indirizzo del sito sono fissati al caricamento del modulo, come nella build:
// per ogni scenario si reimposta l'ambiente e si reimporta il modulo.
async function carica(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('../lib/piattaforma');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('piattaforma web', () => {
  it('usa percorsi relativi per le API e pagine dinamiche per i dettagli', async () => {
    const p = await carica({ NEXT_PUBLIC_PIATTAFORMA: 'web', NEXT_PUBLIC_SITO_URL: 'https://ignorato.example' });
    expect(p.IN_APP).toBe(false);
    expect(p.apiUrl('/api/feed')).toBe('/api/feed');
    expect(p.percorsoDettaglio('ultimora', 'tg-12')).toBe('/ultimora/tg-12');
    expect(p.percorsoDettaglio('leggi', 'un-articolo')).toBe('/leggi/un-articolo');
  });

  it('condivide e torna dall\'accesso sull\'origine della pagina', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://www.politicare.it', host: 'www.politicare.it' } });
    const p = await carica({ NEXT_PUBLIC_PIATTAFORMA: 'web' });
    expect(p.urlPubblico('/ultimora/tg-12')).toBe('https://www.politicare.it/ultimora/tg-12');
    expect(p.hostPubblico()).toBe('www.politicare.it');
    expect(p.urlRitornoAccesso()).toBe('https://www.politicare.it/accedi');
  });
});

describe('piattaforma app', () => {
  it('chiama le API del sito e usa pagine con id in query', async () => {
    const p = await carica({ NEXT_PUBLIC_PIATTAFORMA: 'app', NEXT_PUBLIC_SITO_URL: 'https://politicare.example/' });
    expect(p.IN_APP).toBe(true);
    expect(p.apiUrl('/api/ultimora')).toBe('https://politicare.example/api/ultimora');
    expect(p.percorsoDettaglio('ultimora', 'tg-12')).toBe('/ultimora/?id=tg-12');
    expect(p.percorsoDettaglio('leggi', 'a b/c')).toBe('/leggi/?slug=a%20b%2Fc');
  });

  it('condivide l\'indirizzo pubblico sul sito, non quello locale dell\'app', async () => {
    vi.stubGlobal('window', { location: { origin: 'capacitor://localhost', host: 'localhost' } });
    const p = await carica({ NEXT_PUBLIC_PIATTAFORMA: 'app', NEXT_PUBLIC_SITO_URL: 'https://politicare.example' });
    expect(p.urlPubblico(p.percorsoWebDettaglio('ultimora', 'tg-12'))).toBe('https://politicare.example/ultimora/tg-12');
    expect(p.hostPubblico()).toBe('politicare.example');
    expect(p.urlRitornoAccesso()).toBe('it.politicare.app://accedi');
  });

  it('rifiuta percorsi API non assoluti', async () => {
    const p = await carica({ NEXT_PUBLIC_PIATTAFORMA: 'app', NEXT_PUBLIC_SITO_URL: 'https://politicare.example' });
    expect(() => p.apiUrl('api/feed')).toThrow(/non assoluto/);
  });
});

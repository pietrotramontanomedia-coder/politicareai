import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deduplica, hashBreve, leggiRss, risolviDateRelative, testoSemplice, unisci } from '../lib/agenzie/rss';

const ADESSO = new Date('2026-09-09T16:00:00Z');

function feedFinto(agenzia: 'ansa' | 'adnkronos'): string {
  const file = path.join(__dirname, '..', 'content', 'agenzia', 'finto', `${agenzia}.rss.xml`);
  return risolviDateRelative(readFileSync(file, 'utf8'), ADESSO);
}

describe('risolviDateRelative', () => {
  it('sostituisce i segnaposto con date RFC 2822 relative ad "adesso"', () => {
    const xml = risolviDateRelative('<pubDate>{{fa:15m}}</pubDate><pubDate>{{fa:2h}}</pubDate><pubDate>{{fa:1d}}</pubDate>', ADESSO);
    expect(xml).toContain(new Date('2026-09-09T15:45:00Z').toUTCString());
    expect(xml).toContain(new Date('2026-09-09T14:00:00Z').toUTCString());
    expect(xml).toContain(new Date('2026-09-08T16:00:00Z').toUTCString());
    expect(xml).not.toContain('{{fa:');
  });
});

describe('leggiRss sui feed finti', () => {
  it('legge il feed ANSA finto, scarta il duplicato e marca tutto come simulato', () => {
    const lanci = leggiRss(feedFinto('ansa'), { agenzia: 'ansa', simulato: true });
    // 7 item nel file, uno è un duplicato voluto
    expect(lanci).toHaveLength(6);
    expect(lanci.every((l) => l.simulato)).toBe(true);
    expect(lanci.every((l) => l.agenzia === 'ansa')).toBe(true);
    expect(lanci.every((l) => l.id.startsWith('ansa-'))).toBe(true);
    expect(lanci[0].titolo).toMatch(/^Simulazione: Consiglio dei ministri/);
    expect(lanci[0].data).toBe(new Date('2026-09-09T15:48:00Z').toISOString());
    expect(lanci[0].categoria).toBe('Simulazione');
  });

  it('estrae il sommario senza HTML, sia da description sia da content:encoded', () => {
    const ansa = leggiRss(feedFinto('ansa'), { agenzia: 'ansa', simulato: true });
    expect(ansa[0].testo).toMatch(/^\(Lancio simulato per lo sviluppo/);
    expect(ansa[0].testo).not.toContain('<p>');

    const adn = leggiRss(feedFinto('adnkronos'), { agenzia: 'adnkronos', simulato: true });
    const liste = adn.find((l) => l.titolo.includes('depositate le liste'));
    expect(liste?.testo).toContain('Da domani la verifica delle firme.');
    expect(liste?.testo).not.toContain('<p>');
  });

  it('produce id stabili a partire dal guid', () => {
    const prima = leggiRss(feedFinto('adnkronos'), { agenzia: 'adnkronos', simulato: true });
    const seconda = leggiRss(feedFinto('adnkronos'), { agenzia: 'adnkronos', simulato: true });
    expect(prima.map((l) => l.id)).toEqual(seconda.map((l) => l.id));
    expect(new Set(prima.map((l) => l.id)).size).toBe(prima.length);
  });

  it('accetta un feed Atom minimale', () => {
    const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry><title>Titolo Atom</title><link href="https://esempio.it/a"/><id>urn:1</id>
      <updated>2026-09-09T10:00:00Z</updated><summary>Sommario</summary></entry></feed>`;
    const [lancio] = leggiRss(atom, { agenzia: 'ansa', simulato: false });
    expect(lancio.titolo).toBe('Titolo Atom');
    expect(lancio.link).toBe('https://esempio.it/a');
    expect(lancio.data).toBe('2026-09-09T10:00:00.000Z');
    expect(lancio.testo).toBe('Sommario');
    expect(lancio.simulato).toBe(false);
  });

  it('usa "adesso" quando la data manca o non è leggibile', () => {
    const xml = `<rss><channel><item><title>Senza data</title><pubDate>boh</pubDate></item></channel></rss>`;
    const [lancio] = leggiRss(xml, { agenzia: 'ansa', simulato: false, adesso: ADESSO });
    expect(lancio.data).toBe(ADESSO.toISOString());
  });
});

describe('unisci', () => {
  it('ordina dal più recente e non fonde agenzie diverse sulla stessa notizia', () => {
    const ansa = leggiRss(feedFinto('ansa'), { agenzia: 'ansa', simulato: true });
    const adn = leggiRss(feedFinto('adnkronos'), { agenzia: 'adnkronos', simulato: true });
    const tutti = unisci([ansa, adn], 30);
    expect(tutti).toHaveLength(ansa.length + adn.length);
    for (let i = 1; i < tutti.length; i++) {
      expect(Date.parse(tutti[i - 1].data)).toBeGreaterThanOrEqual(Date.parse(tutti[i].data));
    }
    expect(tutti[0].agenzia).toBe('adnkronos'); // il lancio di 5 minuti fa
    expect(tutti.filter((l) => /Consiglio dei ministri/.test(l.titolo)).map((l) => l.agenzia).sort()).toEqual(['adnkronos', 'ansa']);
  });

  it('rispetta il limite', () => {
    const ansa = leggiRss(feedFinto('ansa'), { agenzia: 'ansa', simulato: true });
    expect(unisci([ansa], 3)).toHaveLength(3);
  });
});

describe('funzioni di supporto', () => {
  it('deduplica ignorando maiuscole e punteggiatura, ma non fra agenzie', () => {
    const base = { testo: '', data: ADESSO.toISOString(), link: '', simulato: true } as const;
    const lanci = deduplica([
      { ...base, id: 'ansa-1', agenzia: 'ansa', titolo: 'Camera, seduta sospesa!' },
      { ...base, id: 'ansa-2', agenzia: 'ansa', titolo: 'camera seduta sospesa' },
      { ...base, id: 'adnkronos-1', agenzia: 'adnkronos', titolo: 'Camera, seduta sospesa' },
    ]);
    expect(lanci.map((l) => l.id)).toEqual(['ansa-1', 'adnkronos-1']);
  });

  it('hashBreve è deterministico e corto', () => {
    expect(hashBreve('abc')).toBe(hashBreve('abc'));
    expect(hashBreve('abc')).not.toBe(hashBreve('abd'));
    expect(hashBreve('abc')).toMatch(/^[0-9a-z]{7,}$/);
  });

  it('testoSemplice rimuove i tag e normalizza gli spazi', () => {
    expect(testoSemplice('<p>Ciao   <b>mondo</b>&nbsp;&amp; co.</p>')).toBe('Ciao mondo & co.');
  });
});

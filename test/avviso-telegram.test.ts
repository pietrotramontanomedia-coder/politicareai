import { describe, expect, it } from 'vitest';
import { spezzaMessaggi, testoInHtml } from '@/lib/avviso-telegram';

describe('avviso privato su Telegram', () => {
  it("fa l'escape dell'HTML e trasforma il grassetto", () => {
    expect(testoInHtml('**1. Legge elettorale** <voto> & fiducia')).toBe('<b>1. Legge elettorale</b> &lt;voto&gt; &amp; fiducia');
  });

  it('un testo corto resta un messaggio solo', () => {
    expect(spezzaMessaggi('Primo paragrafo.\n\nSecondo.')).toEqual(['Primo paragrafo.\n\nSecondo.']);
  });

  it('spezza ai paragrafi senza superare il limite', () => {
    const p = 'x'.repeat(60);
    const pezzi = spezzaMessaggi([p, p, p].join('\n\n'), 130);
    expect(pezzi).toEqual([`${p}\n\n${p}`, p]);
    expect(pezzi.every((m) => m.length <= 130)).toBe(true);
  });

  it('un paragrafo enorme viene spezzato comunque', () => {
    const pezzi = spezzaMessaggi('y'.repeat(250), 100);
    expect(pezzi.every((m) => m.length <= 100)).toBe(true);
    expect(pezzi.join('')).toBe('y'.repeat(250));
  });
});

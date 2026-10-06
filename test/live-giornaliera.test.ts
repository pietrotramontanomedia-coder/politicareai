import { describe, expect, it } from 'vitest';
import { componiPagina, datiStrutturati, giornoDi, giorniDaPubblicare, notizieDelGiorno, oraDi, riassunto, slugGiorno, titoloGiorno } from '@/lib/live-giornaliera';
import type { NotiziaUltimOra } from '@/lib/ultimora-server';

const voce = (id: string, data: string, titolo: string, testo = ''): NotiziaUltimOra => ({
  id,
  data,
  titolo,
  testo,
  fonte: 'telegram',
  link: `https://t.me/politicare/${id.replace('tg-', '')}`,
});

describe('pagina Politica oggi', () => {
  it('usa il giorno di Roma, non quello UTC', () => {
    // 23:30 UTC del 5 ottobre è già il 6 ottobre a Roma
    expect(giornoDi(new Date('2026-10-05T23:30:00Z')).chiave).toBe('2026-10-06');
    expect(oraDi(new Date('2026-10-05T23:30:00Z'))).toBe('01:30');
  });

  it('slug e titolo in italiano', () => {
    const g = giornoDi(new Date('2026-10-06T10:00:00Z'));
    expect(slugGiorno(g)).toBe('politica-oggi-6-ottobre-2026');
    expect(titoloGiorno(g)).toBe('Politica oggi, 6 ottobre 2026: le notizie in diretta');
  });

  it('tiene solo le notizie del giorno, dalla più recente', () => {
    const g = giornoDi(new Date('2026-10-06T10:00:00Z'));
    const voci = [
      voce('tg-1', '2026-10-05T15:00:00Z', 'Ieri'),
      voce('tg-2', '2026-10-06T08:00:00Z', 'Mattina'),
      voce('tg-3', '2026-10-06T16:00:00Z', 'Pomeriggio'),
    ];
    expect(notizieDelGiorno(voci, g).map((v) => v.titolo)).toEqual(['Pomeriggio', 'Mattina']);
  });

  it('il contenuto ha un titoletto per notizia e i dati strutturati, senza fonte', () => {
    const g = giornoDi(new Date('2026-10-06T10:00:00Z'));
    const voci = [voce('tg-3', '2026-10-06T16:00:00Z', 'Pomeriggio <b>', 'Testo'), voce('tg-2', '2026-10-06T08:00:00Z', 'Mattina')];
    const html = componiPagina(voci, g, 'https://www.politicare.it/politica-oggi-6-ottobre-2026/');
    expect(html).toContain('18:00 · Pomeriggio &lt;b&gt;');
    expect(html).not.toContain('t.me/');
    expect(html).not.toContain('Fonte');
    expect(html).toContain('Le notizie di politica di oggi');
    expect(componiPagina(voci, g, 'https://x', false)).toContain('Le notizie di politica del 6 ottobre 2026');
    expect(html).toContain('"@type":"LiveBlogPosting"');
    expect(html).not.toContain('<b>');
  });

  it('i dati strutturati non possono chiudere il tag script', () => {
    const g = giornoDi(new Date('2026-10-06T10:00:00Z'));
    const json = datiStrutturati([voce('tg-9', '2026-10-06T09:00:00Z', 'Titolo </script><script>')], g, 'https://x');
    expect(json).not.toContain('</script><script>');
    expect(json).toContain('+02:00');
  });

  it('d’inverno il fuso è +01:00', () => {
    const g = giornoDi(new Date('2026-12-10T10:00:00Z'));
    expect(datiStrutturati([voce('tg-9', '2026-12-10T09:00:00Z', 'Titolo')], g, 'https://x')).toContain('+01:00');
  });

  it('il riassunto cita i primi titoli', () => {
    const g = giornoDi(new Date('2026-10-06T10:00:00Z'));
    expect(riassunto([voce('tg-2', '2026-10-06T08:00:00Z', 'Primo.'), voce('tg-1', '2026-10-06T07:00:00Z', 'Secondo')], g)).toBe(
      'Le notizie di politica del 6 ottobre: Primo; Secondo.',
    );
  });

  it('titolo dei giorni passati', () => {
    expect(titoloGiorno(giornoDi(new Date('2026-10-05T10:00:00Z')), false)).toBe('Politica oggi, 5 ottobre 2026: le notizie del giorno');
  });

  it('pubblica oggi e i giorni passati, ma non il giorno più vecchio del feed', () => {
    const voci = [
      voce('tg-6', '2026-10-06T08:00:00Z', 'Oggi'),
      voce('tg-5', '2026-10-05T15:00:00Z', 'Ieri'),
      voce('tg-4', '2026-10-04T15:00:00Z', 'Altro ieri'),
      voce('tg-1', '2026-10-01T15:00:00Z', 'Forse tagliato'),
    ];
    const giorni = giorniDaPubblicare(voci, new Date('2026-10-06T10:00:00Z')).map((g) => g.chiave);
    expect(giorni).toEqual(['2026-10-06', '2026-10-05', '2026-10-04']);
  });

  it('non torna indietro più di una settimana e oggi c’è sempre', () => {
    const voci = [voce('tg-2', '2026-09-20T10:00:00Z', 'Vecchia'), voce('tg-1', '2026-09-19T10:00:00Z', 'Più vecchia')];
    expect(giorniDaPubblicare(voci, new Date('2026-10-06T10:00:00Z')).map((g) => g.chiave)).toEqual(['2026-10-06']);
  });
});

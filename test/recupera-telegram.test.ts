import { describe, expect, it } from 'vitest';
import { ricostruisci } from '../strumenti/recupera-telegram';

const ID = 'b326ca5b1a3748e580b44358f9ac449f';
const messaggio = (id: number, testo: string, url?: string, foto = true, dim = '1080x1350') => ({
  id,
  date: 1791962880,
  testo,
  entita: url ? [{ t: 'messageEntityTextUrl', url }] : [],
  foto: foto ? Buffer.from([0xff, 0xd8, 0xff, 1]).toString('base64') : null,
  fotoTipo: 'image/jpeg',
  fotoDim: dim,
});

describe('ricostruzione dagli avvisi Telegram', () => {
  it('prende id, autore, tipo, data, copy e immagine di un post', () => {
    const [r] = ricostruisci(
      [messaggio(1, '🆕 Pasquale ha pubblicato un post\n\nPrima riga.\n\nSeconda parte.\n\nApri nel portale', `https://politicare-app.vercel.app/redazione?apri=${ID}`)],
      () => 'a'.repeat(32),
    );
    expect(r.contenuto).toMatchObject({ id: ID, tipo: 'post', autore: 'Pasquale', stato: 'da_rivedere', recuperatoDa: 'telegram', creatoIl: new Date(1791962880 * 1000).toISOString() });
    expect(r.contenuto.versioni[0]).toMatchObject({ immagini: ['a'.repeat(32)], didascalia: 'Prima riga.\n\nSeconda parte.', formato: '4:5' });
    expect(r.contenuto.eventi?.[0]).toMatchObject({ tipo: 'pubblicato', chi: 'Pasquale' });
    expect(r.immagine.dati[0]).toBe(0xff);
  });

  it('le storie non hanno copy; salta resoconti, promemoria e avvisi senza foto o senza link', () => {
    const fuori = ricostruisci([
      messaggio(2, '🆕 Domitilla ha pubblicato una storia\n\nApri nel portale', `https://x/redazione?apri=${ID}`, true, '900x1600'),
      messaggio(3, '📊 Resoconto di lunedì 12 ottobre', 'https://x/redazione'),
      messaggio(4, '🆕 Matteo ha pubblicato una storia\n\nApri nel portale', `https://x/redazione?apri=${ID}`, false),
      messaggio(5, '🆕 Matteo ha pubblicato una storia\n\nApri nel portale'),
    ]);
    expect(fuori).toHaveLength(1);
    expect(fuori[0].contenuto).toMatchObject({ tipo: 'storia', autore: 'Domitilla' });
    expect(fuori[0].contenuto.versioni[0].didascalia).toBe('');
  });
});

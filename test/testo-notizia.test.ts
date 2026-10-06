import { describe, expect, it } from 'vitest';
import { fraseDiApertura, titoloETesto, titoloLungo } from '@/lib/testo-notizia';

describe('titolo e testo delle notizie del canale', () => {
  it('la prima frase è il titolo, il resto il testo', () => {
    expect(titoloETesto('Sigfrido Ranucci sospeso per 10 giorni dalla Rai. La decisione è arrivata ieri.\n@Politicare')).toEqual({
      titolo: 'Sigfrido Ranucci sospeso per 10 giorni dalla Rai',
      testo: 'La decisione è arrivata ieri.\n@Politicare',
    });
  });

  it('i due punti non spezzano il titolo', () => {
    const { titolo, testo } = titoloETesto("Liceo Amaldi di Novi Ligure: disposta l'ispezione del Ministero. Valditara: \"Pluralismo\".");
    expect(titolo).toBe("Liceo Amaldi di Novi Ligure: disposta l'ispezione del Ministero");
    expect(testo).toBe('Valditara: "Pluralismo".');
  });

  it('un a capo a metà frase non spezza il titolo', () => {
    const { titolo, testo } = titoloETesto('Renzi dalla Leopolda provoca\nConte: "Chiedo delle garanzie". Poi il resto.');
    expect(titolo).toBe('Renzi dalla Leopolda provoca Conte: "Chiedo delle garanzie"');
    expect(testo).toBe('Poi il resto.');
  });

  it('dopo un titolo senza punto, una riga che comincia come frase nuova resta separata', () => {
    const { titolo, testo } = titoloETesto(
      "Sicilia: possibili dimissioni imminenti per il presidente\nSchifani\nL'ipotesi dopo le parole di Minardo.\nAltro.",
    );
    expect(titolo).toBe('Sicilia: possibili dimissioni imminenti per il presidente Schifani');
    expect(testo).toBe("L'ipotesi dopo le parole di Minardo.\nAltro.");
  });

  it('una riga vuota o un’emoji in fondo alla riga sono un a capo voluto', () => {
    expect(titoloETesto('"Condotta depistante" del senatore Scarpinato\n\nEx pm della Procura di Palermo.').titolo).toBe(
      '"Condotta depistante" del senatore Scarpinato',
    );
    expect(titoloETesto('Manovra approvata in Consiglio dei ministri 🔴\nIl testo va alle Camere.').titolo).toBe(
      'Manovra approvata in Consiglio dei ministri 🔴',
    );
  });

  it('il titolo non viene mai tagliato e non si ripete nel testo', () => {
    const lunga = `La Giunta del CONI ha votato all'unanimità per commissariare la FIGC ${'dopo molte polemiche '.repeat(8)}sulla nomina.`;
    const { titolo, testo } = titoloETesto(`${lunga} Seconda frase.`);
    expect(titolo).toBe(lunga.slice(0, -1));
    expect(titolo).not.toContain('…');
    expect(testo).toBe('Seconda frase.');
    expect(titoloLungo(titolo)).toBe(true);
    expect(fraseDiApertura(titolo)).toBe(lunga);
  });

  it('le abbreviazioni non chiudono la frase e i caratteri spuri delle emoji spariscono', () => {
    const { titolo } = titoloETesto('Accesso a mail, messaggi, ecc.) utili alle indagini su Ricci. Altro.');
    expect(titolo).toBe('Accesso a mail, messaggi, ecc.) utili alle indagini su Ricci');
    expect(titoloETesto('Foti parla di elezioni anticipateỊ Poi la manovra. Fine.').titolo).toBe('Foti parla di elezioni anticipate Poi la manovra');
  });
});

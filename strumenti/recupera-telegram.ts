/*
 * Ricostruisce i contenuti del portale della redazione dagli avvisi del bot nel gruppo Telegram,
 * quando l'archivio originale non è leggibile (15/10/2026: store Vercel bloccato).
 *
 * Il file di partenza si prende da Telegram Web: per ogni messaggio id, data, testo, link
 * (con l'id del contenuto) e la foto alla risoluzione più alta. Di ogni avviso «🆕 X ha pubblicato…»
 * tiene: id originale, autore, tipo, data e ora di pubblicazione, copy e immagine. Commenti,
 * versioni successive e stato non ci sono: il contenuto riparte «da rivedere».
 *
 *   npx tsx strumenti/recupera-telegram.ts <file.json>          prova: dice cosa farebbe
 *   npx tsx strumenti/recupera-telegram.ts <file.json> carica   scrive nell'archivio
 *
 * Con ARCHIVIO_URL e ARCHIVIO_TOKEN scrive nell'archivio nostro. Non tocca i contenuti già
 * presenti (stesso id) e non cancella niente.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { archivio } from '../lib/redazione/archivio-server';
import { nuovoContenuto } from '../lib/redazione/regole';
import type { Contenuto, FormatoPost } from '../lib/redazione/tipi';

interface Messaggio {
  id: number;
  date: number;
  testo: string;
  entita: { t: string; url?: string }[];
  foto: string | null;
  fotoTipo?: string;
  fotoDim?: string;
}

export interface Ricostruito {
  contenuto: Contenuto;
  immagine: { id: string; dati: Uint8Array; tipo: string };
}

const INTESTAZIONE = /^🆕 (.+?) ha pubblicato (un post|una storia)$/;

export function ricostruisci(messaggi: Messaggio[], nuovoIdImmagine = () => randomUUID().replace(/-/g, '')): Ricostruito[] {
  const fuori: Ricostruito[] = [];
  for (const m of [...messaggi].sort((a, b) => a.date - b.date)) {
    const righe = m.testo.split('\n');
    const intestazione = INTESTAZIONE.exec(righe[0]?.trim() ?? '');
    const link = m.entita.map((e) => e.url ?? '').find((u) => u.includes('apri='));
    const id = link ? new URL(link).searchParams.get('apri') : null;
    if (!intestazione || !id || !/^[a-f0-9]{32}$/.test(id) || !m.foto) continue;
    const tipo = intestazione[2] === 'un post' ? 'post' : 'storia';
    const blocchi = m.testo.split('\n\n');
    const didascalia = tipo === 'post' ? blocchi.slice(1, -1).join('\n\n').trim() : '';
    const [w, h] = (m.fotoDim ?? '').split('x').map(Number);
    const formato: FormatoPost = tipo === 'post' && w && h && Math.abs(w / h - 1) < 0.05 ? '1:1' : tipo === 'post' ? '4:5' : '1:1';
    const idImmagine = nuovoIdImmagine();
    const contenuto: Contenuto = {
      ...nuovoContenuto(id, tipo, intestazione[1], { immagini: [idImmagine], didascalia, formato }, new Date(m.date * 1000)),
      recuperatoDa: 'telegram',
    };
    fuori.push({ contenuto, immagine: { id: idImmagine, dati: Buffer.from(m.foto, 'base64'), tipo: m.fotoTipo || 'image/jpeg' } });
  }
  return fuori;
}

async function principale(): Promise<void> {
  const [file, modo] = process.argv.slice(2);
  if (!file) throw new Error('manca il file dei messaggi');
  const ricostruiti = ricostruisci(JSON.parse(readFileSync(file, 'utf8')) as Messaggio[]);
  const a = archivio();
  let caricati = 0;
  let presenti = 0;
  for (const { contenuto: c, immagine } of ricostruiti) {
    const gia = await a.leggi(c.id);
    const riga = `${c.creatoIl.slice(0, 16)} ${c.tipo.padEnd(6)} ${c.autore.padEnd(18)} ${c.id} ${c.versioni[0].didascalia.length} car.`;
    if (gia) {
      presenti++;
      console.log(`  già presente  ${riga}`);
      continue;
    }
    if (modo === 'carica') {
      await a.salvaMedia(immagine.id, immagine.dati, immagine.tipo);
      await a.crea(c);
      caricati++;
    }
    console.log(`  ${modo === 'carica' ? 'caricato     ' : 'da caricare  '} ${riga}`);
  }
  console.log(`\n${ricostruiti.length} contenuti ricostruiti, ${presenti} già presenti, ${caricati} caricati${modo === 'carica' ? '' : ' (prova: niente scritto)'}.`);
}

if (process.argv[1]?.endsWith('recupera-telegram.ts')) {
  principale().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

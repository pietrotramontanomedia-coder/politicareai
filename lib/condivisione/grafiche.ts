import { puntiEmiciclo, REGOLE } from '@/lib/simulatore-elettorale';
import { conAlfa, STRUMENTI } from '@/lib/strumenti';
import type { DatiConfronto, DatiQuiz, DatiSimulazione, DatiTest, Formato } from './dati';
import {
  adatta,
  caricaImmagine,
  carattere,
  COLORI,
  creaTela,
  fineContenuto,
  leggibile,
  PAD,
  piede,
  pillola,
  rettangolo,
  righeACapo,
  scriviRighe,
  sfondo,
  tesseraPartito,
  testata,
} from './tela';
import { TESTI_CONDIVISIONE as T } from './testi';

/* Le quattro grafiche da condividere: stesse regole di stile dell'app, nei formati post e storia. */

const PUNTI_CAMERA = puntiEmiciclo(REGOLE.camera.totale, 12);

export async function disegnaTest(d: DatiTest, formato: Formato): Promise<HTMLCanvasElement> {
  const t = await creaTela(formato);
  const { ctx, w, storia } = t;
  const colore = STRUMENTI.test.colore;
  sfondo(t, colore);
  await testata(t, T.test.etichetta, colore);

  let y = storia ? 330 : 250;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  carattere(t, 700, storia ? 88 : 72);
  ctx.fillStyle = COLORI.testo;
  ctx.fillText(T.test.titolo, PAD, y);
  y += storia ? 62 : 52;
  carattere(t, 400, 30);
  ctx.fillStyle = COLORI.muto;
  ctx.fillText(adatta(t, T.test.sottotitolo(d.righe.length, d.risposte, d.affermazioni), w - 2 * PAD), PAD, y);
  if (d.pariMerito) {
    y += 58;
    carattere(t, 700, 24);
    pillola(t, PAD, y, T.test.pariMerito, colore);
    y += 12;
  }
  y += storia ? 72 : 46;

  const fine = fineContenuto(t) - (d.esclusi.length > 0 ? 56 : 0);
  const passo = Math.min(storia ? 102 : 78, (fine - y) / Math.max(1, d.righe.length));
  const lato = Math.max(30, Math.min(62, passo - 16));
  const loghi = await Promise.all(d.righe.map((r) => (r.logo ? caricaImmagine(r.logo) : Promise.resolve(null))));
  const xLogo = PAD + 48;
  const xNome = xLogo + lato + 22;
  const xBarra = 590;
  const xFineBarra = w - PAD - 112;
  const altezzaBarra = storia ? 18 : 14;

  d.righe.forEach((r, i) => {
    const cy = y + i * passo + passo / 2;
    ctx.textBaseline = 'middle';

    carattere(t, 700, 26);
    ctx.fillStyle = COLORI.muto;
    ctx.textAlign = 'right';
    ctx.fillText(String(i + 1), PAD + 28, cy);

    tesseraPartito(t, r, loghi[i], xLogo, cy - lato / 2, lato);

    carattere(t, 600, Math.min(storia ? 34 : 30, passo * 0.42));
    ctx.fillStyle = COLORI.testo;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(adatta(t, r.nome, xBarra - xNome - 24), xNome, cy);

    rettangolo(ctx, xBarra, cy - altezzaBarra / 2, xFineBarra - xBarra, altezzaBarra, altezzaBarra / 2);
    ctx.fillStyle = COLORI.traccia;
    ctx.fill();
    const riempita = Math.max(altezzaBarra, ((xFineBarra - xBarra) * r.percentuale) / 100);
    rettangolo(ctx, xBarra, cy - altezzaBarra / 2, riempita, altezzaBarra, altezzaBarra / 2);
    ctx.fillStyle = leggibile(r.colore);
    ctx.fill();

    carattere(t, 700, storia ? 34 : 30);
    ctx.fillStyle = COLORI.testo;
    ctx.textAlign = 'right';
    ctx.fillText(`${r.percentuale}%`, w - PAD, cy);
  });

  if (d.esclusi.length > 0) {
    carattere(t, 400, 24);
    ctx.fillStyle = COLORI.muto;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(adatta(t, T.test.esclusi(d.esclusi), w - 2 * PAD), PAD, fine + 40);
  }

  piede(t, T.test.nota, T.test.invito, colore);
  return t.canvas;
}

export async function disegnaQuiz(d: DatiQuiz, formato: Formato): Promise<HTMLCanvasElement> {
  const t = await creaTela(formato);
  const { ctx, w, storia } = t;
  const colore = STRUMENTI.quiz.colore;
  sfondo(t, colore);
  await testata(t, T.quiz.etichetta, colore);

  let y = storia ? 320 : 232;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  carattere(t, 500, 30);
  ctx.fillStyle = COLORI.muto;
  ctx.fillText(adatta(t, d.intestazione, w - 2 * PAD), w / 2, y);

  y += storia ? 330 : 262;
  carattere(t, 700, storia ? 300 : 240);
  ctx.fillStyle = COLORI.testo;
  ctx.shadowColor = conAlfa(colore, 0.55);
  ctx.shadowBlur = 70;
  ctx.fillText(`${d.percentuale}%`, w / 2, y);
  ctx.shadowBlur = 0;

  y += storia ? 92 : 74;
  carattere(t, 700, 46);
  ctx.fillText(T.quiz.riepilogo(d.corrette, d.totale), w / 2, y);
  y += 56;
  carattere(t, 400, 32);
  ctx.fillStyle = COLORI.muto;
  y = scriviRighe(t, righeACapo(t, d.commento, w - 2 * PAD - 80, 2), w / 2, y, 42);

  // Una casella per domanda, nell'ordine del quiz
  const lato = storia ? 108 : 90;
  const spazio = 18;
  const x0 = (w - (d.esiti.length * lato + (d.esiti.length - 1) * spazio)) / 2;
  y += storia ? 90 : 56;
  d.esiti.forEach((giusta, i) => {
    const x = x0 + i * (lato + spazio);
    const c = giusta ? COLORI.verde : COLORI.rosso;
    rettangolo(ctx, x, y, lato, lato, lato * 0.24);
    ctx.fillStyle = conAlfa(giusta ? '#22c55e' : '#ef4444', 0.16);
    ctx.fill();
    ctx.strokeStyle = conAlfa(giusta ? '#22c55e' : '#ef4444', 0.7);
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = c;
    ctx.lineWidth = lato * 0.09;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (giusta) {
      ctx.moveTo(x + lato * 0.28, y + lato * 0.53);
      ctx.lineTo(x + lato * 0.44, y + lato * 0.68);
      ctx.lineTo(x + lato * 0.73, y + lato * 0.35);
    } else {
      ctx.moveTo(x + lato * 0.33, y + lato * 0.33);
      ctx.lineTo(x + lato * 0.67, y + lato * 0.67);
      ctx.moveTo(x + lato * 0.67, y + lato * 0.33);
      ctx.lineTo(x + lato * 0.33, y + lato * 0.67);
    }
    ctx.stroke();
  });
  y += lato + (storia ? 110 : 62);

  // Punteggio per sezione
  for (const s of d.sezioni) {
    ctx.textBaseline = 'alphabetic';
    carattere(t, 600, 30);
    ctx.fillStyle = COLORI.testo;
    ctx.textAlign = 'left';
    ctx.fillText(`${s.icona} ${s.titolo}`.trim(), PAD, y);
    carattere(t, 700, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`${s.corrette}/${s.totale}`, w - PAD, y);
    const yBarra = y + 20;
    rettangolo(ctx, PAD, yBarra, w - 2 * PAD, 14, 7);
    ctx.fillStyle = COLORI.traccia;
    ctx.fill();
    if (s.totale > 0 && s.corrette > 0) {
      rettangolo(ctx, PAD, yBarra, ((w - 2 * PAD) * s.corrette) / s.totale, 14, 7);
      ctx.fillStyle = colore;
      ctx.fill();
    }
    y += storia ? 96 : 72;
  }

  piede(t, T.quiz.nota(d.totale), T.quiz.invito, colore);
  return t.canvas;
}

export async function disegnaSimulazione(d: DatiSimulazione, formato: Formato): Promise<HTMLCanvasElement> {
  const t = await creaTela(formato);
  const { ctx, w, storia } = t;
  const colore = STRUMENTI.simulatore.colore;
  sfondo(t, colore);
  await testata(t, T.simulatore.etichetta, colore);

  let y = storia ? 320 : 238;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  carattere(t, 700, storia ? 84 : 68);
  ctx.fillStyle = COLORI.testo;
  ctx.fillText(T.simulatore.titolo, PAD, y);
  y += storia ? 64 : 54;
  carattere(t, 600, 30);
  ctx.fillStyle = d.assegnato ? COLORI.giallo : COLORI.muto;
  y = scriviRighe(t, righeACapo(t, d.premio, w - 2 * PAD, 2), PAD, y, 40);

  // Emiciclo della Camera
  const larghezzaE = storia ? w - 2 * PAD : 860;
  const scala = larghezzaE / 2.12;
  const cx = w / 2;
  const yBase = y + (storia ? 60 : 36) + 1.06 * scala;
  PUNTI_CAMERA.forEach((p, i) => {
    ctx.fillStyle = leggibile(d.coloriEmiciclo[i] ?? '#2a2a2a');
    ctx.beginPath();
    ctx.arc(cx + p.x * scala, yBase - p.y * scala, 0.0245 * scala, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.textAlign = 'center';
  carattere(t, 700, storia ? 130 : 104);
  ctx.fillStyle = COLORI.testo;
  ctx.fillText(String(d.seggiPrimo), cx, yBase - 0.16 * scala);
  carattere(t, 400, 26);
  ctx.fillStyle = COLORI.muto;
  ctx.fillText(d.maggioranza, cx, yBase + 56);

  // Legenda su due colonne
  y = yBase + (storia ? 150 : 118);
  carattere(t, 600, 22);
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORI.muto;
  ctx.fillText(T.simulatore.seggi.toUpperCase(), PAD, y);
  y += storia ? 58 : 46;

  const colonne = 2;
  const larghezzaCella = (w - 2 * PAD - 40) / colonne;
  const altezzaRiga = storia ? 76 : 58;
  const righeDisponibili = Math.max(1, Math.floor((fineContenuto(t) - y + 20) / altezzaRiga));
  const capienza = righeDisponibili * colonne;
  const mostrati = d.competitori.length > capienza ? d.competitori.slice(0, capienza - 1) : d.competitori;

  mostrati.forEach((c, i) => {
    const x = PAD + (i % colonne) * (larghezzaCella + 40);
    const cy = y + Math.floor(i / colonne) * altezzaRiga;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = leggibile(c.colore);
    ctx.beginPath();
    ctx.arc(x + 12, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    carattere(t, 700, storia ? 34 : 30);
    ctx.fillStyle = COLORI.testo;
    ctx.textAlign = 'right';
    const seggi = `${c.seggiCamera} · ${c.seggiSenato}`;
    ctx.fillText(seggi, x + larghezzaCella, cy);
    const larghezzaSeggi = ctx.measureText(seggi).width;
    carattere(t, 500, storia ? 30 : 27);
    ctx.textAlign = 'left';
    ctx.fillText(adatta(t, c.nome, larghezzaCella - larghezzaSeggi - 60), x + 36, cy);
  });
  if (mostrati.length < d.competitori.length) {
    const i = mostrati.length;
    carattere(t, 500, 26);
    ctx.fillStyle = COLORI.muto;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      T.simulatore.altri(d.competitori.length - mostrati.length),
      PAD + (i % colonne) * (larghezzaCella + 40) + 36,
      y + Math.floor(i / colonne) * altezzaRiga,
    );
  }

  piede(t, T.simulatore.nota, T.simulatore.invito, colore);
  return t.canvas;
}

const COLORI_GRUPPO = { favorevoli: COLORI.verde, neutri: COLORI.grigio, contrari: COLORI.rosso } as const;
const ESADECIMALI_GRUPPO = { favorevoli: '#22c55e', neutri: '#9ca3af', contrari: '#ef4444' } as const;

export async function disegnaConfronto(d: DatiConfronto, formato: Formato): Promise<HTMLCanvasElement> {
  const t = await creaTela(formato);
  const { ctx, w, storia } = t;
  const colore = STRUMENTI.confronta.colore;
  sfondo(t, colore);
  await testata(t, T.confronto.etichetta, colore);

  let y = storia ? 300 : 226;
  carattere(t, 700, 26);
  pillola(t, PAD, y, `${d.icona} ${d.tema.toUpperCase()}`.trim(), colore);

  y += storia ? 110 : 90;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const corpo = storia ? 62 : 50;
  carattere(t, 700, corpo);
  ctx.fillStyle = COLORI.testo;
  y = scriviRighe(t, righeACapo(t, d.affermazione, w - 2 * PAD, storia ? 6 : 4), PAD, y, corpo * 1.18);
  y += storia ? 70 : 48;

  const loghi = new Map(
    await Promise.all(
      d.gruppi.flatMap((g) => g.partiti).map(async (p) => [p.nome, p.logo ? await caricaImmagine(p.logo) : null] as const),
    ),
  );

  const fine = fineContenuto(t) - (d.senzaFonte.length > 0 ? 50 : 0);
  const larghezzaInterna = w - 2 * PAD - 48;
  const spazio = 22;
  const intestazione = 58;
  const altezzaGruppo = (n: number, lato: number) => {
    if (n === 0) return intestazione + 44;
    const perRiga = Math.max(1, Math.floor((larghezzaInterna + spazio) / (lato + spazio)));
    return intestazione + Math.ceil(n / perRiga) * (lato + 44) + 14;
  };
  const lati = storia ? [120, 108, 96, 84, 72, 60] : [100, 88, 76, 66, 58, 50];
  const lato =
    lati.find((l) => d.gruppi.reduce((a, g) => a + altezzaGruppo(g.partiti.length, l) + 18, 0) <= fine - y) ?? lati[lati.length - 1];
  const perRiga = Math.max(1, Math.floor((larghezzaInterna + spazio) / (lato + spazio)));

  // Se avanza spazio (tipico della storia), il blocco dei gruppi si centra fra testo e piede.
  const altezzaTotale = d.gruppi.reduce((a, g) => a + altezzaGruppo(g.partiti.length, lato) + 18, 0);
  y += Math.max(0, Math.min(180, (fine - y - altezzaTotale) / 2));

  for (const gruppo of d.gruppi) {
    const altezza = altezzaGruppo(gruppo.partiti.length, lato);
    const c = COLORI_GRUPPO[gruppo.chiave];
    rettangolo(ctx, PAD, y, w - 2 * PAD, altezza, 28);
    ctx.fillStyle = conAlfa(ESADECIMALI_GRUPPO[gruppo.chiave], 0.08);
    ctx.fill();
    ctx.strokeStyle = conAlfa(ESADECIMALI_GRUPPO[gruppo.chiave], 0.3);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textBaseline = 'middle';
    carattere(t, 700, 28);
    ctx.fillStyle = c;
    ctx.textAlign = 'left';
    ctx.fillText(gruppo.titolo, PAD + 24, y + 36);
    ctx.textAlign = 'right';
    ctx.fillText(String(gruppo.partiti.length), w - PAD - 24, y + 36);

    if (gruppo.partiti.length === 0) {
      carattere(t, 400, 26);
      ctx.fillStyle = COLORI.muto;
      ctx.textAlign = 'left';
      ctx.fillText(T.confronto.nessuno, PAD + 24, y + intestazione + 14);
    }
    gruppo.partiti.forEach((p, i) => {
      const x = PAD + 24 + (i % perRiga) * (lato + spazio);
      const yT = y + intestazione + Math.floor(i / perRiga) * (lato + 44);
      tesseraPartito(t, p, loghi.get(p.nome) ?? null, x, yT, lato);
      carattere(t, 600, Math.max(18, lato * 0.22));
      ctx.fillStyle = COLORI.testo;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(adatta(t, p.sigla, lato + spazio - 4), x + lato / 2, yT + lato + 30);
    });
    y += altezza + 18;
  }

  if (d.senzaFonte.length > 0) {
    carattere(t, 400, 24);
    ctx.fillStyle = COLORI.muto;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(adatta(t, T.confronto.senzaFonte(d.senzaFonte), w - 2 * PAD), PAD, Math.min(y + 30, fine + 36));
  }

  piede(t, T.confronto.nota, T.confronto.invito, colore);
  return t.canvas;
}

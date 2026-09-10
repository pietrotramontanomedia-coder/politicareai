import { conAlfa } from '@/lib/strumenti';
import { FORMATI, type Formato, type VocePartitoGrafica } from './dati';

/* Primitive di disegno su canvas per le grafiche da condividere. Da usare solo nel browser. */

export interface Tela {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  famiglia: string;
  storia: boolean;
}

export const PAD = 72;

export const COLORI = {
  sfondo: '#0a0a0a',
  testo: '#ffffff',
  muto: 'rgba(255,255,255,0.64)',
  traccia: 'rgba(255,255,255,0.1)',
  giallo: '#FEDC01',
  verde: '#22c55e',
  rosso: '#ef4444',
  grigio: '#9ca3af',
};

export async function creaTela(formato: Formato): Promise<Tela> {
  const { larghezza: w, altezza: h } = FORMATI[formato];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');

  // Stesso carattere dell'app (Google Sans, caricato con next/font): va atteso prima di disegnare.
  const famiglia = getComputedStyle(document.body).fontFamily || 'sans-serif';
  try {
    await Promise.all([400, 600, 700].map((peso) => document.fonts.load(`${peso} 40px ${famiglia}`)));
  } catch {
    // Senza il carattere dell'app si usa quello di sistema.
  }
  return { canvas, ctx, w, h, famiglia, storia: formato === 'storia' };
}

export function carattere(t: Tela, peso: number, px: number): void {
  t.ctx.font = `${peso} ${Math.round(px)}px ${t.famiglia}`;
}

export function caricaImmagine(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function rettangolo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Tronca con i puntini un testo che supera la larghezza (col carattere già impostato). */
export function adatta(t: Tela, testo: string, maxW: number): string {
  if (t.ctx.measureText(testo).width <= maxW) return testo;
  let s = testo;
  while (s.length > 1 && t.ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/** Spezza un testo in righe entro la larghezza; oltre maxRighe l'ultima riga termina coi puntini. */
export function righeACapo(t: Tela, testo: string, maxW: number, maxRighe: number): string[] {
  const righe: string[] = [];
  let corrente = '';
  for (const parola of testo.split(/\s+/).filter(Boolean)) {
    const prova = corrente ? `${corrente} ${parola}` : parola;
    if (!corrente || t.ctx.measureText(prova).width <= maxW) corrente = prova;
    else {
      righe.push(corrente);
      corrente = parola;
    }
  }
  if (corrente) righe.push(corrente);
  if (righe.length <= maxRighe) return righe;
  const tenute = righe.slice(0, maxRighe);
  tenute[maxRighe - 1] = adatta(t, `${tenute[maxRighe - 1]} ${righe.slice(maxRighe).join(' ')}`, maxW);
  return tenute;
}

export function scriviRighe(t: Tela, righe: string[], x: number, y: number, interlinea: number): number {
  righe.forEach((riga, i) => t.ctx.fillText(riga, x, y + i * interlinea));
  return y + (righe.length - 1) * interlinea;
}

/** Colori di partito troppo scuri per il fondo nero vengono schiariti, senza cambiarne il tono. */
export function leggibile(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const luminanza = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminanza >= 0.3) return hex;
  const mescola = (c: number) => Math.round(c + (255 - c) * 0.35);
  return `rgb(${mescola(r)}, ${mescola(g)}, ${mescola(b)})`;
}

/** Fondo scuro con aloni nel colore dello strumento, griglia fine e filo in testa. */
export function sfondo(t: Tela, accento: string): void {
  const { ctx, w, h } = t;
  ctx.fillStyle = COLORI.sfondo;
  ctx.fillRect(0, 0, w, h);

  const alone = (x: number, y: number, raggio: number, colore: string, alfa: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, raggio);
    g.addColorStop(0, conAlfa(colore, alfa));
    g.addColorStop(1, conAlfa(colore, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  alone(w * 0.9, h * 0.04, w * 0.95, accento, 0.26);
  alone(w * 0.05, h * 0.98, w * 0.85, '#4A6CA8', 0.16);

  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  const filo = ctx.createLinearGradient(0, 0, w, 0);
  filo.addColorStop(0, conAlfa(accento, 0));
  filo.addColorStop(0.5, accento);
  filo.addColorStop(1, conAlfa(accento, 0));
  ctx.fillStyle = filo;
  ctx.fillRect(0, 0, w, 6);
}

/** Pillola con testo; restituisce la larghezza. Imposta prima il carattere. */
export function pillola(t: Tela, x: number, cy: number, testo: string, colore: string, allinea: 'sinistra' | 'destra' = 'sinistra'): number {
  const { ctx } = t;
  const larghezza = ctx.measureText(testo).width + 44;
  const altezza = 52;
  const x0 = allinea === 'destra' ? x - larghezza : x;
  rettangolo(ctx, x0, cy - altezza / 2, larghezza, altezza, altezza / 2);
  ctx.fillStyle = conAlfa(colore, 0.16);
  ctx.fill();
  ctx.strokeStyle = conAlfa(colore, 0.45);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = colore;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(testo, x0 + 22, cy + 1);
  return larghezza;
}

/** Logo Politicare a sinistra ed etichetta dello strumento a destra. */
export async function testata(t: Tela, etichetta: string, colore: string): Promise<void> {
  const logo = await caricaImmagine('/logo-politicare.png');
  // Il PNG del logo ha molto margine attorno al marchio: lo si disegna più grande e spostato.
  const altezza = 150;
  const centro = PAD + 36;
  if (logo) t.ctx.drawImage(logo, PAD - 44, centro - altezza / 2, altezza * (logo.naturalWidth / logo.naturalHeight), altezza);
  carattere(t, 700, 24);
  pillola(t, t.w - PAD, centro, etichetta.toUpperCase(), colore, 'destra');
}

/** Dove finisce lo spazio dei contenuti, sopra il piede. */
export function fineContenuto(t: Tela): number {
  return t.h - 250;
}

/** Nota metodologica, invito e indirizzo del sito. */
export function piede(t: Tela, nota: string, invito: string, colore: string): void {
  const { ctx, w, h } = t;
  const yLinea = h - 210;
  ctx.fillStyle = COLORI.traccia;
  ctx.fillRect(PAD, yLinea, w - 2 * PAD, 2);

  carattere(t, 400, 26);
  ctx.fillStyle = COLORI.muto;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  scriviRighe(t, righeACapo(t, nota, w - 2 * PAD, 2), PAD, yLinea + 50, 36);

  const yBase = h - PAD + 4;
  carattere(t, 600, 32);
  ctx.fillStyle = COLORI.testo;
  ctx.fillText(`${invito} →`, PAD, yBase);
  carattere(t, 700, 32);
  ctx.fillStyle = colore;
  ctx.textAlign = 'right';
  ctx.fillText(window.location.host, w - PAD, yBase);
  ctx.textAlign = 'left';
}

/** Tessera chiara con il logo del partito, o la sigla se il logo manca. */
export function tesseraPartito(t: Tela, voce: VocePartitoGrafica, logo: HTMLImageElement | null, x: number, y: number, lato: number): void {
  const { ctx } = t;
  ctx.save();
  rettangolo(ctx, x, y, lato, lato, lato * 0.24);
  ctx.fillStyle = '#F4F4F5';
  ctx.fill();
  if (logo) {
    ctx.clip();
    const disponibile = lato * 0.8;
    const scala = Math.min(disponibile / logo.naturalWidth, disponibile / logo.naturalHeight);
    const lw = logo.naturalWidth * scala;
    const lh = logo.naturalHeight * scala;
    ctx.drawImage(logo, x + (lato - lw) / 2, y + (lato - lh) / 2, lw, lh);
  } else {
    carattere(t, 700, lato * 0.3);
    ctx.fillStyle = voce.colore;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(adatta(t, voce.sigla, lato * 0.86), x + lato / 2, y + lato / 2);
  }
  ctx.restore();
}

import { load } from 'cheerio';
import type { Agenzia, LancioAgenzia } from './tipi';

/**
 * Lettore RSS 2.0 (con tolleranza per Atom) che trasforma un feed in lanci
 * normalizzati. Pura funzione di testo: niente rete, niente filesystem, così è
 * testabile con i feed finti in content/agenzia/finto.
 */

const MAX_TESTO = 600;

/** Hash FNV-1a a 32 bit in base 36: corto, stabile, senza dipendenze da node:crypto. */
export function hashBreve(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, '0');
}

/** Rimuove tag e decodifica le entità più comuni: i sommari RSS spesso contengono HTML. */
export function testoSemplice(html: string): string {
  const $ = load(`<div>${html}</div>`);
  return $('div')
    .text()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizzaData(grezza: string): string | null {
  const t = Date.parse(grezza.trim());
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export interface OpzioniLettura {
  agenzia: Agenzia;
  simulato: boolean;
  /** Se il feed non ha date valide si usa questa come riferimento (di norma "adesso"). */
  adesso?: Date;
}

export function leggiRss(xml: string, opzioni: OpzioniLettura): LancioAgenzia[] {
  const $ = load(xml, { xmlMode: true });
  const lanci: LancioAgenzia[] = [];
  const adesso = opzioni.adesso ?? new Date();

  // RSS 2.0 usa <item>, Atom usa <entry>: si accettano entrambi.
  $('item, entry').each((_, el) => {
    const nodo = $(el);
    const titolo = testoSemplice(nodo.find('title').first().text());
    if (!titolo) return;

    const link =
      nodo.find('link').first().text().trim() ||
      nodo.find('link').first().attr('href')?.trim() ||
      '';
    const guid = nodo.find('guid, id').first().text().trim() || link || titolo;
    const dataGrezza =
      nodo.find('pubDate').first().text() ||
      nodo.find('published, updated, dc\\:date').first().text();
    const data = normalizzaData(dataGrezza) ?? adesso.toISOString();

    const sommarioGrezzo =
      nodo.find('description').first().text() ||
      nodo.find('summary, content\\:encoded, content').first().text();
    const testo = testoSemplice(sommarioGrezzo).slice(0, MAX_TESTO);

    const categoria = nodo.find('category').first().text().trim() || undefined;

    lanci.push({
      id: `${opzioni.agenzia}-${hashBreve(guid)}`,
      agenzia: opzioni.agenzia,
      titolo,
      // Il sommario che ripete il titolo non aggiunge nulla.
      testo: testo && testo !== titolo ? testo : '',
      data,
      link,
      categoria,
      simulato: opzioni.simulato,
    });
  });

  return deduplica(lanci);
}

function chiaveTitolo(titolo: string): string {
  return titolo
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, 60);
}

/** Dentro la stessa agenzia lo stesso titolo ripubblicato conta una volta sola. */
export function deduplica(lanci: LancioAgenzia[]): LancioAgenzia[] {
  const visti = new Set<string>();
  return lanci.filter((l) => {
    const chiave = `${l.agenzia}|${chiaveTitolo(l.titolo)}`;
    if (visti.has(chiave)) return false;
    visti.add(chiave);
    return true;
  });
}

/** Ordina dal più recente e taglia al limite. Agenzie diverse sulla stessa notizia restano entrambe. */
export function unisci(gruppi: LancioAgenzia[][], limite: number): LancioAgenzia[] {
  return gruppi
    .flat()
    .sort((a, b) => Date.parse(b.data) - Date.parse(a.data))
    .slice(0, limite);
}

/**
 * I feed finti hanno date relative del tipo {{fa:15m}}, {{fa:2h}}, {{fa:1d}}
 * così sembrano sempre freschi in sviluppo. Qui si sostituiscono con date RFC 2822.
 */
export function risolviDateRelative(xml: string, adesso: Date = new Date()): string {
  return xml.replace(/\{\{fa:(\d+)([mhd])\}\}/g, (_, quanto: string, unita: string) => {
    const fattore = unita === 'm' ? 60_000 : unita === 'h' ? 3_600_000 : 86_400_000;
    return new Date(adesso.getTime() - Number(quanto) * fattore).toUTCString();
  });
}

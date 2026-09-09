import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { leggiRss, risolviDateRelative, unisci } from './rss';
import { AGENZIE, DESCRIZIONI_AGENZIE, type Agenzia, type LancioAgenzia, type RispostaAgenzie, type StatoAgenzia } from './tipi';

/**
 * Lato server dell'ultim'ora agenzie: decide da dove arrivano i feed (reali o
 * finti), li scarica, li passa al lettore RSS e li unisce.
 *
 * Interruttore AGENZIE_SIMULA:
 *   "1"     -> sempre feed finti (content/agenzia/finto)
 *   "0"     -> sempre feed reali
 *   assente -> finti in `next dev`, reali in produzione
 */

const LIMITE = 30;
const REVALIDATE_S = 300;
const TIMEOUT_MS = 8000;
const UA = 'Mozilla/5.0 (compatible; PoliticareBot/1.0; +https://www.politicare.it)';

export function simulazioneAttiva(): boolean {
  const flag = process.env.AGENZIE_SIMULA;
  if (flag === '1') return true;
  if (flag === '0') return false;
  return process.env.NODE_ENV === 'development';
}

export function urlFeed(agenzia: Agenzia): string {
  const d = DESCRIZIONI_AGENZIE[agenzia];
  return process.env[d.variabileAmbiente]?.trim() || d.feedPredefinito;
}

/** Il feed finto di un'agenzia, con le date relative già risolte. */
export async function leggiXmlFinto(agenzia: Agenzia, adesso: Date = new Date()): Promise<string> {
  const file = path.join(process.cwd(), 'content', 'agenzia', 'finto', `${agenzia}.rss.xml`);
  const xml = await readFile(file, 'utf8');
  return risolviDateRelative(xml, adesso);
}

async function scaricaXml(url: string): Promise<string> {
  const response = await fetch(url, {
    next: { revalidate: REVALIDATE_S },
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

interface EsitoFonte {
  lanci: LancioAgenzia[];
  stato: StatoAgenzia;
}

async function leggiFonte(agenzia: Agenzia, simulato: boolean): Promise<EsitoFonte> {
  try {
    const xml = simulato ? await leggiXmlFinto(agenzia) : await scaricaXml(urlFeed(agenzia));
    const lanci = leggiRss(xml, { agenzia, simulato });
    return {
      lanci,
      stato: {
        agenzia,
        stato: simulato ? 'simulato' : lanci.length > 0 ? 'ok' : 'vuoto',
        lanci: lanci.length,
      },
    };
  } catch (errore) {
    return {
      lanci: [],
      stato: {
        agenzia,
        stato: 'errore',
        lanci: 0,
        dettaglio: errore instanceof Error ? errore.message : 'errore sconosciuto',
      },
    };
  }
}

/** Tutti i lanci delle agenzie richieste, dal più recente. Una fonte che fallisce non blocca le altre. */
export async function leggiLanci(agenzie: Agenzia[] = AGENZIE): Promise<RispostaAgenzie> {
  const simulato = simulazioneAttiva();
  const esiti = await Promise.all(agenzie.map((a) => leggiFonte(a, simulato)));

  const lanci = unisci(esiti.map((e) => e.lanci), LIMITE);
  const fonti = esiti.map((e) => e.stato);

  return {
    success: lanci.length > 0,
    lanci,
    fonti,
    simulazione: fonti.some((f) => f.stato === 'simulato'),
    timestamp: new Date().toISOString(),
  };
}

export async function leggiLancio(id: string): Promise<LancioAgenzia | null> {
  const agenzia = AGENZIE.find((a) => id.startsWith(`${a}-`));
  if (!agenzia) return null;
  const { lanci } = await leggiLanci([agenzia]);
  return lanci.find((l) => l.id === id) ?? null;
}

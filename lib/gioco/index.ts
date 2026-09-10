import paccoBase from '@/content/gioco/base.v1.json';
import paccoAttualita from '@/content/gioco/attualita.2026-09.json';
import type { PaccoCarte } from './tipi';

export * from './tipi';
export * from './mazzo';
export { TESTI_GIOCO, ETICHETTE_TIPO } from './testi';

export const PACCO_BASE = paccoBase as PaccoCarte;
export const PACCO_ATTUALITA = paccoAttualita as PaccoCarte;

/** I pacchi da usare in partita: la base c'è sempre, l'attualità è opzionale. */
export function pacchiScelti(conAttualita: boolean): PaccoCarte[] {
  return conAttualita ? [PACCO_BASE, PACCO_ATTUALITA] : [PACCO_BASE];
}

import { timingSafeEqual } from 'node:crypto';

/** Vercel Cron invia `Authorization: Bearer <CRON_SECRET>`: confronto a tempo costante. */
export function autorizzatoCron(intestazione: string | null, segreto: string | undefined): boolean {
  if (!segreto || !intestazione) return false;
  const atteso = Buffer.from(`Bearer ${segreto}`);
  const ricevuto = Buffer.from(intestazione);
  return atteso.length === ricevuto.length && timingSafeEqual(atteso, ricevuto);
}

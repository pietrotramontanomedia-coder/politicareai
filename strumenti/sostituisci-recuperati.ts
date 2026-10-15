/*
 * Rimette gli originali al posto dei contenuti ricostruiti da Telegram (recuperatoDa: 'telegram'),
 * appena il vecchio store è di nuovo leggibile. L'originale porta versioni, commenti, stato e
 * registro com'erano; quello che è successo dopo il recupero (commenti, cambi di stato, versioni
 * nuove) si aggiunge in coda, così non si perde niente di nessuna delle due parti.
 *
 *   npx tsx strumenti/sostituisci-recuperati.ts <cartella con i JSON originali>          prova
 *   npx tsx strumenti/sostituisci-recuperati.ts <cartella con i JSON originali> applica
 *
 * La cartella è la copia del vecchio store (redazione/contenuti/<id>.json). Scrive nell'archivio
 * di ARCHIVIO_URL con ARCHIVIO_TOKEN, attraverso l'indice (aggiorna), come il portale.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { archivio } from '../lib/redazione/archivio-server';
import type { Contenuto } from '../lib/redazione/tipi';

/** Unisce l'originale e quello che è successo al contenuto ricostruito dopo il recupero. */
export function unisci(originale: Contenuto, recuperato: Contenuto): { contenuto: Contenuto; aggiunte: number } {
  const ultima = originale.versioni[originale.versioni.length - 1]?.numero ?? 1;
  // La versione 1 del ricostruito è l'ultima che il bot aveva mandato: corrisponde all'ultima dell'originale.
  const mappa = (n: number) => (n <= 1 ? ultima : ultima + n - 1);
  const versioniNuove = recuperato.versioni.filter((v) => v.numero > 1).map((v) => ({ ...v, numero: mappa(v.numero) }));
  const commentiNuovi = recuperato.commenti.filter((c) => !originale.commenti.some((o) => o.id === c.id)).map((c) => ({ ...c, versione: mappa(c.versione) }));
  const eventiNuovi = (recuperato.eventi ?? []).slice(1).map((e) => ({ ...e, ...('versione' in e && typeof e.versione === 'number' ? { versione: mappa(e.versione) } : {}) }));
  const cambiatoStato = eventiNuovi.some((e) => e.tipo === 'stato' || e.tipo === 'nuova_versione' || e.tipo === 'eliminato' || e.tipo === 'ripristinato');
  const contenuto: Contenuto = {
    ...originale,
    versioni: [...originale.versioni, ...versioniNuove],
    commenti: [...originale.commenti, ...commentiNuovi],
    eventi: [...(originale.eventi ?? []), ...eventiNuovi],
    stato: cambiatoStato ? recuperato.stato : originale.stato,
    aggiornatoIl: recuperato.aggiornatoIl > originale.aggiornatoIl && eventiNuovi.length ? recuperato.aggiornatoIl : originale.aggiornatoIl,
    ...(recuperato.eliminatoIl && !originale.eliminatoIl ? { eliminatoIl: recuperato.eliminatoIl, eliminatoDa: recuperato.eliminatoDa } : {}),
  };
  delete contenuto.recuperatoDa;
  delete contenuto.rev;
  return { contenuto, aggiunte: versioniNuove.length + commentiNuovi.length + eventiNuovi.length };
}

async function principale(): Promise<void> {
  const [cartella, modo] = process.argv.slice(2);
  if (!cartella) throw new Error('manca la cartella con i JSON originali');
  const a = archivio();
  const recuperati = (await a.stato()).contenuti.filter((c) => c.recuperatoDa === 'telegram');
  let fatti = 0;
  for (const r of recuperati) {
    const file = path.join(cartella, `${r.id}.json`);
    if (!existsSync(file)) {
      console.log(`  manca l'originale  ${r.id} (${r.autore})`);
      continue;
    }
    const { contenuto, aggiunte } = unisci(JSON.parse(readFileSync(file, 'utf8')) as Contenuto, r);
    const riga = `${contenuto.creatoIl.slice(0, 16)} ${contenuto.tipo.padEnd(6)} ${contenuto.autore.padEnd(18)} v${contenuto.versioni.length} ${String(contenuto.commenti.length).padStart(2)} commenti  ${contenuto.stato}${aggiunte ? `  (+${aggiunte} di oggi)` : ''}`;
    if (modo === 'applica') {
      await a.aggiorna(r.id, () => contenuto);
      fatti++;
    }
    console.log(`  ${modo === 'applica' ? 'sostituito' : 'da sostituire'}  ${riga}`);
  }
  console.log(`\n${recuperati.length} ricostruiti nell'archivio, ${fatti} sostituiti${modo === 'applica' ? '' : ' (prova: niente scritto)'}.`);
}

if (process.argv[1]?.endsWith('sostituisci-recuperati.ts')) {
  principale().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

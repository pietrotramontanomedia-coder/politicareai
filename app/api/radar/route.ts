import { autorizzatoCron } from '@/lib/cron';
import {
  accelerazione,
  componiAvviso,
  inOrario,
  troppoPresto,
  opzioniRadar,
  pota,
  querySuX,
  segnaliDaValutare,
  trovaSegnali,
  valutazioniRimaste,
  type Avviso,
  type Rilevazione,
  type Segnale,
} from '@/lib/radar';
import { scremaTendenze, valutaTendenza, valutazioneDisponibile } from '@/lib/radar-claude-server';
import { leggiStato, salvaStato } from '@/lib/radar-registro';
import { campionePost, conteggiOrari, leggiTendenze, letturaXConfigurata } from '@/lib/radar-x-server';
import { avvisiTelegramConfigurati, descriviDestinatario, inviaAvvisoTelegram } from '@/lib/radar-telegram-server';

/**
 * Radar dei trend su X (vedi docs/RADAR.md). Lo chiama un job programmato ogni 20-30 minuti:
 * legge le tendenze italiane, trova i temi che salgono, fa valutare i migliori a Claude
 * e, in modalità `avvisa`, manda le bozze in privato su Telegram. Non pubblica mai su X.
 *
 * È scollegato dal ponte Telegram → X: bot, chiavi X, chiave Claude e file di stato sono suoi
 * (variabili RADAR_*), e non importa nulla del codice del ponte.
 *
 * `?prova=1` fa un giro completo senza mandare messaggi e senza segnare i temi come proposti.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ORE_RILEVAZIONI = 48;
const ORE_AVVISI = 24 * 14;

interface Esito {
  nome: string;
  motivo: string;
  accelerazione: number | null;
  esito: 'inviato' | 'registrato' | 'non pertinente' | 'non accelera' | 'errore';
  dettaglio?: string;
  bozze?: string[];
}

function messaggioErrore(errore: unknown): string {
  return errore instanceof Error ? errore.message : String(errore);
}

export async function GET(request: Request) {
  if (!autorizzatoCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ ok: false, error: 'non autorizzato' }, { status: 401 });
  }

  const opzioni = opzioniRadar(process.env);
  const parametri = new URL(request.url).searchParams;

  // `?telegram=chi` dice quale bot scrive e a quale chat, senza mandare nulla e senza mostrare il token.
  if (parametri.get('telegram') === 'chi') {
    try {
      return Response.json({ ok: true, ...(await descriviDestinatario()) });
    } catch (errore) {
      return Response.json({ ok: false, error: messaggioErrore(errore) }, { status: 502 });
    }
  }

  // `?telegram=1` manda un avviso di esempio: serve a verificare che il bot del radar
  // sappia scrivere a RADAR_TELEGRAM_CHAT, senza aspettare che un tema vero passi tutti i filtri.
  if (parametri.get('telegram') === '1') {
    if (!avvisiTelegramConfigurati()) {
      return Response.json({ ok: false, error: 'RADAR_TELEGRAM_BOT_TOKEN o RADAR_TELEGRAM_CHAT mancanti' }, { status: 503 });
    }
    const esempio = componiAvviso(
      { nome: 'Esempio', chiave: 'esempio', posizione: 7, posizionePrima: 19, volume: 12400, volumePrima: 4100, forza: 2.7, motivo: 'da 19\u00b0 a 7\u00b0 posto' },
      {
        pertinente: true,
        tema: "Messaggio di prova del radar: nessun tema reale, serve solo a controllare che gli avvisi arrivino.",
        motivo: 'Se stai leggendo questo, il bot del radar sa scriverti e le bozze arriveranno qui.',
        gancio: 'politicare.it/simulatore',
        bozze: ['Prima bozza di esempio: qui ci sar\u00e0 il post pronto, con i numeri e le fonti del tema che sta salendo.', 'Seconda bozza di esempio: un taglio diverso sullo stesso tema.'],
        verifiche: ['Questo \u00e8 un messaggio di prova, non pubblicare nulla.'],
      },
      2.4,
    );
    try {
      await inviaAvvisoTelegram(esempio);
      return Response.json({ ok: true, inviato: 'avviso di esempio' });
    } catch (errore) {
      return Response.json({ ok: false, error: `Telegram: ${messaggioErrore(errore)}` }, { status: 502 });
    }
  }

  const prova = parametri.get('prova') === '1';
  if (opzioni.modalita === 'spento' && !prova) {
    return Response.json({ ok: true, attivo: false, nota: 'RADAR_MODALITA non impostata: il radar è spento' });
  }
  const adesso = new Date();
  if (!prova && !inOrario(opzioni.orario, adesso)) {
    return Response.json({ ok: true, attivo: false, nota: `fuori orario (${opzioni.orario.join('-')}): nessuna lettura` });
  }
  if (!letturaXConfigurata()) {
    return Response.json({ ok: false, error: 'RADAR_X_BEARER_TOKEN mancante' }, { status: 503 });
  }

  const stato = await leggiStato();
  if (!prova && troppoPresto(stato.rilevazioni, opzioni.intervalloMinuti, adesso)) {
    return Response.json({ ok: true, attivo: false, nota: `ultimo giro da meno di ${opzioni.intervalloMinuti} minuti: nessuna lettura` });
  }

  let attuale: Rilevazione;
  try {
    attuale = { quando: adesso.toISOString(), tendenze: (await leggiTendenze()).slice(0, opzioni.classifica) };
  } catch (errore) {
    console.error('[radar] tendenze non lette:', errore);
    return Response.json({ ok: false, error: `tendenze non lette: ${messaggioErrore(errore)}` }, { status: 502 });
  }

  const segnali = trovaSegnali(stato.rilevazioni, attuale, opzioni.classifica);
  const rimaste = valutazioniRimaste(stato.avvisi, opzioni.massimoGiorno, adesso);

  // Prima della valutazione vera un filtro rapido scarta i temi non politici (sport, serie tv, marchi):
  // senza, il tema più forte del giorno, anche se è Bridgerton, si prende il posto e il tetto giornaliero.
  // Se il filtro non risponde si va avanti con tutti i segnali, come prima.
  let candidati = segnali;
  let scartati: string[] = [];
  if (valutazioneDisponibile() && rimaste > 0 && segnali.length) {
    try {
      const tenuti = await scremaTendenze(segnali.map((s) => s.nome));
      candidati = segnali.filter((s) => tenuti.has(s.nome));
      scartati = segnali.filter((s) => !tenuti.has(s.nome)).map((s) => s.nome);
    } catch (errore) {
      console.warn('[radar] filtro non riuscito, si valutano tutti i segnali:', errore);
    }
  }
  const scelti = valutazioneDisponibile()
    ? segnaliDaValutare(candidati, stato.avvisi, { ...opzioni, valutazioni: Math.min(opzioni.valutazioni, rimaste) }, adesso)
    : [];
  const telegram = avvisiTelegramConfigurati();
  const invia = opzioni.modalita === 'avvisa' && !prova && telegram;

  const valuta = async (segnale: Segnale): Promise<{ esito: Esito; avviso?: Avviso }> => {
    const query = querySuX(segnale.nome);
    let accel: number | null = null;
    try {
      accel = accelerazione(await conteggiOrari(query));
    } catch (errore) {
      console.warn(`[radar] conteggi non letti per ${segnale.nome}:`, errore);
    }
    const base = { nome: segnale.nome, motivo: segnale.motivo, accelerazione: accel };
    if (accel !== null && accel < opzioni.accelerazioneMinima) return { esito: { ...base, esito: 'non accelera' } };

    try {
      const campione = opzioni.campione
        ? await campionePost(query, opzioni.campione).catch((errore) => {
            console.warn(`[radar] campione non letto per ${segnale.nome}:`, errore);
            return [];
          })
        : [];
      const valutazione = await valutaTendenza(segnale, campione, adesso);
      const avviso: Avviso = {
        chiave: segnale.chiave,
        nome: segnale.nome,
        quando: adesso.toISOString(),
        inviato: false,
        forza: segnale.forza,
        motivo: segnale.motivo,
        accelerazione: accel,
        valutazione,
      };
      if (!valutazione.pertinente) {
        return { esito: { ...base, esito: 'non pertinente', dettaglio: valutazione.motivo }, avviso };
      }
      if (invia && valutazione.bozze.length) {
        await inviaAvvisoTelegram(componiAvviso(segnale, valutazione, accel));
        avviso.inviato = true;
      }
      return {
        esito: { ...base, esito: avviso.inviato ? 'inviato' : 'registrato', dettaglio: valutazione.tema, bozze: valutazione.bozze },
        avviso,
      };
    } catch (errore) {
      console.error(`[radar] valutazione fallita per ${segnale.nome}:`, errore);
      return { esito: { ...base, esito: 'errore', dettaglio: messaggioErrore(errore) } };
    }
  };

  const risultati = await Promise.all(scelti.map(valuta));

  stato.rilevazioni = pota([...stato.rilevazioni, attuale], ORE_RILEVAZIONI, adesso);
  if (!prova) {
    const nuovi = risultati.flatMap((r) => (r.avviso ? [r.avviso] : []));
    stato.avvisi = pota([...stato.avvisi, ...nuovi], ORE_AVVISI, adesso);
  }
  try {
    await salvaStato(stato);
  } catch (errore) {
    console.error('[radar] stato non salvato:', errore);
  }

  return Response.json({
    ok: true,
    modalita: prova ? 'prova' : opzioni.modalita,
    tendenze: attuale.tendenze.length,
    segnali: segnali.slice(0, 10).map((s) => ({ nome: s.nome, motivo: s.motivo, forza: s.forza })),
    valutati: risultati.map((r) => r.esito),
    ...(scartati.length ? { scartati } : {}),
    ...(valutazioneDisponibile() ? {} : { nota: 'RADAR_ANTHROPIC_API_KEY mancante: segnali registrati senza valutazione' }),
    ...(rimaste === 0 && segnali.length ? { tetto: `raggiunto il tetto di ${opzioni.massimoGiorno} temi valutati oggi` } : {}),
    ...(opzioni.modalita === 'avvisa' && !telegram
      ? { avviso: 'RADAR_TELEGRAM_BOT_TOKEN o RADAR_TELEGRAM_CHAT mancante: nessun messaggio inviato' }
      : {}),
  });
}

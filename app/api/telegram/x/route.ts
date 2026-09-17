import { CANALE_TELEGRAM } from '@/lib/telegram-server';
import { componiPostConRiscrittura, estraiPostCanale, opzioniFormato } from '@/lib/telegram-x';
import { riscritturaDisponibile, riscriviPerX } from '@/lib/riscrittura-server';
import { scaricaFotoTelegram, segretoTelegramValido } from '@/lib/telegram-bot-server';
import { giaPubblicato, registraPubblicazione, ultimaPubblicazione } from '@/lib/telegram-x-registro';
import { pubblicaSuX, rifiutatoDaX, xConfigurato } from '@/lib/x-server';

/**
 * Webhook di Telegram: ogni post nuovo del canale arriva qui e viene ripubblicato su X.
 * Registrazione: `node strumenti/telegram-x.mjs registra` (vedi docs/TELEGRAM-X.md).
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SITO = process.env.SITO_URL ?? 'https://politicare-app.vercel.app';

/** Minuti minimi fra un post e l'altro su X: due post nello stesso minuto sono la firma dello spam. */
function distanzaMinima(): number {
  const valore = Number(process.env.X_DISTANZA_MINUTI ?? 10);
  return Number.isFinite(valore) && valore >= 0 ? valore : 10;
}

export async function GET() {
  return Response.json({
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET),
    x: xConfigurato(),
    canale: process.env.TELEGRAM_CANALE ?? CANALE_TELEGRAM,
    formato: opzioniFormato(process.env),
    distanzaMinuti: distanzaMinima(),
    riscrittura: riscritturaDisponibile(),
  });
}

export async function POST(request: Request) {
  if (!segretoTelegramValido(request.headers.get('x-telegram-bot-api-secret-token'), process.env.TELEGRAM_WEBHOOK_SECRET)) {
    return Response.json({ ok: false, error: 'non autorizzato' }, { status: 401 });
  }

  const aggiornamento = await request.json().catch(() => null);
  const post = estraiPostCanale(aggiornamento);
  if (!post) return Response.json({ ok: true, ignorato: 'non è un post nuovo di un canale' });

  const canale = process.env.TELEGRAM_CANALE ?? CANALE_TELEGRAM;
  if (post.canale.toLowerCase() !== canale.toLowerCase()) {
    return Response.json({ ok: true, ignorato: `canale ${post.canale} non seguito` });
  }
  if (!post.testo.trim()) return Response.json({ ok: true, ignorato: 'post senza testo' });

  const precedente = await giaPubblicato(post.numero);
  if (precedente) return Response.json({ ok: true, ignorato: 'già pubblicato', x: precedente.x });

  // Telegram consegna gli aggiornamenti in ordine e riprova quelli rifiutati con 503:
  // rispondere 503 finché non è passata la distanza minima li fa uscire distanziati.
  const ultima = await ultimaPubblicazione();
  const distanza = distanzaMinima();
  if (ultima && distanza > 0) {
    const trascorsi = (Date.now() - ultima.getTime()) / 60_000;
    if (trascorsi < distanza) {
      const attesa = Math.ceil(distanza - trascorsi);
      return Response.json({ ok: false, attesa: `ultimo post su X ${Math.floor(trascorsi)} min fa: riprovo fra ${attesa} min` }, { status: 503, headers: { 'retry-after': String(attesa * 60) } });
    }
  }

  const opzioni = { ...opzioniFormato(process.env), link: `${SITO}/ultimora/tg-${post.numero}` };

  try {
    const parti = await componiPostConRiscrittura(post.testo, opzioni, riscritturaDisponibile() ? riscriviPerX : undefined);
    const immagine = post.foto ? await scaricaFotoTelegram(post.foto) : undefined;
    const { id } = await pubblicaSuX(parti[0], immagine);
    await registraPubblicazione(post.numero, id);
    console.log(`[telegram-x] t.me/${canale}/${post.numero} → x.com/i/status/${id}${parti.length > 1 ? ` (thread di ${parti.length})` : ''}`);
    // Il primo post è registrato: se una risposta del thread fallisce non si ripubblica nulla.
    let precedente = id;
    for (const parte of parti.slice(1)) {
      try {
        ({ id: precedente } = await pubblicaSuX(parte, undefined, precedente));
      } catch (errore) {
        console.error(`[telegram-x] post ${post.numero}: thread interrotto: ${errore instanceof Error ? errore.message : errore}`);
        break;
      }
    }
    return Response.json({ ok: true, x: id, parti: parti.length });
  } catch (errore) {
    const messaggio = errore instanceof Error ? errore.message : 'errore sconosciuto';
    console.error(`[telegram-x] post ${post.numero} non pubblicato: ${messaggio}`);
    // Con 503 Telegram rispedisce l'aggiornamento più tardi (rete, X sovraccarico, foto non scaricata);
    // con 200 lo considera consegnato: inutile insistere se X ha rifiutato il post.
    return Response.json({ ok: false, error: messaggio }, { status: rifiutatoDaX(errore) ? 200 : 503 });
  }
}

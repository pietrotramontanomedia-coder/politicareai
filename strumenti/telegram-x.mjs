#!/usr/bin/env node
/**
 * Gestione del ponte Telegram → X.
 *
 *   node strumenti/telegram-x.mjs registra [https://sito]   collega il webhook di Telegram al sito
 *   node strumenti/telegram-x.mjs stato                     mostra webhook, bot e aggiornamenti in attesa
 *   node strumenti/telegram-x.mjs rimuovi                   scollega il webhook (il bot smette di ricevere)
 *   node strumenti/telegram-x.mjs prova "testo del post"    mostra come verrebbe il post su X, senza pubblicare
 *
 * Legge TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET da .env.local (o dall'ambiente).
 */
import { readFileSync } from 'node:fs';
import { componiTweet, lunghezzaX } from '../lib/telegram-x.ts';

const SITO_PREDEFINITO = 'https://politicare-app.vercel.app';

function caricaEnv() {
  try {
    for (const riga of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*?)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* senza .env.local si usa solo l'ambiente */
  }
}

async function telegram(metodo, parametri = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN mancante (mettilo in .env.local)');
  const risposta = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parametri),
  });
  const corpo = await risposta.json();
  if (!corpo.ok) throw new Error(`${metodo}: ${corpo.description ?? risposta.status}`);
  return corpo.result;
}

const [comando, argomento] = process.argv.slice(2);
caricaEnv();

switch (comando) {
  case 'registra': {
    const segreto = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!segreto) throw new Error('TELEGRAM_WEBHOOK_SECRET mancante: deve essere lo stesso valore impostato su Vercel');
    const sito = (argomento ?? process.env.SITO_URL ?? SITO_PREDEFINITO).replace(/\/$/, '');
    await telegram('setWebhook', {
      url: `${sito}/api/telegram/x`,
      secret_token: segreto,
      allowed_updates: ['channel_post'],
      max_connections: 1,
      drop_pending_updates: true,
    });
    const io = await telegram('getMe');
    console.log(`Webhook registrato: ${sito}/api/telegram/x`);
    console.log(`Bot: @${io.username}. Deve essere amministratore del canale, con il solo permesso di leggere i post.`);
    break;
  }
  case 'stato': {
    const [io, info] = await Promise.all([telegram('getMe'), telegram('getWebhookInfo')]);
    console.log(`Bot: @${io.username}`);
    console.log(`Webhook: ${info.url || '(nessuno)'}`);
    console.log(`In attesa: ${info.pending_update_count ?? 0}`);
    if (info.last_error_message) console.log(`Ultimo errore (${new Date(info.last_error_date * 1000).toLocaleString('it-IT')}): ${info.last_error_message}`);
    break;
  }
  case 'rimuovi':
    await telegram('deleteWebhook', { drop_pending_updates: true });
    console.log('Webhook rimosso: il bot non riceve più i post.');
    break;
  case 'prova': {
    if (!argomento) throw new Error('scrivi il testo da provare tra virgolette');
    const testo = componiTweet(argomento, { link: `${SITO_PREDEFINITO}/ultimora/tg-0`, politicaLink: process.env.X_LINK_NOTIZIE ?? 'se-troncato' });
    console.log(testo);
    console.log(`\n— ${lunghezzaX(testo)} caratteri su 280`);
    break;
  }
  default:
    console.log('Comandi: registra [sito] | stato | rimuovi | prova "testo"');
}

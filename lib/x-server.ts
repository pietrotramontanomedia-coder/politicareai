import { ApiRequestError, ApiResponseError, EUploadMimeType, TwitterApi, type SendTweetV2Params } from 'twitter-api-v2';

/**
 * Pubblicazione su X con OAuth 1.0a (chiavi dell'app + token dell'account @politicare).
 * Solo lato server: le chiavi non escono mai dall'ambiente.
 */

export interface Immagine {
  dati: Buffer;
  tipo: string;
}

const VARIABILI = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'] as const;

export function xConfigurato(): boolean {
  return VARIABILI.every((nome) => Boolean(process.env[nome]));
}

function client(): TwitterApi {
  const mancanti = VARIABILI.filter((nome) => !process.env[nome]);
  if (mancanti.length) throw new Error(`variabili X mancanti: ${mancanti.join(', ')}`);
  return new TwitterApi({
    appKey: process.env.X_API_KEY!,
    appSecret: process.env.X_API_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessSecret: process.env.X_ACCESS_SECRET!,
  });
}

const TIPI_AMMESSI = new Set<string>(Object.values(EUploadMimeType));

/** Pubblica un post; con `rispostaA` esce come risposta a quel post (per i thread). */
export async function pubblicaSuX(testo: string, immagine?: Immagine, rispostaA?: string): Promise<{ id: string }> {
  const x = client();
  const corpo: SendTweetV2Params = { text: testo };
  if (immagine && TIPI_AMMESSI.has(immagine.tipo)) {
    const id = await x.v2.uploadMedia(immagine.dati, {
      media_type: immagine.tipo as EUploadMimeType,
      media_category: 'tweet_image',
    });
    corpo.media = { media_ids: [id] };
  }
  if (rispostaA) corpo.reply = { in_reply_to_tweet_id: rispostaA };
  const risposta = await x.v2.tweet(corpo);
  return { id: risposta.data.id };
}

/** X ha rifiutato il post (chiavi errate, testo duplicato, contenuto non ammesso): riprovare non serve. */
export function rifiutatoDaX(errore: unknown): boolean {
  return errore instanceof ApiResponseError && errore.code !== 429 && errore.code < 500;
}

/** Vero per errori di rete verso X: utile solo nei log. */
export function erroreDiRete(errore: unknown): boolean {
  return errore instanceof ApiRequestError;
}

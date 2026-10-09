import type { BozzaVersione, Contenuto, SessioneRedazione, StatoContenuto, TipoCommento, TipoContenuto } from './tipi';

/** Chiamate del browser alle API del portale della redazione. */

export class ErroreApi extends Error {
  constructor(
    readonly status: number,
    messaggio: string,
  ) {
    super(messaggio);
    this.name = 'ErroreApi';
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const risposta = await fetch(url, { cache: 'no-store', ...init });
  const corpo = (await risposta.json().catch(() => ({}))) as { ok?: boolean; errore?: string } & T;
  if (!risposta.ok || corpo.ok === false) throw new ErroreApi(risposta.status, corpo.errore ?? 'Errore di rete, riprova.');
  return corpo;
}

const json = (metodo: string, dati: unknown): RequestInit => ({
  method: metodo,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(dati),
});

export const urlMedia = (id: string) => `/api/redazione/media/${id}`;

export async function entra(nome: string, codice: string): Promise<SessioneRedazione> {
  return (await api<{ sessione: SessioneRedazione }>('/api/redazione/accesso', json('POST', { nome, codice }))).sessione;
}

export async function esci(): Promise<void> {
  await api('/api/redazione/accesso', { method: 'DELETE' });
}

export async function caricaContenuti(): Promise<Contenuto[]> {
  return (await api<{ contenuti: Contenuto[] }>('/api/redazione/contenuti')).contenuti;
}

export async function creaContenuto(tipo: TipoContenuto, bozza: BozzaVersione): Promise<Contenuto> {
  return (await api<{ contenuto: Contenuto }>('/api/redazione/contenuti', json('POST', { tipo, ...bozza }))).contenuto;
}

export async function nuovaVersione(id: string, bozza: BozzaVersione): Promise<Contenuto> {
  return (await api<{ contenuto: Contenuto }>(`/api/redazione/contenuti/${id}`, json('PUT', bozza))).contenuto;
}

export async function eliminaContenuto(id: string): Promise<void> {
  await api(`/api/redazione/contenuti/${id}`, { method: 'DELETE' });
}

export async function commenta(id: string, dati: { tipo: TipoCommento; testo: string; stato: StatoContenuto | null }): Promise<Contenuto> {
  return (await api<{ contenuto: Contenuto }>(`/api/redazione/contenuti/${id}/commenti`, json('POST', dati))).contenuto;
}

export async function caricaFoto(foto: Blob): Promise<string> {
  return (await api<{ id: string }>('/api/redazione/media', { method: 'POST', headers: { 'content-type': foto.type }, body: foto })).id;
}

/** Lato lungo massimo delle foto caricate: abbastanza per una storia a 1080×1920. */
const LATO_MASSIMO = 1920;

/**
 * Riduce e ricomprime l'immagine nel browser: meno attesa, meno spazio, niente dati EXIF (posizione
 * compresa). Qualità alta perché sono card con testo, dove la compressione si vede.
 */
export async function riduciFoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scala = Math.min(1, LATO_MASSIMO / Math.max(bitmap.width, bitmap.height));
    const larghezza = Math.round(bitmap.width * scala);
    const altezza = Math.round(bitmap.height * scala);
    const tela = document.createElement('canvas');
    tela.width = larghezza;
    tela.height = altezza;
    const ctx = tela.getContext('2d');
    if (!ctx) throw new Error('canvas non disponibile');
    ctx.drawImage(bitmap, 0, 0, larghezza, altezza);
    return await new Promise<Blob>((risolvi, rifiuta) =>
      tela.toBlob((blob) => (blob ? risolvi(blob) : rifiuta(new Error('compressione non riuscita'))), 'image/jpeg', 0.92),
    );
  } finally {
    bitmap.close();
  }
}

const COLORI_AVATAR = ['#FEDC01', '#FB923C', '#F472B6', '#A78BFA', '#60A5FA', '#34D399', '#F87171', '#2DD4BF'];

/** Ogni persona ha sempre lo stesso colore, deciso dal nome. */
export function coloreDaNome(chiave: string): string {
  let h = 0;
  for (const c of chiave) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORI_AVATAR[h % COLORI_AVATAR.length];
}

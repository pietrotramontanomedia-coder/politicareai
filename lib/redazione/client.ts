import type { BozzaVersione, Contenuto, Obiettivi, PersonaPubblica, SchedaDati, SessioneRedazione, Sincronizzazione, StatoContenuto, TipoCommento, TipoContenuto } from './tipi';

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

export type RispostaElenco = Sincronizzazione & { completo: boolean; obiettivi: Obiettivi; persone: PersonaPubblica[] };

/** Prima volta (dal = null) le ultime settimane; poi solo quello che è cambiato dopo la revisione `dal`. */
export async function caricaContenuti(dal: number | null): Promise<RispostaElenco> {
  return api<RispostaElenco>(`/api/redazione/contenuti${dal === null ? '' : `?dal=${dal}`}`);
}

/** La scheda di una persona, a pagine: `prima` è la data dell'ultimo contenuto già ricevuto. */
export async function caricaScheda(chiave: string, prima: string | null = null): Promise<SchedaDati> {
  const parametri = new URLSearchParams({ autore: chiave, ...(prima ? { prima } : {}) });
  return api<SchedaDati>(`/api/redazione/contenuti?${parametri}`);
}

export async function caricaContenuto(id: string): Promise<Contenuto> {
  return (await api<{ contenuto: Contenuto }>(`/api/redazione/contenuti/${id}`)).contenuto;
}

export async function aggiungiPersona(nome: string, password: string): Promise<PersonaPubblica[]> {
  return (await api<{ persone: PersonaPubblica[] }>('/api/redazione/persone', json('POST', { nome, password }))).persone;
}

export async function modificaPersona(chiave: string, modifica: { attiva: boolean } | { password: string }): Promise<PersonaPubblica[]> {
  return (await api<{ persone: PersonaPubblica[] }>('/api/redazione/persone', json('PATCH', { chiave, ...modifica }))).persone;
}

export async function salvaObiettivi(obiettivi: Pick<Obiettivi, 'storieGiorno' | 'postGiorno' | 'storieWeekend' | 'postWeekend'>): Promise<Obiettivi> {
  return (await api<{ obiettivi: Obiettivi }>('/api/redazione/obiettivi', json('PUT', obiettivi))).obiettivi;
}

export async function creaContenuto(tipo: TipoContenuto, bozza: BozzaVersione): Promise<Contenuto> {
  return (await api<{ contenuto: Contenuto }>('/api/redazione/contenuti', json('POST', { tipo, ...bozza }))).contenuto;
}

export async function nuovaVersione(id: string, bozza: BozzaVersione): Promise<Contenuto> {
  return (await api<{ contenuto: Contenuto }>(`/api/redazione/contenuti/${id}`, json('PUT', bozza))).contenuto;
}

export async function eliminaContenuto(id: string): Promise<Contenuto> {
  return (await api<{ contenuto: Contenuto }>(`/api/redazione/contenuti/${id}`, { method: 'DELETE' })).contenuto;
}

export async function ripristinaContenuto(id: string): Promise<Contenuto> {
  return (await api<{ contenuto: Contenuto }>(`/api/redazione/contenuti/${id}`, { method: 'PATCH' })).contenuto;
}

export async function commenta(id: string, dati: { tipo: TipoCommento; testo: string; stato: StatoContenuto | null }): Promise<Contenuto> {
  return (await api<{ contenuto: Contenuto }>(`/api/redazione/contenuti/${id}/commenti`, json('POST', dati))).contenuto;
}

/** Carica un'immagine; se cade la rete o il server inciampa riprova, così la pubblicazione non salta. */
export async function caricaFoto(foto: Blob): Promise<string> {
  for (let tentativo = 1; ; tentativo++) {
    try {
      return (await api<{ id: string }>('/api/redazione/media', { method: 'POST', headers: { 'content-type': foto.type }, body: foto })).id;
    } catch (errore) {
      const definitivo = errore instanceof ErroreApi && errore.status >= 400 && errore.status < 500;
      if (definitivo || tentativo >= 3) throw errore;
      await new Promise((r) => setTimeout(r, 1000 * tentativo));
    }
  }
}

/** Lato lungo massimo delle foto caricate: abbastanza per una storia a 1080×1920. */
const LATO_MASSIMO = 1920;

/**
 * Apre l'immagine scelta. createImageBitmap con l'orientamento EXIF dove c'è; sui browser che non
 * accettano l'opzione, o non sanno decodificare il file così, si passa da un elemento <img>.
 */
async function apriImmagine(file: File): Promise<{ disegno: CanvasImageSource; larghezza: number; altezza: number; chiudi: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { disegno: bitmap, larghezza: bitmap.width, altezza: bitmap.height, chiudi: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { disegno: img, larghezza: img.naturalWidth, altezza: img.naturalHeight, chiudi: () => URL.revokeObjectURL(url) };
    } catch (errore) {
      URL.revokeObjectURL(url);
      throw errore;
    }
  }
}

/**
 * Riduce e ricomprime l'immagine nel browser: meno attesa, meno spazio, niente dati EXIF (posizione
 * compresa). Qualità alta perché sono card con testo, dove la compressione si vede. Le parti
 * trasparenti di un PNG diventano bianche: nel JPEG sarebbero nere.
 */
export async function riduciFoto(file: File): Promise<Blob> {
  const immagine = await apriImmagine(file);
  try {
    if (!immagine.larghezza || !immagine.altezza) throw new Error('immagine vuota');
    const scala = Math.min(1, LATO_MASSIMO / Math.max(immagine.larghezza, immagine.altezza));
    const larghezza = Math.round(immagine.larghezza * scala);
    const altezza = Math.round(immagine.altezza * scala);
    const tela = document.createElement('canvas');
    tela.width = larghezza;
    tela.height = altezza;
    const ctx = tela.getContext('2d');
    if (!ctx) throw new Error('canvas non disponibile');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, larghezza, altezza);
    ctx.drawImage(immagine.disegno, 0, 0, larghezza, altezza);
    return await new Promise<Blob>((risolvi, rifiuta) =>
      tela.toBlob((blob) => (blob ? risolvi(blob) : rifiuta(new Error('compressione non riuscita'))), 'image/jpeg', 0.92),
    );
  } finally {
    immagine.chiudi();
  }
}

const COLORI_AVATAR = ['#FEDC01', '#FB923C', '#F472B6', '#A78BFA', '#60A5FA', '#34D399', '#F87171', '#2DD4BF'];

/** Ogni persona ha sempre lo stesso colore, deciso dal nome. */
export function coloreDaNome(chiave: string): string {
  let h = 0;
  for (const c of chiave) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORI_AVATAR[h % COLORI_AVATAR.length];
}

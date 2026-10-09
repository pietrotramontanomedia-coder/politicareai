'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { caricaFoto, creaContenuto, nuovaVersione, riduciFoto, urlMedia } from '@/lib/redazione/client';
import { contaHashtag, LIMITI, URL_GENERATORE, versioneCorrente } from '@/lib/redazione/regole';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { BozzaVersione, Contenuto, TipoContenuto } from '@/lib/redazione/tipi';
import AnteprimaPost from './AnteprimaPost';
import AnteprimaStoria from './AnteprimaStoria';
import Finestra from './Finestra';

const T = TESTI_REDAZIONE.compositore;

interface Foto {
  chiave: string;
  /** Già nell'archivio (versioni precedenti). */
  id?: string;
  /** Nuova, già ridotta, da caricare alla pubblicazione. */
  blob?: Blob;
  url: string;
}

const campo = 'w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-2';
const stileCampo = { borderColor: 'var(--bordo)', background: 'var(--bg)', color: 'var(--fg)' };

/**
 * Pubblicazione di un post (card del generatore + copy) o di una storia (una sola immagine), con
 * l'anteprima com'è su Instagram. Serve anche per le nuove versioni.
 */
export default function Compositore({
  tipo,
  autore,
  base,
  onPubblicato,
  onChiudi,
}: {
  tipo: TipoContenuto;
  autore: string;
  /** Contenuto da correggere: si parte dalla sua ultima versione. */
  base?: Contenuto;
  onPubblicato: (contenuto: Contenuto) => void;
  onChiudi: () => void;
}) {
  const ultima = base ? versioneCorrente(base) : null;
  const [foto, setFoto] = useState<Foto[]>(() => (ultima?.immagini ?? []).map((id) => ({ chiave: id, id, url: urlMedia(id) })));
  const [didascalia, setDidascalia] = useState(ultima?.didascalia ?? '');
  const [avanzamento, setAvanzamento] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);
  const id = useId();

  // Gli URL temporanei delle foto nuove si liberano alla chiusura.
  const fotoCorrenti = useRef(foto);
  useEffect(() => {
    fotoCorrenti.current = foto;
  }, [foto]);
  useEffect(() => () => fotoCorrenti.current.forEach((f) => f.blob && URL.revokeObjectURL(f.url)), []);

  const massimo = tipo === 'post' ? LIMITI.immaginiPost : 1;
  const hashtag = contaHashtag(didascalia);
  const occupato = avanzamento !== null;
  const pronto =
    tipo === 'post' ? foto.length > 0 && didascalia.trim().length > 0 && didascalia.length <= LIMITI.didascalia && hashtag <= LIMITI.hashtag : foto.length === 1;

  async function aggiungi(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErrore(null);
    const scelte = [...files].slice(0, tipo === 'post' ? massimo - foto.length : 1);
    const nuove: Foto[] = [];
    for (const file of scelte) {
      try {
        const blob = await riduciFoto(file);
        nuove.push({ chiave: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
      } catch {
        setErrore(T.erroreFoto);
      }
    }
    setFoto((attuali) => {
      if (tipo === 'storia') {
        attuali.forEach((f) => f.blob && URL.revokeObjectURL(f.url));
        return nuove.slice(0, 1);
      }
      return [...attuali, ...nuove].slice(0, massimo);
    });
  }

  function togli(chiave: string) {
    setFoto((attuali) => {
      const f = attuali.find((x) => x.chiave === chiave);
      if (f?.blob) URL.revokeObjectURL(f.url);
      return attuali.filter((x) => x.chiave !== chiave);
    });
  }

  function sposta(i: number, verso: -1 | 1) {
    setFoto((attuali) => {
      const nuove = [...attuali];
      [nuove[i], nuove[i + verso]] = [nuove[i + verso], nuove[i]];
      return nuove;
    });
  }

  async function pubblica(e: React.FormEvent) {
    e.preventDefault();
    if (!pronto || occupato) return;
    setErrore(null);
    try {
      const daCaricare = foto.filter((f) => !f.id);
      const ids: string[] = [];
      let fatte = 0;
      for (const f of foto) {
        if (f.id) {
          ids.push(f.id);
          continue;
        }
        setAvanzamento(T.caricamento(fatte, daCaricare.length));
        ids.push(await caricaFoto(f.blob!));
        fatte++;
      }
      setAvanzamento(T.salvataggio);
      // Le card del generatore sono 4:5; il formato resta nei dati per i post già pubblicati.
      const bozza: BozzaVersione = tipo === 'post' ? { immagini: ids, didascalia, formato: '4:5' } : { immagini: ids, didascalia: '', formato: '1:1' };
      const contenuto = base ? await nuovaVersione(base.id, bozza) : await creaContenuto(tipo, bozza);
      onPubblicato(contenuto);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : T.erroreInvio);
      setAvanzamento(null);
    }
  }

  const titolo = base ? T.titoloVersione(base.versioni.length + 1) : tipo === 'post' ? T.titoloPost : T.titoloStoria;

  return (
    <Finestra titolo={titolo} onChiudi={() => !occupato && onChiudi()} larga>
      <form onSubmit={pubblica} className="flex min-h-full flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-elevated)' }}>
          <button type="button" onClick={onChiudi} disabled={occupato} className="text-sm font-semibold" style={{ color: 'var(--fg-muta)' }}>
            {T.annulla}
          </button>
          <h2 className="text-base font-bold">{titolo}</h2>
          <button
            type="submit"
            disabled={!pronto || occupato}
            className="rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-40"
            style={{ background: 'var(--accento)', color: '#0a0a0a' }}
          >
            {base ? T.pubblicaVersione : T.pubblica}
          </button>
        </div>

        {(avanzamento || errore) && (
          <p role={errore ? 'alert' : 'status'} className="px-4 pt-3 text-sm" style={{ color: errore ? '#F87171' : 'var(--fg-muta)' }}>
            {errore ?? avanzamento}
          </p>
        )}

        <div className="grid gap-6 p-4 sm:grid-cols-[1fr_minmax(0,22rem)]">
          <div className="space-y-5">
            <p className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--bordo)', color: 'var(--fg-muta)' }}>
              {tipo === 'post' ? T.dalGeneratorePost : T.dalGeneratoreStoria}{' '}
              <a href={URL_GENERATORE} target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: 'var(--accento)' }}>
                {T.apriGeneratore}
              </a>
            </p>
            <div>
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--fg-muta)' }}>
                {tipo === 'post' ? T.fotoPost : T.fotoStoria}
              </span>
              <div className="flex flex-wrap gap-2">
                {foto.map((f, i) => (
                  <div key={f.chiave} className="w-24">
                    {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale o foto privata del portale */}
                    <img src={f.url} alt={`${T.foto} ${i + 1}`} className="h-24 w-24 rounded-lg object-cover" />
                    <div className="mt-1 flex justify-between text-xs">
                      {tipo === 'post' && (
                        <button type="button" onClick={() => sposta(i, -1)} disabled={i === 0 || occupato} aria-label={`${T.spostaPrima}: ${T.foto} ${i + 1}`} className="px-1 disabled:opacity-30">
                          ←
                        </button>
                      )}
                      <button type="button" onClick={() => togli(f.chiave)} disabled={occupato} className="px-1 font-semibold" style={{ color: '#F87171' }} aria-label={`${T.togliFoto}: ${T.foto} ${i + 1}`}>
                        {T.togliFoto}
                      </button>
                      {tipo === 'post' && (
                        <button type="button" onClick={() => sposta(i, 1)} disabled={i === foto.length - 1 || occupato} aria-label={`${T.spostaDopo}: ${T.foto} ${i + 1}`} className="px-1 disabled:opacity-30">
                          →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(foto.length < massimo || tipo === 'storia') && (
                  <button
                    type="button"
                    onClick={() => inputFoto.current?.click()}
                    disabled={occupato}
                    data-autofocus
                    className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border border-dashed text-xs font-semibold"
                    style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'var(--fg-muta)' }}
                  >
                    <span className="text-2xl" aria-hidden>
                      +
                    </span>
                    {tipo === 'post' ? T.aggiungiFoto : foto.length > 0 ? T.cambiaFoto : T.caricaStoria}
                  </button>
                )}
              </div>
              <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                multiple={tipo === 'post'}
                className="hidden"
                onChange={(e) => {
                  void aggiungi(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            {tipo === 'post' && (
              <div>
                <label htmlFor={`${id}-didascalia`} className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--fg-muta)' }}>
                  {T.didascalia}
                </label>
                <textarea
                  id={`${id}-didascalia`}
                  value={didascalia}
                  onChange={(e) => setDidascalia(e.target.value)}
                  rows={8}
                  placeholder={T.didascaliaSegnaposto}
                  className={campo}
                  style={stileCampo}
                />
                <p className="mt-1 flex justify-between text-xs" style={{ color: 'var(--fg-muta)' }} aria-live="polite">
                  <span style={{ color: didascalia.length > LIMITI.didascalia ? '#F87171' : undefined }}>{T.caratteri(didascalia.length, LIMITI.didascalia)}</span>
                  <span style={{ color: hashtag > LIMITI.hashtag ? '#F87171' : undefined }}>{T.hashtag(hashtag, LIMITI.hashtag)}</span>
                </p>
              </div>
            )}
          </div>

          <div className="sm:sticky sm:top-20 sm:self-start">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muta)' }}>
              {T.anteprima}
            </p>
            {tipo === 'post' ? (
              <AnteprimaPost autore={autore} immagini={foto.map((f) => f.url)} didascalia={didascalia} formato="4:5" />
            ) : (
              <AnteprimaStoria immagine={foto[0]?.url ?? null} autore={autore} className="mx-auto max-w-[18rem]" />
            )}
          </div>
        </div>
      </form>
    </Finestra>
  );
}

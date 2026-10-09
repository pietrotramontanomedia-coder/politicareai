'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { caricaFoto, creaContenuto, nuovaVersione, riduciFoto, urlMedia } from '@/lib/redazione/client';
import { COLORI_SFONDO_STORIA, COLORI_TESTO_STORIA, contaHashtag, LIMITI, versioneCorrente } from '@/lib/redazione/regole';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { BozzaVersione, Contenuto, FormatoPost, PosizioneTesto, Storia, TipoContenuto } from '@/lib/redazione/tipi';
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

const STORIA_VUOTA: Storia = { testo: '', posizione: 'centro', sfondo: COLORI_SFONDO_STORIA[0], coloreTesto: COLORI_TESTO_STORIA[0], riquadro: false };

const campo = 'w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-2';
const stileCampo = { borderColor: 'var(--bordo)', background: 'var(--bg)', color: 'var(--fg)' };

function Scelta<V extends string>({ etichetta, valori, valore, nomi, onCambia }: { etichetta: string; valori: readonly V[]; valore: V; nomi: Record<V, string>; onCambia: (v: V) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold" style={{ color: 'var(--fg-muta)' }}>
        {etichetta}
      </legend>
      <div className="flex flex-wrap gap-2">
        {valori.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={v === valore}
            onClick={() => onCambia(v)}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={v === valore ? { background: 'var(--accento)', color: '#0a0a0a', borderColor: 'var(--accento)' } : { borderColor: 'var(--bordo)' }}
          >
            {nomi[v]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Colori({ etichetta, colori, valore, onCambia }: { etichetta: string; colori: readonly string[]; valore: string; onCambia: (c: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold" style={{ color: 'var(--fg-muta)' }}>
        {etichetta}
      </legend>
      <div className="flex flex-wrap gap-2">
        {colori.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={c === valore}
            aria-label={T.colore(c)}
            onClick={() => onCambia(c)}
            className="h-8 w-8 rounded-full"
            style={{ background: c, boxShadow: c === valore ? '0 0 0 2px var(--bg-elevated), 0 0 0 4px var(--accento)' : 'inset 0 0 0 1px rgba(255,255,255,0.25)' }}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Scrittura di un post o di una storia, con l'anteprima com'è su Instagram. Serve anche per le nuove versioni. */
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
  const [formato, setFormato] = useState<FormatoPost>(ultima?.formato ?? '4:5');
  const [storia, setStoria] = useState<Storia>(ultima?.storia ?? STORIA_VUOTA);
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
  const pronto = tipo === 'post' ? foto.length > 0 && didascalia.length <= LIMITI.didascalia && hashtag <= LIMITI.hashtag : foto.length > 0 || storia.testo.trim().length > 0;

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
      const bozza: BozzaVersione = tipo === 'post' ? { immagini: ids, didascalia, formato, storia: null } : { immagini: ids, didascalia: '', formato: '1:1', storia };
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
                    {tipo === 'storia' && foto.length > 0 ? T.cambiaFoto : T.aggiungiFoto}
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

            {tipo === 'post' ? (
              <>
                <Scelta etichetta={T.formato} valori={['4:5', '1:1'] as const} valore={formato} nomi={T.formati} onCambia={setFormato} />
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
              </>
            ) : (
              <>
                <div>
                  <label htmlFor={`${id}-testo`} className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--fg-muta)' }}>
                    {T.testoStoria}
                  </label>
                  <textarea
                    id={`${id}-testo`}
                    value={storia.testo}
                    maxLength={LIMITI.testoStoria}
                    onChange={(e) => setStoria({ ...storia, testo: e.target.value })}
                    rows={4}
                    placeholder={T.testoStoriaSegnaposto}
                    className={campo}
                    style={stileCampo}
                  />
                  <p className="mt-1 text-xs" style={{ color: 'var(--fg-muta)' }}>
                    {T.caratteri(storia.testo.length, LIMITI.testoStoria)}
                  </p>
                </div>
                <Scelta etichetta={T.posizione} valori={['alto', 'centro', 'basso'] as const} valore={storia.posizione} nomi={T.posizioni} onCambia={(p: PosizioneTesto) => setStoria({ ...storia, posizione: p })} />
                <Colori etichetta={T.sfondo} colori={COLORI_SFONDO_STORIA} valore={storia.sfondo} onCambia={(c) => setStoria({ ...storia, sfondo: c })} />
                <Colori etichetta={T.coloreTesto} colori={COLORI_TESTO_STORIA} valore={storia.coloreTesto} onCambia={(c) => setStoria({ ...storia, coloreTesto: c })} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={storia.riquadro} onChange={(e) => setStoria({ ...storia, riquadro: e.target.checked })} className="h-4 w-4 accent-[var(--accento)]" />
                  {T.riquadro}
                </label>
              </>
            )}
          </div>

          <div className="sm:sticky sm:top-20 sm:self-start">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muta)' }}>
              {T.anteprima}
            </p>
            {tipo === 'post' ? (
              <AnteprimaPost autore={autore} immagini={foto.map((f) => f.url)} didascalia={didascalia} formato={formato} />
            ) : (
              <AnteprimaStoria storia={storia} immagine={foto[0]?.url ?? null} autore={autore} className="mx-auto max-w-[18rem]" />
            )}
          </div>
        </div>
      </form>
    </Finestra>
  );
}

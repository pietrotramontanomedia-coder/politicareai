'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Avatar from '@/components/profilo/Avatar';
import { formattaDataRelativa } from '@/lib/data-ora';
import { caricaContenuti, coloreDaNome, ErroreApi, esci, urlMedia } from '@/lib/redazione/client';
import { chiaveNome, codaRevisione, eliminato, puoVedereCommenti, statistiche, storieRecenti, URL_GENERATORE, versioneCorrente } from '@/lib/redazione/regole';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { Contenuto, SessioneRedazione, TipoContenuto } from '@/lib/redazione/tipi';
import AccessoRedazione from './AccessoRedazione';
import AnteprimaPost from './AnteprimaPost';
import AnteprimaStoria from './AnteprimaStoria';
import Compositore from './Compositore';
import Dettaglio from './Dettaglio';
import { BadgeRuolo, BadgeStato } from './Distintivi';
import VisoreStorie, { type GruppoStorie } from './VisoreStorie';

const T = TESTI_REDAZIONE;
/** Ogni minuto il portale si aggiorna da solo, così chi corregge vede arrivare i contenuti. */
const AGGIORNAMENTO_MS = 60_000;

type Vista = 'feed' | 'profilo' | 'revisione' | 'squadra';

/* ---------- Pezzi ---------- */

/** Copertina di un contenuto per griglie ed elenchi: prima card, o la storia in piccolo. */
function Copertina({ contenuto, conStato }: { contenuto: Contenuto; conStato: boolean }) {
  const v = versioneCorrente(contenuto);
  const prima = v.immagini[0] ? urlMedia(v.immagini[0]) : null;
  return (
    <span className="relative block w-full overflow-hidden bg-black">
      {contenuto.tipo === 'storia' ? (
        <AnteprimaStoria immagine={prima} piccola />
      ) : (
        <span className="block" style={{ aspectRatio: '4 / 5' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- foto private servite dalle API del portale */}
          {prima && <img src={prima} alt="" className="h-full w-full object-cover" loading="lazy" />}
        </span>
      )}
      {conStato && (
        <span className="absolute bottom-1.5 left-1.5">
          <BadgeStato stato={contenuto.stato} piccola />
        </span>
      )}
      {v.immagini.length > 1 && (
        <span className="absolute right-1.5 top-1.5 rounded px-1 text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.6)' }} aria-hidden>
          {v.immagini.length}
        </span>
      )}
      {contenuto.versioni.length > 1 && (
        <span className="absolute bottom-1.5 right-1.5 rounded px-1 text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.6)' }}>
          {T.dettaglio.versioneCorta(contenuto.versioni.length)}
        </span>
      )}
    </span>
  );
}

/** Cerchio delle storie: anello colorato se ci sono storie da vedere, grigio se già viste, nessuno se non ce ne sono. */
function CerchioStoria({
  nome,
  anello,
  onClick,
  piu = false,
  etichetta,
}: {
  nome: string;
  anello: 'nuove' | 'viste' | 'nessuno';
  onClick: () => void;
  piu?: boolean;
  etichetta?: string;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1">
      <span
        className="relative rounded-full p-[3px]"
        style={{ background: anello === 'nessuno' ? 'transparent' : anello === 'viste' ? 'rgba(255,255,255,0.2)' : 'linear-gradient(45deg, #FEDC01, #F97316, #EC4899)' }}
      >
        <span className="block rounded-full p-[2px]" style={{ background: 'var(--bg)' }}>
          <Avatar nome={nome} colore={coloreDaNome(chiaveNome(nome))} className="h-14 w-14 text-base" />
        </span>
        {piu && (
          <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full text-sm font-bold" style={{ background: '#3B82F6', color: '#fff', boxShadow: '0 0 0 2px var(--bg)' }} aria-hidden>
            +
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[11px]">{etichetta ?? nome.split(' ')[0]}</span>
    </button>
  );
}

/* ---------- Portale ---------- */

export default function PortaleRedazione({ sessioneIniziale, configurata }: { sessioneIniziale: SessioneRedazione | null; configurata: boolean }) {
  const [sessione, setSessione] = useState(sessioneIniziale);
  const [contenuti, setContenuti] = useState<Contenuto[] | null>(null);
  const [errore, setErrore] = useState(false);
  const [vista, setVista] = useState<Vista>('feed');
  const [persona, setPersona] = useState<string | null>(null);
  const [schedaProfilo, setSchedaProfilo] = useState<TipoContenuto>('post');
  const [composizione, setComposizione] = useState<{ tipo: TipoContenuto; base?: Contenuto } | null>(null);
  const [aperto, setAperto] = useState<string | null>(null);
  const [storieAperte, setStorieAperte] = useState<number | null>(null);
  const [storieViste, setStorieViste] = useState<Set<string>>(() => new Set());

  const aggiorna = useCallback(async () => {
    try {
      setContenuti(await caricaContenuti());
      setErrore(false);
    } catch (e) {
      if (e instanceof ErroreApi && e.status === 401) setSessione(null);
      else setErrore(true);
    }
  }, []);

  useEffect(() => {
    if (!sessione) return;
    // Primo caricamento e aggiornamento periodico quando la scheda è in primo piano.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void aggiorna();
    const t = window.setInterval(() => document.visibilityState === 'visible' && void aggiorna(), AGGIORNAMENTO_MS);
    const visibile = () => document.visibilityState === 'visible' && void aggiorna();
    document.addEventListener('visibilitychange', visibile);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', visibile);
    };
  }, [sessione, aggiorna]);

  const adesso = useMemo(() => new Date(), [contenuti]); // eslint-disable-line react-hooks/exhaustive-deps
  // Feed, profili e statistiche ignorano i contenuti eliminati; chi corregge li ritrova nel cestino.
  const tutti = useMemo(() => (contenuti ?? []).filter((c) => !eliminato(c)), [contenuti]);
  const cestino = useMemo(() => (contenuti ?? []).filter(eliminato), [contenuti]);
  const gruppiStorie: GruppoStorie[] = useMemo(() => storieRecenti(tutti, adesso), [tutti, adesso]);
  const coda = useMemo(() => codaRevisione(tutti), [tutti]);
  const squadra = useMemo(() => statistiche(tutti, adesso), [tutti, adesso]);

  // Link dall'avviso Telegram (/redazione?apri=<id>): apre il contenuto appena arriva il feed.
  const linkAperto = useRef(false);
  useEffect(() => {
    if (!contenuti || linkAperto.current) return;
    linkAperto.current = true;
    const id = new URLSearchParams(window.location.search).get('apri');
    if (!id) return;
    if (contenuti.some((c) => c.id === id)) setAperto(id); // eslint-disable-line react-hooks/set-state-in-effect
    window.history.replaceState(null, '', window.location.pathname);
  }, [contenuti]);

  if (!sessione) return <AccessoRedazione configurata={configurata} onEntrato={setSessione} />;

  const mia = chiaveNome(sessione.nome);
  const revisore = sessione.ruolo === 'revisore';
  const mieDaCorreggere = tutti.filter((c) => c.chiaveAutore === mia && c.stato === 'da_correggere').length;
  const contenutoAperto = aperto ? (contenuti ?? []).find((c) => c.id === aperto) : undefined;

  function sostituisci(c: Contenuto) {
    setContenuti((attuali) => {
      const lista = attuali ?? [];
      return lista.some((x) => x.id === c.id) ? lista.map((x) => (x.id === c.id ? c : x)) : [c, ...lista];
    });
  }

  function apriProfilo(chiave: string) {
    setPersona(chiave);
    setVista('profilo');
    window.scrollTo({ top: 0 });
  }

  async function uscita() {
    await esci().catch(() => undefined);
    setSessione(null);
    setContenuti(null);
  }

  const schede: { id: Vista; etichetta: string; conta?: number }[] = [
    { id: 'feed', etichetta: T.schede.feed },
    { id: 'profilo', etichetta: T.schede.profilo, conta: mieDaCorreggere || undefined },
    ...(revisore
      ? [
          { id: 'revisione' as const, etichetta: T.schede.revisione, conta: coda.length || undefined },
          { id: 'squadra' as const, etichetta: T.schede.squadra },
        ]
      : []),
  ];

  /* ----- Viste ----- */

  function vistaFeed() {
    const post = tutti.filter((c) => c.tipo === 'post');
    const mieStorie = gruppiStorie.findIndex((g) => g.chiave === mia);
    return (
      <div className="mx-auto max-w-xl">
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4" role="list" aria-label={T.storie.elenco}>
          <div role="listitem">
            <CerchioStoria nome={sessione!.nome} anello={mieStorie >= 0 ? 'nuove' : 'nessuno'} piu={mieStorie < 0} etichetta={T.laTuaStoria} onClick={() => (mieStorie >= 0 ? setStorieAperte(mieStorie) : setComposizione({ tipo: 'storia' }))} />
          </div>
          {gruppiStorie.map((g, i) =>
            g.chiave === mia ? null : (
              <div role="listitem" key={g.chiave}>
                <CerchioStoria
                  nome={g.autore}
                  anello={g.storie.every((s) => storieViste.has(s.id)) ? 'viste' : 'nuove'}
                  onClick={() => {
                    setStorieAperte(i);
                    setStorieViste((v) => new Set([...v, ...g.storie.map((s) => s.id)]));
                  }}
                />
              </div>
            ),
          )}
        </div>

        {post.length === 0 ? (
          <p className="py-12 text-center" style={{ color: 'var(--fg-muta)' }}>
            {T.feed.vuoto}
          </p>
        ) : (
          <div className="space-y-6">
            {post.map((c) => {
              const v = versioneCorrente(c);
              const conGiudizio = puoVedereCommenti(sessione!, c);
              return (
                <AnteprimaPost
                  key={`${c.id}-${v.numero}`}
                  autore={c.autore}
                  immagini={v.immagini.map(urlMedia)}
                  didascalia={v.didascalia}
                  formato={v.formato}
                  extraIntestazione={conGiudizio ? <BadgeStato stato={c.stato} piccola /> : undefined}
                  piede={
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--fg-muta)' }}>
                      <time dateTime={v.inviataIl}>{formattaDataRelativa(v.inviataIl, adesso)}</time>
                      {c.versioni.length > 1 && <span>{T.feed.versione(v.numero)}</span>}
                      {conGiudizio && c.commenti.length > 0 && <span>{T.feed.commenti(c.commenti.length)}</span>}
                      <button type="button" onClick={() => setAperto(c.id)} className="ml-auto font-bold" style={{ color: 'var(--accento)' }}>
                        {T.feed.apri} →
                      </button>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function vistaProfilo() {
    const chiave = persona ?? mia;
    const suoi = tutti.filter((c) => c.chiaveAutore === chiave);
    const nome = suoi[0]?.autore ?? sessione!.nome;
    const mio = chiave === mia;
    const stat = squadra.find((s) => s.chiave === chiave);
    const mostrati = suoi.filter((c) => c.tipo === schedaProfilo);
    return (
      <div className="mx-auto max-w-3xl">
        {!mio && revisore && (
          <button type="button" onClick={() => setVista('squadra')} className="mb-4 text-sm font-semibold" style={{ color: 'var(--fg-muta)' }}>
            {T.profilo.indietro}
          </button>
        )}
        <div className="flex items-center gap-5">
          <Avatar nome={nome} colore={coloreDaNome(chiave)} className="h-20 w-20 text-2xl" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{nome}</h2>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
              <span>
                <strong className="text-white">{stat?.post ?? 0}</strong> {T.profilo.post}
              </span>
              <span>
                <strong className="text-white">{stat?.storie ?? 0}</strong> {T.profilo.contaStorie(stat?.storie ?? 0)}
              </span>
              <span>
                <strong className="text-white">{stat?.approvati ?? 0}</strong> {T.profilo.contaApprovati(stat?.approvati ?? 0)}
              </span>
              {(mio || revisore) && (stat?.daCorreggere ?? 0) > 0 && (
                <span>
                  <strong style={{ color: T.coloreStato.da_correggere }}>{stat?.daCorreggere}</strong> {T.profilo.daCorreggere}
                </span>
              )}
            </p>
          </div>
        </div>

        {mio && (
          <div className="mt-5">
            <a
              href={URL_GENERATORE}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl py-2 text-center text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              {T.profilo.generatore}
            </a>
            <p className="mt-1.5 text-center text-xs" style={{ color: 'var(--fg-muta)' }}>
              {T.profilo.generatoreAiuto}
            </p>
          </div>
        )}

        {mio && mieDaCorreggere > 0 && (
          <p className="mt-5 rounded-2xl border p-3 text-sm" role="status" style={{ borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)' }}>
            {T.profilo.avvisoCorrezioni(mieDaCorreggere)}
          </p>
        )}

        <div className="mt-6 flex border-b" role="tablist" style={{ borderColor: 'var(--bordo)' }}>
          {(['post', 'storia'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={schedaProfilo === t}
              onClick={() => setSchedaProfilo(t)}
              className="flex-1 border-b-2 py-3 text-sm font-semibold uppercase tracking-wider"
              style={{ borderColor: schedaProfilo === t ? 'var(--fg)' : 'transparent', color: schedaProfilo === t ? 'var(--fg)' : 'var(--fg-muta)' }}
            >
              {t === 'post' ? T.profilo.post : T.profilo.storie}
            </button>
          ))}
        </div>

        {mostrati.length === 0 ? (
          <p className="py-12 text-center" style={{ color: 'var(--fg-muta)' }}>
            {schedaProfilo === 'post' ? T.profilo.vuotoPost : T.profilo.vuotoStorie}
          </p>
        ) : (
          <div className={`mt-1 grid gap-1 ${schedaProfilo === 'post' ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'}`}>
            {mostrati.map((c) => (
              <button key={c.id} type="button" onClick={() => setAperto(c.id)} className="block hover:opacity-80" aria-label={T.miniatura(c.tipo, c.autore)}>
                <Copertina contenuto={c} conStato={puoVedereCommenti(sessione!, c)} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function vistaRevisione() {
    return (
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold">{T.revisione.titolo}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
          {T.revisione.spiegazione}
        </p>
        {coda.length === 0 ? (
          <p className="py-12 text-center" style={{ color: 'var(--fg-muta)' }}>
            {T.revisione.vuota}
          </p>
        ) : (
          <ul className="mt-5 space-y-2">
            {coda.map((c) => {
              const v = versioneCorrente(c);
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => setAperto(c.id)} className="flex w-full items-center gap-3 rounded-2xl border p-2 text-left hover:bg-white/5" style={{ borderColor: 'var(--bordo)' }}>
                    <span className="w-14 shrink-0 overflow-hidden rounded-lg">
                      <Copertina contenuto={c} conStato={false} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.autore}</span>
                      <span className="block truncate text-sm" style={{ color: 'var(--fg-muta)' }}>
                        {T.tipo[c.tipo]} · {T.feed.versione(v.numero)} · {T.revisione.inAttesaDa(formattaDataRelativa(v.inviataIl, adesso))}
                      </span>
                      {v.didascalia && (
                        <span className="mt-0.5 block truncate text-sm" style={{ color: 'var(--fg-muta)', opacity: 0.8 }}>
                          {v.didascalia}
                        </span>
                      )}
                    </span>
                    <span className="pr-2 text-sm font-bold" style={{ color: 'var(--accento)' }} aria-hidden>
                      →
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  function vistaSquadra() {
    const C = T.squadra.colonne;
    return (
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-bold">{T.squadra.titolo}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
          {T.squadra.spiegazione}
        </p>
        {squadra.length === 0 ? (
          <p className="py-12 text-center" style={{ color: 'var(--fg-muta)' }}>
            {T.squadra.vuota}
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--bordo)' }}>
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muta)' }}>
                  <th scope="col" className="p-3">{C.persona}</th>
                  <th scope="col" className="p-3 text-right">{C.settimana}</th>
                  <th scope="col" className="p-3 text-right">{C.post}</th>
                  <th scope="col" className="p-3 text-right">{C.storie}</th>
                  <th scope="col" className="p-3 text-right">{C.daRivedere}</th>
                  <th scope="col" className="p-3 text-right">{C.daCorreggere}</th>
                  <th scope="col" className="p-3 text-right">{C.approvati}</th>
                  <th scope="col" className="p-3 text-right">{C.ultimo}</th>
                </tr>
              </thead>
              <tbody>
                {squadra.map((p) => (
                  <tr key={p.chiave} className="border-t" style={{ borderColor: 'var(--bordo)' }}>
                    <th scope="row" className="p-3 text-left font-normal">
                      <button type="button" onClick={() => apriProfilo(p.chiave)} className="flex items-center gap-2 font-semibold hover:underline" aria-label={T.squadra.apri(p.nome)}>
                        <Avatar nome={p.nome} colore={coloreDaNome(p.chiave)} className="h-7 w-7 text-[10px]" />
                        {p.nome}
                      </button>
                    </th>
                    <td className="p-3 text-right font-bold">{p.settimana}</td>
                    <td className="p-3 text-right">{p.post}</td>
                    <td className="p-3 text-right">{p.storie}</td>
                    <td className="p-3 text-right" style={{ color: p.daRivedere ? T.coloreStato.da_rivedere : undefined }}>{p.daRivedere}</td>
                    <td className="p-3 text-right" style={{ color: p.daCorreggere ? T.coloreStato.da_correggere : undefined }}>{p.daCorreggere}</td>
                    <td className="p-3 text-right" style={{ color: p.approvati ? T.coloreStato.approvato : undefined }}>{p.approvati}</td>
                    <td className="p-3 text-right" style={{ color: 'var(--fg-muta)' }}>{p.ultimoInvio ? formattaDataRelativa(p.ultimoInvio, adesso) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {cestino.length > 0 && (
          <section className="mt-10" aria-labelledby="cestino-titolo">
            <h3 id="cestino-titolo" className="text-lg font-bold">
              {T.cestino.titolo(cestino.length)}
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
              {T.cestino.spiegazione}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-6">
              {cestino.map((c) => (
                <button key={c.id} type="button" onClick={() => setAperto(c.id)} className="block opacity-60 hover:opacity-100" aria-label={T.miniatura(c.tipo, c.autore)}>
                  <Copertina contenuto={c} conStato={false} />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ borderColor: 'var(--bordo)', background: 'rgba(10,10,10,0.85)', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <span className="text-base font-bold">
            {T.marchio}
            <span className="ml-2 hidden text-sm font-normal sm:inline" style={{ color: 'var(--fg-muta)' }}>
              {T.sottomarchio}
            </span>
          </span>
          <span className="ml-auto flex min-w-0 items-center gap-2">
            <Avatar nome={sessione.nome} colore={coloreDaNome(mia)} className="h-7 w-7 text-[10px]" />
            <span className="hidden truncate text-sm font-semibold sm:inline">{sessione.nome}</span>
            <BadgeRuolo ruolo={sessione.ruolo} />
          </span>
          <button type="button" onClick={uscita} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.08)' }}>
            {T.esci}
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-3 pb-2" aria-label={T.marchio}>
          {schede.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={vista === s.id ? 'page' : undefined}
              onClick={() => {
                setVista(s.id);
                if (s.id === 'profilo') setPersona(null);
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
              style={vista === s.id ? { background: 'var(--fg)', color: '#0a0a0a' } : { color: 'var(--fg-muta)' }}
            >
              {s.etichetta}
              {s.conta !== undefined && (
                <span className="rounded-full px-1.5 text-[11px] font-bold" style={{ background: '#F59E0B', color: '#0a0a0a' }}>
                  {s.conta}
                </span>
              )}
            </button>
          ))}
          <span className="ml-auto flex shrink-0 gap-1.5 pl-2">
            <button type="button" onClick={() => setComposizione({ tipo: 'post' })} className="rounded-full px-3 py-1.5 text-sm font-bold" style={{ background: 'var(--accento)', color: '#0a0a0a' }}>
              {T.piuPost}
            </button>
            <button type="button" onClick={() => setComposizione({ tipo: 'storia' })} className="rounded-full border px-3 py-1.5 text-sm font-bold" style={{ borderColor: 'var(--accento)', color: 'var(--accento)' }}>
              {T.piuStoria}
            </button>
          </span>
        </nav>
      </header>

      <main className="px-4 py-6">
        {errore && (
          <p role="alert" className="mx-auto mb-4 flex max-w-xl items-center justify-between gap-3 rounded-2xl border p-3 text-sm" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}>
            {T.feed.errore}
            <button type="button" onClick={() => void aggiorna()} className="font-bold">
              {T.feed.riprova}
            </button>
          </p>
        )}
        {contenuti === null && !errore ? (
          <p className="py-12 text-center" role="status" style={{ color: 'var(--fg-muta)' }}>
            {T.feed.caricamento}
          </p>
        ) : vista === 'feed' ? (
          vistaFeed()
        ) : vista === 'profilo' ? (
          vistaProfilo()
        ) : vista === 'revisione' && revisore ? (
          vistaRevisione()
        ) : vista === 'squadra' && revisore ? (
          vistaSquadra()
        ) : (
          vistaFeed()
        )}
      </main>

      {storieAperte !== null && gruppiStorie[storieAperte] && (
        <VisoreStorie
          gruppi={gruppiStorie}
          iniziale={storieAperte}
          sessione={sessione}
          onApri={(c) => {
            setStorieAperte(null);
            setAperto(c.id);
          }}
          onChiudi={() => setStorieAperte(null)}
        />
      )}

      {contenutoAperto && !composizione && (
        <Dettaglio
          contenuto={contenutoAperto}
          sessione={sessione}
          onAggiornato={sostituisci}
          onEliminato={(id) => {
            setAperto(null);
            // Resta nell'archivio: qui si segna come eliminato, l'aggiornamento successivo lo conferma.
            const adesso = new Date().toISOString();
            setContenuti((attuali) => (attuali ?? []).map((c) => (c.id === id ? { ...c, eliminatoIl: adesso, eliminatoDa: sessione.nome } : c)));
          }}
          onCorreggi={(c) => setComposizione({ tipo: c.tipo, base: c })}
          onChiudi={() => setAperto(null)}
        />
      )}

      {composizione && (
        <Compositore
          tipo={composizione.tipo}
          base={composizione.base}
          autore={sessione.nome}
          onPubblicato={(c) => {
            sostituisci(c);
            setComposizione(null);
            setAperto(composizione.base ? c.id : null);
            if (!composizione.base) {
              setVista(c.tipo === 'post' ? 'feed' : 'profilo');
              setPersona(null);
              setSchedaProfilo(c.tipo);
            }
          }}
          onChiudi={() => setComposizione(null)}
        />
      )}
    </div>
  );
}

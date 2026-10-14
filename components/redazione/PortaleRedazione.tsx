'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Avatar from '@/components/profilo/Avatar';
import { formattaDataRelativa } from '@/lib/data-ora';
import { caricaContenuti, caricaContenuto, caricaScheda, coloreDaNome, ErroreApi, esci, salvaObiettivi, urlMedia } from '@/lib/redazione/client';
import {
  chiaveNome,
  codaRevisione,
  cronologia,
  eliminato,
  OBIETTIVI_PREDEFINITI,
  obiettiviDiOggi,
  ordinaFeed,
  percentuale,
  puoVedereCommenti,
  storieRecenti,
  unisci,
  URL_GENERATORE,
  versioneCorrente,
} from '@/lib/redazione/regole';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { Contenuto, Obiettivi, PersonaPubblica, SchedaDati, SessioneRedazione, StatistichePersona, TipoContenuto } from '@/lib/redazione/tipi';
import AccessoRedazione from './AccessoRedazione';
import Andamento from './Andamento';
import Attivita from './Attivita';
import AnteprimaPost from './AnteprimaPost';
import AnteprimaStoria from './AnteprimaStoria';
import Compositore from './Compositore';
import Dettaglio from './Dettaglio';
import Persone from './Persone';
import SchedaPersona from './SchedaPersona';
import { BadgeRuolo, BadgeStato } from './Distintivi';
import VisoreStorie, { type GruppoStorie } from './VisoreStorie';

const T = TESTI_REDAZIONE;
/** Ogni minuto il portale si aggiorna da solo, così chi corregge vede arrivare i contenuti. */
const AGGIORNAMENTO_MS = 60_000;
/** Post mostrati nel feed prima di «Mostra altri»: le immagini si caricano solo per quelli. */
const PAGINA_FEED = 15;

/** I contenuti di una persona chiesti a pagine, con i numeri calcolati dal server su tutto. */
interface StatoScheda {
  numeri: SchedaDati | null;
  altri: boolean;
  prima: string | null;
  caricando: boolean;
  errore: boolean;
}
const SCHEDA_VUOTA: StatoScheda = { numeri: null, altri: false, prima: null, caricando: false, errore: false };

type Vista = 'feed' | 'profilo' | 'revisione' | 'attivita' | 'squadra';

/* ---------- Pezzi ---------- */

/** Chi corregge decide quante storie e quanti post al giorno a testa. */
function ModificaObiettivi({ obiettivi, onSalvati }: { obiettivi: Obiettivi; onSalvati: (o: Obiettivi) => void }) {
  const O = T.obiettivi;
  const [valori, setValori] = useState({
    storieGiorno: String(obiettivi.storieGiorno),
    postGiorno: String(obiettivi.postGiorno),
    storieWeekend: String(obiettivi.storieWeekend),
    postWeekend: String(obiettivi.postWeekend),
  });
  const [esito, setEsito] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    setEsito(null);
    try {
      onSalvati(
        await salvaObiettivi({
          storieGiorno: Number(valori.storieGiorno),
          postGiorno: Number(valori.postGiorno),
          storieWeekend: Number(valori.storieWeekend),
          postWeekend: Number(valori.postWeekend),
        }),
      );
      setEsito(O.salvato);
    } catch (err) {
      setEsito(err instanceof Error ? err.message : O.errore);
    } finally {
      setInvio(false);
    }
  }
  const campo = 'w-20 rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2';
  const stile = { borderColor: 'var(--bordo)', background: 'var(--bg)', color: 'var(--fg)' };
  return (
    <form onSubmit={salva} className="rounded-2xl border p-4" style={{ borderColor: 'var(--bordo)' }}>
      <h2 className="text-lg font-bold">{O.titolo}</h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
        {O.spiegazione}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-6">
        {(
          [
            [O.feriali, 'storieGiorno', 'postGiorno'],
            [O.weekend, 'storieWeekend', 'postWeekend'],
          ] as const
        ).map(([gruppo, chiaveStorie, chiavePost]) => (
          <fieldset key={gruppo}>
            <legend className="mb-1 text-xs font-bold">{gruppo}</legend>
            <div className="flex gap-3">
              {(
                [
                  [O.storie, chiaveStorie],
                  [O.post, chiavePost],
                ] as const
              ).map(([etichetta, chiave]) => (
                <label key={chiave} className="text-xs font-semibold" style={{ color: 'var(--fg-muta)' }}>
                  {etichetta}
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={valori[chiave]}
                    onChange={(e) => setValori({ ...valori, [chiave]: e.target.value })}
                    className={`${campo} mt-1 block`}
                    style={stile}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button type="submit" disabled={invio} className="rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40" style={{ background: 'var(--accento)', color: '#0a0a0a' }}>
          {O.salva}
        </button>
        {esito && (
          <span role="status" className="text-sm" style={{ color: 'var(--fg-muta)' }}>
            {esito}
          </span>
        )}
      </div>
    </form>
  );
}

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
  const [obiettivi, setObiettivi] = useState<Obiettivi>(OBIETTIVI_PREDEFINITI);
  const [persone, setPersone] = useState<PersonaPubblica[]>([]);
  const [vista, setVista] = useState<Vista>('feed');
  const [persona, setPersona] = useState<string | null>(null);
  const [schedaProfilo, setSchedaProfilo] = useState<TipoContenuto>('post');
  const [composizione, setComposizione] = useState<{ tipo: TipoContenuto; base?: Contenuto } | null>(null);
  const [aperto, setAperto] = useState<string | null>(null);
  const [storieAperte, setStorieAperte] = useState<number | null>(null);
  const [storieViste, setStorieViste] = useState<Set<string>>(() => new Set());
  const [squadra, setSquadra] = useState<StatistichePersona[]>([]);
  const [schedePersone, setSchedePersone] = useState<Record<string, StatoScheda>>({});
  const [quantiPost, setQuantiPost] = useState(PAGINA_FEED);

  // Revisione dell'archivio già ricevuta: ogni aggiornamento chiede solo quello che è cambiato dopo.
  const revisione = useRef<number | null>(null);
  const inCorso = useRef(false);
  const ancora = useRef(false);

  const aggiorna = useCallback(async () => {
    // Una richiesta alla volta; se ne serve un'altra intanto (dopo una pubblicazione), parte subito dopo.
    if (inCorso.current) {
      ancora.current = true;
      return;
    }
    inCorso.current = true;
    try {
      do {
        ancora.current = false;
        const dati = await caricaContenuti(revisione.current);
        setContenuti((attuali) => (dati.completo ? unisci([], dati.contenuti) : unisci(attuali ?? [], dati.contenuti, dati.rimossi)));
        revisione.current = dati.revisione;
        setSquadra(dati.statistiche);
        setObiettivi(dati.obiettivi);
        setPersone(dati.persone);
        setErrore(false);
      } while (ancora.current);
    } catch (e) {
      if (e instanceof ErroreApi && e.status === 401) setSessione(null);
      else setErrore(true);
    } finally {
      inCorso.current = false;
      ancora.current = false;
    }
  }, []);

  const caricaPaginaScheda = useCallback(async (chiave: string, prima: string | null) => {
    setSchedePersone((s) => ({ ...s, [chiave]: { ...(s[chiave] ?? SCHEDA_VUOTA), caricando: true, errore: false } }));
    try {
      const dati = await caricaScheda(chiave, prima);
      setContenuti((attuali) => unisci(attuali ?? [], dati.contenuti));
      setSchedePersone((s) => ({ ...s, [chiave]: { numeri: dati, altri: dati.altri, prima: dati.contenuti.at(-1)?.creatoIl ?? prima, caricando: false, errore: false } }));
    } catch (e) {
      if (e instanceof ErroreApi && e.status === 401) setSessione(null);
      setSchedePersone((s) => ({ ...s, [chiave]: { ...(s[chiave] ?? SCHEDA_VUOTA), caricando: false, errore: true } }));
    }
  }, []);

  useEffect(() => {
    if (!sessione) return;
    // Nuova sessione: si riparte da capo, niente di quello che vedeva chi c'era prima.
    revisione.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSchedePersone({});
    // Primo caricamento e aggiornamento periodico quando la scheda è in primo piano.
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
  // Feed e profili ignorano i contenuti eliminati; chi corregge li ritrova nel cestino. Le
  // statistiche (eliminati compresi, per le percentuali) le calcola il server su tutto l'archivio.
  const tutti = useMemo(() => ordinaFeed((contenuti ?? []).filter((c) => !eliminato(c))), [contenuti]);
  const cestino = useMemo(() => (contenuti ?? []).filter(eliminato).sort((a, b) => (b.eliminatoIl ?? '').localeCompare(a.eliminatoIl ?? '')), [contenuti]);
  const gruppiStorie: GruppoStorie[] = useMemo(() => storieRecenti(tutti, adesso), [tutti, adesso]);
  const coda = useMemo(() => codaRevisione(tutti), [tutti]);
  const voci = useMemo(() => cronologia(contenuti ?? []), [contenuti]);

  // Profilo o scheda aperti: si chiedono al server i contenuti della persona, anche i più vecchi.
  const chiaveProfilo = sessione && vista === 'profilo' ? (persona ?? chiaveNome(sessione.nome)) : null;
  useEffect(() => {
    if (!chiaveProfilo) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void caricaPaginaScheda(chiaveProfilo, null);
    // Anche i numeri della squadra, così obiettivi e percentuali sono quelli di adesso.
    void aggiorna();
  }, [chiaveProfilo, caricaPaginaScheda, aggiorna]);

  // Link dall'avviso Telegram (/redazione?apri=<id>): apre il contenuto appena arriva il feed,
  // chiedendolo a parte se è più vecchio delle ultime settimane.
  const linkAperto = useRef(false);
  useEffect(() => {
    if (!contenuti || linkAperto.current) return;
    linkAperto.current = true;
    const id = new URLSearchParams(window.location.search).get('apri');
    if (!id) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (contenuti.some((c) => c.id === id)) {
      setAperto(id); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    caricaContenuto(id)
      .then((c) => {
        setContenuti((attuali) => unisci(attuali ?? [], [c]));
        setAperto(c.id);
      })
      .catch(() => undefined);
  }, [contenuti]);

  if (!sessione) return <AccessoRedazione configurata={configurata} onEntrato={setSessione} />;

  const mia = chiaveNome(sessione.nome);
  const revisore = sessione.ruolo === 'revisore';
  const mieDaCorreggere = tutti.filter((c) => c.chiaveAutore === mia && c.stato === 'da_correggere').length;
  const contenutoAperto = aperto ? (contenuti ?? []).find((c) => c.id === aperto) : undefined;

  /** Dopo una modifica: il contenuto aggiornato subito, poi i numeri (obiettivi, coda) dal server. */
  function sostituisci(c: Contenuto) {
    setContenuti((attuali) => unisci(attuali ?? [], [c]));
    void aggiorna();
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
    setSquadra([]);
  }

  const schede: { id: Vista; etichetta: string; conta?: number }[] = [
    { id: 'feed', etichetta: T.schede.feed },
    { id: 'profilo', etichetta: T.schede.profilo, conta: mieDaCorreggere || undefined },
    ...(revisore
      ? [
          { id: 'revisione' as const, etichetta: T.schede.revisione, conta: coda.length || undefined },
          { id: 'attivita' as const, etichetta: T.schede.attivita },
          { id: 'squadra' as const, etichetta: T.schede.squadra },
        ]
      : []),
  ];

  /* ----- Viste ----- */

  function vistaFeed() {
    const post = tutti.filter((c) => c.tipo === 'post');
    const mostrati = post.slice(0, quantiPost);
    const mieStorie = gruppiStorie.findIndex((g) => g.chiave === mia);
    return (
      <div className="mx-auto max-w-xl">
        {!revisore && (
          <div className="mb-4">
            <Andamento persona={squadra.find((p) => p.chiave === mia)} obiettivi={obiettivi} conPercentuali={false} />
          </div>
        )}
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
                  onClick={() => setStorieAperte(i)}
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
            {mostrati.map((c) => {
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
            {post.length > quantiPost ? (
              <button type="button" onClick={() => setQuantiPost(quantiPost + PAGINA_FEED)} className="w-full rounded-full py-2.5 text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.08)' }}>
                {T.feed.altriPost}
              </button>
            ) : (
              <p className="pb-4 text-center text-xs" style={{ color: 'var(--fg-muta)' }}>
                {T.feed.finestra}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function vistaAttivita() {
    return (
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold">{T.attivita.titolo}</h2>
        <p className="mb-4 mt-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
          {T.attivita.spiegazione}
        </p>
        <Attivita voci={voci} contenuti={contenuti ?? []} persone={squadra.map((p) => [p.chiave, p.nome])} onApri={setAperto} />
      </div>
    );
  }

  function vistaProfilo() {
    const chiave = persona ?? mia;
    const scheda = schedePersone[chiave] ?? SCHEDA_VUOTA;
    const precedenti = (
      <div className="mt-4 text-center text-sm" style={{ color: 'var(--fg-muta)' }}>
        {scheda.errore ? (
          <p role="alert">
            {T.profilo.errore}{' '}
            <button type="button" onClick={() => void caricaPaginaScheda(chiave, scheda.prima)} className="font-bold" style={{ color: 'var(--fg)' }}>
              {T.feed.riprova}
            </button>
          </p>
        ) : scheda.caricando ? (
          <p role="status">{T.profilo.caricando}</p>
        ) : (
          scheda.altri && (
            <button type="button" onClick={() => void caricaPaginaScheda(chiave, scheda.prima)} className="w-full rounded-full py-2.5 font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--fg)' }}>
              {T.profilo.precedenti}
            </button>
          )
        )}
      </div>
    );
    // Chi coordina, sul profilo di un ragazzo, vede la sua scheda completa.
    if (revisore && chiave !== mia) {
      const stat = squadra.find((s) => s.chiave === chiave);
      return (
        <SchedaPersona
          chiave={chiave}
          nome={stat?.nome ?? persone.find((p) => p.chiave === chiave)?.nome ?? chiave}
          stat={stat}
          contenuti={ordinaFeed((contenuti ?? []).filter((c) => c.chiaveAutore === chiave))}
          numeri={scheda.numeri}
          voci={voci}
          tutti={contenuti ?? []}
          obiettivi={obiettivi}
          adesso={adesso}
          piede={precedenti}
          onApri={setAperto}
          onIndietro={() => setVista('squadra')}
        />
      );
    }
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

        <div className="mt-5">
          <Andamento persona={stat} obiettivi={obiettivi} />
        </div>

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
        {precedenti}
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
    const oggi = obiettiviDiOggi(obiettivi, adesso);
    return (
      <div className="mx-auto max-w-5xl">
        <ModificaObiettivi obiettivi={obiettivi} onSalvati={setObiettivi} />
        <div className="mt-4">
          <Persone persone={persone} onCambiate={setPersone} onApri={apriProfilo} />
        </div>
        <h2 className="mt-8 text-2xl font-bold">{T.squadra.titolo}</h2>
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
                  <th scope="col" className="p-3 text-right">{C.oggi}</th>
                  <th scope="col" className="p-3 text-right">{C.settimana}</th>
                  <th scope="col" className="p-3 text-right">{C.post}</th>
                  <th scope="col" className="p-3 text-right">{C.storie}</th>
                  <th scope="col" className="p-3 text-right">{C.daRivedere}</th>
                  <th scope="col" className="p-3 text-right">{C.daCorreggere}</th>
                  <th scope="col" className="p-3 text-right">{C.approvati}</th>
                  <th scope="col" className="p-3 text-right">{C.nonVaBene}</th>
                  <th scope="col" className="p-3 text-right">{C.eliminati}</th>
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
                    <td className="p-3 text-right whitespace-nowrap" style={{ color: p.storieOggi >= oggi.storie && p.postOggi >= oggi.post ? T.coloreStato.approvato : undefined }}>
                      {p.storieOggi}/{oggi.storie} · {p.postOggi}/{oggi.post}
                    </td>
                    <td className="p-3 text-right font-bold">{p.settimana}</td>
                    <td className="p-3 text-right">{p.post}</td>
                    <td className="p-3 text-right">{p.storie}</td>
                    <td className="p-3 text-right" style={{ color: p.daRivedere ? T.coloreStato.da_rivedere : undefined }}>{p.daRivedere}</td>
                    <td className="p-3 text-right" style={{ color: p.daCorreggere ? T.coloreStato.da_correggere : undefined }}>{p.daCorreggere}</td>
                    <td className="p-3 text-right" style={{ color: p.approvati ? T.coloreStato.approvato : undefined }}>
                      {p.approvati} <span style={{ color: 'var(--fg-muta)' }}>({percentuale(p.approvati, p.totale)}%)</span>
                    </td>
                    <td className="p-3 text-right" style={{ color: p.nonVaBene ? T.coloreStato.non_va_bene : undefined }}>
                      {p.nonVaBene} <span style={{ color: 'var(--fg-muta)' }}>({percentuale(p.nonVaBene, p.totale)}%)</span>
                    </td>
                    <td className="p-3 text-right" style={{ color: p.eliminati ? '#F87171' : undefined }}>
                      {p.eliminati} <span style={{ color: 'var(--fg-muta)' }}>({percentuale(p.eliminati, p.totale)}%)</span>
                    </td>
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
                if (s.id === 'feed') setQuantiPost(PAGINA_FEED);
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
        {contenuti === null ? (
          !errore && (
            <p className="py-12 text-center" role="status" style={{ color: 'var(--fg-muta)' }}>
              {T.feed.caricamento}
            </p>
          )
        ) : vista === 'feed' ? (
          vistaFeed()
        ) : vista === 'profilo' ? (
          vistaProfilo()
        ) : vista === 'revisione' && revisore ? (
          vistaRevisione()
        ) : vista === 'attivita' && revisore ? (
          vistaAttivita()
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
          onVista={(id) => setStorieViste((v) => (v.has(id) ? v : new Set([...v, id])))}
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
          onEliminato={(c) => {
            // Resta nell'archivio: esce da feed e profili e va nel cestino di chi coordina.
            setAperto(null);
            sostituisci(c);
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

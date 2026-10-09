'use client';

import { useId, useState } from 'react';
import Avatar from '@/components/profilo/Avatar';
import { formattaDataEstesa, formattaDataRelativa } from '@/lib/data-ora';
import { coloreDaNome, commenta, eliminaContenuto, urlMedia } from '@/lib/redazione/client';
import { chiaveNome, puoEliminare, puoModificare, puoVedereCommenti, TIPI_COMMENTO_REVISORE } from '@/lib/redazione/regole';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { Contenuto, SessioneRedazione, StatoContenuto, TipoCommento } from '@/lib/redazione/tipi';
import AnteprimaPost from './AnteprimaPost';
import AnteprimaStoria from './AnteprimaStoria';
import { BadgeCommento, BadgeRuolo, BadgeStato } from './Distintivi';
import Finestra from './Finestra';

const T = TESTI_REDAZIONE.dettaglio;

/** Un contenuto con tutte le sue versioni e il filo delle correzioni. */
export default function Dettaglio({
  contenuto,
  sessione,
  onAggiornato,
  onEliminato,
  onCorreggi,
  onChiudi,
}: {
  contenuto: Contenuto;
  sessione: SessioneRedazione;
  onAggiornato: (c: Contenuto) => void;
  onEliminato: (id: string) => void;
  onCorreggi: (c: Contenuto) => void;
  onChiudi: () => void;
}) {
  const ultima = contenuto.versioni.length;
  const [scelta, setScelta] = useState<number | null>(null);
  const numero = scelta ?? ultima;
  const versione = contenuto.versioni.find((v) => v.numero === numero) ?? contenuto.versioni[ultima - 1];
  const revisore = sessione.ruolo === 'revisore';
  const [tipo, setTipo] = useState<TipoCommento>('correzione');
  const [testo, setTesto] = useState('');
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [conferma, setConferma] = useState(false);
  const id = useId();

  async function invia(stato: StatoContenuto | null) {
    if (invio || (!testo.trim() && !stato)) return;
    setInvio(true);
    setErrore(null);
    try {
      const aggiornato = await commenta(contenuto.id, { tipo: revisore ? tipo : 'risposta', testo, stato });
      setTesto('');
      setScelta(null);
      onAggiornato(aggiornato);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : T.errore);
    } finally {
      setInvio(false);
    }
  }

  async function elimina() {
    setInvio(true);
    try {
      await eliminaContenuto(contenuto.id);
      onEliminato(contenuto.id);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : T.errore);
      setInvio(false);
    }
  }

  const immagini = versione.immagini.map(urlMedia);

  return (
    <Finestra titolo={`${TESTI_REDAZIONE.feed.apri}: ${contenuto.autore}`} onChiudi={onChiudi} larga>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-elevated)' }}>
        <BadgeStato stato={contenuto.stato} />
        <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--fg-muta)' }}>
          {contenuto.autore} · {formattaDataEstesa(versione.inviataIl)}
        </span>
        <button type="button" onClick={onChiudi} data-autofocus className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {T.chiudi}
        </button>
      </div>

      <div className="grid gap-6 p-4 sm:grid-cols-[minmax(0,24rem)_1fr]">
        <div>
          {contenuto.versioni.length > 1 && (
            <div className="mb-3" role="group" aria-label={T.versioni}>
              <span className="mr-2 text-xs font-semibold" style={{ color: 'var(--fg-muta)' }}>
                {T.versioni}
              </span>
              {contenuto.versioni.map((v) => (
                <button
                  key={v.numero}
                  type="button"
                  aria-pressed={v.numero === numero}
                  onClick={() => setScelta(v.numero)}
                  className="mr-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                  style={v.numero === numero ? { background: 'var(--accento)', color: '#0a0a0a', borderColor: 'var(--accento)' } : { borderColor: 'var(--bordo)' }}
                >
                  {T.versioneCorta(v.numero)}
                </button>
              ))}
            </div>
          )}
          {contenuto.tipo === 'post' ? (
            <AnteprimaPost key={numero} autore={contenuto.autore} immagini={immagini} didascalia={versione.didascalia} formato={versione.formato} />
          ) : (
            <AnteprimaStoria immagine={immagini[0] ?? null} autore={contenuto.autore} className="mx-auto max-w-[20rem]" />
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {puoModificare(sessione, contenuto) && (
              <button type="button" onClick={() => onCorreggi(contenuto)} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: 'var(--accento)', color: '#0a0a0a' }}>
                {T.correggi}
              </button>
            )}
            {puoEliminare(sessione, contenuto) &&
              (conferma ? (
                <span className="flex flex-wrap items-center gap-2 text-sm" role="alert">
                  {T.confermaElimina}
                  <button type="button" onClick={elimina} disabled={invio} className="rounded-full px-3 py-1.5 font-bold" style={{ background: '#DC2626', color: '#fff' }}>
                    {T.elimina}
                  </button>
                  <button type="button" onClick={() => setConferma(false)} className="rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    {TESTI_REDAZIONE.compositore.annulla}
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConferma(true)} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)' }}>
                  {T.elimina}
                </button>
              ))}
          </div>
        </div>

        {puoVedereCommenti(sessione, contenuto) && (
          <section aria-labelledby={`${id}-titolo`}>
            <h3 id={`${id}-titolo`} className="text-lg font-bold">
              {T.correzioni}
            </h3>
            <p className="text-xs" style={{ color: 'var(--fg-muta)' }}>
              {T.commentiPrivati}
            </p>

            <ol className="mt-4 space-y-3">
              {contenuto.commenti.length === 0 && (
                <li className="text-sm" style={{ color: 'var(--fg-muta)' }}>
                  {T.nessunCommento}
                </li>
              )}
              {contenuto.commenti.map((c) => (
                <li key={c.id} className="rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)', background: c.ruolo === 'revisore' ? 'rgba(254,220,1,0.04)' : 'transparent' }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Avatar nome={c.autore} colore={coloreDaNome(chiaveNome(c.autore))} className="h-6 w-6 text-[10px]" />
                    <span className="text-sm font-semibold">{c.autore}</span>
                    <BadgeRuolo ruolo={c.ruolo} />
                    <BadgeCommento tipo={c.tipo} />
                    <span className="ml-auto text-xs" style={{ color: 'var(--fg-muta)' }}>
                      <button type="button" onClick={() => setScelta(c.versione)} className="underline-offset-2 hover:underline">
                        {T.suVersione(c.versione)}
                      </button>{' '}
                      · <time dateTime={c.creatoIl}>{formattaDataRelativa(c.creatoIl)}</time>
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed">{c.testo}</p>
                </li>
              ))}
            </ol>

            <div className="mt-5 rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)' }}>
              {revisore && (
                <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label={T.tipo}>
                  {TIPI_COMMENTO_REVISORE.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={t === tipo}
                      onClick={() => setTipo(t)}
                      className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                      style={t === tipo ? { background: TESTI_REDAZIONE.coloreCommento[t], color: '#0a0a0a', borderColor: 'transparent' } : { borderColor: 'var(--bordo)' }}
                    >
                      {TESTI_REDAZIONE.tipoCommento[t]}
                    </button>
                  ))}
                </div>
              )}
              <label htmlFor={`${id}-testo`} className="sr-only">
                {revisore ? T.scriviCommento : T.scriviRisposta}
              </label>
              <textarea
                id={`${id}-testo`}
                value={testo}
                onChange={(e) => setTesto(e.target.value)}
                rows={4}
                placeholder={revisore ? T.segnapostoRevisore : T.segnapostoAutore}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: 'var(--bordo)', background: 'var(--bg)' }}
              />
              {errore && (
                <p role="alert" className="mt-1 text-sm" style={{ color: '#F87171' }}>
                  {errore}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={invio || !testo.trim()} onClick={() => invia(null)} className="rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  {invio ? T.invio : T.invia}
                </button>
                {revisore && (
                  <>
                    <button
                      type="button"
                      disabled={invio || !testo.trim()}
                      onClick={() => invia('da_correggere')}
                      className="rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40"
                      style={{ background: TESTI_REDAZIONE.coloreStato.da_correggere, color: '#0a0a0a' }}
                    >
                      {T.inviaECorreggi}
                    </button>
                    {contenuto.stato !== 'approvato' ? (
                      <button type="button" disabled={invio} onClick={() => invia('approvato')} className="rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40" style={{ background: TESTI_REDAZIONE.coloreStato.approvato, color: '#0a0a0a' }}>
                        {T.approva}
                      </button>
                    ) : (
                      <button type="button" disabled={invio} onClick={() => invia('da_rivedere')} className="rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        {T.riapri}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </Finestra>
  );
}

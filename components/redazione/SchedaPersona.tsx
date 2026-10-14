'use client';

import Avatar from '@/components/profilo/Avatar';
import { formattaDataEstesa, formattaDataRelativa } from '@/lib/data-ora';
import { coloreDaNome, urlMedia } from '@/lib/redazione/client';
import { eliminato, percentuale, versioneCorrente } from '@/lib/redazione/regole';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { Contenuto, GiornoAndamento, Obiettivi, SchedaDati, StatistichePersona, VoceAttivita } from '@/lib/redazione/tipi';
import Andamento from './Andamento';
import Attivita from './Attivita';
import { BadgeStato } from './Distintivi';

const T = TESTI_REDAZIONE.scheda;

function Numero({ etichetta, valore, nota }: { etichetta: string; valore: string; nota?: string }) {
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)' }}>
      <div className="text-xl font-bold">{valore}</div>
      <div className="text-xs" style={{ color: 'var(--fg-muta)' }}>
        {etichetta}
        {nota && ` · ${nota}`}
      </div>
    </div>
  );
}

/** Le barre degli ultimi 14 giorni: storie e post affiancati, l'obiettivo come linea. */
function Giorni({ giorni }: { giorni: GiornoAndamento[] }) {
  const massimo = Math.max(1, ...giorni.flatMap((g) => [g.storie, g.post, g.obiettivoStorie, g.obiettivoPost]));
  const altezza = (n: number) => `${(n / massimo) * 100}%`;
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label={giorni.map((g) => `${g.giorno}: ${g.storie} storie, ${g.post} post`).join('; ')}>
        {giorni.map((g) => (
          <div key={g.giorno} className="relative flex h-full flex-1 items-end justify-center gap-0.5">
            <div className="absolute inset-x-0 border-t border-dashed" style={{ bottom: altezza(g.obiettivoStorie), borderColor: 'rgba(255,255,255,0.25)' }} />
            <div className="w-1/2 rounded-t" style={{ height: altezza(g.storie), background: 'rgba(255,255,255,0.55)', minHeight: g.storie ? 3 : 0 }} />
            <div className="w-1/2 rounded-t" style={{ height: altezza(g.post), background: 'var(--accento)', minHeight: g.post ? 3 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-center text-[10px]" style={{ color: 'var(--fg-muta)' }} aria-hidden>
        {giorni.map((g) => (
          <div key={g.giorno} className="flex-1">
            <div>{Number(g.giorno.slice(8))}</div>
            <div style={{ color: g.inPari ? '#22C55E' : undefined }}>{g.inPari ? '✓' : '·'}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--fg-muta)' }}>
        {T.legenda}
      </p>
    </div>
  );
}

/**
 * La scheda di un ragazzo per chi coordina: andamento, numeri, ogni contenuto con i commenti, ogni
 * attività. I numeri arrivano dal server, calcolati su tutto; i contenuti a pagine.
 */
export default function SchedaPersona({
  chiave,
  nome,
  stat,
  contenuti: suoi,
  numeri,
  voci,
  tutti,
  obiettivi,
  adesso,
  piede,
  onApri,
  onIndietro,
}: {
  chiave: string;
  nome: string;
  stat: StatistichePersona | undefined;
  /** I suoi contenuti arrivati finora, dal più recente, eliminati compresi. */
  contenuti: Contenuto[];
  /** Andamento e numeri dal server; null finché non arrivano. */
  numeri: SchedaDati | null;
  voci: VoceAttivita[];
  /** Tutti i contenuti arrivati, per le miniature delle attività sui contenuti degli altri. */
  tutti: Contenuto[];
  obiettivi: Obiettivi;
  adesso: Date;
  /** «Mostra i precedenti», caricamento ed errori. */
  piede: React.ReactNode;
  onApri: (id: string) => void;
  onIndietro: () => void;
}) {
  const giorni = numeri?.andamento ?? [];
  const primoColpo = numeri?.primoColpo ?? 0;
  const approvati = numeri?.approvati ?? 0;
  const versioniMedie = numeri?.versioniMedie != null ? numeri.versioniMedie.toFixed(1).replace('.', ',') : '—';

  return (
    <div className="mx-auto max-w-4xl">
      <button type="button" onClick={onIndietro} className="mb-4 text-sm font-semibold" style={{ color: 'var(--fg-muta)' }}>
        {T.indietro}
      </button>
      <div className="flex items-center gap-4">
        <Avatar nome={nome} colore={coloreDaNome(chiave)} className="h-16 w-16 text-xl" />
        <div>
          <h2 className="text-2xl font-bold">{nome}</h2>
          <p className="text-sm" style={{ color: 'var(--fg-muta)' }}>
            {stat?.post ?? 0} post · {stat?.storie ?? 0} {TESTI_REDAZIONE.profilo.contaStorie(stat?.storie ?? 0)} · {T.ultimoInvio.toLowerCase()} {stat?.ultimoInvio ? formattaDataRelativa(stat.ultimoInvio, adesso) : T.mai}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Andamento persona={stat} obiettivi={obiettivi} />
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--bordo)' }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muta)' }}>
            {T.giorni}
          </p>
          <Giorni giorni={giorni} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero etichetta={T.giorniInPari} valore={numeri ? `${giorni.filter((g) => g.inPari).length}/${giorni.length}` : '—'} />
        <Numero etichetta={T.primoColpo} valore={`${percentuale(primoColpo, approvati)}%`} nota={`${primoColpo}/${approvati}`} />
        <Numero etichetta={T.versioniMedie} valore={versioniMedie} />
        <Numero etichetta={T.ultimoInvio} valore={stat?.ultimoInvio ? formattaDataRelativa(stat.ultimoInvio, adesso) : T.mai} />
      </div>

      <h3 className="mt-8 text-lg font-bold">{T.contenuti}</h3>
      {suoi.length === 0 ? (
        numeri && (
          <p className="py-6" style={{ color: 'var(--fg-muta)' }}>
            {T.nessunContenuto}
          </p>
        )
      ) : (
        <ul className="mt-3 space-y-3">
          {suoi.map((c) => {
            const v = versioneCorrente(c);
            return (
              <li key={c.id} className="flex gap-3 rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)', opacity: eliminato(c) ? 0.6 : 1 }}>
                <button type="button" onClick={() => onApri(c.id)} className="shrink-0" aria-label={`${T.apri}: ${TESTI_REDAZIONE.tipo[c.tipo]}`}>
                  {v.immagini[0] && (
                    // eslint-disable-next-line @next/next/no-img-element -- foto private servite dalle API del portale
                    <img src={urlMedia(v.immagini[0])} alt="" loading="lazy" className={`${c.tipo === 'storia' ? 'h-28 w-16' : 'h-24 w-20'} rounded-lg object-cover`} />
                  )}
                </button>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{TESTI_REDAZIONE.tipo[c.tipo]}</span>
                    <BadgeStato stato={c.stato} piccola />
                    {eliminato(c) && <span className="text-xs font-semibold" style={{ color: '#F87171' }}>{TESTI_REDAZIONE.andamento.eliminati}</span>}
                    <span className="text-xs" style={{ color: 'var(--fg-muta)' }}>
                      {formattaDataEstesa(c.creatoIl)} · {T.versioni(c.versioni.length)}
                    </span>
                  </div>
                  {v.didascalia && <p className="mt-1 line-clamp-3 whitespace-pre-line break-words">{v.didascalia}</p>}
                  {c.commenti.length === 0 ? (
                    <p className="mt-2 text-xs" style={{ color: 'var(--fg-muta)' }}>
                      {T.nessunCommento}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {c.commenti.map((m) => (
                        <li key={m.id} className="rounded-lg px-2 py-1 text-[13px]" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <span className="font-semibold" style={{ color: TESTI_REDAZIONE.coloreCommento[m.tipo] }}>
                            {TESTI_REDAZIONE.tipoCommento[m.tipo]}
                          </span>{' '}
                          <span style={{ color: 'var(--fg-muta)' }}>
                            · {m.autore} · v{m.versione} · {formattaDataRelativa(m.creatoIl, adesso)}
                          </span>
                          <span className="block whitespace-pre-line break-words">{m.testo}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {piede}

      <h3 className="mb-3 mt-8 text-lg font-bold">{T.attivita}</h3>
      <Attivita voci={voci} contenuti={tutti} persone={[]} filtroIniziale={chiave} conFiltro={false} onApri={onApri} />
    </div>
  );
}

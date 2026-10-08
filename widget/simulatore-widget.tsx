/**
 * Simulatore della legge elettorale per le pagine di politicare.it (WordPress), senza iframe.
 * Usa lo stesso motore dell'app (lib/simulatore-motore.ts): cambia solo l'aspetto, che segue il sito.
 * Si monta in <div id="politicare-simulatore"></div>. Build: node scripts/build-widget-simulatore.mjs
 */

import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  FONTI_LEGGE,
  formattaPercentuale,
  LOCALI,
  presetPartitiDiOggi,
  presetPolitiche2022,
  presetSondaggi,
  puntiEmiciclo,
  REGOLE,
  ribilancia,
  simula,
  TESTI_SIMULATORE as T,
  type Esito,
  type ListaInput,
  type Preset,
  type SeggiSpeciali,
} from '@/lib/simulatore-elettorale';
import { GEOGRAFIA_SENATO_2022 } from '@/lib/simulatore-geografia-2022';
import partiti from './partiti.json';
import { CSS } from './stile';

type Ramo = 'camera' | 'senato';
type Speciali = Record<Ramo, SeggiSpeciali>;

const colori = Object.fromEntries(partiti.map((p) => [p.id, p.colore]));
const PRESET: Preset[] = [presetSondaggi(partiti), presetPolitiche2022(colori), { ...presetPartitiDiOggi(partiti), nome: 'Da zero' }];
const EMICICLO = { camera: puntiEmiciclo(REGOLE.camera.totale, 12), senato: puntiEmiciclo(REGOLE.senato.totale, 8) };
const DA_SOLA = '';

const specialiDi = (p: Preset): Speciali => ({ camera: { ...(p.speciali?.camera ?? {}) }, senato: { ...(p.speciali?.senato ?? {}) } });

function Simulatore() {
  const [idPreset, setIdPreset] = useState(PRESET[0].id);
  const [liste, setListe] = useState<ListaInput[]>(PRESET[0].liste);
  const [coalizioni, setCoalizioni] = useState(PRESET[0].coalizioni);
  const [maggioranzeDiverse, setMaggioranzeDiverse] = useState(false);
  const [speciali, setSpeciali] = useState<Speciali>(specialiDi(PRESET[0]));
  const [bloccate, setBloccate] = useState<Set<string>>(new Set());
  // Il riequilibrio legge sempre i lucchetti più recenti, anche se il clic arriva nello stesso istante.
  const lucchetti = useRef<Set<string>>(new Set());

  const esito = useMemo(
    () => simula(liste, { coalizioni, maggioranzeDiverse, speciali, geografia: GEOGRAFIA_SENATO_2022 }),
    [liste, coalizioni, maggioranzeDiverse, speciali],
  );
  const preset = PRESET.find((p) => p.id === idPreset)!;

  const carica = (p: Preset) => {
    setIdPreset(p.id);
    setListe(p.liste);
    setCoalizioni(p.coalizioni);
    setMaggioranzeDiverse(false);
    setSpeciali(specialiDi(p));
    lucchetti.current = new Set();
    setBloccate(new Set());
  };
  const percentuale = (id: string, valore: string) => {
    const n = Number.parseFloat(valore.replace(',', '.'));
    setListe((prec) => ribilancia(prec, id, Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0, lucchetti.current));
  };
  const blocca = (id: string) =>
    setBloccate((prec) => {
      const nuove = new Set(prec);
      if (nuove.has(id)) nuove.delete(id);
      else nuove.add(id);
      lucchetti.current = nuove;
      return nuove;
    });

  return (
    <div className="pcs">
      <div className="pcs-preset" role="group" aria-label={T.partiDa}>
        <span className="pcs-etichetta">{T.partiDa}</span>
        {PRESET.map((p) => (
          <button key={p.id} type="button" className="pcs-pillola" aria-pressed={p.id === idPreset} onClick={() => carica(p)}>
            {p.nome}
          </button>
        ))}
      </div>
      <p className="pcs-nota">
        {preset.descrizione}
        {preset.fonte && (
          <>
            {' '}
            {T.fontePreset}:{' '}
            <a href={preset.fonte.url} target="_blank" rel="noopener noreferrer">
              {preset.fonte.citazione}
            </a>
            .
          </>
        )}
      </p>

      <div className="pcs-griglia">
        <section className="pcs-scheda" aria-labelledby="pcs-liste">
          <div className="pcs-riga">
            <h3 id="pcs-liste">{T.liste}</h3>
            <span className="pcs-totale">{T.totale(esito.totaleVoti)}</span>
          </div>
          <p className="pcs-nota">{T.ribilancia}</p>
          <ul className="pcs-liste">
            {liste.map((l) => (
              <li key={l.id}>
                <div className="pcs-riga">
                  <span className="pcs-pallino" style={{ background: l.colore }} aria-hidden />
                  <label className="pcs-nome" htmlFor={`pcs-${l.id}`}>
                    {l.nome}
                  </label>
                  <input
                    id={`pcs-${l.id}`}
                    className="pcs-numero"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={0.1}
                    value={l.percentuale}
                    onChange={(e) => percentuale(l.id, e.target.value)}
                  />
                  <span className="pcs-muto">%</span>
                  <button
                    type="button"
                    className="pcs-lucchetto"
                    aria-pressed={bloccate.has(l.id)}
                    aria-label={bloccate.has(l.id) ? T.sblocca(l.nome) : T.blocca(l.nome)}
                    title={bloccate.has(l.id) ? T.sblocca(l.nome) : T.blocca(l.nome)}
                    onClick={() => blocca(l.id)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d={bloccate.has(l.id) ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'} />
                    </svg>
                  </button>
                </div>
                <div className="pcs-riga">
                  <input
                    className="pcs-cursore"
                    type="range"
                    min={0}
                    max={l.aggregato ? 100 : 60}
                    step={0.1}
                    value={Math.min(l.aggregato ? 100 : 60, l.percentuale)}
                    onChange={(e) => percentuale(l.id, e.target.value)}
                    aria-label={`${T.percentuale} ${l.nome}`}
                    style={{ accentColor: l.colore }}
                  />
                  {!l.aggregato && (
                    <select
                      className="pcs-select"
                      value={l.coalizione ?? DA_SOLA}
                      onChange={(e) => setListe((prec) => prec.map((x) => (x.id === l.id ? { ...x, coalizione: e.target.value || null } : x)))}
                      aria-label={`${T.coalizione} ${l.nome}`}
                    >
                      <option value={DA_SOLA}>{T.daSola}</option>
                      {Object.entries(coalizioni).map(([id, nome]) => (
                        <option key={id} value={id}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <label className="pcs-spunta">
            <input type="checkbox" checked={maggioranzeDiverse} onChange={(e) => setMaggioranzeDiverse(e.target.checked)} />
            <span>
              <strong>{T.maggioranzeDiverse}</strong>
              <span className="pcs-nota">{T.maggioranzeDiverseNota}</span>
            </span>
          </label>
          <PannelloSpeciali esito={esito} speciali={speciali} onChange={setSpeciali} />
        </section>

        <section className="pcs-scheda pcs-risultato" aria-live="polite">
          <Risultato esito={esito} />
        </section>
      </div>

      <DettaglioListe esito={esito} />
      <Regioni esito={esito} />

      <div className="pcs-griglia pcs-regole">
        <section className="pcs-scheda">
          <h3>{T.regoleTitolo}</h3>
          <ul>
            {T.regole.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <h4>{T.fonti}</h4>
          <ul>
            {FONTI_LEGGE.map((f) => (
              <li key={f.url}>
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  {f.citazione}
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section className="pcs-scheda">
          <h3>{T.approssimazioniTitolo}</h3>
          <ul>
            {T.approssimazioni.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="pcs-nota">{T.verifica}</p>
        </section>
      </div>
    </div>
  );
}

function Emiciclo({ esito, ramo }: { esito: Esito; ramo: Ramo }) {
  const R = REGOLE[ramo];
  const colori: string[] = [];
  for (const c of esito.competitori) for (let i = 0; i < c[ramo].totale; i++) colori.push(c.colore);
  while (colori.length < R.totale) colori.push('#e6e6e6');
  const primo = Math.max(0, ...esito.competitori.filter((c) => c.tipo !== 'locali').map((c) => c[ramo].totale));
  return (
    <figure className="pcs-emiciclo">
      <svg viewBox="-1.06 -1.06 2.12 1.14" role="img" aria-label={`${ramo === 'camera' ? T.camera : T.senato}: ${esito.competitori.map((c) => `${c.nome} ${c[ramo].totale}`).join(', ')}`}>
        {EMICICLO[ramo].map((p, i) => (
          <circle key={i} cx={p.x} cy={-p.y} r={ramo === 'camera' ? 0.026 : 0.04} fill={colori[i]} />
        ))}
        <text x={0} y={-0.04} textAnchor="middle" fontSize={0.26} fontWeight={700} fill="#1f1f1f">
          {primo}
        </text>
      </svg>
      <figcaption>
        <strong>{ramo === 'camera' ? T.camera : `${T.senato} (${T.stima})`}</strong>
        <span>{T.maggioranza(R.maggioranza, R.totale)}</span>
      </figcaption>
    </figure>
  );
}

function Risultato({ esito }: { esito: Esito }) {
  const vincitore = esito.competitori.find((c) => c.id === esito.premio.vincitore);
  const messaggio =
    esito.premio.motivo === 'assegnato' && vincitore ? T.premio.assegnato(vincitore.nome) : T.premio[esito.premio.motivo as Exclude<typeof esito.premio.motivo, 'assegnato'>];
  return (
    <>
      <p className={esito.premio.motivo === 'assegnato' ? 'pcs-esito pcs-esito--premio' : 'pcs-esito'}>{messaggio}</p>
      <div className="pcs-emicicli">
        <Emiciclo esito={esito} ramo="camera" />
        <Emiciclo esito={esito} ramo="senato" />
      </div>
      {(esito.tettoCamera || esito.tettoSenato) && (
        <ul className="pcs-avvisi">
          {esito.tettoCamera && <li>{T.tetto(T.camera, REGOLE.camera.tetto)}</li>}
          {esito.tettoSenato && <li>{T.tetto(T.senato, REGOLE.senato.tetto)}</li>}
          {esito.correzioniTettoSenato.length > 0 && <li>{T.correzioniSenato(esito.correzioniTettoSenato.length)}</li>}
        </ul>
      )}
      <div className="pcs-scorri">
        <table className="pcs-tabella">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">{T.votiUtili}</th>
              <th scope="col">{T.camera}</th>
              <th scope="col">{T.senato}</th>
            </tr>
          </thead>
          <tbody>
            {esito.competitori.map((c) => (
              <tr key={c.id}>
                <th scope="row">
                  <span className="pcs-riga">
                    <span className="pcs-pallino" style={{ background: c.colore }} aria-hidden />
                    <strong>{c.nome}</strong>
                  </span>
                  {c.tipo === 'coalizione' && <span className="pcs-sotto">{T.coalizioneDi(c.listeConSeggi.map((l) => l.nome).join(', '))}</span>}
                  {c.tipo !== 'locali' && (c.camera.premio > 0 || c.camera.speciali > 0) && (
                    <span className="pcs-sotto">
                      {T.camera}: {T.composizione(c.camera.proporzionali, c.camera.premio, c.camera.speciali)}
                    </span>
                  )}
                  {c.seggiCamera >= REGOLE.camera.maggioranza && (
                    <span className="pcs-badge">
                      {T.conMaggioranza}
                      {c.seggiSenato >= REGOLE.senato.maggioranza ? ` · ${T.maggioranzaSenato}` : ''}
                    </span>
                  )}
                </th>
                <td>{c.tipo === 'locali' ? '' : `${formattaPercentuale(c.quota)}%`}</td>
                <td className="pcs-forte">{c.seggiCamera}</td>
                <td>{c.seggiSenato}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="pcs-avvisi">
        <li>
          {T.estero}: {REGOLE.camera.estero} deputati, {REGOLE.senato.estero} senatori
        </li>
        {esito.totaleVoti > 0 && <li>{T.dispersi(formattaPercentuale(esito.votiDispersi))}</li>}
        {esito.coalizioniSottoSoglia.length > 0 && <li>{T.coalizioniSottoSoglia(esito.coalizioniSottoSoglia.join(', '))}</li>}
      </ul>
    </>
  );
}

function PannelloSpeciali({ esito, speciali, onChange }: { esito: Esito; speciali: Speciali; onChange: (s: Speciali) => void }) {
  const scelte = [
    ...esito.competitori.filter((c) => c.tipo !== 'locali').map((c) => ({ id: c.id, nome: c.nome, colore: c.colore })),
    { id: LOCALI, nome: T.specialiLocali, colore: '#9ca3af' },
  ];
  const valore = (ramo: Ramo, id: string) => esito.competitori.find((x) => x.id === id)?.[ramo].speciali ?? 0;
  const cambia = (ramo: Ramo, id: string, delta: number) => {
    const max = REGOLE[ramo].speciali;
    const attuale: SeggiSpeciali = Object.fromEntries(scelte.map((x) => [x.id, valore(ramo, x.id)]));
    const nuovo = Math.min(max, Math.max(0, (attuale[id] ?? 0) + delta));
    if (nuovo === attuale[id]) return;
    attuale[id] = nuovo;
    let scarto = Object.values(attuale).reduce((a, b) => a + b, 0) - max;
    for (const x of [LOCALI, ...scelte.map((y) => y.id)]) {
      if (scarto === 0 || x === id) continue;
      const v = attuale[x] ?? 0;
      const passo = scarto > 0 ? Math.min(v, scarto) : scarto;
      attuale[x] = v - passo;
      scarto -= passo;
    }
    onChange({ ...speciali, [ramo]: attuale });
  };
  return (
    <details className="pcs-dettagli">
      <summary>{T.specialiTitolo}</summary>
      <p className="pcs-nota">{T.specialiNota}</p>
      <table className="pcs-tabella">
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">
              {T.camera} ({REGOLE.camera.speciali})
            </th>
            <th scope="col">
              {T.senato} ({REGOLE.senato.speciali})
            </th>
          </tr>
        </thead>
        <tbody>
          {scelte.map((x) => (
            <tr key={x.id}>
              <th scope="row">
                <span className="pcs-riga">
                  <span className="pcs-pallino" style={{ background: x.colore }} aria-hidden />
                  {x.nome}
                </span>
              </th>
              {(['camera', 'senato'] as const).map((ramo) => (
                <td key={ramo}>
                  <span className="pcs-passi">
                    <button type="button" onClick={() => cambia(ramo, x.id, -1)} aria-label={`Un seggio in meno a ${x.nome}, ${ramo}`}>
                      −
                    </button>
                    <span>{valore(ramo, x.id)}</span>
                    <button type="button" onClick={() => cambia(ramo, x.id, 1)} aria-label={`Un seggio in più a ${x.nome}, ${ramo}`}>
                      +
                    </button>
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function DettaglioListe({ esito }: { esito: Esito }) {
  return (
    <details className="pcs-scheda pcs-dettagli">
      <summary>{T.dettaglioListe}</summary>
      <div className="pcs-scorri">
        <table className="pcs-tabella">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">%</th>
              <th scope="col" />
              <th scope="col">{T.camera}</th>
              <th scope="col">{T.senato}</th>
            </tr>
          </thead>
          <tbody>
            {esito.liste.map(({ lista, stato, statoSenato, seggiCamera, seggiSenato }) => (
              <tr key={lista.id}>
                <th scope="row">
                  <span className="pcs-riga">
                    <span className="pcs-pallino" style={{ background: lista.colore }} aria-hidden />
                    {lista.nome}
                  </span>
                </th>
                <td>{formattaPercentuale(lista.percentuale)}</td>
                <td className={stato === 'in-parlamento' ? 'pcs-stato pcs-stato--ok' : 'pcs-stato'}>
                  {T.stati[stato]}
                  {statoSenato !== stato && statoSenato === 'in-parlamento' && <span className="pcs-sotto">{T.statoSenatoDiverso}</span>}
                </td>
                <td className="pcs-forte">{seggiCamera}</td>
                <td>{seggiSenato}</td>
              </tr>
            ))}
            {esito.competitori
              .filter((c) => c.camera.premio > 0 || c.senato.premio > 0)
              .map((c) => (
                <tr key={`premio-${c.id}`}>
                  <th scope="row" colSpan={3}>
                    {T.premioListino}: {c.nome}
                  </th>
                  <td className="pcs-forte">{c.camera.premio}</td>
                  <td>{c.senato.premio}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="pcs-nota">{T.dettaglioListeNota}</p>
    </details>
  );
}

function Regioni({ esito }: { esito: Esito }) {
  const competitori = esito.competitori.filter((c) => c.tipo !== 'locali' && c.senato.proporzionali > 0);
  const vincitore = esito.competitori.find((c) => c.id === esito.premio.vincitore);
  return (
    <details className="pcs-scheda pcs-dettagli">
      <summary>{T.regioniTitolo}</summary>
      <p className="pcs-nota">{T.regioniNota}</p>
      <div className="pcs-scorri">
        <table className="pcs-tabella">
          <thead>
            <tr>
              <th scope="col">{T.regione}</th>
              <th scope="col">{T.seggiRegione}</th>
              {competitori.map((c) => (
                <th key={c.id} scope="col">
                  <span className="pcs-riga">
                    <span className="pcs-pallino" style={{ background: c.colore }} aria-hidden />
                    {c.nome}
                  </span>
                </th>
              ))}
              {vincitore && <th scope="col">{T.premioRegione(vincitore.nome)}</th>}
            </tr>
          </thead>
          <tbody>
            {esito.regioniSenato.map((r) => (
              <tr key={r.regione.id}>
                <th scope="row">{r.regione.nome}</th>
                <td className="pcs-muto">{Object.values(r.seggi).reduce((a, b) => a + b, 0)}</td>
                {competitori.map((c) => (
                  <td key={c.id}>{r.seggi[c.id] ?? 0}</td>
                ))}
                {vincitore && <td>+{r.regione.premio}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function monta() {
  const nodo = document.getElementById('politicare-simulatore');
  if (!nodo || nodo.dataset.montato) return;
  nodo.dataset.montato = '1';
  if (!document.getElementById('pcs-stile')) {
    const stile = document.createElement('style');
    stile.id = 'pcs-stile';
    stile.textContent = CSS;
    document.head.appendChild(stile);
  }
  createRoot(nodo).render(<Simulatore />);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta);
else monta();

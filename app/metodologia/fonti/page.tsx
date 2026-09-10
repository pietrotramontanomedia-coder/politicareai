import type { Metadata } from 'next';
import Link from 'next/link';
import type { TipoFonte, Valore } from '@politicare/motore';
import { caricaPackTestPartito } from '@/lib/contenuti';
import { etichettaArea } from '@/lib/aree';

export const metadata: Metadata = {
  title: 'Fonti delle posizioni — Politicare',
  description: 'Per ogni affermazione del test, la posizione di ogni partito con citazione, tipo di fonte, data e link.',
};

const ETICHETTA_VALORE: Record<Valore, string> = {
  [-2]: '−2 molto contrario',
  [-1]: '−1 contrario',
  0: '0 neutro',
  1: '+1 favorevole',
  2: '+2 molto favorevole',
};

const ETICHETTA_FONTE: Record<TipoFonte, string> = {
  voto: 'voto',
  programma: 'programma',
  dichiarazione: 'dichiarazione',
  questionario: 'questionario',
  stampa: 'stampa',
};

export default function PaginaFonti() {
  const pack = caricaPackTestPartito();
  const totale = pack.affermazioni.length * pack.partiti.length;
  const documentate = pack.partiti.reduce((n, p) => n + p.posizioni.filter((x) => x.valore !== null).length, 0);
  const perTipo = new Map<string, number>();
  for (const p of pack.partiti) for (const x of p.posizioni) if (x.valore !== null) perTipo.set(x.fonte.tipo, (perTipo.get(x.fonte.tipo) ?? 0) + 1);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
        Metodologia · Fonti
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Le fonti di ogni posizione</h1>
      <p className="mt-3 leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
        Pack {pack.id} v{pack.versione} del {pack.data}. Posizioni documentate: {documentate} su {totale}
        {' '}({[...perTipo.entries()].map(([t, n]) => `${n} da ${ETICHETTA_FONTE[t as TipoFonte] ?? t}`).join(', ')}).
        Le caselle vuote sono affermazioni su cui non abbiamo trovato una fonte verificabile: non entrano nel calcolo.
        Se conosci una fonte che ci manca, o una posizione è cambiata,{' '}
        <a href="mailto:redazione@politicare.it" className="underline underline-offset-2" style={{ color: 'var(--accento)' }}>
          scrivici
        </a>
        .
      </p>

      <nav aria-label="Affermazioni" className="mt-8 flex flex-wrap gap-2">
        {pack.affermazioni.map((a, i) => (
          <a key={a.id} href={`#${a.id}`} className="rounded-full border px-2.5 py-1 text-xs tabular-nums hover:border-[var(--accento)]" style={{ borderColor: 'var(--bordo)' }}>
            {i + 1}
          </a>
        ))}
      </nav>

      {pack.affermazioni.map((a, i) => {
        const { label, icona } = etichettaArea(a.area);
        return (
          <section key={a.id} id={a.id} className="mt-10 scroll-mt-24">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muta)' }}>
              {i + 1} · <span aria-hidden>{icona}</span> {label} · {a.verso === 1 ? 'propone un cambiamento' : "difende l'assetto vigente"}
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-snug">{a.testo}</h2>
            <div className="mt-3 overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--bordo)' }}>
              <table className="w-full text-left text-sm">
                <thead style={{ background: 'var(--bg-elevated)' }}>
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">Partito</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Posizione</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {pack.partiti.map((p) => {
                    const pos = p.posizioni.find((x) => x.affermazioneId === a.id);
                    if (!pos) return null;
                    return (
                      <tr key={p.id} className="border-t align-top" style={{ borderColor: 'var(--bordo)' }}>
                        <td className="whitespace-nowrap px-3 py-2 font-medium">{p.sigla ?? p.nome}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                          {pos.valore === null ? <span style={{ color: 'var(--fg-muta)' }}>—</span> : ETICHETTA_VALORE[pos.valore]}
                          {pos.confidenza && pos.valore !== null && (
                            <span className="ml-1 text-xs" style={{ color: 'var(--fg-muta)' }}>({pos.confidenza})</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
                          {pos.valore !== null && (
                            <span className="mr-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: 'var(--bordo)', color: 'var(--fg)' }}>
                              {ETICHETTA_FONTE[pos.fonte.tipo]}{pos.fonte.data ? ` · ${pos.fonte.data}` : ''}
                            </span>
                          )}
                          {pos.fonte.url ? (
                            <a href={pos.fonte.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80" style={{ color: 'var(--accento)' }}>
                              {pos.fonte.citazione}
                            </a>
                          ) : (
                            pos.fonte.citazione
                          )}
                          {pos.nota ? <span className="block mt-0.5">{pos.nota}</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <Link href="/metodologia" className="mt-12 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline" style={{ color: 'var(--fg-muta)' }}>
        ← Torna alla metodologia
      </Link>
    </main>
  );
}

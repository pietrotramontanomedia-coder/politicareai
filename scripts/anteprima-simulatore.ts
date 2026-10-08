// Genera il riquadro statico che presenta il simulatore nella home e nell'hub Elezioni 2027 di politicare.it.
// Niente JavaScript sul sito: l'emiciclo è un SVG calcolato qui con lo stesso motore del simulatore.
// Uso: node scripts/build-anteprima-simulatore.mjs > anteprima.html
import partiti from '../widget/partiti.json';
import { presetPolitiche2022, puntiEmiciclo, REGOLE, simula } from '@/lib/simulatore-elettorale';
import { GEOGRAFIA_SENATO_2022 } from '@/lib/simulatore-geografia-2022';

const URL_SIMULATORE = 'https://www.politicare.it/simulatore-legge-elettorale/';
// Un dato certo, non una previsione: i voti 2022 riletti con le regole nuove.
const p = presetPolitiche2022(Object.fromEntries(partiti.map((x) => [x.id, x.colore])));
const esito = simula(p.liste, { coalizioni: p.coalizioni, speciali: p.speciali, geografia: GEOGRAFIA_SENATO_2022 });

const colori: string[] = [];
for (const c of esito.competitori) for (let i = 0; i < c.camera.totale; i++) colori.push(c.colore);
while (colori.length < REGOLE.camera.totale) colori.push('#e6e6e6');
const punti = puntiEmiciclo(REGOLE.camera.totale, 12);
const cerchi = punti.map((q, i) => `<circle cx="${q.x}" cy="${-q.y}" r=".026" fill="${colori[i]}"/>`).join('');
const primo = esito.competitori.filter((c) => c.tipo !== 'locali')[0];

const righe = esito.competitori
  .map(
    (c) =>
      `<li><span class="pcsa-pallino" style="background:${c.colore}"></span><span class="pcsa-nome">${c.nome}</span><span class="pcsa-seggi">${c.camera.totale}</span></li>`,
  )
  .join('');

const R = '#pc-sim-anteprima';
const css = `
${R}{margin:8px auto 40px;max-width:1180px;padding:0 20px;box-sizing:border-box;font-family:"Google Sans Local",system-ui,sans-serif;color:#1f1f1f}
${R} *{box-sizing:border-box}
${R} .pcsa-scheda{display:grid;grid-template-columns:minmax(0,1fr);gap:28px;align-items:center;background:#fff;border:1px solid #ececec;border-radius:22px;padding:28px;box-shadow:0 1px 0 rgba(0,0,0,.02)}
@media(min-width:900px){${R} .pcsa-scheda{grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);padding:40px 44px;gap:44px}}
${R} .pcsa-kicker{display:inline-flex;align-items:center;gap:8px;margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#d32f2f}
${R} .pcsa-kicker::before{content:"";width:8px;height:8px;border-radius:50%;background:#d32f2f}
${R} .pcsa-titolo{margin:0;font-family:Gloock,Georgia,serif;font-weight:400;font-size:clamp(26px,3.2vw,38px);line-height:1.12;color:#1f1f1f;letter-spacing:normal;text-transform:none}
${R} .pcsa-testo{margin:14px 0 0;font-size:16px;line-height:1.55;color:#4a4a4a}
${R} .pcsa-cta{display:inline-flex;align-items:center;gap:8px;margin-top:22px;padding:13px 22px;border-radius:999px;background:#1f1f1f;color:#fff!important;font-weight:700;font-size:15px;text-decoration:none!important;transition:background .2s}
${R} .pcsa-cta:hover{background:#d32f2f}
${R} .pcsa-figura{margin:0}
${R} .pcsa-figura svg{display:block;width:100%;height:auto}
${R} .pcsa-lista{list-style:none;margin:14px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px}
@media(max-width:520px){${R} .pcsa-lista{grid-template-columns:minmax(0,1fr)}${R} .pcsa-scheda{padding:22px}}
${R} .pcsa-lista li{display:flex;align-items:center;gap:8px;font-size:14px;margin:0;padding:0}
${R} .pcsa-lista li::before{content:none}
${R} .pcsa-pallino{width:10px;height:10px;border-radius:50%;flex:0 0 auto}
${R} .pcsa-nome{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${R} .pcsa-seggi{font-weight:700;font-variant-numeric:tabular-nums}
${R} .pcsa-nota{margin:12px 0 0;font-size:12px;line-height:1.45;color:#8a8a8a}
`.trim();

const html = `<div id="pc-sim-anteprima"><style>${css}</style><div class="pcsa-scheda">
<div><p class="pcsa-kicker">Strumento · Elezioni 2027</p>
<h2 class="pcsa-titolo">La legge elettorale è approvata. Come diventano seggi i voti?</h2>
<p class="pcsa-testo">Scegli le percentuali dei partiti e le coalizioni. Il simulatore applica le nuove regole e ti dà i seggi di Camera e Senato: premio al 42%, soglie e tetti.</p>
<a class="pcsa-cta" href="${URL_SIMULATORE}">Prova il simulatore →</a></div>
<figure class="pcsa-figura"><a href="${URL_SIMULATORE}" aria-label="Apri il simulatore della legge elettorale"><svg viewBox="-1.06 -1.06 2.12 1.12" role="img" aria-label="Emiciclo della Camera con i voti del 2022 e le regole nuove: ${esito.competitori.map((c) => `${c.nome} ${c.camera.totale}`).join(', ')}">${cerchi}<text x="0" y="-.12" text-anchor="middle" font-size=".26" font-weight="700" fill="#1f1f1f">${primo.camera.totale}</text><text x="0" y="-.02" text-anchor="middle" font-size=".07" fill="#8a8a8a">deputati su 400</text></svg></a>
<ul class="pcsa-lista">${righe}</ul>
<figcaption class="pcsa-nota">Le politiche del 2022 rifatte con le regole nuove: il centrodestra arriva al tetto di 220 deputati. Dati del Ministero dell’Interno. Nel simulatore provi i sondaggi di oggi e le tue coalizioni.</figcaption></figure>
</div></div>`;

process.stdout.write(html.replace(/\n/g, ''));

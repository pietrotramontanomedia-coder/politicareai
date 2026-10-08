// Esegue scripts/anteprima-simulatore.ts con esbuild e stampa l'HTML del riquadro.
import { build } from 'esbuild';

const r = await build({ entryPoints: ['scripts/anteprima-simulatore.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error' });
const url = 'data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64');
await import(url);

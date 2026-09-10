import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// eslint-config-next 16 esporta già configurazioni flat: si importano direttamente,
// senza passare da FlatCompat (che con queste versioni va in errore).
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ['packages/**', 'node_modules/**', '.next/**'],
  },
];

export default eslintConfig;

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Cada worker SSR y navegador recibe su caché. Nunca compite con npm run dev
// ni borra node_modules/.vite del usuario o de otro test.
export function cacheViteAislada() {
  const temporal = path.resolve(os.tmpdir());
  const ruta = fs.mkdtempSync(path.join(temporal, 'hostflow-vite-test-'));
  return { ruta, limpiar() {
    if (path.dirname(path.resolve(ruta)) !== temporal || !path.basename(ruta).startsWith('hostflow-vite-test-')) throw new Error('Caché fuera del temporal de pruebas.');
    fs.rmSync(ruta, {recursive:true,force:true});
  } };
}

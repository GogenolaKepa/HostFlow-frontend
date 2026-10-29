import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { cacheViteAislada } from './helpers/cacheVite.js';

let vite, CargaPagina;
const cache = cacheViteAislada();
before(async () => {
  vite = await createServer({ configFile: false, envDir: false, cacheDir: cache.ruta, plugins: [react()], server: { middlewareMode: true, ws: false, watch: null } });
  CargaPagina = (await vite.ssrLoadModule('/src/components/CargaPagina.jsx')).default;
});
after(async () => { await vite?.close(); cache.limpiar(); });

for (const variante of ['dashboard', 'propiedades', 'reservas', 'limpiezas', 'huespedes', 'calendario', 'reportes', 'empresa', 'operativas', 'preferencias']) {
  test(`${variante}: carga accesible sin controles ficticios ni datos expuestos`, () => {
    const html = renderToStaticMarkup(createElement(CargaPagina, { variante }));
    assert.match(html, /role="status"/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /Cargando /);
    assert.doesNotMatch(html, /<(button|input|a|select)\b/);
    assert.match(html, new RegExp(`hf-skeleton--${['empresa','operativas','preferencias'].includes(variante)?'formulario':variante}`));
  });
}

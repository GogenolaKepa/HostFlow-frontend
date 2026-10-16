import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { cacheViteAislada } from './helpers/cacheVite.js';

let vite, AccesoFlowIA;
const cache = cacheViteAislada();
before(async () => {
  vite = await createServer({ configFile: false, envDir: false, cacheDir: cache.ruta, plugins: [react()],
    server: { middlewareMode: true, ws: false, watch: null } });
  AccesoFlowIA = (await vite.ssrLoadModule('/src/components/flowia/AccesoFlowIA.jsx')).default;
});
after(async () => { await vite?.close(); cache.limpiar(); });

for (const movil of [false, true]) test(`FlowIA: acceso ${movil ? 'móvil' : 'lateral'} con nombre y estado accesibles`, () => {
  for (const abierta of [false, true]) {
    const html = renderToStaticMarkup(createElement(AccesoFlowIA, { movil, abierta, panelId: 'panel-prueba', onClick() {} }));
    assert.equal((html.match(/<button/g) || []).length, 1);
    assert.ok(html.includes('type="button"'));
    assert.ok(html.includes(`aria-label="${abierta ? 'Cerrar' : 'Abrir'} FlowIA"`));
    assert.ok(html.includes(`aria-expanded="${abierta}"`));
    assert.ok(html.includes('aria-controls="panel-prueba"'));
    assert.ok(html.includes(movil ? 'mobile-flowia' : 'sidebar-flowia'));
    assert.equal(html.includes('<a'), false);
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { cacheViteAislada } from '../helpers/cacheVite.js';
import { abrirNavegador } from '../helpers/navegadorComercial.js';
import { puertoAislado } from '../helpers/puertoAislado.js';

test('consulta ficticia por rol y empresa sin arrastrar datos entre selecciones o sesiones', { timeout: 60000 }, async () => {
  const puerto = await puertoAislado();
  const origen = `http://127.0.0.1:${puerto}`;
  const cache = cacheViteAislada();
  const bloqueadas = [];
  let vite;
  let navegador;

  try {
    vite = await createServer({
      root: fileURLToPath(new URL('../..', import.meta.url)),
      configFile: false,
      envDir: false,
      cacheDir: cache.ruta,
      plugins: [react()],
      server: { host: '127.0.0.1', port: puerto, strictPort: true, ws: false, watch: null },
    });
    await vite.listen();
    navegador = await abrirNavegador(process.env.HOSTFLOW_TEST_BROWSER ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe');
    const { command, evaluate, esperar } = navegador;

    navegador.on('Fetch.requestPaused', ({ requestId, request }) => {
      const url = new URL(request.url);
      if (url.origin === origen && !url.pathname.startsWith('/api/') && request.method === 'GET') {
        return command('Fetch.continueRequest', { requestId }).catch(error => bloqueadas.push(error.message));
      }
      bloqueadas.push(request.url);
      return command('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
    });
    await command('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await command('Page.navigate', { url: origen + '/tests/manual/consulta-suscripcion.html' });
    const selectorSesion = '.sesion-simulada select';
    const selectorEmpresa = '.hf-suscripcion select';
    const panel = 'document.querySelector(".hf-suscripcion")';
    const consumo = 'document.querySelector(".hf-suscripcion__consumo")';
    const elegir = (selector, valor) => evaluate(`{
      const select = document.querySelector(${JSON.stringify(selector)});
      select.value = ${JSON.stringify(valor)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }`);

    await esperar(`!!document.querySelector("${selectorSesion}")`);
    assert.equal(await evaluate(`!!${panel}`), false);
    await elegir(selectorSesion, 'admin');
    await esperar(`!!document.querySelector("${selectorEmpresa}")`);
    assert.equal(await evaluate(`!!${consumo}`), false);
    await elegir(selectorEmpresa, '101');
    await esperar(`${consumo}?.innerText.includes("Profesional")`);
    assert.match(await evaluate(`${consumo}.innerText`), /2 de 10[\s\S]*3 de 3[\s\S]*2 usuarios activos · 1 invitación pendiente/);
    assert.equal(await evaluate(`${panel}.querySelectorAll("button, form").length`), 0);
    await command('Emulation.setDeviceMetricsOverride', {
      width: 320, height: 820, deviceScaleFactor: 1, mobile: true,
    });
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));

    await elegir(selectorEmpresa, '102');
    await esperar(`${consumo}?.innerText.includes("Inicial")`);
    assert.doesNotMatch(await evaluate(`${panel}.innerText`), /Profesional|2 de 10/);
    await elegir(selectorEmpresa, '101');
    await esperar(`${consumo}?.innerText.includes("Profesional")`);
    await elegir(selectorSesion, 'operador');
    await esperar(`${consumo}?.innerText.includes("Empresa ficticia Sierra")`);
    assert.doesNotMatch(await evaluate(`${panel}.innerText`), /Costa|Profesional/);
    assert.equal(await evaluate(`!!document.querySelector("${selectorEmpresa}")`), false);
    await elegir(selectorSesion, '');
    await esperar(`!${panel}`);
    assert.deepEqual(bloqueadas, []);
  } finally {
    try {
      await navegador?.cerrar();
    } finally {
      await vite?.close();
      cache.limpiar();
    }
  }
});

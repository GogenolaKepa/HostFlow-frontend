import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { abrirNavegador } from '../helpers/navegadorComercial.js';

const require = createRequire(new URL('../../../backend/package.json', import.meta.url));
const { crearPlantillaCorreo } = require('./src/security/comercial/plantillasCorreo');
const { CORREO_HOSTFLOW_PROPUESTO } = require('./src/security/comercial/configuracionCorreo');
const ejecutable = process.env.HOSTFLOW_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

test('correos HostFlow en escritorio y móvil con HTML real y red bloqueada', {
  skip: !fs.existsSync(ejecutable), timeout: 30000,
}, async () => {
  const carpeta = fileURLToPath(new URL('../../../revision/autenticacion-comercial-2026-11-05/correos/', import.meta.url));
  fs.mkdirSync(carpeta, { recursive: true });
  const navegador = await abrirNavegador(ejecutable);
  const solicitudes = [];
  const { command, evaluate } = navegador;
  navegador.on('Fetch.requestPaused', async p => {
    solicitudes.push(p.request.url);
    await command('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
  });
  try {
    await command('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    const { frameTree } = await command('Page.getFrameTree');
    for (const plantilla of ['recuperacion', 'invitacion', 'contacto']) {
      const enlace = `${CORREO_HOSTFLOW_PROPUESTO.origen}/cuenta/${plantilla}#token=${'A'.repeat(43)}`;
      const correo = crearPlantillaCorreo({ plantilla, destinatario: 'ficticia@example.invalid', enlace }, CORREO_HOSTFLOW_PROPUESTO.origen);
      // Enlace ficticio sin desafío asociado. Estos archivos son vistas previas.
      fs.writeFileSync(path.join(carpeta, `${plantilla}.html`), correo.html);
      fs.writeFileSync(path.join(carpeta, `${plantilla}.txt`), correo.text);
      for (const width of [1280, 375, 320]) {
        await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
        await command('Page.setDocumentContent', { frameId: frameTree.frame.id, html: correo.html });
        assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), `${plantilla} ancho ${width}`);
        assert.equal(await evaluate('document.querySelectorAll("a").length'), 1);
        assert.equal(await evaluate('document.querySelector("a").href'), enlace);
        assert.equal(await evaluate('document.documentElement.lang'), 'es');
        assert.ok(await evaluate('document.querySelector("a").getBoundingClientRect().height>=44'));
        fs.writeFileSync(path.join(carpeta, `${plantilla}-${width}.png`),
          Buffer.from((await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
      }
    }
    assert.deepEqual(solicitudes, []);
  } finally {
    await navegador.cerrar();
  }
});

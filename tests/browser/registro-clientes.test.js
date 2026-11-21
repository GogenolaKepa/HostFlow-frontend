import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirNavegador } from '../helpers/navegadorComercial.js';

const ejecutable = process.env.HOSTFLOW_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const origen = 'https://registro.example.invalid';
const ruta = '/clientes/registro';
const rutaVerificacion = '/clientes/verificar';
const rutaLogin = '/clientes/login';
const token = 'A'.repeat(43);
const enlaceVigente = { tipo: 'registro', expiraEn: '2099-01-01T00:00:00.000Z' };
const csrf = 'csrf.ficticio.' + 'a'.repeat(43);
const password = 'Contraseña solamente ficticia 2026';
const capacidades = { version: 1, registro: true, modalidadRegistro: 'controlado', operativa: false };
const aceptada = { mensaje: 'Si corresponde, recibirás un enlace seguro para continuar.' };
const tipos = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png',
};

test('registro por correo y verificación con API simulada', {
  skip: !fs.existsSync(ejecutable), timeout: 45000,
}, async t => {
  const navegador = await abrirNavegador(ejecutable);
  const { command, evaluate, esperar } = navegador;
  const llamadas = [];
  const inesperadas = [];
  let responderCapacidades = async () => [200, capacidades];
  let responderCsrf = async () => [200, { csrf }];
  let responderRegistro = async () => [202, aceptada];
  let responderEstado = async () => [200, enlaceVigente];
  let responderVerificacion = async () => [200, { completado: true }];
  let sesionCliente = false;
  const reglas = fs.readFileSync(path.join(dist, '_headers'), 'utf8');
  const politicas = Object.fromEntries([ruta, rutaVerificacion, rutaLogin].map(url => {
    const regla = reglas.match(new RegExp(`^${url}\\r?\\n  Cache-Control: no-store\\r?\\n  Content-Security-Policy: (.+)$`, 'm'));
    assert.ok(regla, `Falta la política del documento ${url}`);
    return [url, regla[1]];
  }));
  let bloqueosCsp = 0;

  function responder(peticion, responseCode, cuerpo, tipo, adicionales = []) {
    return command('Fetch.fulfillRequest', {
      requestId: peticion.requestId, responseCode,
      responseHeaders: [{ name: 'Content-Type', value: tipo }, ...adicionales],
      body: Buffer.from(cuerpo).toString('base64'),
    });
  }

  async function simular(peticion) {
    const url = new URL(peticion.request.url);
    if (url.origin !== origen) {
      inesperadas.push(url.origin);
      return command('Fetch.failRequest', { requestId: peticion.requestId, errorReason: 'BlockedByClient' });
    }
    if (url.pathname.startsWith('/api/')) {
      const { method, headers, postData } = peticion.request;
      const ubicacion = await evaluate('location.href');
      llamadas.push({ ruta: url.pathname, method, headers, postData, ubicacion, query: url.search });
      const mock = {
        'GET /api/clientes/capacidades': responderCapacidades,
        'GET /api/clientes/csrf': responderCsrf,
        'POST /api/clientes/registro': responderRegistro,
        'POST /api/clientes/enlaces/estado': responderEstado,
        'POST /api/clientes/verificar': responderVerificacion,
        'GET /api/clientes/sesion': () => sesionCliente ? [200, { estado: 'pendiente-activacion' }] : [401, { codigo: 'SESION_CLIENTE_REQUERIDA' }],
        'POST /api/clientes/login': () => {
          sesionCliente = true;
          return [200, { estado: 'pendiente-activacion' }];
        },
        'POST /api/clientes/logout': () => {
          sesionCliente = false;
          return [200, { cerrado: true }];
        },
      }[method + ' ' + url.pathname];
      if (mock) {
        const [estado, datos] = await mock();
        return responder(peticion, estado, JSON.stringify(datos), 'application/json');
      }
      inesperadas.push(method + ' ' + url.pathname);
      return responder(peticion, 404, '', 'text/plain');
    }

    const politica = politicas[url.pathname];
    const archivo = path.resolve(dist, politica ? 'index.html' : '.' + url.pathname);
    assert.ok(archivo.startsWith(dist));
    if (!fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) {
      return responder(peticion, 404, '', 'text/plain');
    }
    if (politica) {
      const html = fs.readFileSync(archivo, 'utf8').replace('</head>',
        '<script src="https://analitica.example.invalid/antes-del-render.js"></script></head>');
      return responder(peticion, 200, html, 'text/html', [
        { name: 'Content-Security-Policy', value: politica },
        { name: 'Cache-Control', value: 'no-store' },
        { name: 'Referrer-Policy', value: 'no-referrer' },
      ]);
    }
    return responder(peticion, 200, fs.readFileSync(archivo), tipos[path.extname(archivo)] || 'application/octet-stream');
  }

  const visitar = async condicion => {
    await evaluate('window.__registroAnterior = true');
    await command('Page.navigate', { url: origen + ruta });
    await esperar('!window.__registroAnterior && (' + condicion + ')');
  };
  const visitarVerificacion = async (fragmento, condicion) => {
    await command('Page.navigate', { url: 'about:blank' });
    await esperar('location.href === "about:blank"');
    await command('Page.navigate', { url: origen + rutaVerificacion + fragmento });
    await esperar('location.pathname === "' + rutaVerificacion + '" && (' + condicion + ')');
  };
  const llenarVerificacion = valor =>
    evaluate(`document.getElementById("verificacion-password").value = ${JSON.stringify(valor)}`);
  const llenar = (id, valor) => evaluate(`document.getElementById(${JSON.stringify('registro-' + id)}).value = ${JSON.stringify(valor)}`);
  const enviar = () => evaluate('document.querySelector("form").requestSubmit()');
  const mensaje = texto => `document.querySelector("main")?.innerText.includes(${JSON.stringify(texto)})`;
  const aceptarUsoDelCorreo = () => evaluate('document.querySelector(".registro-consentimiento input").click()');
  const solicitudesPost = () => llamadas.filter(l => l.method === 'POST');
  const formulario = '!!document.querySelector("form")';
  const selectorPlanes = '!!document.querySelector(".hf-selector-planes")';
  const formularioRegistro = '!!document.querySelector("#registro-nombre") && !document.getElementById("registro-nombre").closest("[hidden]")';
  const preciosSelector = '[...document.querySelectorAll(".hf-selector-planes__precio b")].map(e=>e.textContent)';

  async function comprobarOjo(id) {
    const campo = `document.getElementById(${JSON.stringify(id)})`;
    const boton = `document.querySelector(${JSON.stringify(`button[aria-controls="${id}"]`)})`;
    const valor = await evaluate(`${campo}.value`);
    assert.equal(await evaluate(`${campo}.type`), 'password');
    await evaluate(`${boton}.click()`);
    assert.equal(await evaluate(`${campo}.type`), 'text');
    assert.match(await evaluate(`${boton}.getAttribute('aria-label')`), /^Ocultar/);
    assert.equal(await evaluate(`${campo}.value`), valor);
    await evaluate(`${boton}.click()`);
    assert.equal(await evaluate(`${campo}.type`), 'password');
  }

  async function elegirPlan(plan, ciclo) {
    for (const valor of [plan, ciclo]) {
      await evaluate(`document.querySelector('.hf-selector-planes input[value="${valor}"]').click()`);
    }
    await evaluate('document.querySelector(".hf-selector-planes").requestSubmit()');
    await esperar(formularioRegistro);
  }

  async function completar() {
    await llenar('nombre', '  Cliente de prueba  ');
    await llenar('email', 'cliente@example.invalid');
    await llenar('password', password);
    await llenar('repetir', password);
  }

  navegador.on('Network.loadingFailed', evento => {
    if (evento.blockedReason === 'csp') bloqueosCsp += 1;
  });
  navegador.on('Fetch.requestPaused', peticion => {
    simular(peticion).catch(error => inesperadas.push(error.message));
  });

  try {
    await command('Page.enable');
    await command('Runtime.enable');
    await command('Network.enable');
    await command('Page.addScriptToEvaluateOnNewDocument', { source: `
      if (location.pathname === "/clientes/verificar") {
        const observer = new MutationObserver(() => {
          if (!document.querySelector("#root > *")) return;
          window.__primeraURLRender = location.href;
          observer.disconnect();
        });
        observer.observe(document, { childList: true, subtree: true });
      }
    ` });
    await command('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });

    await t.test('espera capacidades y evita envíos para datos inválidos o sin consentimiento', async () => {
      const pausa = Promise.withResolvers();
      responderCapacidades = () => pausa.promise;
      await visitar(mensaje('Comprobando la disponibilidad'));
      assert.equal(await evaluate(formulario), false);
      pausa.resolve([200, capacidades]);
      await esperar(selectorPlanes);
      assert.deepEqual(await evaluate(preciosSelector), ['US$9,99', 'US$29,99', 'US$79,99']);
      await evaluate('document.querySelector(\'.hf-selector-planes [value="anual"]\').click()');
      assert.deepEqual(await evaluate(preciosSelector), ['US$109,89', 'US$329,89', 'US$879,89']);
      assert.match(await evaluate('document.querySelector(".hf-selector-planes__ahorro").innerText'), /8,33 %/);
      assert.ok(bloqueosCsp > 0);
      assert.equal(await evaluate(formularioRegistro), false);
      await enviar();
      assert.equal(await evaluate(formularioRegistro), false);
      await elegirPlan('inicial', 'mensual');
      assert.equal(await evaluate('document.activeElement.id'), 'titulo-registro');

      await completar();
      await comprobarOjo('registro-password');
      await comprobarOjo('registro-repetir');
      await enviar();
      assert.equal(await evaluate('document.querySelector("form input:invalid").type'), 'checkbox');

      await aceptarUsoDelCorreo();
      await llenar('email', 'invalido');
      await enviar();
      assert.equal(await evaluate('document.querySelector("form input:invalid").type'), 'email');

      await llenar('email', 'cliente@intranet');
      await enviar();
      assert.equal(await evaluate('document.getElementById("registro-email").validity.patternMismatch'), true);

      await llenar('email', 'cliente@example.invalid');
      await llenar('nombre', '   ');
      await enviar();
      await esperar(mensaje('Ingresá tu nombre.'));

      await llenar('nombre', '  Cliente de prueba  ');
      await llenar('password', 'corta');
      await llenar('repetir', 'corta');
      await enviar();
      await esperar(mensaje('al menos 12 caracteres'));

      await llenar('password', password);
      await llenar('repetir', password + ' distinta');
      await enviar();
      await esperar(mensaje('Las contraseñas no coinciden.'));
      assert.ok(llamadas.every(l => l.ruta === '/api/clientes/capacidades'));
    });

    await t.test('usa CSRF y emite un solo POST con el plan y ciclo confirmados', async () => {
      const pausa = Promise.withResolvers();
      responderRegistro = () => pausa.promise;
      await llenar('repetir', password);
      await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 800, deviceScaleFactor: 1, mobile: true });
      await evaluate('document.querySelector(".registro-plan-elegido button").click()');
      assert.equal(await evaluate(formularioRegistro), false);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".hf-selector-planes input:checked"), el => el.value)'),
        ['mensual', 'inicial']);
      await evaluate(`document.querySelector('form[aria-label="Registro por correo"]')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));`);
      assert.ok(llamadas.every(l => l.ruta === '/api/clientes/capacidades'));
      await elegirPlan('gestion', 'anual');
      assert.match(await evaluate('document.querySelector(".registro-plan-elegido").innerText'), /Gestión\s+US\$879,89 · Anual/);
      assert.equal(await evaluate('document.getElementById("registro-email").value'), 'cliente@example.invalid');
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      await evaluate(`const f = document.querySelector('form');
        f.requestSubmit();
        f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));`);
      await esperar(mensaje('Enviando'));
      await evaluate('document.querySelector("form").requestSubmit()');
      pausa.resolve([202, aceptada]);
      await esperar(mensaje('Revisá tu correo'));

      const envios = solicitudesPost();
      assert.equal(envios.length, 1);
      assert.equal(llamadas.filter(l => l.ruta === '/api/clientes/csrf').length, 1);
      const cabeceras = Object.fromEntries(Object.entries(envios[0].headers).map(([nombre, valor]) => [nombre.toLowerCase(), valor]));
      assert.equal(cabeceras['x-hostflow-csrf'], csrf);
      assert.equal(cabeceras.authorization, undefined);
      assert.deepEqual(JSON.parse(envios[0].postData), {
        email: 'cliente@example.invalid', nombre: 'Cliente de prueba', password, plan: 'gestion', ciclo: 'anual',
      });
      assert.equal(await evaluate(formulario), false);
    });

    await t.test('habilitación denegada, capacidades incompatibles y error de servicio cierran el formulario', async () => {
      for (const [estado, datos, texto] of [
        [200, { ...capacidades, registro: false }, 'está en preparación'],
        [200, { ...capacidades, version: 2 }, 'No pudimos comprobar'],
        [200, { ...capacidades, modalidadRegistro: 'abierto' }, 'No pudimos comprobar'],
        [503, {}, 'No pudimos comprobar'],
      ]) {
        responderCapacidades = async () => [estado, datos];
        await visitar(mensaje(texto));
        assert.equal(await evaluate(formulario), false);
        assert.deepEqual(await evaluate("[...document.querySelectorAll('.hf-publica-cabecera nav a')].map(a=>a.getAttribute('href'))"), ['/#planes', '/acceso']);
        assert.deepEqual(await evaluate("[...document.querySelectorAll('.hf-entrada-publica__acciones a')].map(a=>a.getAttribute('href'))"), ['/#planes', '/acceso']);
      }
      assert.equal(solicitudesPost().length, 1);
    });

    await t.test('falla antes del POST sin CSRF válido y bloquea el reenvío con resultado incierto', async () => {
      responderCapacidades = async () => [200, capacidades];
      responderCsrf = async () => [200, { csrf: 'incompleto' }];
      await visitar(selectorPlanes);
      await elegirPlan('profesional', 'mensual');
      await completar();
      await aceptarUsoDelCorreo();
      await enviar();
      await esperar(mensaje('No pudimos preparar el envío seguro'));
      assert.equal(solicitudesPost().length, 1);

      responderCsrf = async () => [200, { csrf }];
      responderRegistro = async () => [202, { incompatible: true }];
      await llenar('password', password);
      await llenar('repetir', password);
      await enviar();
      await esperar(mensaje('No pudimos confirmar el resultado'));
      assert.equal(await evaluate('document.querySelector("fieldset").disabled'), true);
      assert.equal(await evaluate('document.getElementById("registro-password").value'), '');
      await enviar();
      assert.equal(solicitudesPost().length, 2);
    });

    await t.test('retira fragmentos inválidos sin consultar la API ni habilitar confirmación', async () => {
      const antes = llamadas.length;
      for (const fragmento of ['', '#token=corto', '#token=' + 'A'.repeat(42) + 'B', '#token=' + token + '&token=' + token, '#token=' + token + '&extra=1']) {
        await visitarVerificacion(fragmento, mensaje('Este enlace no es válido'));
        assert.equal(await evaluate('location.href'), origen + rutaVerificacion);
        assert.equal(await evaluate('window.__primeraURLRender'), origen + rutaVerificacion);
        assert.equal(await evaluate(formulario), false);
      }
      assert.equal(llamadas.length, antes);
    });

    await t.test('el enlace vencido y el enlace de otro flujo se cierran sin confirmación', async () => {
      const antes = solicitudesPost().length;
      responderEstado = async () => [400, { codigo: 'ENLACE_NO_VALIDO' }];
      await visitarVerificacion('#token=' + token, mensaje('Este enlace venció'));
      assert.equal(await evaluate(formulario), false);

      responderEstado = async () => [200, { ...enlaceVigente, tipo: 'recuperacion' }];
      await visitarVerificacion('#token=' + token, mensaje('Este enlace venció'));
      assert.equal(await evaluate(formulario), false);
      assert.deepEqual(solicitudesPost().slice(antes).map(l => l.ruta), [
        '/api/clientes/enlaces/estado', '/api/clientes/enlaces/estado',
      ]);

      responderEstado = async () => [200, { tipo: 'registro', expiraEn: 'incompatible' }];
      await visitarVerificacion('#token=' + token, mensaje('No pudimos comprobar el enlace'));
      assert.equal(await evaluate(formulario), false);
    });

    await t.test('confirma el enlace vigente una vez y mantiene el token fuera de la URL y del almacenamiento', async () => {
      const antes = llamadas.length;
      const bloqueosAntes = bloqueosCsp;
      const pausa = Promise.withResolvers();
      responderEstado = () => pausa.promise;
      await visitarVerificacion('?utm_source=correo#token=' + token, mensaje('Comprobando tu enlace'));
      assert.equal(await evaluate(formulario), false);
      assert.equal(await evaluate('window.__primeraURLRender'), origen + rutaVerificacion);
      pausa.resolve([200, enlaceVigente]);
      await esperar(formulario);

      await llenarVerificacion('corta');
      await comprobarOjo('verificacion-password');
      await enviar();
      await esperar(mensaje('al menos 12 caracteres'));
      assert.equal(llamadas.slice(antes).filter(l => l.ruta.endsWith('/verificar')).length, 0);

      const respuesta = Promise.withResolvers();
      responderVerificacion = () => respuesta.promise;
      await llenarVerificacion(password);
      await evaluate(`
        const form = document.querySelector('form');
        form.requestSubmit();
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      `);
      await esperar(mensaje('Confirmando'));
      await enviar();
      respuesta.resolve([200, { completado: true }]);
      await esperar(mensaje('Correo verificado'));
      assert.equal(await evaluate(formulario), false);

      const peticiones = llamadas.slice(antes);
      assert.deepEqual(peticiones.map(l => [l.method, l.ruta]), [
        ['GET', '/api/clientes/csrf'], ['POST', '/api/clientes/enlaces/estado'],
        ['GET', '/api/clientes/csrf'], ['POST', '/api/clientes/verificar'],
      ]);
      const envios = peticiones.filter(l => l.method === 'POST');
      assert.deepEqual(envios.map(l => JSON.parse(l.postData)), [{ token }, { token, password }]);
      assert.ok(peticiones.every(l => l.ubicacion === origen + rutaVerificacion && !l.query));
      for (const envio of envios) {
        const cabeceras = Object.fromEntries(Object.entries(envio.headers).map(([nombre, valor]) => [nombre.toLowerCase(), valor]));
        assert.equal(cabeceras['x-hostflow-csrf'], csrf);
        assert.equal(cabeceras.authorization, undefined);
        assert.ok(!cabeceras.referer?.includes(token));
      }
      assert.equal(await evaluate(`[...Object.values(localStorage), ...Object.values(sessionStorage)]
        .some(valor => valor.includes(${JSON.stringify(token)}))`), false);
      assert.ok(bloqueosCsp > bloqueosAntes);
    });

    await t.test('después de verificar se ingresa al área de cliente pendiente y se puede cerrar sesión', async () => {
      await evaluate('document.querySelector(\'a[href="/clientes/login"]\').click()');
      await esperar('!!document.querySelector("#cliente-password")');
      const antes = llamadas.length;
      await evaluate(`document.querySelector('#cliente-email').value = 'cliente@example.invalid';
        document.querySelector('#cliente-password').value = ${JSON.stringify(password)};`);
      await comprobarOjo('cliente-password');
      await enviar();
      await esperar(mensaje('Tu cuenta está pendiente de activación'));
      assert.equal(await evaluate('!!document.querySelector("[role=alert]")'), false);
      assert.ok(llamadas.slice(antes).every(l => l.ubicacion === origen + rutaLogin && !l.query));
      assert.deepEqual(JSON.parse(llamadas.slice(antes).find(l => l.ruta.endsWith('/login')).postData),
        { email: 'cliente@example.invalid', password });
      await evaluate('document.querySelector("main button").click()');
      await esperar('!!document.querySelector("#cliente-password")');
      assert.equal(sesionCliente, false);
      assert.equal(await evaluate('document.querySelector("#cliente-password").value'), '');
    });

    await t.test('una respuesta de confirmación incierta limpia la contraseña y bloquea el reenvío', async () => {
      responderEstado = async () => [200, enlaceVigente];
      responderVerificacion = async () => [200, { completado: false }];
      await visitarVerificacion('#token=' + token, formulario);
      const antes = solicitudesPost().filter(l => l.ruta.endsWith('/verificar')).length;
      await llenarVerificacion(password);
      await enviar();
      await esperar(mensaje('No pudimos confirmar el resultado'));
      assert.equal(await evaluate('document.querySelector("fieldset").disabled'), true);
      assert.equal(await evaluate('document.getElementById("verificacion-password").value'), '');
      await evaluate("document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));");
      assert.equal(solicitudesPost().filter(l => l.ruta.endsWith('/verificar')).length, antes + 1);
    });

    assert.deepEqual(inesperadas, []);
  } finally {
    await navegador.cerrar();
  }
});

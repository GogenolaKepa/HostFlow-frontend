import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {abrirNavegador} from '../helpers/navegadorComercial.js';

const ejecutable = process.env.HOSTFLOW_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

test('landing híbrida y login real con API completamente simulada', {skip: !fs.existsSync(ejecutable), timeout: 120000}, async t => {
  const frontend = fileURLToPath(new URL('../..', import.meta.url));
  const capturas = path.resolve(frontend, '../evidencia-hibrida');
  fs.mkdirSync(capturas, {recursive: true});
  const dist = path.join(frontend, 'dist');
  const base = 'https://hostflow.com.ar', api = 'https://api.hostflow.com.ar';
  const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
  assert.ok(fs.existsSync(path.join(dist, 'index.html')), 'Construir primero con configuración Cloudflare.');
  const llamadas = [], externos = [], errores = [], confirmaciones = [];
  let navegador, foto = true, revision = 0;
  const usuario = {idUsuario: 9001, nombre: 'Persona ficticia', email: 'laboratorio@example.invalid', rol: 'Administrador', permisos: ['dashboard.ver'], origenAutenticacion: 'sql', gestionCuentasDisponible: true, debeCambiarPassword: false, versionRegistro: '0000000000000001'};
  try {
    navegador = await abrirNavegador(ejecutable);
    const {command, evaluate} = navegador;
    const esperar = async expression => {
      for (let i = 0; i < 100; i++) {
        try { if (await evaluate(expression)) return; } catch { /* Navegación entre documentos. */ }
        await new Promise(resolve => setTimeout(resolve, 60));
      }
      throw Error('No se alcanzó: ' + expression);
    };
    navegador.on('Runtime.exceptionThrown', p => errores.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'excepción'));
    await command('Runtime.enable');
    await command('Page.enable');
    navegador.on('Page.javascriptDialogOpening', p => {
      confirmaciones.push(p.message);
      command('Page.handleJavaScriptDialog', {accept: p.type==='confirm'&&p.message==='Se cerrarán todas tus sesiones de HostFlow. ¿Continuar?'}).catch(()=>errores.push('No se pudo responder al diálogo ficticio.'));
    });
    navegador.on('Fetch.requestPaused', async p => {
      try {
        const url = new URL(p.request.url);
        if (![base,api].includes(url.origin) && !p.request.url.startsWith('data:')) {
          externos.push(url.origin);
          await command('Fetch.failRequest', {requestId: p.requestId, errorReason: 'BlockedByClient'});
          return;
        }
        if (url.origin === api) {
          if(p.request.method==='OPTIONS'){await command('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:204,responseHeaders:[{name:'Access-Control-Allow-Origin',value:base},{name:'Access-Control-Allow-Methods',value:'GET,POST,OPTIONS'},{name:'Access-Control-Allow-Headers',value:'authorization,content-type'}]});return;}
          llamadas.push({ruta: url.pathname, metodo: p.request.method, cuerpo: p.request.postData});
          let status = 200, data = {};
          if (url.pathname === '/api/auth/me') data = {usuario, expiraEn: Math.floor(Date.now()/1000)+3600};
          else if (url.pathname === '/api/auth/login') data = {token: 'token-solo-fixture', usuario};
          else if (url.pathname === '/api/auth/logout') data = {};
          else if (url.pathname === '/api/dashboard/resumen') data = {resumen: {propiedadesActivas: 0, reservasActivas: 0, huespedesRegistrados: 0, ocupacionMensual: 0, alertasPendientes: 0}, proximasReservas: [], alertas: []};
          else if (url.pathname === '/api/monedas/estado') data = {habilitado: false};
          else {status = 404; data = {mensaje: 'Ruta no preparada en fixture.'};}
          await command('Fetch.fulfillRequest', {requestId: p.requestId, responseCode: status, responseHeaders: [{name: 'Content-Type', value: 'application/json'}, {name:'Access-Control-Allow-Origin',value:base}, {name:'Access-Control-Allow-Methods',value:'GET,POST,OPTIONS'}, {name:'Access-Control-Allow-Headers',value:'authorization,content-type'}], body: Buffer.from(JSON.stringify(data)).toString('base64')});
          return;
        }
        if (!foto && /hero.*\.webp/.test(url.pathname)) {
          await command('Fetch.failRequest', {requestId: p.requestId, errorReason: 'BlockedByClient'});
          return;
        }
        if (foto === 'lenta' && /hero.*\.webp/.test(url.pathname)) await new Promise(resolve => setTimeout(resolve, 3500));
        const destino = path.resolve(dist, '.'+decodeURIComponent(url.pathname));
        assert.ok(destino.startsWith(path.resolve(dist)+path.sep)||destino===path.resolve(dist));
        const archivo = fs.existsSync(destino)&&fs.statSync(destino).isFile()?destino:path.extname(url.pathname)?null:path.join(dist,'index.html');
        await command('Fetch.fulfillRequest', {requestId:p.requestId,responseCode:archivo?200:404,responseHeaders:[{name:'Content-Type',value:archivo?(mime[path.extname(archivo)]||'application/octet-stream'):'text/plain'},{name:'Cache-Control',value:'no-store'}],body:archivo?fs.readFileSync(archivo).toString('base64'):''});
      } catch { /* Cierre del perfil aislado. */ }
    });
    await command('Fetch.enable', {patterns: [{urlPattern: '*', requestStage: 'Request'}]});
    const navegar = async ruta => {
      await evaluate("if(document.body)document.body.dataset.anterior='1'");
      const url = new URL(ruta, base);
      url.searchParams.set('_prueba', String(++revision));
      await command('Page.navigate', {url: url.href});
      await esperar("!!document.body&&!document.body.dataset.anterior");
    };
    const llenar = (selector, valor) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const captura = async (nombre, completa = true) => fs.writeFileSync(path.join(capturas, nombre+'.png'), Buffer.from((await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: completa})).data, 'base64'));

    for (const width of [1440, 768, 390, 320]) await t.test('landing responsive, accesible y sin fixtures públicos '+width, async () => {
      await command('Emulation.setDeviceMetricsOverride', {width, height: 950, deviceScaleFactor: 1, mobile: width < 760});
      await navegar('/');
      await esperar("document.querySelector('.hero-foto img')?.complete");
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
      assert.equal(await evaluate("document.querySelectorAll('main h1').length"), 1);
      assert.equal(await evaluate("document.querySelectorAll('.tarjeta-plan').length"), 3);
      assert.deepEqual(await evaluate("[...document.querySelectorAll('.precio strong')].map(x=>x.textContent)"), ['US$9,99', 'US$29,99', 'US$79,99']);
      assert.ok(await evaluate("[...document.querySelectorAll('.hf-landing a[href^=\"#\"]')].every(a=>!!document.querySelector(a.getAttribute('href')))"));
      assert.equal(await evaluate("/prototipo|laboratorio|datos ficticios|localhost|127\\.0\\.0\\.1/i.test(document.body.innerText)"), false);
      assert.ok(await evaluate("[...document.querySelectorAll('form input,form select,form textarea')].every(e=>!!e.closest('label'))"));
      assert.equal(await evaluate("getComputedStyle(document.querySelector('[name=nombre]')).backgroundColor"), 'rgb(15, 33, 53)');
      assert.ok(await evaluate("[...document.querySelectorAll('.cabecera span')].every(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(e).padding==='0px')"));
      if (width < 760) {
        await evaluate("document.querySelector('.menu-movil').click()");
        assert.equal(await evaluate("document.querySelector('.menu-movil').getAttribute('aria-expanded')"), 'true');
        await evaluate("document.querySelector('#navegacion a[href=\"#planes\"]').click()");
        assert.equal(await evaluate("document.querySelector('.menu-movil').getAttribute('aria-expanded')"), 'false');
        await evaluate('scrollTo(0,0)');
      }
      await captura('landing-'+width);
      await captura('hero-'+width, false);
    });
    await t.test('precios anuales y comparación coherentes', async () => {
      await evaluate("document.querySelector('input[name=\"ciclo-plan\"][value=anual]').click();document.querySelector('.comparador').open=true");
      assert.deepEqual(await evaluate("[...document.querySelectorAll('.precio strong')].map(x=>x.textContent)"), ['US$109,89', 'US$329,89', 'US$879,89']);
      assert.ok(await evaluate("document.querySelector('.comparador').innerText.includes('US$329,89')&&document.querySelector('.facturacion-anual').innerText.includes('8,33')"));
      await captura('planes-anuales-320');
    });
    await t.test('contacto prepara correo, nunca POST ni falso acuse, invalida borrador al cambiar', async () => {
      assert.ok(llamadas.every(x=>x.metodo==='GET'&&x.ruta==='/api/cuentas-comerciales/capacidades'));
      await evaluate("document.querySelectorAll('.tarjeta-plan a')[1].click()");
      await llenar('[name=nombre]', 'Persona ficticia');
      await llenar('[name=correo]', 'consulta@example.invalid');
      await llenar('[name=mensaje]', 'Quiero organizar alojamientos de prueba.');
      await evaluate("document.querySelector('[name=consentimiento]').click();document.querySelector('.formulario').requestSubmit()");
      await esperar("!!document.getElementById('hf-solicitud')");
      assert.match(await evaluate("document.getElementById('hf-solicitud').value"), /Profesional/);
      assert.ok(await evaluate("document.querySelector('.correo-preparado a').href.startsWith('mailto:contacto@hostflow.com.ar?')"));
      assert.match(await evaluate("document.querySelector('.correo-preparado').innerText"), /sin enviar/);
      await captura('contacto-preparado');
      await llenar('[name=nombre]', 'Otra persona ficticia');
      assert.equal(await evaluate("!!document.getElementById('hf-solicitud')"), false);
      assert.ok(llamadas.every(x=>x.metodo==='GET'&&x.ruta==='/api/cuentas-comerciales/capacidades'));
      assert.equal(await evaluate('localStorage.length'), 0);
    });
    await t.test('teclado, movimiento reducido e imagen ausente', async () => {
      foto = false;
      await command('Network.setCacheDisabled', {cacheDisabled: true});
      await command('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
      await navegar('/'); await esperar("!!document.getElementById('hf-hero-title')");
      assert.ok(await evaluate("getComputedStyle(document.querySelector('.hero')).backgroundImage.includes('gradient')"));
      await command('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
      await command('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
      assert.equal(await evaluate("document.activeElement.getAttribute('href')"), '#principal');
      await navegar('/login'); await esperar("document.querySelector('.login-premium')?.dataset.fondo==='fallback'");
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.login-hero')).opacity"), '0');
      assert.ok(await evaluate("getComputedStyle(document.querySelector('.login-container')).backgroundImage.includes('gradient')"));
      await captura('login-fallback-320'); foto = true;
    });
    for (const width of [1440, 390, 320]) await t.test('login real, foto y composición de marca '+width, async () => {
      await command('Emulation.setDeviceMetricsOverride', {width, height: 950, deviceScaleFactor: 1, mobile: width < 760});
      await navegar('/login');
      await esperar("document.querySelector('.login-premium')?.dataset.fondo==='foto'");
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.login-hero')).opacity"), '1');
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
      const medidas = await evaluate("(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();const n=r('.nombre-login'),p=r('.identidad-login>p'),i=r('.identidad-login>img');return {nombre:n.x+n.width/2,subtitulo:p.x+p.width/2,iconoY:i.y+i.height/2,textoY:(n.y+ p.bottom)/2,iconoHeight:i.height,ratio:i.width/i.height}})()");
      assert.ok(Math.abs(medidas.nombre-medidas.subtitulo)<1, JSON.stringify(medidas));
      if (width === 390) assert.ok(Math.abs(medidas.iconoY-medidas.textoY)<1, JSON.stringify(medidas));
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.identidad-login>img')).objectFit"), 'contain');
      if (width < 760) assert.ok(medidas.ratio>0.85&&medidas.ratio<0.89);
      assert.equal(await evaluate("document.body.innerText.includes('Conocer HostFlow')"), false);
      assert.equal(await evaluate("!!document.querySelector('.login-volver-publico[href=\"/\"]')"), true);
      await captura('login-'+width);
    });
    await t.test('imagen lenta no bloquea ni desplaza el formulario y conserva fallback', async () => {
      foto = 'lenta';
      await navegar('/login'); await esperar("!!document.getElementById('login-email')");
      const rectangulo = () => evaluate("(()=>{const r=document.querySelector('.login-card').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()");
      const antes = await rectangulo();
      assert.equal(await evaluate("document.querySelector('.login-card button').disabled"), false);
      await esperar("document.querySelector('.login-premium')?.dataset.fondo==='fallback'");
      await new Promise(resolve => setTimeout(resolve, 1200));
      assert.equal(await evaluate("document.querySelector('.login-premium').dataset.fondo"), 'fallback');
      assert.deepEqual(await rectangulo(), antes);
      foto = true;
    });
    await t.test('ruta protegida, login real y restauración sin API externa', async () => {
      await navegar('/reservas'); await esperar("!!document.getElementById('login-email')");
      assert.equal(await evaluate("!!document.querySelector('.sidebar')"), false);
      await llenar('#login-email', usuario.email); await llenar('#login-password', 'Solo un fixture ficticio 123');
      await evaluate("document.querySelector('.login-card').requestSubmit()");
      await esperar("!!document.querySelector('.sidebar')");
      const post = llamadas.filter(x=>x.metodo==='POST');
      assert.equal(post.length, 1); assert.equal(post[0].ruta, '/api/auth/login');
      assert.deepEqual(JSON.parse(post[0].cuerpo), {email: usuario.email, password: 'Solo un fixture ficticio 123'});
      await navegar('/'); await esperar("!!document.querySelector('.sidebar')");
      assert.equal(await evaluate("!!document.querySelector('.hf-landing')"), false);
    });
    await t.test('cierre de sesión real limpia token y vuelve al login', async () => {
      await evaluate("document.querySelector('.sidebar-logout').click()");
      await esperar("!!document.getElementById('login-email')");
      assert.equal(await evaluate("localStorage.getItem('token')"), null);
      assert.equal(await evaluate("!!document.querySelector('.sidebar')"), false);
      assert.equal(llamadas.filter(x=>x.ruta==='/api/auth/logout'&&x.metodo==='POST').length, 1);
      assert.deepEqual(confirmaciones, ['Se cerrarán todas tus sesiones de HostFlow. ¿Continuar?']);
    });
    assert.deepEqual(externos, []); assert.deepEqual(errores, []);
    fs.writeFileSync(path.join(capturas, 'resultado.json'), JSON.stringify({api:'interceptada', azure:false, externos, errores, anchos:[1440,768,390,320]}, null, 2));
  } finally {
    fs.writeFileSync(path.join(capturas, 'diagnostico.json'), JSON.stringify({llamadas,externos,errores}, null, 2));
    await navegador?.cerrar();
  }
});

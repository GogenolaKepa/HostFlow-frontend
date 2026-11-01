import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {abrirNavegador} from '../helpers/navegadorComercial.js';
import {puertoAislado} from '../helpers/puertoAislado.js';
import {cacheViteAislada} from '../helpers/cacheVite.js';
const require=createRequire(new URL('../../../backend/package.json',import.meta.url));
const {crearProductoE2E}=require('./tests/helpers/productoComercialE2E');
const ejecutable=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

test('producto React→Express→cuentas→workers→Resend ficticio→enlace→login, sin SQL',{skip:!fs.existsSync(ejecutable),timeout:120000},async()=>{
  const frontend=fileURLToPath(new URL('../..',import.meta.url)),cache=cacheViteAislada();
  const base='http://127.0.0.1:'+await puertoAislado(),e=await crearProductoE2E({origen:base});
  let server,vite,b;
  try{
    server=e.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    vite=await createServer({root:frontend,configFile:false,envDir:false,cacheDir:cache.ruta,plugins:[react(),{name:'entrada-e2e',configureServer(s){s.middlewares.use((req,_res,next)=>{if(req.url==='/'||req.url==='/login'||req.url.startsWith('/cuenta/'))req.url='/tests/manual/autenticacion/producto.html';next();});}}],
      define:{'import.meta.env.VITE_API_URL':JSON.stringify('/api')},server:{host:'127.0.0.1',port:Number(new URL(base).port),strictPort:true,ws:false,watch:null,proxy:{'/api':`http://127.0.0.1:${server.address().port}`}}});
    await vite.listen();b=await abrirNavegador(ejecutable);const {command,evaluate}=b;
    const esperar=expr=>b.esperar(`(()=>{try{return ${expr};}catch{return false;}})()`);
    const externos=[];
    b.on('Fetch.requestPaused',async p=>{const local=p.request.url.startsWith(base+'/')||p.request.url.startsWith('data:');if(!local)externos.push(new URL(p.request.url).origin);try{await command(local?'Fetch.continueRequest':'Fetch.failRequest',{requestId:p.requestId,...(local?{}:{errorReason:'BlockedByClient'})});}catch{/* El perfil puede estar cerrándose. */}});
    await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
    b.on('Runtime.exceptionThrown',p=>console.error('Excepción del navegador:',p.exceptionDetails?.exception?.description||p.exceptionDetails?.text));
    await command('Runtime.enable');
    await command('Emulation.setDeviceMetricsOverride',{width:1440,height:950,deviceScaleFactor:1,mobile:false});
    const click=texto=>evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(texto)}).click()`);
    const fill=(id,v)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const navegar=async ruta=>{await command('Page.navigate',{url:base+ruta});};
    const nueva='Clave E2E ficticia 2026 segura';
    const capturas=path.join(frontend,'../revision/integracion-producto-authcom-2026-10-31/capturas');fs.mkdirSync(capturas,{recursive:true});
    // Enrolamiento de un Operador legacy: contraseña + sesión + enlace, sin backfill.
    await navegar('/login');await esperar("!!document.getElementById('login-email')");
    await fill('login-email',e.operador.usuario.email);await fill('login-password',e.operador.password);await click('Ingresar');
    await esperar("!!document.querySelector('button[title=\"Mi cuenta\"]')");await evaluate("document.querySelector('button[title=\"Mi cuenta\"]').click()");
    await esperar("!!document.getElementById('ac-contacto-password')");
    await evaluate("window.HostFlowAppearance.setPreference('oscuro');document.getElementById('ac-contacto-password').scrollIntoView({block:'center'})");
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    fs.writeFileSync(path.join(capturas,'contacto-escritorio.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    await fill('ac-contacto-password',e.operador.password);await click('Solicitar verificación de correo');await esperar("document.body.innerText.includes('La verificación se completa únicamente')");
    assert.ok(!e.repository.filas.get(2).emailVerificadoEn);await e.procesar();
    const contacto=e.tokenCorreo();await navegar('/cuenta/contacto#token='+contacto);await esperar("Array.from(document.querySelectorAll('button')).some(x=>x.textContent==='Confirmar mi correo')");
    await click('Confirmar mi correo');await esperar("document.body.innerText.includes('Tu correo fue verificado')");
    assert.ok(e.repository.filas.get(2).emailVerificadoEn);assert.equal(e.repository.filas.get(2).versionSesion,1);
    await evaluate('localStorage.clear()');
    await navegar('/login');await esperar("!!document.getElementById('login-email')");await esperar("document.body.innerText.includes('¿Olvidaste tu contraseña?')");
    await click('¿Olvidaste tu contraseña?');await esperar("!!document.getElementById('ac-email')");await fill('ac-email',e.operador.usuario.email);await click('Solicitar enlace seguro');await esperar("document.body.innerText.includes('Revisá tu correo')");
    assert.equal(e.repository.ingresos.size,1);assert.equal(e.correos.length,1);
    const {SupervisorComercial}=require('./src/services/SupervisorComercial');
    const supervisor=new SupervisorComercial({procesar:()=>e.procesar(),intervaloMs:100});
    supervisor.iniciar();
    try{for(let n=0;n<100&&e.correos.length<2;n++)await new Promise(r=>setTimeout(r,30));}finally{await supervisor.detener();}
    assert.equal(e.correos.length,2);assert.equal(e.plantillas.length,2);assert.ok(e.plantillas[0].html.includes('HostFlow'));
    const token=e.tokenCorreo(),vieja=e.tokenOperador();
    await navegar('/cuenta/recuperacion#token='+token);await esperar("!!document.getElementById('ac-password')");
    assert.equal(await evaluate('location.hash'), '');assert.ok(!await evaluate(`JSON.stringify(localStorage).includes(${JSON.stringify(token)})`));
    for(const id of ['ac-password','ac-confirmacion'])await fill(id,nueva);
    await click('Actualizar contraseña');await esperar("document.body.innerText.includes('Tu contraseña fue actualizada')");
    const api=`http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(api+'/api/auth/me',{headers:{Authorization:'Bearer '+vieja}})).status,401);
    await click('Volver al inicio de sesión');await esperar("!!document.getElementById('login-email')");await fill('login-email',e.operador.usuario.email);await fill('login-password',nueva);await click('Ingresar');await esperar("!!localStorage.getItem('token')");
    assert.equal(JSON.parse(await evaluate("localStorage.getItem('usuario')")).rol,'Operador');
    const operario=await evaluate("localStorage.getItem('token')");
    assert.equal((await fetch(api+'/api/cuentas-comerciales/invitaciones',{headers:{Authorization:'Bearer '+operario}})).status,403);
    // Admin ficticio autenticado por el AuthService real; Usuarios es la pantalla real.
    await evaluate(`localStorage.setItem('token',${JSON.stringify(e.tokenAdmin())})`);await navegar('/');await esperar("document.body.innerText.includes('Usuarios')");await click('Usuarios');await esperar("!!document.getElementById('ac-nombre')");
    await fill('ac-nombre','Persona invitada E2E');await fill('ac-inv-email','invitada-e2e@example.invalid');await click('Enviar invitación');await esperar("document.body.innerText.includes('Pendiente')");
    fs.writeFileSync(path.join(capturas,'usuarios-invitaciones-escritorio.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    await e.procesar();const enlace=e.tokenCorreo();assert.equal(e.repository.filas.size,2);
    await navegar('/cuenta/invitacion#token='+enlace);await esperar("!!document.getElementById('ac-password')");
    for(const id of ['ac-password','ac-confirmacion'])await fill(id,nueva);
    await click('Aceptar invitación');await esperar("document.body.innerText.includes('Ya sos parte del equipo')");assert.equal(e.repository.filas.size,3);
    const nuevaCuenta=await e.auth.login('invitada-e2e@example.invalid',nueva);assert.equal(nuevaCuenta.usuario.rol,'Operador');
    const creada=[...e.repository.filas.values()].find(u=>u.email==='invitada-e2e@example.invalid');assert.ok(creada.emailVerificadoEn);
    await navegar('/cuenta/invitacion#token='+enlace);await esperar("document.body.innerText.includes('Este enlace ya no está disponible')");
    await command('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    fs.writeFileSync(path.join(capturas,'enlace-consumido-movil.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    // Respuesta incierta DESPUÉS del commit del doble: la UI no reenvía.
    await e.cuentas.invitar({idUsuario:1,versionSesion:1},{nombre:'Incertidumbre ficticia',email:'incierta@example.invalid'},{ip:'127.0.0.1'});await e.procesar();
    const incierta=e.tokenCorreo();e.perderConfirmacion();await navegar('/cuenta/invitacion#token='+incierta);await esperar("!!document.getElementById('ac-password')");
    for(const id of ['ac-password','ac-confirmacion'])await fill(id,nueva);
    const antes=e.confirmaciones();await click('Aceptar invitación');await esperar("document.body.innerText.includes('No pudimos confirmar el resultado')");
    assert.equal(e.repository.filas.size,4);assert.equal(e.confirmaciones(),antes+1);
    await evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
    assert.equal(e.confirmaciones(),antes+1);assert.ok(await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Aceptar invitación').disabled"));
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    fs.writeFileSync(path.join(capturas,'respuesta-incierta-movil.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    e.desactivar();await evaluarLoginCerrado();
    async function evaluarLoginCerrado(){await evaluate('localStorage.clear()');await navegar('/');await esperar("!!document.getElementById('hf-hero-title')");await navegar('/login');await esperar("!!document.getElementById('login-email')");assert.equal(await evaluate("document.body.innerText.includes('¿Olvidaste tu contraseña?')"),false);}
    assert.deepEqual(externos,[]);
  }catch(error){if(b)console.error('Pantalla al fallar:',await b.evaluate('document.body?.innerText'));throw error;}
  finally{await b?.cerrar();await vite?.close();if(server)await new Promise(r=>server.close(r));cache.limpiar();}
});

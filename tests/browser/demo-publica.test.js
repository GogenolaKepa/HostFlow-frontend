import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';import react from '@vitejs/plugin-react';
import {abrirNavegador} from '../helpers/navegadorComercial.js';import {puertoAislado} from '../helpers/puertoAislado.js';import {cacheViteAislada} from '../helpers/cacheVite.js';
const ejecutable=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe';

test('demo pública aislada: ocho módulos, memoria, cero API/JWT y responsive',{skip:!fs.existsSync(ejecutable),timeout:90000},async t=>{
 const frontend=fileURLToPath(new URL('../..',import.meta.url)),cache=cacheViteAislada(),capturas=path.join(frontend,'../revision/demo-interactiva-authcom-2026-11-01/capturas');fs.mkdirSync(capturas,{recursive:true});let vite,b,modulosDemo=[];const api=[],externos=[],modulos=[],errores=[];
 try{
  vite=await createServer({root:frontend,configFile:false,envDir:false,cacheDir:cache.ruta,plugins:[react()],define:{'import.meta.env.VITE_API_URL':JSON.stringify('/api')},server:{host:'127.0.0.1',port:await puertoAislado(),strictPort:true,ws:false,watch:null}});await vite.listen();const base='http://127.0.0.1:'+vite.httpServer.address().port;b=await abrirNavegador(ejecutable);const {command,evaluate,esperar}=b;
  b.on('Runtime.exceptionThrown',p=>errores.push(p.exceptionDetails?.text||'excepción'));await command('Runtime.enable');
  b.on('Fetch.requestPaused',async p=>{try{const u=new URL(p.request.url);if(u.origin!==base&&!p.request.url.startsWith('data:')){externos.push(u.origin);await command('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});return;}if(u.pathname.startsWith('/api/')){api.push({ruta:u.pathname,metodo:p.request.method});await command('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from('{"mensaje":"API prohibida en demo"}').toString('base64')});return;}modulos.push(u.pathname);await command('Fetch.continueRequest',{requestId:p.requestId});}catch{/* Cierre del perfil propio. */}});
  await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
  await command('Page.enable');
  const {identifier:instrumentacion}=await command('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('token','sentinela-ficticio-no-usar');window.lecturasJWT=0;window.escriturasDemo=[];const get=Storage.prototype.getItem,set=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k==='token'||k==='usuario')window.lecturasJWT++;return get.call(this,k)};Storage.prototype.setItem=function(k,v){window.escriturasDemo.push(k);return set.call(this,k,v)}`});
  let revision=0;const abrir=async ruta=>{await evaluate("if(document.body)document.body.dataset.anterior='1'");await command('Page.navigate',{url:base+ruta+'?prueba='+(++revision)});await esperar("!!document.body&&!document.body.dataset.anterior");};
  const clickTexto=texto=>evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(texto)}).click()`);
  const seccion=nombre=>evaluate(`[...document.querySelectorAll('.demo-sidebar nav button')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(nombre)})).click()`);
  const seleccionar=(id,valor)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(valor)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const screenshot=async nombre=>fs.writeFileSync(path.join(capturas,nombre+'.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:950,deviceScaleFactor:1,mobile:false});await abrir('/demo');await esperar("!!document.querySelector('.demo-kpis')");
  await t.test('demo ignorando sesión existente, sin cargar páginas operativas',async()=>{
   assert.equal(await evaluate('window.lecturasJWT'),0);assert.deepEqual(await evaluate('window.escriturasDemo'),[]);assert.equal(await evaluate("document.querySelectorAll('.demo-sidebar nav button').length"),8);
   assert.ok(!modulos.some(p=>/^\/src\/(App\.jsx|services\/api\.js|pages\/(Dashboard|Reservas|Login)\.jsx)$/.test(p)));await screenshot('dashboard-escritorio');
  });
  await t.test('reservas: filtros, vacío y detalle accesible',async()=>{
   await seccion('Reservas');await esperar("!!document.getElementById('demo-buscar')");await seleccionar('demo-estado','Cancelada');assert.equal(await evaluate("document.querySelectorAll('.demo-tabla-scroll tbody tr').length"),1);
   await evaluarInput('demo-buscar','sin coincidencias');assert.ok(await evaluate("!!document.querySelector('.demo-vacio')"));await clickTexto('Limpiar filtros');
   await evaluate("const b=document.querySelector('.demo-tabla-scroll button');b.focus();b.click()");await esperar("!!document.querySelector('dialog[open]')");assert.ok(await evaluate("document.querySelector('dialog').innerText.includes('15:00')"));
   await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await esperar("!document.querySelector('dialog')");assert.equal(await evaluate('document.activeElement.textContent'),'Ver detalle');
  });
  async function evaluarInput(id,valor){await evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);}
  await t.test('calendario: mes, alojamiento y movimientos ficticios',async()=>{
   await seccion('Calendario');await esperar("!!document.querySelector('.demo-calendario')");await evaluate("document.querySelector('.demo-dia:not(:disabled)').click()");await esperar("!!document.querySelector('dialog[open]')");await evaluate("document.querySelector('button[aria-label=\"Cerrar detalle\"]').click()");
   await seleccionar('demo-cal-propiedad','demo-p4');assert.equal(await evaluate("document.querySelectorAll('.demo-dia:not(:disabled)').length"),0);await clickTexto('→');assert.equal(await evaluate("document.getElementById('demo-periodo').value"),'2026-12');
  });
  await t.test('limpiezas y avisos solo en memoria, reinicio y F5',async()=>{
   await seccion('Limpiezas');await clickTexto('Iniciar en la demo');await clickTexto('Completar en la demo');assert.equal(await evaluate("[...document.querySelectorAll('.demo-tareas .demo-estado')].filter(x=>x.textContent==='Completada').length"),2);
   await seccion('Alertas');await clickTexto('Marcar leída en demo');assert.equal(await evaluate("[...document.querySelectorAll('.demo-avisos .demo-estado')].filter(x=>x.textContent==='Nueva').length"),1);await clickTexto('Reiniciar demo');assert.equal(await evaluate("[...document.querySelectorAll('.demo-avisos .demo-estado')].filter(x=>x.textContent==='Nueva').length"),2);
   await seccion('Limpiezas');await clickTexto('Iniciar en la demo');await abrir('/demo/');await esperar("!!document.querySelector('.demo-kpis')");await seccion('Limpiezas');assert.equal(await evaluate("[...document.querySelectorAll('.demo-tareas .demo-estado')].filter(x=>x.textContent==='Pendiente').length"),1);
  });
  await t.test('propiedades, huéspedes, reportes y FlowIA explicativo',async()=>{
   await seccion('Propiedades');assert.equal(await evaluate("document.querySelectorAll('.demo-propiedad').length"),4);await clickTexto('Explorar alojamiento ↗');await esperar("!!document.querySelector('dialog[open]')");await evaluate("document.querySelector('button[aria-label=\"Cerrar detalle\"]').click()");
   await seccion('Huéspedes');assert.equal(await evaluate("document.querySelectorAll('.demo-huespedes button').length"),5);await seccion('Reportes');assert.equal(await evaluate("document.querySelectorAll('svg[role=img]').length"),3);
   assert.ok(await evaluate("[...document.querySelectorAll('.chart-trend svg')].every(s=>s.getBoundingClientRect().width>200&&s.getBoundingClientRect().height>80)"));assert.ok(await evaluate("document.querySelector('.chart-ring-wrap svg').getBoundingClientRect().width>=140"));await screenshot('reportes-escritorio');
   await seccion('Vista general');await clickTexto('Explorar el concepto ↗');await esperar("!!document.querySelector('dialog[open]')");assert.ok(await evaluate("document.querySelector('dialog').textContent.includes('no se ejecuta un modelo')"));await evaluate("document.querySelector('button[aria-label=\"Cerrar detalle\"]').click()");
  });
  for(const width of [820,390,320])await t.test('responsive y navegación '+width,async()=>{
   await command('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<800});await seccion('Vista general');assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
   if(width<800){await evaluate("document.querySelector('.demo-menu').click()");assert.equal(await evaluate("document.querySelector('.demo-menu').getAttribute('aria-expanded')"),'true');await seccion('Reportes');assert.equal(await evaluate("document.querySelector('.demo-menu').getAttribute('aria-expanded')"),'false');await seccion('Vista general');}
   for(const nombre of ['Propiedades','Reservas','Calendario','Limpiezas','Huéspedes','Reportes','Alertas']){await seccion(nombre);const correcto=await evaluate('document.documentElement.scrollWidth<=innerWidth+1');if(!correcto)fs.writeFileSync(path.join(capturas,'overflow.json'),JSON.stringify(await evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth,elementos:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&!e.closest('.demo-tabla-scroll,.demo-cal-scroll')}).slice(0,12).map(e=>({tag:e.tagName,clase:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))})"),null,2));assert.ok(correcto,nombre+' sin overflow de página');}
   await seccion('Vista general');assert.equal(await evaluate("getComputedStyle(document.querySelector('.demo-encabezado h1')).outlineStyle"),'none');
   await screenshot('dashboard-'+width);
  });
  await t.test('landing, comparador y enlaces de salida honestos',async()=>{
   assert.equal(await evaluate('window.lecturasJWT'),0);assert.deepEqual(await evaluate('window.escriturasDemo'),[]);assert.deepEqual(api,[]);assert.deepEqual(externos,[]);
   modulosDemo=modulos.slice();assert.ok(!modulosDemo.some(p=>/^\/src\/(App\.jsx|services\/api\.js|pages\/(Dashboard|Reservas|Login)\.jsx)$/.test(p)));
   assert.ok(await evaluate("!!document.querySelector('a[href=\"/login\"]')&&!!document.querySelector('a[href=\"/#planes\"]')"));
   await command('Page.removeScriptToEvaluateOnNewDocument',{identifier:instrumentacion});await evaluate('localStorage.clear()');await abrir('/');await esperar("!!document.querySelector('.hf-landing')");assert.equal(await evaluate("document.querySelector('.hf-hero-actions a').textContent.trim()"),'Explorar demo');
   await evaluate("document.querySelector('.hf-comparador summary').click()");await seleccionar('hf-forma-trabajo','equipo');await esperar("!!document.querySelector('.hf-comparador [role=status] a')");await evaluate("document.querySelector('.hf-comparador [role=status] a').click()");assert.equal(await evaluate("document.getElementById('hf-plan').value"),'equipo');assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
  });
  assert.deepEqual(errores,[]);fs.writeFileSync(path.join(capturas,'resultado.json'),JSON.stringify({api,externos,errores,modulosOperativosCargadosDuranteDemo:modulosDemo.filter(p=>/^\/src\/(App\.jsx|services\/api\.js|pages\/(Dashboard|Reservas|Login)\.jsx)$/.test(p)),demoSinSesion:true,anchos:[1440,820,390,320]},null,2));
 }finally{await b?.cerrar();await vite?.close();cache.limpiar();}
});

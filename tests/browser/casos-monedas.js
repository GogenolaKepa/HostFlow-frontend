import assert from 'node:assert/strict';
import {fechaNegocio} from '../../src/services/monedasCalculos.js';
export async function probarMonedas({t,evaluate,send,fill,esperar,inicioVisible,fixture,fase,requests,capturar}) {
 const boton=(texto,raiz='.main')=>evaluate(`[...document.querySelectorAll(${JSON.stringify(raiz+' button')})].find(b=>b.textContent.trim()===${JSON.stringify(texto)}).click()`);
 const seleccionar=(id,v)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify('#'+id)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const recargar=async()=>{await evaluate('globalThis.__monedasAnterior=true');await send('Page.reload');await esperar(`globalThis.__monedasAnterior===undefined && (${inicioVisible})`);};
 const entrar=async()=>{await boton('Configuración','.sidebar');await esperar("Boolean(document.querySelector('.settings-nav'))");await boton('Monedas y cotizaciones','.settings-nav');await esperar("Boolean(document.querySelector('#monedas-fuente'))");};
 const confirmar=()=>boton('Confirmar','dialog[open]');
 const mutaciones=desde=>requests.slice(desde).filter(r=>['PUT','PATCH','POST','DELETE'].includes(r.method));
 const manual=async(valor='1000')=>{await seleccionar('monedas-fuente','MANUAL');await fill('#monedas-valor',valor);await boton('Confirmar vista previa manual');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar();await esperar("Boolean(document.querySelector('.monedas-cotizacion'))");};
 await t.test('Monedas apagadas: manual requiere confirmación, vista previa decimal y cero escrituras',async()=>{
  fase('monedas manual sin SQL');fixture({rol:'Administrador',datosVisuales:true,monedasActivas:false,monedasEscritura:false,formularioRealPrueba:false});await recargar();await entrar();const desde=requests.length;
  assert.equal(await evaluate("document.querySelector('.monedas-panel').textContent.includes('no se guardan')"),true);
  await fill('#monedas-valor','0');await boton('Confirmar vista previa manual');await esperar("document.querySelector('.monedas-panel .error')?.textContent.includes('positiva')");
  await fill('#monedas-valor','1000');await boton('Confirmar vista previa manual');await esperar("Boolean(document.querySelector('dialog[open]'))");
  assert.equal(await evaluate("document.querySelector('dialog').textContent.includes('HostFlow no verifica su exactitud')"),true);
  await boton('Cancelar','dialog[open]');assert.equal(await evaluate("Boolean(document.querySelector('.monedas-cotizacion'))"),false);
  await manual();assert.equal(await evaluate("[...document.querySelectorAll('.monedas-panel button')].find(b=>b.textContent==='Guardar cotización').disabled"),true);
  await fill('#monedas-importe','100');await boton('Calcular equivalencia');await esperar("document.querySelector('.monedas-equivalencia')?.textContent.includes('ARS 100.000,00')");
  await seleccionar('monedas-origen','ARS');await fill('#monedas-importe','1000');await boton('Calcular equivalencia');await esperar("document.querySelector('.monedas-equivalencia')?.textContent.includes('USD 1,00')");
  await capturar('monedas-manual-escritorio');
  await fill('#monedas-checkin',fechaNegocio());await boton('Simular referencia de check-in');await esperar("document.querySelector('.monedas-panel .error')?.textContent.includes('original en USD')");
  assert.deepEqual(mutaciones(desde),[]);
 });
 await t.test('Monedas: ARS/USD por propiedad en vista previa no reinterpreta precio ni guarda sin esquema',async()=>{
  fase('monedas tarifa vista previa');await seleccionar('monedas-propiedad','1');await seleccionar('monedas-moneda','USD');await fill('#monedas-precio','100');const desde=requests.length;
  await boton('Previsualizar tarifa sin guardar');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar();await esperar("document.querySelector('.monedas-panel .success-message')?.textContent.includes('USD 100,00')");
  assert.deepEqual(mutaciones(desde),[]);await seleccionar('monedas-moneda','ARS');await fill('#monedas-precio','150000');await boton('Previsualizar tarifa sin guardar');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar();await esperar("document.querySelector('.monedas-panel .success-message')?.textContent.includes('ARS 150.000,00')");
  assert.deepEqual(mutaciones(desde),[]);
 });
 await t.test('Monedas: BCRA explícito, tipo/fecha/hora ausente; error no reemplaza ni repite',async()=>{
  fase('monedas BCRA');await seleccionar('monedas-fuente','BCRA');const desde=requests.length;
  await evaluate('new Promise(r=>setTimeout(r,150))');assert.equal(mutaciones(desde).length,0);
  await boton('Consultar BCRA');await esperar("document.querySelector('.monedas-cotizacion')?.textContent.includes('BCRA_TIPO_COTIZACION')");
  assert.equal(await evaluate("document.querySelector('.monedas-cotizacion').textContent.includes('No informada por la fuente')"),true);
  fixture({falloBcraMonedas:true});await boton('Consultar BCRA');await esperar("document.querySelector('.monedas-panel .error')?.textContent.includes('no disponible')");
  assert.equal(await evaluate("Boolean(document.querySelector('.monedas-cotizacion'))"),false);
  await evaluate('new Promise(r=>setTimeout(r,200))');assert.equal(mutaciones(desde).filter(r=>r.ruta==='/monedas/consultar-bcra').length,2);fixture({falloBcraMonedas:false});
 });
 await t.test('Monedas: guardado ficticio confirmado, tarifa USD, revisión y vista original en Propiedades',async()=>{
  fase('monedas guardado aislado');fixture({monedasActivas:true,monedasEscritura:true,configMonedas:null,tarifasMonedas:[]});await recargar();await entrar();await manual('1500');
  await esperar("[...document.querySelectorAll('.monedas-panel button')].find(b=>b.textContent==='Guardar cotización').disabled===false");
  const desde=requests.length;await boton('Guardar cotización');await esperar("Boolean(document.querySelector('dialog[open]'))");await evaluate("(()=>{const b=[...document.querySelectorAll('dialog button')].find(x=>x.textContent==='Confirmar');b.click();b.click();})()");
  await esperar("document.querySelector('.monedas-panel .success-message')?.textContent.includes('guardada con autor')");assert.equal(mutaciones(desde).filter(r=>r.ruta==='/monedas/configuracion').length,1);
  await seleccionar('monedas-propiedad','1');await seleccionar('monedas-moneda','USD');await fill('#monedas-precio','100.25');await boton('Revisar y guardar tarifa');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar();await esperar("document.querySelector('.monedas-panel .success-message')?.textContent.includes('Tarifa declarada guardada')");
  assert.deepEqual(mutaciones(desde).map(r=>r.ruta),['/monedas/configuracion','/monedas/tarifas/1']);
  await boton('Propiedades','.sidebar-nav');await esperar("document.querySelector('.properties-page,.propiedades-page')?.textContent.includes('USD 100,25')");
 });
 await t.test('Monedas: avisos derivados sin duplicados y navegación protegida a Configuración',async()=>{
  fase('monedas avisos');fixture({avisoTarifaMonedas:true,monedasEscritura:false});await recargar();const desde=requests.length;
  await boton('Alertas','.sidebar-nav');await esperar("Boolean(document.querySelector('.monedas-aviso'))");assert.equal(await evaluate("document.querySelectorAll('.monedas-aviso').length"),1);
  await boton('Monedas y cotizaciones','.monedas-avisos');await esperar("Boolean(document.querySelector('#monedas-fuente'))");
  assert.equal(await evaluate("document.querySelector('.settings-nav button.is-active').textContent.includes('Monedas')"),true);assert.deepEqual(mutaciones(desde),[]);
 });
 for(const modo of ['conflicto','incierto'])await t.test(`Monedas: ${modo} conserva borrador y bloquea reenvío`,async()=>{
  fase(`monedas ${modo}`);fixture({rol:'Administrador',monedasEscritura:true,falloGuardadoMonedas:modo});await recargar();await entrar();await manual('1600');const desde=requests.length;
  await boton('Guardar cotización');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar();await esperar("document.querySelector('.monedas-panel .error')?.textContent.includes('Recargá')");
  assert.equal(await evaluate("document.querySelector('#monedas-valor').value"),'1600');assert.equal(await evaluate("[...document.querySelectorAll('.monedas-panel button')].find(b=>b.textContent==='Guardar cotización').disabled"),true);
  assert.equal(await evaluate("Boolean(document.querySelector('.monedas-panel .success-message'))"),false);await evaluate('new Promise(r=>setTimeout(r,200))');assert.equal(mutaciones(desde).length,1);fixture({falloGuardadoMonedas:''});
 });
 await t.test('Monedas: temas, 320 px, teclado y Operador sin configuración administrativa',async()=>{
  fase('monedas responsive');fixture({monedasEscritura:false});await recargar();await entrar();
  for(const tema of ['claro','oscuro','automatico']){await evaluate(`globalThis.HostFlowAppearance.setPreference(${JSON.stringify(tema)})`);await send('Emulation.setDeviceMetricsOverride',{width:320,height:640,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await capturar(`monedas-${tema}-320`);}
  await evaluate("document.querySelector('#monedas-fuente').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate("document.activeElement.closest('.monedas-panel')!==null"),true);
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});fixture({rol:'Operador'});await recargar();await boton('Configuración','.sidebar');await esperar("Boolean(document.querySelector('.settings-nav'))");
  assert.equal(await evaluate("document.querySelector('.settings-nav').textContent.includes('Monedas y cotizaciones')"),false);
  await boton('Propiedades','.sidebar-nav');await esperar("document.querySelector('.properties-page,.propiedades-page')?.textContent.includes('USD 100,25')");
 });
 fixture({monedasActivas:false,monedasEscritura:false,avisoTarifaMonedas:false,falloGuardadoMonedas:''});
}

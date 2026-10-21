import assert from 'node:assert/strict';
export async function probarPulidoUX({t,evaluate,send,fill,click,esperar,login,inicioVisible,fixture,requests,fase}){
 const boton=(nombre,raiz='.main')=>evaluate(`[...document.querySelectorAll(${JSON.stringify(raiz+' button')})].find(e=>e.textContent.trim()===${JSON.stringify(nombre)}).click()`);
 const recargar=async()=>{await evaluate('globalThis.__pulidoAnterior=true');await send('Page.reload');await esperar(`globalThis.__pulidoAnterior===undefined && (${inicioVisible})`);};
 const ir=async nombre=>{await boton(nombre,'.sidebar-nav');const selector={Inicio:'.main header h1',Propiedades:'.propiedades-page .section-header',Huéspedes:'.guest-search',Limpiezas:'.limpiezas-header',Reportes:'.reportes-header',Alertas:'.alertas-page-header'}[nombre];await esperar(`Boolean(document.querySelector('${selector}'))`);};
 const preparar=async()=>{fixture({rol:'Administrador',datosVisuales:true,jornadaMonetaria:true,escrituraJornada:false});await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});if(await evaluate("Boolean(document.querySelector('#login-email'))")){await login();await esperar(inicioVisible);}else await recargar();};
 await t.test('Pulido: descarte del aviso persiste tras F5 y Reportes conserva importes/CSV',async()=>{
  fase('pulido descarte');await preparar();await evaluate("localStorage.removeItem('hostflow:aviso-monetario:v1:1')");await recargar();await esperar("Boolean(document.querySelector('.monetary-notice'))");const desde=requests.length;
  await click('.notice-dismiss');await esperar("!document.querySelector('.monetary-notice')");await recargar();assert.equal(await evaluate("Boolean(document.querySelector('.monetary-notice'))"),false);
  await ir('Reportes');await esperar("Boolean(document.querySelector('.monedas-resumen summary'))");assert.equal(await evaluate("document.querySelector('.monedas-resumen').open"),false);
  await click('.monedas-resumen summary');assert.equal(await evaluate("document.querySelector('.monedas-resumen').open"),true);assert.equal(await evaluate("[...document.querySelectorAll('.monedas-resumen button')].some(e=>e.textContent.includes('CSV'))"),true);
  assert.equal(requests.slice(desde).filter(r=>!['GET','OPTIONS'].includes(r.method)&&!r.ruta.startsWith('/auth/')).length,0);
 });
 await t.test('Pulido: acciones de recarga dentro de sus cabeceras; Reportes y Alertas primero',async()=>{
  fase('pulido cabeceras');await preparar();
  for(const [nombre,selector]of [['Propiedades','.propiedades-page .section-header'],['Huéspedes','.huespedes-page .section-header'],['Limpiezas','.limpiezas-header'],['Alertas','.alertas-page-header']]){
   await ir(nombre);await esperar(`Boolean(document.querySelector('${selector} .page-actions'))`);assert.equal(await evaluate(`document.querySelector('${selector} .page-actions').querySelectorAll('button').length`),2);
  }
  await ir('Reportes');await esperar("Boolean(document.querySelector('.monedas-resumen'))");assert.equal(await evaluate("document.querySelector('.reportes-page').firstElementChild.className"),'reportes-header');
  await ir('Alertas');await esperar("Boolean(document.querySelector('.monedas-avisos'))");assert.equal(await evaluate("document.querySelector('.alertas-page').firstElementChild.classList.contains('alertas-page-header')"),true);
 });
 await t.test('Pulido: búsqueda visible por nombre/email/ID, vacío y limpiar, sin mutaciones',async()=>{
  fase('pulido busqueda');await preparar();await ir('Huéspedes');await esperar("Boolean(document.querySelector('#buscar-huesped'))");const desde=requests.length;
  for(const consulta of ['INTEGRACION   ficticia','visitante@example.invalid','60']){await fill('#buscar-huesped',consulta);await esperar("document.querySelectorAll('.huespedes-desktop-list tbody tr').length===1");}
  await fill('#buscar-huesped','no-existe');await esperar("document.querySelectorAll('.huespedes-desktop-list tbody tr').length===0");assert.equal(await evaluate("Boolean(document.querySelector('.guest-search-empty'))"),true);
  await boton('Limpiar búsqueda');await esperar("document.querySelectorAll('.huespedes-desktop-list tbody tr').length===1");
  assert.equal(requests.slice(desde).filter(r=>!['GET','OPTIONS'].includes(r.method)).length,0);
 });
 await t.test('Pulido: teclado del resumen y seis páginas móviles sin desbordamiento',async()=>{
  fase('pulido responsive');await preparar();await ir('Reportes');await esperar("Boolean(document.querySelector('.monedas-resumen summary'))");await evaluate("document.querySelector('.monedas-resumen summary').focus()");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await esperar("document.querySelector('.monedas-resumen').open");assert.equal(await evaluate("document.querySelector('.monedas-resumen').open"),true);
  for(const nombre of ['Inicio','Propiedades','Huéspedes','Limpiezas','Reportes','Alertas']){
   await ir(nombre);await send('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});await esperar('document.documentElement.scrollWidth<=innerWidth+1');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true,nombre);
   await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  }
 });
 fixture({jornadaMonetaria:false,monedasActivas:false,monedasEscritura:false});
 await click('.sidebar-logout');await esperar("Boolean(document.querySelector('#login-email'))");
}

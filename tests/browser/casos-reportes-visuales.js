import assert from 'node:assert/strict';
export async function probarReportesVisuales({t,evaluate,send,click,fill,esperar,login,inicioVisible,fixture,requests,fase,capturar}){
 const boton=(nombre,raiz='.main')=>evaluate(`[...document.querySelectorAll(${JSON.stringify(raiz+' button')})].find(b=>b.textContent.trim()===${JSON.stringify(nombre)}).click()`);
 const ir=nombre=>boton(nombre,'.sidebar-nav');
 const configurar=async()=>{await boton('Configuración','.sidebar');await esperar("Boolean(document.querySelector('.settings-nav'))");await boton('Monedas y cotizaciones','.settings-nav');await esperar("Boolean(document.querySelector('#monedas-fuente'))");};
 await t.test('Visual: gráficos con datos del contrato, detalle accesible y acuerdos sin sumar monedas',async()=>{
  fase('reportes visuales contrato');fixture({rol:'Administrador',datosVisuales:true,jornadaMonetaria:true,escrituraJornada:false});await login();await esperar(inicioVisible);await ir('Reportes');await esperar("document.querySelectorAll('.chart-trend svg').length===2");
  assert.equal(await evaluate("document.querySelectorAll('.reportes-secondary-grid .chart-distribution svg').length"),2);
  assert.equal(await evaluate("document.querySelector('.reportes-main-grid').textContent.includes('Un mes disponible')"),true);
  assert.equal(await evaluate("document.querySelector('.reportes-main-grid polyline')===null"),true,'Un solo mes no inventa una curva.');
  await click('.chart-data summary');assert.equal(await evaluate("document.querySelector('.chart-data').open"),true);
  await click('.monedas-resumen summary');await esperar("Boolean(document.querySelector('.monetary-count'))");
  assert.equal(await evaluate("document.querySelector('.monetary-visual-grid').textContent.includes('reservas con moneda declarada')"),true);
  await capturar('reportes-nuevos-graficos');
 });
 await t.test('Visual: cuatro tarjetas, guardado bloqueado y vista previa distinta de cotización guardada',async()=>{
  fase('monedas visuales lectura');await configurar();const desde=requests.length;
  assert.equal(await evaluate("document.querySelectorAll('.currency-card').length"),4);
  assert.equal(await evaluate("document.querySelector('.currency-card-action button').disabled"),true);
  assert.equal(await evaluate("document.querySelector('#quote-save-reason').textContent.includes('desactivada')"),true);
  const actual=await evaluate("document.querySelector('.currency-spotlight').textContent");
  await evaluate("(()=>{const e=document.querySelector('#monedas-fuente');e.value='MANUAL';e.dispatchEvent(new Event('change',{bubbles:true}));})()");await fill('#monedas-valor','1234.12345678');await boton('Confirmar vista previa manual');await esperar("Boolean(document.querySelector('dialog[open]'))");await boton('Confirmar','dialog[open]');await esperar("Boolean(document.querySelector('.currency-preview'))");
  assert.equal(await evaluate("document.querySelector('.currency-spotlight').textContent"),actual,'La vista previa no reemplaza la cotización guardada.');
  assert.equal(await evaluate("document.querySelector('.monedas-cotizacion').textContent.includes('1234.12345678')"),true);
  await fill('#monedas-importe','10');await boton('Calcular equivalencia');await esperar("Boolean(document.querySelector('.monedas-equivalencia'))");
  assert.equal(await evaluate("document.querySelector('.monedas-equivalencia').textContent.includes('ARS 12.341,23')"),true);
  assert.deepEqual(requests.slice(desde).filter(r=>!['GET','OPTIONS'].includes(r.method)),[]);
 });
 await t.test('Visual: tarjetas, gráficos y detalle monetario legibles a 320, 820 y 1440 px',async()=>{
  fase('reportes y monedas responsive');
  for(const width of [320,820,1440]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<701});
   assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true,`Monedas ${width}`);await capturar('monedas-tarjetas-'+width);
  }
  await ir('Reportes');if(await evaluate("Boolean(document.querySelector('dialog[open]'))")){await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent.includes('Descartar')).click()");}
  await esperar("Boolean(document.querySelector('.reportes-main-grid'))");await click('.monedas-resumen summary');
  for(const width of [320,820,1440]){await send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<701});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true,`Reportes ${width}`);await capturar('reportes-graficos-'+width);}
 });
 await t.test('Visual: período vacío sin series, porcentajes ni reservas inventadas',async()=>{
  fase('gráficos vacíos');fixture({datosVisuales:false,jornadaMonetaria:false,monedasActivas:false,monedasEscritura:false});await send('Page.reload');await esperar(inicioVisible);await ir('Reportes');await esperar("document.querySelectorAll('.chart-empty').length===5");
  assert.equal(await evaluate("document.querySelectorAll('.chart-trend svg,.chart-distribution svg,.chart-properties').length"),0);
  assert.equal(await evaluate("document.querySelector('.reportes-summary-grid').textContent.includes('0')"),true);await capturar('reportes-sin-datos');
 });
 await click('.sidebar-logout');await esperar("Boolean(document.querySelector('#login-email'))");fixture({jornadaMonetaria:false,monedasActivas:false,monedasEscritura:false});
}

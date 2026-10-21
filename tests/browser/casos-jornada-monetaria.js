import assert from 'node:assert/strict';
import {fechaNegocio} from '../../src/services/monedasCalculos.js';
export async function probarJornadaMonetaria({t,evaluate,send,click,fill,esperar,login,inicioVisible,fixture,fase,requests,capturar,snapshotJornada}){
 const boton=(texto,scope='.main')=>evaluate(`[...document.querySelectorAll(${JSON.stringify(scope+' button')})].find(b=>b.textContent.trim()===${JSON.stringify(texto)}&&b.getClientRects().length).click()`);
 const seleccionar=async(selector,value)=>{await esperar(`Boolean([...document.querySelector(${JSON.stringify(selector)})?.options||[]].find(o=>o.value===${JSON.stringify(value)}))`);return evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);};
 const recargar=async()=>{await evaluate('globalThis.__docJornada=true');await send('Page.reload');await esperar(`globalThis.__docJornada===undefined&&(${inicioVisible})`);};
 const ir=async texto=>{if(await evaluate('innerWidth<701'))await click('.mobile-menu-toggle');await boton(texto,await evaluate('innerWidth<701')?'.mobile-nav-list':'.sidebar');};
 const configuracion=async()=>{await ir('Configuración');await esperar("Boolean(document.querySelector('.settings-nav'))");await boton('Monedas y cotizaciones','.settings-nav');await esperar("Boolean(document.querySelector('#monedas-fuente'))");};
 const confirmar=(texto='Confirmar')=>boton(texto,'dialog[open]');
 const submit=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).form.requestSubmit()`);
 const mutaciones=desde=>requests.slice(desde).filter(r=>['POST','PUT','PATCH','DELETE'].includes(r.method));
 const fecha=dias=>new Date(Date.parse(fechaNegocio()+'T12:00:00Z')+dias*86400000).toISOString().slice(0,10);
 const abrirDetalle=async id=>{await evaluate(`document.querySelector('#reserva-${id} .detail-button').click()`);await esperar("Boolean(document.querySelector('.monedas-reserva'))");await esperar("!document.querySelector('.monedas-reserva').textContent.includes('Consultando acuerdo')");};
 const completarAlta=async()=>{
  await ir('Reservas');await esperar("Boolean(document.querySelector('.reservas-page'))");await boton('Nueva reserva');await seleccionar('#reserva-idPropiedad','50');await seleccionar('#reserva-idHuesped','60');
  for(const [campo,valor]of Object.entries({fechaIngreso:fecha(10),horaIngreso:'15:00',fechaEgreso:fecha(12),horaEgreso:'10:00',cantidadHuespedes:'1',montoEstimado:'0'}))await fill(`input[name=${campo}]`,valor);
  await seleccionar('#nuevo-acuerdo-moneda','ARS');await fill('#nuevo-acuerdo-importe','12345.67');
 };

 await t.test('Jornada: crear propiedad USD y tarifa juntas; edición de datos no ofrece un precio competidor',async()=>{
  fase('jornada propiedad');fixture({rol:'Administrador',datosVisuales:true,formularioRealPrueba:false,jornadaMonetaria:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});if(await evaluate("Boolean(document.querySelector('#login-email'))")){await login();await esperar(inicioVisible);}await recargar();await ir('Propiedades');await esperar("Boolean(document.querySelector('.propiedades-page'))");
  await boton('Nueva propiedad');for(const [name,value]of Object.entries({nombre:'Jornada USD',direccion:'Calle Ficticia 50',ciudad:'Ciudad Ficticia',provincia:'Provincia Ficticia',capacidadMaxima:'2',precioBase:'99.99'}))await fill(`input[name=${name}]`,value);
  await seleccionar('#propiedad-moneda','USD');const antes=requests.length;await submit('input[name=nombre]');await esperar("Boolean(document.querySelector('dialog[open]'))");await boton('Cancelar','dialog[open]');assert.equal(mutaciones(antes).length,0);
  await submit('input[name=nombre]');await esperar("Boolean(document.querySelector('dialog[open]'))");await evaluate("(()=>{const b=[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Confirmar');b.click();b.click();})()");
  await esperar("document.querySelector('.main').textContent.includes('Propiedad y tarifa registradas correctamente')");assert.equal(mutaciones(antes).filter(r=>r.ruta==='/monedas/propiedades').length,1);assert.equal(snapshotJornada().propiedades.find(p=>p.idPropiedad===50).monedaBase,'USD');
  await evaluate("[...document.querySelectorAll('.property-card')].find(c=>c.textContent.includes('Jornada USD')).querySelector('.secondary-button').click()");
  await esperar("Boolean(document.querySelector('input[name=precioBase]'))");assert.equal(await evaluate("document.querySelector('input[name=precioBase]').disabled"),true);assert.equal(await evaluate("document.querySelector('input[name=precioBase]').value"),'99.99');
  await fill('input[name=nombre]','Jornada USD revisada');const meta=requests.length;await submit('input[name=nombre]');await esperar("document.querySelector('.main').textContent.includes('Propiedad modificada correctamente')");
  assert.equal(Object.hasOwn(mutaciones(meta).find(r=>r.ruta==='/propiedades/50').body,'precioBase'),false);
  await configuracion();await seleccionar('#monedas-propiedad','50');await fill('#monedas-precio','100.25');await boton('Revisar y guardar tarifa');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar();await esperar("document.querySelector('.success-message')?.textContent.includes('Tarifa declarada guardada')");
  await ir('Propiedades');await esperar("document.querySelector('.main').textContent.includes('USD 100,25')");assert.equal(await evaluate("document.querySelector('.main').textContent.includes('USD 99,99')"),false);
 });
 await t.test('Jornada: alta manual con acuerdo explícito y estimado separado; confirmación cancelable y un único POST',async()=>{
  fase('jornada reserva con acuerdo');await ir('Reservas');await esperar("Boolean(document.querySelector('.reservas-page'))");await boton('Nueva reserva');await esperar("Boolean(document.querySelector('#reserva-idPropiedad option[value=\"50\"]'))");
  await seleccionar('#reserva-idPropiedad','50');await seleccionar('#reserva-idHuesped','60');
  for(const [campo,valor]of Object.entries({fechaIngreso:fecha(0),horaIngreso:'15:00',fechaEgreso:fecha(2),horaEgreso:'10:00',cantidadHuespedes:'1',montoEstimado:'0'}))await fill(`input[name=${campo}]`,valor);
  await seleccionar('#nuevo-acuerdo-moneda','USD');await fill('#nuevo-acuerdo-importe','200.50');await click('.monedas-formulario-acuerdo input[type=checkbox]');await seleccionar('#nuevo-acuerdo-fuente','BCRA');
  const antes=requests.length;await submit('input[name=fechaIngreso]');await esperar("Boolean(document.querySelector('dialog[open]'))");await boton('Cancelar','dialog[open]');assert.equal(mutaciones(antes).length,0);
  await submit('input[name=fechaIngreso]');await esperar("Boolean(document.querySelector('dialog[open]'))");await evaluate("(()=>{const b=[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Confirmar operación');b.click();b.click();})()");
  await esperar("!document.querySelector('#nuevo-acuerdo-moneda')");const altas=mutaciones(antes).filter(r=>r.ruta==='/reservas');assert.equal(altas.length,1);assert.equal(altas[0].body.montoEstimado,0);assert.equal(altas[0].body.acuerdoMonetario.importe,'200.50');assert.equal('canal'in altas[0].body,false);
  assert.equal(snapshotJornada().acuerdos.find(a=>a.idReserva===70).estadoFijacion,'PENDIENTE');
  await evaluate("document.querySelector('#reserva-70 .edit-button').click()");await esperar("Boolean(document.querySelector('input[name=fechaEgreso]'))");await fill('input[name=fechaEgreso]',fecha(3));await submit('input[name=fechaEgreso]');await esperar("!document.querySelector('input[name=fechaEgreso]')");
  assert.equal(snapshotJornada().acuerdos.find(a=>a.idReserva===70).importe,'200.50');
 });
 await t.test('Jornada: consulta explícita, Escape solo cierra confirmación y fijación única conserva USD original',async()=>{
  fase('jornada fijacion');fixture({lecturaAcuerdoTardiaJornada:true});await evaluate("document.querySelector('#reserva-70 .detail-button').click()");await esperar("Boolean(document.querySelector('.monedas-reserva'))");
  await boton('Recargar acuerdo','.monedas-reserva');await esperar("document.querySelector('.monedas-reserva').textContent.includes('USD 200,50')");await evaluate('new Promise(r=>setTimeout(r,450))');assert.equal(await evaluate("Boolean(document.querySelector('.monedas-reserva .error'))"),false,'Una lectura anterior tardía no reemplaza ni invalida la recarga vigente.');const antes=requests.length;
  assert.equal(await evaluate("document.querySelector('.monedas-reserva').textContent.includes('USD 200,50')"),true);assert.equal(mutaciones(antes).length,0);
  await boton('Consultar BCRA para este acuerdo','.monedas-reserva');await esperar("Boolean(document.querySelector('.monedas-estimacion'))");assert.equal(await evaluate("document.querySelector('.monedas-estimacion').textContent.includes('ARS 250.625,00')"),true);
  await boton('Fijar cotización de check-in','.monedas-reserva');await esperar("Boolean(document.querySelector('dialog[open]'))");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await esperar("!document.querySelector('dialog[open]')");assert.equal(await evaluate("Boolean(document.querySelector('.reservation-detail-modal'))"),true);
  await boton('Fijar cotización de check-in','.monedas-reserva');await esperar("Boolean(document.querySelector('dialog[open]'))");const inicio=requests.length;await evaluate("(()=>{const b=[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Confirmar');b.click();b.click();})()");
  await esperar("document.querySelector('.monedas-reserva').textContent.includes('FIJADA')");assert.equal(mutaciones(inicio).filter(r=>r.ruta.endsWith('/fijacion')).length,1);
  const a=snapshotJornada().acuerdos.find(a=>a.idReserva===70);assert.equal(a.moneda,'USD');assert.equal(a.importe,'200.50');assert.equal(a.equivalenteARS,'250625.00');assert.equal(snapshotJornada().reservas.find(r=>r.idReserva===70).montoEstimado,0);
  await capturar('jornada-acuerdo-fijado');await click('.reservation-detail-close');await esperar("!document.querySelector('.reservation-detail-modal')");
  await evaluate("document.querySelector('#reserva-70 .edit-button').click()");await esperar("Boolean(document.querySelector('input[name=fechaIngreso]'))");assert.equal(await evaluate("document.querySelector('input[name=fechaIngreso]').disabled"),true);await fill('input[name=fechaEgreso]',fecha(4));await submit('input[name=fechaEgreso]');await esperar("!document.querySelector('input[name=fechaIngreso]')");assert.equal(snapshotJornada().acuerdos.find(a=>a.idReserva===70).versionRegistro,a.versionRegistro);
 });
 await t.test('Jornada: declaración legacy explícita, reportes por moneda y avisos derivados sin cambiar precios',async()=>{
  fase('jornada resumen y alertas');await abrirDetalle(69);await boton('Declarar acuerdo explícito','.monedas-reserva');await seleccionar('#revisar-acuerdo-moneda','ARS');await fill('#revisar-acuerdo-importe','150000');await boton('Revisar y confirmar acuerdo','.monedas-reserva');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar();await esperar("document.querySelector('.monedas-reserva').textContent.includes('ARS 150.000,00')");await click('.reservation-detail-close');
  await ir('Reportes');await esperar("document.querySelector('.monedas-resumen')?.textContent.includes('ARS 150.000,00')");assert.equal(await evaluate("document.querySelector('.monedas-resumen').textContent.includes('USD 200,50')"),true);assert.equal(await evaluate("document.querySelector('.monedas-resumen').textContent.includes('1 reservas sin moneda')"),true);
  assert.equal(await evaluate("Boolean(document.querySelector('.reportes-summary-grid,.reportes-grid,.reportes-page'))"),true);await capturar('jornada-reportes-por-moneda');
  await configuracion();await seleccionar('#monedas-propiedad','1');await seleccionar('#monedas-moneda','ARS');await fill('#monedas-precio','150000');await boton('Revisar y guardar tarifa');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar();await esperar("document.querySelector('.success-message')?.textContent.includes('Tarifa declarada guardada')");
  await boton('Consultar BCRA');await esperar("document.querySelector('.monedas-cotizacion')?.textContent.includes('1250.00000000')");await boton('Guardar cotización');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar();await esperar("document.querySelector('.success-message')?.textContent.includes('Cotización guardada')");
  const precio=snapshotJornada().tarifas.find(t=>t.idPropiedad===1).precio;await ir('Alertas');await esperar("Boolean(document.querySelector('.monedas-aviso'))");assert.equal(await evaluate("document.querySelectorAll('.monedas-aviso').length"),1);assert.equal(await evaluate("document.querySelector('.monedas-aviso').textContent.includes('-20.00')"),true);assert.equal(snapshotJornada().tarifas.find(t=>t.idPropiedad===1).precio,precio);
  await boton('Monedas y cotizaciones','.monedas-avisos');await esperar("Boolean(document.querySelector('#monedas-fuente'))");
 });
 await t.test('Jornada: FlowIA reutiliza el aviso calculado y navega a su revisión sin cambiar precios',async()=>{
  fase('jornada aviso en FlowIA');const antes=requests.length;
  await boton('FlowIA','.sidebar');await esperar("Boolean(document.querySelector('[data-flowia-panel] .monedas-aviso'))");
  assert.equal(await evaluate("document.querySelectorAll('[data-flowia-panel] .monedas-aviso').length"),1);
  assert.equal(await evaluate("document.querySelector('[data-flowia-panel] .monedas-aviso').textContent.includes('BCRA')"),true);
  await boton('Monedas y cotizaciones','[data-flowia-panel] .monedas-avisos');await esperar("!document.querySelector('[data-flowia-panel]')&&Boolean(document.querySelector('#monedas-fuente'))");
  assert.equal(mutaciones(antes).length,0);assert.equal(snapshotJornada().tarifas.find(t=>t.idPropiedad===1).precio,'150000.00');
 });
 for(const modo of ['conflicto','incierto','incompleto'])await t.test(`Jornada: ${modo} en acuerdo conserva borrador y bloquea reenvío`,async()=>{
  fase('jornada acuerdo '+modo);fixture({falloAcuerdoJornada:modo});await recargar();await ir('Reservas');await esperar("Boolean(document.querySelector('#reserva-69'))");await abrirDetalle(69);await boton('Revisar acuerdo','.monedas-reserva');await fill('#revisar-acuerdo-importe',modo==='conflicto'?'150001.00':modo==='incierto'?'150002.00':'150003.00');
  await boton('Revisar y confirmar acuerdo','.monedas-reserva');await esperar("Boolean(document.querySelector('dialog[open]'))");const inicio=requests.length;await confirmar();await esperar("document.querySelector('.monedas-reserva').textContent.includes('Recargá')");assert.equal(await evaluate("document.querySelector('#revisar-acuerdo-importe').matches(':disabled')"),true,'Un fieldset deshabilitado contiene el borrador pero impide editarlo o reenviarlo.');assert.equal(await evaluate("Boolean(document.querySelector('.monedas-reserva .success-message'))"),false);
  await evaluate('new Promise(r=>setTimeout(r,150))');assert.equal(mutaciones(inicio).filter(r=>r.ruta.endsWith('/acuerdo')).length,1);fixture({falloAcuerdoJornada:''});
 });
 await t.test('Jornada: alta con confirmación incompleta conserva formulario, bloquea reenvío y no anuncia éxito',async()=>{
  fase('jornada alta incompleta');fixture({falloAltaJornada:'incompleto'});await recargar();await completarAlta();const antes=requests.length;
  await submit('input[name=fechaIngreso]');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar('Confirmar operación');await esperar("document.querySelector('.main').textContent.includes('No se recibió confirmación completa')");
  assert.equal(await evaluate("document.querySelector('#nuevo-acuerdo-importe').value"),'12345.67');assert.equal(await evaluate("document.querySelector('.main').textContent.includes('Reserva registrada correctamente')"),false);
  await submit('input[name=fechaIngreso]');await evaluate('new Promise(r=>setTimeout(r,100))');assert.equal(mutaciones(antes).filter(r=>r.ruta==='/reservas').length,1);fixture({falloAltaJornada:''});await recargar();
 });
 await t.test('Jornada: cancelación conserva snapshot e historial tras recarga; lectura, móvil y Operador',async()=>{
  fase('jornada cierre');await recargar();await ir('Reservas');await esperar("Boolean(document.querySelector('#reserva-70 .cancel-button'))");await evaluate("document.querySelector('#reserva-70 .cancel-button').click()");await esperar("document.querySelector('#reserva-70').textContent.includes('Cancelada')");
  const a=snapshotJornada().acuerdos.find(a=>a.idReserva===70),eventos=snapshotJornada().eventos.find(([id])=>id===70)[1];assert.equal(a.estadoFijacion,'FIJADA');assert.equal(eventos.filter(e=>e.tipo==='RESERVA_CANCELADA').length,1);assert.equal(eventos.filter(e=>e.tipo==='RESERVA_CREADA').length,1);
  fixture({escrituraJornada:false});await recargar();await ir('Reservas');await esperar("Boolean(document.querySelector('#reserva-70'))");await abrirDetalle(70);assert.equal(await evaluate("document.querySelector('.monedas-reserva').textContent.includes('FIJADA')"),true);assert.equal(await evaluate("[...document.querySelectorAll('.monedas-reserva button')].some(b=>b.textContent.includes('Fijar cotización'))"),false);
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:700,deviceScaleFactor:1,mobile:true});await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await capturar('jornada-reserva-cancelada-movil');await click('.reservation-detail-close');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});fixture({rol:'Operador'});await recargar();await ir('Reservas');await esperar("Boolean(document.querySelector('#reserva-70'))");const inicio=requests.length;await evaluate("document.querySelector('#reserva-70 .detail-button').click()");await esperar("Boolean(document.querySelector('.reservation-detail-modal'))");assert.equal(await evaluate("Boolean(document.querySelector('.monedas-reserva'))"),false);assert.equal(requests.slice(inicio).some(r=>r.ruta.startsWith('/monedas/reservas/')),false);
  await click('.reservation-detail-close');fixture({escrituraJornada:true});await recargar();await completarAlta();const antes=requests.length;
  await submit('input[name=fechaIngreso]');await esperar("Boolean(document.querySelector('dialog[open]'))");await confirmar('Confirmar operación');await esperar("document.querySelector('.main').textContent.includes('Reserva registrada correctamente')");assert.equal(mutaciones(antes).filter(r=>r.ruta==='/reservas').length,1);
  fixture({jornadaMonetaria:false});
 });
}

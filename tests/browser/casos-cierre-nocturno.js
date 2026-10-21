import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';

// El interceptor envía estas rutas a Express/controladores/servicios/repositorios
// reales, con driver ficticio. No conecta a SQL ni al backend del usuario.
export async function probarCierreNocturno({t,evaluate,send,click,fill,esperar,login,inicioVisible,fixture,fase,requests,activarApiUniversitaria,capturar,denegarDescargas}){
 const ruta=new URL('../../../backend/tests/helpers/operacionUniversitariaAislada.js',import.meta.url);
 if(!existsSync(ruta))return; // El checkout independiente frontend conserva sus casos habituales.
 const {default:modulo}=await import(ruta.href),real=await activarApiUniversitaria(modulo.crearApiUniversitaria);
 const boton=(texto,scope='.main')=>evaluate(`[...document.querySelectorAll(${JSON.stringify(scope+' button')})].find(b=>b.textContent.trim()===${JSON.stringify(texto)}&&b.getClientRects().length).click()`);
 const ir=async texto=>{if(await evaluate('innerWidth<701'))await click('.mobile-menu-toggle');await boton(texto,await evaluate('innerWidth<701')?'.mobile-nav-list':'.sidebar');};
 const recargar=async()=>{await evaluate('globalThis.__nocturnoDoc=true');await send('Page.reload');await esperar(`globalThis.__nocturnoDoc===undefined&&(${inicioVisible})`);};
 const seleccionar=async(selector,valor)=>{await esperar(`Boolean(document.querySelector(${JSON.stringify(selector+' option[value="'+valor+'"]')}))`);await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(String(valor))};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);};
 const submit=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).form.requestSubmit()`);
 const fecha=n=>new Date(Date.parse(real.h.hoy+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
 let propiedad,huesped,reserva,reservaRevisada;
 await t.test('Recorrido real aislado: crear propiedad y huésped, bloquear doble envío y conservar tras F5',async()=>{
  fase('nocturno altas reales aisladas');fixture({rol:'Administrador',datosVisuales:true,jornadaMonetaria:false,formularioRealPrueba:false,monedasPrueba:false});
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  if(await evaluate("Boolean(document.querySelector('#login-email'))")){await login();await esperar(inicioVisible);}await recargar();await ir('Propiedades');await esperar("Boolean(document.querySelector('.propiedades-page'))");
  await boton('Nueva propiedad');for(const [name,value]of Object.entries({nombre:'Recorrido nocturno ficticio',direccion:'Ficticia 101',ciudad:'Ficticia',provincia:'Ficticia',capacidadMaxima:'2',precioBase:'10'}))await fill(`input[name=${name}]`,value);
  await submit('input[name=nombre]');await esperar("document.querySelector('.main').textContent.includes('Propiedad registrada; precio histórico sin moneda declarada.')");propiedad=[...real.h.propiedades.values()].find(p=>p.nombre==='Recorrido nocturno ficticio').idPropiedad;
  await ir('Huéspedes');await esperar("Boolean(document.querySelector('.huespedes-page'))");await boton('Agregar huésped manual');
  for(const [name,value]of Object.entries({nombre:'Persona nocturna',apellido:'Ficticia',email:'persona-nocturna-ui@example.invalid'}))await fill('#huesped-'+name,value);
  real.h.hooks.huespedCrear=()=>new Promise(r=>setTimeout(r,250));const antes=requests.length;
  await evaluate("(()=>{const f=document.querySelector('#huesped-nombre').form;f.requestSubmit();f.requestSubmit();})()");
  await esperar("document.querySelector('.huespedes-page .success-message')?.textContent.includes('registrado correctamente')");
  assert.equal(requests.slice(antes).filter(r=>r.method==='POST'&&r.ruta==='/huespedes').length,1);delete real.h.hooks.huespedCrear;
  huesped=[...real.h.huespedes.values()].find(g=>g.email==='persona-nocturna-ui@example.invalid').idHuesped;
  await recargar();await ir('Huéspedes');await esperar("document.querySelector('.huespedes-page')?.textContent.includes('persona-nocturna-ui@example.invalid')");
 });
 await t.test('Recorrido real aislado: borrador de huésped, edición y alta manual con los catálogos reales',async()=>{
  fase('nocturno huésped y reserva');await evaluate("[...document.querySelectorAll('tr')].find(r=>r.textContent.includes('persona-nocturna-ui@example.invalid')).querySelectorAll('button')[1].click()");await esperar("Boolean(document.querySelector('#huesped-nombre'))");
  await fill('#huesped-nombre','Persona revisada');await ir('Reservas');await esperar("Boolean(document.querySelector('dialog[open]'))");await boton('Seguir editando','dialog[open]');assert.equal(await evaluate("document.querySelector('#huesped-nombre').value"),'Persona revisada');
  await submit('#huesped-nombre');await esperar("!document.querySelector('#huesped-nombre')");await ir('Reservas');await esperar("Boolean(document.querySelector('.reservas-page'))");await boton('Nueva reserva');
  await seleccionar('#reserva-idPropiedad',propiedad);await seleccionar('#reserva-idHuesped',huesped);
  for(const [name,value]of Object.entries({fechaIngreso:fecha(1),horaIngreso:'15:00',fechaEgreso:fecha(3),horaEgreso:'10:00',cantidadHuespedes:'1',montoEstimado:'0'}))await fill(`input[name=${name}]`,value);
  await submit('input[name=fechaIngreso]');await esperar("document.querySelector('.reservas-page .success-message')?.textContent.includes('registrada correctamente')");reserva=[...real.h.filas.values()].find(r=>r.idPropiedad===propiedad).idReserva;
  assert.equal((await real.pedir(`/reservas/${reserva}`)).data.reserva.huesped,'Persona revisada Ficticia');assert.equal(real.h.eventos.length,1);
 });
 await t.test('Recorrido real aislado: calendario, edición, historial obligatorio, cancelación y F5 sin duplicados',async()=>{
  fase('nocturno calendario y cierre');await ir('Calendario');await esperar("document.querySelector('.main').textContent.includes('Recorrido nocturno ficticio')");
  const cal=await real.pedir(`/calendario?anio=${fecha(1).slice(0,4)}&mes=${Number(fecha(1).slice(5,7))}&idPropiedad=${propiedad}`);assert.equal(cal.data.resumen.cantidadReservas,1);
  await ir('Reservas');await esperar(`Boolean(document.querySelector('#reserva-${reserva}'))`);await click(`#reserva-${reserva} .edit-button`);await esperar("Boolean(document.querySelector('input[name=fechaEgreso]'))");await fill('input[name=fechaEgreso]',fecha(4));await submit('input[name=fechaEgreso]');await esperar("!document.querySelector('input[name=fechaEgreso]')");
  await recargar();await ir('Reservas');await esperar(`Boolean(document.querySelector('#reserva-${reserva}'))`);await click(`#reserva-${reserva} .detail-button`);await esperar("document.querySelector('.reservation-detail-modal')?.textContent.includes('Reserva modificada')");await click('.reservation-detail-close');
  await click(`#reserva-${reserva} .cancel-button`);await esperar(`document.querySelector('#reserva-${reserva}')?.textContent.includes('Cancelada')`);await recargar();await ir('Reservas');await esperar(`document.querySelector('#reserva-${reserva}')?.textContent.includes('Cancelada')`);
  assert.equal(real.h.filas.size,1);assert.deepEqual(real.h.eventos.map(e=>e.tipo),['RESERVA_CREADA','RESERVA_MODIFICADA','RESERVA_CANCELADA']);await capturar('recorrido-nocturno-cancelado');
 });
 await t.test('Respuesta incompleta tras guardar huésped: no anuncia éxito ni reenvía; F5 recupera el registro confirmado',async()=>{
  fase('nocturno respuesta perdida huésped');await ir('Huéspedes');await esperar("Boolean(document.querySelector('.huespedes-page'))");await boton('Agregar huésped manual');
  for(const [name,value]of Object.entries({nombre:'Respuesta',apellido:'Parcial',email:'parcial@example.invalid'}))await fill('#huesped-'+name,value);
  real.transformar=({method,ruta,respuesta})=>method==='POST'&&ruta==='/huespedes'?[respuesta.status,{mensaje:'Respuesta incompleta ficticia'}]:[respuesta.status,respuesta.data];
  const antes=requests.length;await submit('#huesped-nombre');await esperar("document.querySelector('.huespedes-page .error')?.textContent.includes('Recargá')");
  assert.equal(await evaluate("Boolean(document.querySelector('.huespedes-page .success-message'))"),false);await submit('#huesped-nombre');await evaluate('new Promise(r=>setTimeout(r,80))');assert.equal(requests.slice(antes).filter(r=>r.method==='POST').length,1);
  delete real.transformar;await recargar();await ir('Huéspedes');await esperar("document.querySelector('.huespedes-page')?.textContent.includes('parcial@example.invalid')");assert.equal([...real.h.huespedes.values()].filter(g=>g.email==='parcial@example.invalid').length,1);
 });
 await t.test('Respuesta incompleta de propiedad: conserva formulario, bloquea reenvío y recupera la fila tras F5',async()=>{
  fase('nocturno respuesta perdida propiedad');await ir('Propiedades');await esperar("Boolean(document.querySelector('.propiedades-page'))");await boton('Nueva propiedad');
  for(const [name,value]of Object.entries({nombre:'Propiedad respuesta parcial',direccion:'Ficticia 202',ciudad:'Ficticia',provincia:'Ficticia',capacidadMaxima:'2',precioBase:'10'}))await fill(`input[name=${name}]`,value);
  real.transformar=({method,ruta,respuesta})=>method==='POST'&&ruta==='/propiedades'?[respuesta.status,{mensaje:'Respuesta incompleta ficticia'}]:[respuesta.status,respuesta.data];
  const antes=requests.length;await submit('input[name=nombre]');await esperar("document.querySelector('.propiedades-page .error')?.textContent.includes('Recargá')");assert.equal(await evaluate("document.querySelector('input[name=nombre]').value"),'Propiedad respuesta parcial');assert.equal(await evaluate("Boolean(document.querySelector('.propiedades-page .success-message'))"),false);
  await submit('input[name=nombre]');await evaluate('new Promise(r=>setTimeout(r,80))');assert.equal(requests.slice(antes).filter(r=>r.method==='POST').length,1);delete real.transformar;await recargar();await ir('Propiedades');await esperar("document.querySelector('.main').textContent.includes('Propiedad respuesta parcial')");assert.equal([...real.h.propiedades.values()].filter(p=>p.nombre==='Propiedad respuesta parcial').length,1);
 });
 await t.test('Reportes reales aislados: una consulta anterior tardía no reemplaza los filtros vigentes',async()=>{
  fase('nocturno reportes concurrentes');await ir('Reportes');await esperar("Boolean(document.querySelector('.reportes-summary-grid'))");await boton('Filtros');
  real.transformar=async({ruta,params,respuesta})=>{if(ruta==='/dashboard/reportes'&&params.get('estado')==='Confirmada')await new Promise(r=>setTimeout(r,500));return [respuesta.status,respuesta.data];};
  await seleccionar('select[name=estado]','Confirmada');await boton('Aplicar filtros');await esperar("document.querySelector('.reportes-refresh-compact')?.disabled===true");
  if(!await evaluate("Boolean(document.querySelector('select[name=estado]'))"))await click('.reportes-filter-toggle');await seleccionar('select[name=estado]','Cancelada');await boton('Aplicar filtros');
  await esperar("[...document.querySelectorAll('.reportes-breakdown-row strong')].some(e=>e.textContent.trim()==='Cancelada')");await evaluate('new Promise(r=>setTimeout(r,650))');
  assert.equal(await evaluate("[...document.querySelectorAll('.reportes-breakdown-row strong')].some(e=>e.textContent.trim()==='Cancelada')"),true,'Los datos deben corresponder al estado aplicado, no a la petición anterior');delete real.transformar;
 });
 await t.test('Exportaciones CSV y Excel conservan filtros, estado y cantidades del reporte real aislado',async()=>{
  fase('nocturno exportaciones coherentes');await denegarDescargas();
  await evaluate("globalThis.__blobNocturnoOriginal=URL.createObjectURL;globalThis.__exportadoNocturno=null;URL.createObjectURL=function(b){b.text().then(texto=>globalThis.__exportadoNocturno={texto,tipo:b.type});return globalThis.__blobNocturnoOriginal.call(URL,b);};");
  try{for(const formato of ['csv','excel']){
   await evaluate('globalThis.__exportadoNocturno=null');await click('.reportes-generate-button');await esperar("Boolean(document.querySelector('.reportes-export-modal'))");await click(`input[name=formatoExportacion][value=${formato}]`);await click('.reportes-export-confirm');await esperar('Boolean(globalThis.__exportadoNocturno)');
   const r=await evaluate('globalThis.__exportadoNocturno');assert.ok(r.texto.includes('Estado: Cancelada'));assert.ok(r.texto.includes('Cancelada'));assert.ok(r.texto.includes(formato==='csv'?'Cancelada;1;100%':'<td>Cancelada</td>'));assert.ok(!r.texto.includes('USD 0')&&!r.texto.includes('ARS 0'),'No reinterpreta importes históricos sin moneda');
  }}finally{await evaluate('URL.createObjectURL=globalThis.__blobNocturnoOriginal;delete globalThis.__blobNocturnoOriginal;delete globalThis.__exportadoNocturno;');}
 });
 await t.test('Limpiezas reales aisladas: doble clic envía un PATCH; incertidumbre exige recarga sin reenvíos',async()=>{
  fase('nocturno limpieza y acuse');real.h.limpiezas.set(201,{idTareaLimpieza:201,idPropiedad:propiedad,propiedad:'Recorrido nocturno ficticio',idReservaSalida:reserva,huespedReservaSalida:'Persona revisada Ficticia',canalReservaSalida:'Manual',fechaInicio:fecha(4),horaInicio:'10:00',estado:'Pendiente',origen:'Sistema'});
  await ir('Limpiezas');await esperar("Boolean(document.querySelector('.limpiezas-action-button'))");real.h.hooks.limpiezaActualizar=()=>new Promise(r=>setTimeout(r,200));const antes=requests.length;
  await evaluate("(()=>{const b=document.querySelector('.limpiezas-action-button');b.click();b.click();})()");await esperar("document.querySelector('.limpiezas-table')?.textContent.includes('En progreso')");assert.equal(requests.slice(antes).filter(r=>r.method==='PATCH').length,1);delete real.h.hooks.limpiezaActualizar;
  real.h.acusePerdido=true;const previas=requests.length;await click('.limpiezas-action-button');await esperar("document.querySelector('.limpiezas-page')?.textContent.includes('Recargá los datos antes de reintentar')");assert.equal(await evaluate("Boolean(document.querySelector('.limpiezas-message--success'))"),false);
  assert.equal(await evaluate("document.querySelector('.limpiezas-action-button').disabled"),true);assert.equal(real.h.limpiezas.get(201).estado,'Completada');real.h.acusePerdido=false;await recargar();await ir('Limpiezas');await esperar("document.querySelector('.limpiezas-table')?.textContent.includes('Completada')");assert.equal(requests.slice(previas).filter(r=>r.method==='PATCH').length,1);
 });
 await t.test('Operador móvil oscuro: busca huésped real aislado, formulario accesible y rechazo backend sin escrituras',async()=>{
  fase('nocturno operador móvil');fixture({rol:'Operador'});await send('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});await recargar();await ir('Huéspedes');await esperar("Boolean(document.querySelector('#buscar-huesped'))");await evaluate("document.documentElement.dataset.theme='dark'");await fill('#buscar-huesped','persona revisada');
  assert.equal(await evaluate("document.querySelectorAll('.huesped-mobile-card').length"),1);await evaluate("[...document.querySelectorAll('.huesped-mobile-card button')].find(b=>b.textContent.trim()==='Editar').click()");await esperar("Boolean(document.querySelector('#huesped-nombre'))");
  assert.equal(await evaluate("[...document.querySelectorAll('.huespedes-page form input')].every(i=>i.labels?.length>0)"),true);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);await evaluate("document.querySelector('#huesped-nombre').focus()");assert.equal(await evaluate('document.activeElement.id'),'huesped-nombre');await capturar('huesped-formulario-movil-oscuro');
  const antes=real.h.consultas.length,r=await real.pedir(`/reservas/${reserva}/cancelar`,'PATCH',{},'Operador');assert.equal(r.status,403);assert.equal(real.h.consultas.length,antes,'Permiso rechazado antes de SQL');
  // reservas.importes controla la edición; el monto legacy conserva su lectura
  // histórica. reportes.economia sí exige proyección operativa sin agregados.
  const reporte=await real.pedir('/dashboard/reportes?periodo=6','GET',undefined,'Operador');assert.equal(reporte.status,200);assert.equal(Object.hasOwn(reporte.data.reportes.resumen,'ingresosEstimados'),false);
 });
 await t.test('Alta legacy con respuesta incompleta no confirma éxito; F5 recupera una sola reserva e historial',async()=>{
  fase('nocturno alta legacy incompleta');fixture({rol:'Administrador'});await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await recargar();await ir('Reservas');await esperar("Boolean(document.querySelector('.reservas-page'))");await boton('Nueva reserva');await seleccionar('#reserva-idPropiedad',propiedad);await seleccionar('#reserva-idHuesped',huesped);
  for(const [name,value]of Object.entries({fechaIngreso:fecha(10),horaIngreso:'15:00',fechaEgreso:fecha(12),horaEgreso:'10:00',cantidadHuespedes:'1',montoEstimado:'0'}))await fill(`input[name=${name}]`,value);
  real.transformar=({method,ruta,respuesta})=>method==='POST'&&ruta==='/reservas'?[respuesta.status,{mensaje:'Respuesta incompleta ficticia'}]:[respuesta.status,respuesta.data];const antes=requests.length;await submit('input[name=fechaIngreso]');await esperar("document.querySelector('.reservas-page .error')?.textContent.includes('Recargá')");assert.equal(await evaluate("Boolean(document.querySelector('.reservas-page .success-message'))"),false);await submit('input[name=fechaIngreso]');await evaluate('new Promise(r=>setTimeout(r,80))');assert.equal(requests.slice(antes).filter(r=>r.method==='POST'&&r.ruta==='/reservas').length,1);
  delete real.transformar;reservaRevisada=[...real.h.filas.values()].find(r=>r.fechaIngreso===fecha(10)).idReserva;await recargar();await ir('Reservas');await esperar(`Boolean(document.querySelector('#reserva-${reservaRevisada}'))`);assert.equal(real.h.eventos.filter(e=>e.idReserva===reservaRevisada).length,1);
 });
 await t.test('Edición y cancelación manuales no duplican envíos ni historial ante doble clic',async()=>{
  fase('nocturno doble edición y cancelación');await click(`#reserva-${reservaRevisada} .edit-button`);await esperar("Boolean(document.querySelector('input[name=fechaEgreso]'))");await fill('input[name=fechaEgreso]',fecha(13));real.h.hooks.editar=()=>new Promise(r=>setTimeout(r,200));let antes=requests.length;
  await evaluate("(()=>{const f=document.querySelector('input[name=fechaEgreso]').form;f.requestSubmit();f.requestSubmit();})()");await esperar("!document.querySelector('input[name=fechaEgreso]')");assert.equal(requests.slice(antes).filter(r=>r.method==='PUT').length,1);delete real.h.hooks.editar;
  real.h.hooks.cancelar=()=>new Promise(r=>setTimeout(r,200));antes=requests.length;await evaluate(`(()=>{const b=document.querySelector('#reserva-${reservaRevisada} .cancel-button');b.click();b.click();})()`);await esperar(`document.querySelector('#reserva-${reservaRevisada}')?.textContent.includes('Cancelada')`);assert.equal(requests.slice(antes).filter(r=>r.method==='PATCH').length,1);delete real.h.hooks.cancelar;assert.deepEqual(real.h.eventos.filter(e=>e.idReserva===reservaRevisada).map(e=>e.tipo),['RESERVA_CREADA','RESERVA_MODIFICADA','RESERVA_CANCELADA']);
 });
 await t.test('CSV/Excel: un nombre real del catálogo que empieza con = se exporta como texto',async()=>{
  fase('nocturno texto de planilla');const cambio=await real.pedir(`/propiedades/${propiedad}`,'PUT',{nombre:'=1+1'});assert.equal(cambio.status,200);await ir('Reportes');await esperar("Boolean(document.querySelector('.reportes-summary-grid'))");
  await evaluate("globalThis.__blobNocturnoOriginal=URL.createObjectURL;URL.createObjectURL=function(b){b.text().then(texto=>globalThis.__exportadoNocturno=texto);return globalThis.__blobNocturnoOriginal.call(URL,b);};");
  try{for(const formato of ['csv','excel']){await evaluate('globalThis.__exportadoNocturno=null');await click('.reportes-generate-button');await esperar("Boolean(document.querySelector('.reportes-export-modal'))");await click(`input[name=formatoExportacion][value=${formato}]`);await click('.reportes-export-confirm');await esperar("typeof globalThis.__exportadoNocturno==='string'");assert.ok((await evaluate('globalThis.__exportadoNocturno')).includes(formato==='csv'?"'=1+1":'&#039;=1+1'));}}
  finally{await evaluate('URL.createObjectURL=globalThis.__blobNocturnoOriginal;delete globalThis.__blobNocturnoOriginal;delete globalThis.__exportadoNocturno;');}
 });
 await t.test('Propiedades: listado incompleto no rompe la aplicación y permite recargar sin escrituras',async()=>{
  fase('nocturno listado incompleto');real.transformar=({method,ruta,respuesta})=>method==='GET'&&ruta==='/propiedades'?[200,{propiedades:{}}]:[respuesta.status,respuesta.data];const antes=requests.length;await ir('Propiedades');await esperar("document.querySelector('.propiedades-page .error')?.textContent.includes('No se pudieron')");delete real.transformar;await boton('Recargar propiedades');await esperar("document.querySelector('.propiedades-page').textContent.includes('=1+1')");assert.equal(requests.slice(antes).some(r=>['POST','PUT','PATCH','DELETE'].includes(r.method)),false);
 });
 await t.test('Borradores de propiedad y reserva legacy: cancelar navegación conserva campos; descartar no escribe',async()=>{
  fase('nocturno borradores críticos');const antes=requests.length;await boton('Nueva propiedad');await fill('input[name=nombre]','Borrador de propiedad');await ir('Reservas');await esperar("Boolean(document.querySelector('dialog[open]'))");await boton('Seguir editando','dialog[open]');assert.equal(await evaluate("document.querySelector('input[name=nombre]').value"),'Borrador de propiedad');await ir('Reservas');await esperar("Boolean(document.querySelector('dialog[open]'))");await boton('Descartar y continuar','dialog[open]');await esperar("Boolean(document.querySelector('.reservas-page'))");
  await boton('Nueva reserva');await seleccionar('#reserva-idPropiedad',propiedad);await ir('Calendario');await esperar("Boolean(document.querySelector('dialog[open]'))");await boton('Seguir editando','dialog[open]');assert.equal(await evaluate("document.querySelector('#reserva-idPropiedad').value"),String(propiedad));await ir('Calendario');await esperar("Boolean(document.querySelector('dialog[open]'))");await boton('Descartar y continuar','dialog[open]');await esperar("Boolean(document.querySelector('.calendar-page'))");assert.equal(requests.slice(antes).some(r=>['POST','PUT','PATCH','DELETE'].includes(r.method)),false);
 });
 await t.test('Recarga anterior de Propiedades no oculta una creación confirmada posterior',async()=>{
  fase('nocturno recarga tras guardado');await ir('Propiedades');await esperar("document.querySelector('.propiedades-page')?.textContent.includes('=1+1')");let retrasada=false,notificar;const iniciada=new Promise(r=>{notificar=r;});
  real.transformar=async({method,ruta,respuesta})=>{if(method==='GET'&&ruta==='/propiedades'&&!retrasada){retrasada=true;notificar();await new Promise(r=>setTimeout(r,500));}return [respuesta.status,respuesta.data];};
  await boton('Recargar propiedades');await iniciada;await boton('Nueva propiedad');for(const [name,value]of Object.entries({nombre:'Creación posterior a recarga',direccion:'Ficticia 303',ciudad:'Ficticia',provincia:'Ficticia',capacidadMaxima:'2',precioBase:'10'}))await fill(`input[name=${name}]`,value);await submit('input[name=nombre]');await esperar("document.querySelector('.properties-grid')?.textContent.includes('Creación posterior a recarga')");await evaluate('new Promise(r=>setTimeout(r,650))');assert.equal(await evaluate("document.querySelector('.properties-grid')?.textContent.includes('Creación posterior a recarga')"),true);delete real.transformar;
 });
}

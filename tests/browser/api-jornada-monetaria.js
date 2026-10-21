// API ficticia con memoria del proceso de prueba. No abre conexiones ni servidores.
import {propiedadVisual,reservaVisual,huespedVisual} from '../fixtures/visual-modulos.js';
import {fechaNegocio,fechaValida,decimal,unidades,fijarCheckin,alertaTarifa} from '../../src/services/monedasCalculos.js';
const clonar=x=>structuredClone(x);
export function crearApiJornadaMonetaria(){
 let activo=false,s;
 const hoy=()=>fechaNegocio(),revision=()=> (++s.revision).toString(16).padStart(16,'0');
 const presentar=r=>({...r,...(s.acuerdos.has(r.idReserva)?{acuerdoMonetario:{...s.acuerdos.get(r.idReserva),estadoReserva:r.estado}}:{})});
 const publico=(r,usuario)=>{const dto=clonar(presentar(r));if(usuario.rol==='Administrador')return dto;dto.accionesDisponibles=['VER','EDITAR'];if(dto.acuerdoMonetario)dto.acuerdoMonetario=Object.fromEntries(['idReserva','moneda','monedaPago','reglaCambio','estadoFijacion','estadoReserva'].map(k=>[k,dto.acuerdoMonetario[k]]));return dto;};
 const reset=()=>{
  s={revision:1000,escritura:true,fallo:'',anterior:false,propiedades:[{...clonar(propiedadVisual),idPropiedad:1,nombre:'Legado ficticio',precioBase:50000}],tarifas:new Map(),
   reservas:[68,69].map(idReserva=>({...clonar(reservaVisual),idReserva,idPropiedad:1,idHuesped:60,estado:'Confirmada',canal:'Manual',fechaIngreso:hoy(),fechaEgreso:hoy(),accionesDisponibles:['VER','EDITAR','CANCELAR']})),
   acuerdos:new Map(),eventos:new Map(),cotizacion:null,config:{fuente:'BCRA',tipo:'BCRA_TIPO_COTIZACION',valor:'1000.00000000',fecha:hoy(),horaPublicacion:null,consultadaEn:new Date().toISOString(),versionRegistro:'00000000000003e8',idAutor:1}};
 };
 const evento=(id,tipo,titulo,datosJson)=>{const lista=s.eventos.get(id)||[];lista.push({idEventoReserva:700+lista.length,idReserva:id,tipo,titulo,descripcion:titulo,origen:'Manual',fechaEvento:new Date().toISOString(),datosJson});s.eventos.set(id,lista);};
 const respuestaAcuerdo=a=>s.fallo==='incierto'?[500,{codigo:'OPERACION_RESULTADO_INCIERTO',mensaje:'No se pudo confirmar el resultado del guardado. Recargá los datos antes de reintentar.'}]:s.fallo==='incompleto'?[200,{acuerdo:{}}]:[200,{acuerdo:clonar(a)}];
 const contrato=(body,id,usuario,anterior)=>({idReserva:id,idEmpresa:1,moneda:body.moneda,importe:decimal(unidades(body.importe)),pagoEquivalenteARS:body.pagoEquivalenteARS,
  monedaPago:body.pagoEquivalenteARS?'ARS':body.moneda,reglaCambio:body.pagoEquivalenteARS?'CHECKIN':'SIN_CONVERSION',
  fuenteReferencia:body.pagoEquivalenteARS?body.fuenteReferencia:null,tipoReferencia:body.pagoEquivalenteARS?(body.fuenteReferencia==='BCRA'?'BCRA_TIPO_COTIZACION':'MANUAL'):null,
  estadoFijacion:body.pagoEquivalenteARS?'PENDIENTE':'NO_REQUIERE',versionRegistro:revision(),idAutor:anterior?.idAutor||usuario.idUsuario,
  fechaAcuerdo:anterior?.fechaAcuerdo||new Date().toISOString(),fijadoEn:null,valorAplicado:null,equivalenteARS:null});
 function responder(method,ruta,body,params,usuario){
  if(!activo)return undefined;
  if(ruta==='/monedas/estado')return [200,{activado:true,escritura:s.escritura,reservas:true,acuerdosEscritura:s.escritura,persistencia:'sql',fechaNegocio:hoy(),fuentes:[{id:'BCRA',disponible:true},{id:'MANUAL',disponible:true},{id:'BNA',disponible:false}]}];
  if(ruta==='/monedas/tarifas'&&method==='GET')return [200,{tarifas:clonar([...s.tarifas.values()])}];
  if(ruta==='/monedas/alertas')return [200,{disponible:true,alertas:[...s.tarifas.values()].map(t=>alertaTarifa(t,s.config,hoy())).filter(Boolean)}];
  if(ruta==='/monedas/resumen'){
   if(usuario.rol!=='Administrador')return [403,{mensaje:'Sin permiso económico.'}];
   const filtros={fechaDesde:params.get('fechaDesde'),fechaHasta:params.get('fechaHasta'),idPropiedad:params.get('idPropiedad')?Number(params.get('idPropiedad')):null,canal:params.get('canal'),estado:params.get('estado')};
   if(!fechaValida(filtros.fechaDesde)||!fechaValida(filtros.fechaHasta))return [400,{mensaje:'Periodo inválido.'}];
   const seleccion=s.reservas.filter(r=>!['Cancelada','No show'].includes(r.estado)&&r.fechaIngreso>=filtros.fechaDesde&&r.fechaIngreso<=filtros.fechaHasta&&(!filtros.idPropiedad||r.idPropiedad===filtros.idPropiedad)&&(!filtros.canal||r.canal===filtros.canal)&&(!filtros.estado||r.estado===filtros.estado));
   const totales=new Map();let sinMoneda=0;
   for(const r of seleccion){const a=s.acuerdos.get(r.idReserva);if(!a){sinMoneda++;continue;}const previo=totales.get(a.moneda)||{n:0n,c:0};totales.set(a.moneda,{n:previo.n+unidades(a.importe),c:previo.c+1});}
   return [200,{disponible:true,criterio:'IMPORTES_ACORDADOS_ORIGINALES_SIN_COBROS',filtros,porMoneda:[...totales].map(([moneda,v])=>({moneda,importe:decimal(v.n),cantidad:String(v.c)})),sinMoneda:String(sinMoneda),totalReservas:String(seleccion.length),excluye:['Cancelada','No show']}];
  }
  if(ruta==='/propiedades'&&method==='GET')return [200,{propiedades:clonar(s.propiedades)}];
  if(ruta==='/huespedes'&&method==='GET')return [200,{huespedes:[{...clonar(huespedVisual),idHuesped:60,nombre:'Integración',apellido:'Ficticia'}]}];
  if(ruta==='/monedas/consultar-bcra'){
   if(usuario.rol!=='Administrador')return [403,{mensaje:'Sin permiso.'}];
   const fecha=s.anterior?new Date(Date.parse(hoy()+'T12:00:00Z')-86400000).toISOString().slice(0,10):hoy();
   s.cotizacion={id:'consulta-jornada-'+revision(),fuente:'BCRA',tipo:'BCRA_TIPO_COTIZACION',valor:'1250.00000000',fecha,horaPublicacion:null,consultadaEn:new Date().toISOString()};
   return [200,{cotizacion:clonar(s.cotizacion),persistida:false}];
  }
  if(ruta==='/monedas/configuracion'){
   if(usuario.rol!=='Administrador')return [403,{mensaje:'Sin permiso.'}];
   if(method==='GET')return [200,{configuracion:clonar(s.config)}];
   if(!s.escritura)return [503,{codigo:'MONEDAS_SOLO_LECTURA',mensaje:'Solo lectura.'}];
   s.config={...(body.fuente==='BCRA'?s.cotizacion:{fuente:'MANUAL',tipo:'MANUAL',valor:body.valor,fecha:hoy(),consultadaEn:new Date().toISOString(),horaPublicacion:null}),versionRegistro:revision(),idAutor:usuario.idUsuario};return [200,{configuracion:clonar(s.config)}];
  }
  if(ruta==='/monedas/propiedades'&&method==='POST'){
   if(usuario.rol!=='Administrador')return [403,{mensaje:'Sin permiso.'}];if(!s.escritura)return [503,{mensaje:'Solo lectura.'}];
   if(body.confirmar!==true||!['ARS','USD'].includes(body.moneda)||typeof body.precio!=='string')return [400,{mensaje:'Contrato monetario inválido.'}];
   const idPropiedad=50+s.propiedades.filter(p=>p.idPropiedad>=50).length;
   const tarifa={idPropiedad,nombre:body.propiedad.nombre,moneda:body.moneda,precio:decimal(unidades(body.precio)),versionRegistro:revision(),referencia:clonar(s.config)};
   const propiedad={...clonar(propiedadVisual),...body.propiedad,idPropiedad,precioBase:tarifa.precio,monedaBase:tarifa.moneda,tarifaMonetaria:tarifa,canales:[]};s.propiedades.push(propiedad);s.tarifas.set(idPropiedad,tarifa);return [201,{propiedad:clonar(propiedad)}];
  }
  const tarifaRuta=ruta.match(/^\/monedas\/tarifas\/(\d+)$/);
  if(tarifaRuta&&method==='PUT'){
   if(usuario.rol!=='Administrador')return [403,{mensaje:'Sin permiso.'}];if(!s.escritura)return [503,{mensaje:'Solo lectura.'}];
   const id=Number(tarifaRuta[1]),p=s.propiedades.find(x=>x.idPropiedad===id),t=s.tarifas.get(id);
   if(!p||body.revision!==(t?.versionRegistro||null))return [409,{mensaje:'La tarifa cambió. Recargá.'}];
   const tarifa={idPropiedad:id,nombre:p.nombre,moneda:body.moneda,precio:body.precio,versionRegistro:revision(),referencia:clonar(s.config)};s.tarifas.set(id,tarifa);Object.assign(p,{precioBase:tarifa.precio,monedaBase:tarifa.moneda,tarifaMonetaria:tarifa});return [200,{tarifa:clonar(tarifa)}];
  }
  const propiedadRuta=ruta.match(/^\/propiedades\/(\d+)$/);
  if(propiedadRuta){const p=s.propiedades.find(x=>x.idPropiedad===Number(propiedadRuta[1]));if(!p)return [404,{mensaje:'Propiedad ficticia inexistente.'}];
   if(method==='GET')return [200,{propiedad:clonar(p)}];if(method==='PUT'){if(Object.hasOwn(body,'precioBase'))return [409,{mensaje:'Usá el editor único de tarifa.'}];Object.assign(p,body);return [200,{propiedad:clonar(p)}];}}
  if(ruta==='/reservas'&&method==='GET')return [200,{reservas:s.reservas.map(presentar).map(r=>usuario.rol==='Administrador'?clonar(r):{...clonar(r),accionesDisponibles:['VER','EDITAR'],...(r.acuerdoMonetario?{acuerdoMonetario:{idReserva:r.idReserva,moneda:r.acuerdoMonetario.moneda,estadoFijacion:r.acuerdoMonetario.estadoFijacion}}:{})})}];
  if(ruta==='/reservas'&&method==='POST'){
   const permitidos=['idPropiedad','idHuesped','fechaIngreso','horaIngreso','fechaEgreso','horaEgreso','cantidadHuespedes','montoEstimado','acuerdoMonetario'];
   if(!s.escritura)return [503,{mensaje:'Acuerdos en solo lectura.'}];if(Object.keys(body).some(k=>!permitidos.includes(k))||body.acuerdoMonetario?.confirmar!==true)return [400,{mensaje:'Contrato de alta inválido.'}];
   const idReserva=70+s.reservas.filter(r=>r.idReserva>=70).length,p=s.propiedades.find(x=>x.idPropiedad===body.idPropiedad);if(!p||body.idHuesped!==60)return [400,{mensaje:'Identidad ficticia inválida.'}];
   const r={...clonar(reservaVisual),...body,idReserva,canal:'Manual',estado:'Confirmada',estadoSincronizacion:'Solo HostFlow',huesped:'Integración Ficticia',propiedad:p.nombre,tipoGestion:'INTERNA',accionesDisponibles:['VER','EDITAR','CANCELAR']};delete r.acuerdoMonetario;
   const a=contrato(body.acuerdoMonetario,idReserva,usuario);s.reservas.push(r);s.acuerdos.set(idReserva,a);evento(idReserva,'RESERVA_CREADA','Reserva creada en HostFlow',{acuerdoMonetario:a});return [201,{reserva:s.falloAlta==='incompleto'?{idReserva,acuerdoMonetario:{moneda:a.moneda}}:publico(r,usuario)}];
  }
  const reservaRuta=ruta.match(/^\/reservas\/(\d+)(?:\/(eventos|cancelar))?$/);
  if(reservaRuta){const id=Number(reservaRuta[1]),r=s.reservas.find(x=>x.idReserva===id);if(!r)return [404,{mensaje:'Reserva ficticia inexistente.'}];
   if(reservaRuta[2]==='eventos')return [200,{eventos:clonar(s.eventos.get(id)||[])}];
   if(reservaRuta[2]==='cancelar'&&method==='PATCH'){if(usuario.rol!=='Administrador')return [403,{mensaje:'Sin permiso.'}];r.estado='Cancelada';evento(id,'RESERVA_CANCELADA','Reserva cancelada',{});return [200,{reserva:clonar(presentar(r))}];}
   if(method==='GET')return [200,{reserva:publico(r,usuario)}];
   if(method==='PUT'){
    if(s.acuerdos.get(id)?.fijadoEn&&(body.fechaIngreso!==r.fechaIngreso||body.horaIngreso!==r.horaIngreso))return [409,{codigo:'ACUERDO_FIJADO',mensaje:'El check-in fijado no puede cambiarse.'}];
    Object.assign(r,body);evento(id,'RESERVA_MODIFICADA','Estadía modificada',{});return [200,{reserva:clonar(presentar(r))}];}
  }
  const acuerdoRuta=ruta.match(/^\/monedas\/reservas\/(\d+)\/(acuerdo|fijacion)$/);
  if(acuerdoRuta){if(usuario.rol!=='Administrador')return [403,{mensaje:'Sin permiso económico.'}];const id=Number(acuerdoRuta[1]),r=s.reservas.find(x=>x.idReserva===id),a=s.acuerdos.get(id);
   if(method==='GET'){if(s.lecturaTardia){s.lecturaTardia=false;return new Promise(resolve=>setTimeout(()=>resolve([200,{acuerdo:{}}]),350));}return [200,{acuerdo:a?clonar({...a,estadoReserva:r.estado}):null}];}if(!s.escritura)return [503,{mensaje:'Solo lectura.'}];
   if(s.fallo==='conflicto')return [409,{codigo:'ACUERDO_CONFLICTO',mensaje:'El acuerdo cambió. Recargá los datos.'}];
   if(!r||!['Confirmada','Pendiente'].includes(r.estado)||a?.fijadoEn||body.revision!==(a?.versionRegistro||null))return [409,{mensaje:'Acuerdo cerrado o revisión antigua. Recargá.'}];
   let nuevo;
   if(acuerdoRuta[2]==='acuerdo')nuevo=contrato(body.acuerdo,id,usuario,a);
   else {
    const q=a.fuenteReferencia==='BCRA'?s.cotizacion:s.config;
    if(a.fuenteReferencia==='BCRA'&&q?.id!==body.cotizacionId)return [400,{mensaje:'Consulta no acreditada.'}];
    try{const snap=fijarCheckin({canal:'Manual',moneda:a.moneda,importe:a.importe,pagoEquivalenteARS:a.pagoEquivalenteARS,fechaIngreso:r.fechaIngreso,cotizacion:q,aceptarUltimaOficial:body.aceptarUltimaOficial});
     nuevo={...a,fuenteAplicada:snap.fuente,tipoAplicado:snap.tipo,valorAplicado:snap.valor,fechaEfectiva:snap.fechaEfectiva,fechaCheckinFijada:snap.fechaCheckin,fijadoEn:snap.fijadoEn,equivalenteARS:snap.equivalenteARS,idUsuarioFijacion:usuario.idUsuario,estadoFijacion:'FIJADA',versionRegistro:revision()};
    }catch(e){return [400,{mensaje:e.message}];}
   }
   s.acuerdos.set(id,nuevo);evento(id,'RESERVA_MODIFICADA',acuerdoRuta[2]==='fijacion'?'Cotización del check-in fijada':'Acuerdo monetario confirmado',{motivoMonetario:acuerdoRuta[2]==='fijacion'?'COTIZACION_CHECKIN_FIJADA':'ACUERDO_CONFIRMADO',actual:nuevo});return respuestaAcuerdo({...nuevo,estadoReserva:r.estado});
  }
  return undefined;
 }
 return {responder,esActiva:()=>activo,configurar(v){if(Object.hasOwn(v,'jornadaMonetaria')){if(v.jornadaMonetaria&&!activo)reset();activo=v.jornadaMonetaria;}if(activo){if(Object.hasOwn(v,'escrituraJornada'))s.escritura=v.escrituraJornada;if(Object.hasOwn(v,'falloAcuerdoJornada'))s.fallo=v.falloAcuerdoJornada;if(Object.hasOwn(v,'falloAltaJornada'))s.falloAlta=v.falloAltaJornada;if(Object.hasOwn(v,'lecturaAcuerdoTardiaJornada'))s.lecturaTardia=v.lecturaAcuerdoTardiaJornada;if(Object.hasOwn(v,'cotizacionAnteriorJornada'))s.anterior=v.cotizacionAnteriorJornada;}},snapshot:()=>activo?clonar({propiedades:s.propiedades,tarifas:[...s.tarifas.values()],reservas:s.reservas,acuerdos:[...s.acuerdos.values()],eventos:[...s.eventos]}):null};
}

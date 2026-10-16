import {test} from 'node:test';
import assert from 'node:assert/strict';
import {avisosValidos,preferenciasValidas,guardadoPreferenciasValido,TIPOS_NOTIFICACION,cantidadAvisos,estadoErrorNotificaciones} from '../src/services/notificaciones.js';

const prefs=()=>({estado:{persistencia:'sql',soloLectura:false},preferencias:Object.keys(TIPOS_NOTIFICACION).map(tipo=>({tipo,habilitada:false,persistida:false,versionRegistro:null}))});
const feed=()=>({origen:'alertas_persistidas',lecturaPersonal:false,paginacion:{total:1,totalSinFiltros:1,paginas:1},avisos:[{idAviso:1,tipo:'CHECKIN_PROXIMO',categoria:'reservas',prioridad:'Alta',titulo:'Llegada próxima',descripcion:'Revisar operación',fecha:null,destino:{seccion:'alertas'}}]});

test('Guardado: solo confirma ocho opciones persistidas con revision y los valores solicitados',()=>{
  const solicitud=prefs().preferencias,ok={...prefs(),preferencias:solicitud.map(p=>({...p,persistida:true,versionRegistro:'0000000000000001'}))};
  assert.equal(guardadoPreferenciasValido(ok,solicitud),true);
  assert.equal(guardadoPreferenciasValido(prefs(),solicitud),false);
  assert.equal(guardadoPreferenciasValido({...ok,estado:{persistencia:'sql',soloLectura:true}},solicitud),false);
  assert.equal(guardadoPreferenciasValido({...ok,preferencias:ok.preferencias.map((p,i)=>i===0?{...p,habilitada:!p.habilitada}:p)},solicitud),false);
  assert.equal(guardadoPreferenciasValido(ok,[solicitud[0],...solicitud.slice(0,7)]),false);
  assert.equal(guardadoPreferenciasValido(ok,[]),false);
});
test('Preferencias: contratos SQL completos, revisiones y ausencia explícita de persistencia',()=>{
  assert.equal(preferenciasValidas(prefs()),true);
  const almacenada=prefs();almacenada.preferencias[0]={...almacenada.preferencias[0],persistida:true,versionRegistro:'0000000000000001'};assert.equal(preferenciasValidas(almacenada),true);
  for(const data of [null,{}, {...prefs(),estado:{persistencia:'local',soloLectura:false}},{...prefs(),estado:{persistencia:'sql'}},{...prefs(),preferencias:[null,...prefs().preferencias.slice(1)]},{...prefs(),preferencias:prefs().preferencias.slice(1)}, {...prefs(),preferencias:prefs().preferencias.map(p=>({...p,persistida:true}))}])assert.equal(preferenciasValidas(data),false);
  const duplicada=prefs();duplicada.preferencias[0]=duplicada.preferencias[1];assert.equal(preferenciasValidas(duplicada),false);
});
test('Avisos: no acepta lecturas personales ficticias, destinos arbitrarios ni contratos incompletos',()=>{
  assert.equal(avisosValidos(feed()),true);assert.equal(avisosValidos({...feed(),avisos:[]}),true);
  for(const data of [null,{}, {...feed(),lecturaPersonal:true},{...feed(),origen:'simulado'},{...feed(),avisos:[null]},{...feed(),paginacion:{total:-1,paginas:1}},{...feed(),avisos:[feed().avisos[0],feed().avisos[0]]}])assert.equal(avisosValidos(data),false);
  for(const cambio of [{tipo:'SISTEMA_INVENTADO'},{fecha:'inexistente'},{idAviso:'1'},{prioridad:'Urgente'},{destino:{seccion:'usuarios'}},{titulo:''}])assert.equal(avisosValidos({...feed(),avisos:[{...feed().avisos[0],...cambio}]}),false);
});
test('Movimiento: persistencia exclusivamente del navegador, suscripción y sincronización entre pestañas',async()=>{
  const listeners=new Map(),datos=new Map([['hostflow.accesibilidad.movimiento','reducido']]);
  globalThis.window={localStorage:{getItem:k=>datos.get(k),setItem:(k,v)=>datos.set(k,v)},addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
  try{
    const store=await import('../src/services/preferenciasNavegador.js?normal');assert.equal(store.snapshotMovimiento(),'reducido');
    let cambios=0;const cerrar=store.suscribirMovimiento(()=>cambios++);
    assert.equal(store.guardarMovimiento('otra'),false);assert.equal(cambios,0);assert.equal(store.guardarMovimiento('sistema'),true);assert.equal(cambios,1);
    assert.equal(datos.get('hostflow.accesibilidad.movimiento'),'sistema');
    listeners.get('storage')({key:'token',newValue:'otro'});assert.equal(cambios,1);
    listeners.get('storage')({key:'hostflow.accesibilidad.movimiento',newValue:'reducido'});assert.equal(store.snapshotMovimiento(),'reducido');assert.equal(cambios,2);
    listeners.get('storage')({key:null,newValue:null});assert.equal(store.snapshotMovimiento(),'sistema');assert.equal(cambios,3);
    cerrar();assert.equal(listeners.size,0);assert.deepEqual([...datos.keys()],['hostflow.accesibilidad.movimiento']);
  }finally{delete globalThis.window;}
});
test('Movimiento: almacenamiento denegado aplica solo en memoria e informa que no persistió',async()=>{
  globalThis.window={get localStorage(){throw Error('Almacenamiento bloqueado');}};
  try{const store=await import('../src/services/preferenciasNavegador.js?bloqueado');assert.equal(store.snapshotMovimiento(),'sistema');assert.equal(store.guardarMovimiento('reducido'),false);assert.equal(store.snapshotMovimiento(),'reducido');}
  finally{delete globalThis.window;}
});
test('Avisos: singular/plural y estados de activación, esquema, sesión y contrato separados',()=>{
  assert.deepEqual([0,1,2].map(cantidadAvisos),['Ningún aviso disponible','1 aviso disponible','2 avisos disponibles']);
  for(const [codigo,tipo]of [['NOTIFICACIONES_NO_ACTIVADAS','desactivada'],['NOTIFICACIONES_MODELO_PENDIENTE','modelo']]){const estado=estadoErrorNotificaciones({response:{status:503,data:{codigo}}});assert.equal(estado.tipo,tipo);assert.equal(estado.reintentar,false);}
  assert.equal(estadoErrorNotificaciones({response:{status:401}}).tipo,'sesion');assert.equal(estadoErrorNotificaciones({response:{status:403}}).tipo,'permiso');
  assert.equal(estadoErrorNotificaciones({codigo:'CONTRATO_INCOMPLETO'}).tipo,'contrato');assert.equal(estadoErrorNotificaciones(Error('Red')).tipo,'conexion');
  for(const prioridad of ['Critica','Informativa','NoDefinida'])assert.equal(avisosValidos({...feed(),avisos:[{...feed().avisos[0],prioridad}]}),true);
  assert.equal(avisosValidos({...feed(),avisos:[{...feed().avisos[0],prioridad:'Baja'}]}),false);
});

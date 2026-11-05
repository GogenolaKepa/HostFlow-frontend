import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crearNavegacionSistema, resolverRutaSistema} from '../src/services/navegacionSistema.js';
import {crearProtectorBorradores} from '../src/services/borradores.js';
const usuario={permisos:['usuarios.ver','notificaciones.ver','configuracion.ver','notificaciones.preferencias'],gestionCuentasDisponible:true,debeCambiarPassword:false};
function laboratorio(pathname='/login') {
  const location={pathname},entries=[{url:pathname,state:{ajeno:'conservar'}}],events=new Map(),queue=[];let position=0;
  const ventana={location,history:{get state(){return entries[position].state;},replaceState(state,_,url){entries[position]={state,url};location.pathname=url;},pushState(state,_,url){entries.splice(++position);entries.push({state,url});location.pathname=url;},go(delta){queue.push(()=>{if(position+delta<0||position+delta>=entries.length)return;position+=delta;location.pathname=entries[position].url;events.get('popstate')?.();});}},addEventListener:(e,f)=>events.set(e,f),removeEventListener:(e,f)=>{if(events.get(e)===f)events.delete(e);}};
  const protector=crearProtectorBorradores(), cambios=[];
  const nav=crearNavegacionSistema({ventana,usuario,protector,alCambiar:r=>cambios.push(r)});
  return {ventana,protector,nav,cambios,flush(){while(queue.length)queue.shift()();},entries,events};
}
test('rutas y títulos explícitos: login va a Inicio, reserva y configuración conservan destino',()=>{
  assert.equal(resolverRutaSistema('/login',usuario).url,'/inicio');
  assert.equal(resolverRutaSistema('/reservas/',usuario).titulo,'Reservas | HostFlow');
  assert.equal(resolverRutaSistema('/configuracion/monedas',usuario).titulo,'Monedas y cotizaciones | HostFlow');
  for(const ruta of ['/constructor','/toString','/reservas/extra','//externo.invalid','/configuracion/monedas/extra'])assert.equal(resolverRutaSistema(ruta,usuario).url,'/inicio');
});
test('rutas administrativas y apartados respetan permisos del servidor',()=>{
  const operador={permisos:[],gestionCuentasDisponible:false};
  for(const ruta of ['/usuarios','/notificaciones'])assert.equal(resolverRutaSistema(ruta,operador).seccion,'inicio');
  for(const tab of ['monedas','empresa','operativas','notificaciones','seguridad','integraciones'])assert.equal(resolverRutaSistema('/configuracion/'+tab,operador).apartado,'apariencia');
  assert.equal(resolverRutaSistema('/configuracion/generales',operador).apartado,'generales');
  assert.equal(resolverRutaSistema('/mi-cuenta',operador).seccion,'mi-cuenta');
});
test('navegar crea una entrada por sección; recargar restaura sección e índice sin duplicarlos',()=>{
  const l=laboratorio();l.nav.navegar('reservas');l.nav.navegar('reservas');
  assert.equal(l.entries.length,2);assert.equal(l.ventana.history.state.ajeno,'conservar');
  const n=l.ventana.history.state.hostflowNavegacion;l.nav.cerrar();
  const nav=crearNavegacionSistema({ventana:l.ventana,usuario,protector:l.protector,alCambiar:r=>l.cambios.push(r)});
  assert.equal(l.cambios.at(-1).seccion,'reservas');assert.equal(l.ventana.history.state.hostflowNavegacion,n);assert.equal(l.entries.length,2);nav.cerrar();
});
test('Atrás y Adelante actualizan vista, URL y título',()=>{
  const l=laboratorio();l.nav.navegar('reservas');l.nav.navegar('configuracion','monedas');
  l.ventana.history.go(-1);l.flush();assert.equal(l.cambios.at(-1).url,'/reservas');
  l.ventana.history.go(1);l.flush();assert.equal(l.cambios.at(-1).titulo,'Monedas y cotizaciones | HostFlow');
});
test('Atrás con borrador restaura URL y conserva vista al cancelar',()=>{
  const l=laboratorio();l.nav.navegar('reservas');const form=l.protector.registrar();form.actualizar(true,false);
  l.ventana.history.go(-1);l.flush();assert.equal(l.ventana.location.pathname,'/reservas');assert.equal(l.cambios.at(-1).seccion,'reservas');assert.equal(l.protector.estado().pendiente,true);
  l.protector.cancelar();assert.equal(l.ventana.location.pathname,'/reservas');assert.equal(l.entries.length,2);
});
test('confirmar descarte vuelve a la entrada solicitada y mantiene Adelante disponible',()=>{
  const l=laboratorio();l.nav.navegar('configuracion','empresa');const form=l.protector.registrar();form.actualizar(true,false);
  l.ventana.history.go(-1);l.flush();l.protector.confirmar();l.flush();assert.equal(l.ventana.location.pathname,'/inicio');assert.equal(l.cambios.at(-1).seccion,'inicio');
  form.liberar();l.ventana.history.go(1);l.flush();assert.equal(l.ventana.location.pathname,'/configuracion/empresa');assert.equal(l.entries.length,2);
});
test('historial durante guardado no pierde el formulario ni abre otra confirmación',()=>{
  const l=laboratorio();l.nav.navegar('reservas');const form=l.protector.registrar();form.actualizar(true,true);
  l.ventana.history.go(-1);l.flush();assert.equal(l.ventana.location.pathname,'/reservas');assert.equal(l.protector.estado().pendiente,false);assert.equal(l.cambios.at(-1).seccion,'reservas');
});
test('desmontar elimina listener y una confirmación tardía no navega tras cerrar sesión',()=>{
  const l=laboratorio();l.nav.navegar('reservas');const form=l.protector.registrar();form.actualizar(true,false);
  l.ventana.history.go(-1);l.flush();l.nav.cerrar();l.protector.confirmar();l.flush();assert.equal(l.events.size,0);assert.equal(l.ventana.location.pathname,'/reservas');
});

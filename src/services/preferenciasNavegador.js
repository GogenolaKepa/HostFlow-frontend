import { guardarPreferenciaCuenta, leerPreferenciaCuenta } from './preferenciasCuenta.js';

const CLAVE='hostflow.accesibilidad.movimiento';
let ambito=null,preferencia='sistema';
const listeners=new Set();
const normalizar=v=>v==='reducido'?'reducido':'sistema';
const publicar = valor => {
  if (valor === preferencia) return;
  preferencia=valor;
  for(const fn of listeners)fn();
};
export function establecerAmbitoMovimiento(siguiente){
  if(ambito===siguiente)return;
  ambito=siguiente;
  publicar(normalizar(leerPreferenciaCuenta(CLAVE,ambito)));
}
export const snapshotMovimiento=()=>preferencia;
const storage=e=>{
  if(!ambito||(e.key!==`${CLAVE}:${ambito}`&&e.key!==null))return;
  publicar(normalizar(e.key===null?null:e.newValue));
};
export function suscribirMovimiento(fn){
  if(!listeners.size)window.addEventListener('storage',storage);listeners.add(fn);
  return()=>{listeners.delete(fn);if(!listeners.size)window.removeEventListener('storage',storage);};
}
export function guardarMovimiento(valor){
  if(!ambito||!['sistema','reducido'].includes(valor))return false;
  const guardada=guardarPreferenciaCuenta(CLAVE,ambito,valor);
  publicar(valor);
  return guardada;
}

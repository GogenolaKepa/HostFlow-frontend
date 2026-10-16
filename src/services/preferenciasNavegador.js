// Preferencia explícitamente del navegador; nunca representa una preferencia SQL.
const CLAVE='hostflow.accesibilidad.movimiento';
let preferencia='sistema',cargada=false;
const listeners=new Set();
const normalizar=v=>v==='reducido'?'reducido':'sistema';
export function snapshotMovimiento(){
  if(!cargada){try{preferencia=normalizar(window.localStorage.getItem(CLAVE));}catch{/* Valor seguro sin almacenamiento. */}cargada=true;}
  return preferencia;
}
const storage=e=>{if(e.key!==CLAVE&&e.key!==null)return;preferencia=normalizar(e.key===null?null:e.newValue);for(const fn of listeners)fn();};
export function suscribirMovimiento(fn){
  if(!listeners.size)window.addEventListener('storage',storage);listeners.add(fn);
  return()=>{listeners.delete(fn);if(!listeners.size)window.removeEventListener('storage',storage);};
}
export function guardarMovimiento(valor){
  if(!['sistema','reducido'].includes(valor))return false;
  cargada=true;preferencia=valor;let guardada=true;
  try{window.localStorage.setItem(CLAVE,valor);}catch{guardada=false;}
  for(const fn of listeners)fn();return guardada;
}

export const LIMITES_HUESPED=Object.freeze({nombre:100,apellido:100,email:150,telefono:50,dni:100,nacionalidad:100});
export const huespedVacio=()=>Object.fromEntries(Object.keys(LIMITES_HUESPED).map(k=>[k,'']));
const textoBusqueda=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function filtrarHuespedes(huespedes,busqueda){
 const partes=textoBusqueda(busqueda).split(/\s+/).filter(Boolean);
 return huespedes.filter(g=>{
  const texto=textoBusqueda([g.nombre,g.apellido,g.email,g.dni,g.idHuesped,String(g.dni??'').replace(/\D/g,'')].join(' '));
  return partes.every(parte=>texto.includes(parte));
 });
}
export const formularioDesdeHuesped=g=>Object.fromEntries(Object.keys(LIMITES_HUESPED).map(k=>[k,['No registrado','No registrada'].includes(g?.[k])?'':g?.[k]||'']));
export function payloadHuesped(form,{emailRequerido=true}={}){
 const datos={};for(const [campo,max]of Object.entries(LIMITES_HUESPED)){
  if(typeof form[campo]!=='string'||form[campo].trim().length>max)throw Error(`Revisá el campo ${campo} y su longitud.`);datos[campo]=form[campo].trim();
 }
 if(!datos.nombre||!datos.apellido)throw Error('Nombre y apellido son obligatorios.');
 if((emailRequerido||datos.email)&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email))throw Error('Ingresá un email válido.');return datos;
}
export function huespedValido(g){return Boolean(g&&Number.isInteger(g.idHuesped)&&g.idHuesped>0&&g.idHuesped<=2147483647&&typeof g.nombre==='string'&&g.nombre.trim()&&typeof g.apellido==='string'&&g.apellido.trim()&&Object.keys(LIMITES_HUESPED).every(k=>g[k]===null||typeof g[k]==='string'));}
export function listaHuespedesValida(data){return Array.isArray(data?.huespedes)&&data.huespedes.every(huespedValido)&&new Set(data.huespedes.map(g=>g.idHuesped)).size===data.huespedes.length;}
export function guardadoHuespedValido(g,datos,id){
 if(!huespedValido(g)||(id&&g.idHuesped!==id))return false;
 const form=formularioDesdeHuesped(g);return Object.keys(LIMITES_HUESPED).every(k=>form[k]===datos[k]);
}

import {unidades,decimal,convertir,cotizacionValida,fechaNegocio} from './monedasCalculos.js';
import {vistaBnaValida} from './vistaBna.js';

export const MAX_NOCHES=365;
export function referenciaInformativa(q){return cotizacionValida(q)||vistaBnaValida(q);}
export function resolverTarifa({id,moneda,precio,guardada}){
 if(!id)return {disponible:false,motivo:'Seleccioná una propiedad en Tarifa por propiedad.'};
 if(!['ARS','USD'].includes(moneda))return {disponible:false,motivo:'Elegí una moneda para la vista previa. No se presume la moneda del precio histórico.'};
 try{
  const importe=decimal(unidades(precio));
  if(unidades(importe)<=0n)throw Error();
  const persistida=guardada?.idPropiedad===Number(id)&&guardada.moneda===moneda&&decimal(unidades(guardada.precio))===importe;
  return {disponible:true,idPropiedad:Number(id),moneda,precio:importe,borrador:!persistida};
 }catch{return {disponible:false,motivo:'Ingresá un precio por noche positivo, con hasta dos decimales.'};}
}
export function presupuestoEstadia(tarifa,noches,cotizacion){
 if(!tarifa.disponible)return {disponible:false,motivo:tarifa.motivo};
 if(!/^[1-9]\d{0,2}$/.test(String(noches))||Number(noches)>MAX_NOCHES)return {disponible:false,motivo:`Indicá entre 1 y ${MAX_NOCHES} noches enteras.`};
 try{
  // Multiplicar centavos originales y convertir el total una sola vez.
  const total=decimal(unidades(tarifa.precio)*BigInt(noches));
  const resultado={disponible:true,moneda:tarifa.moneda,precio:tarifa.precio,total,noches:Number(noches),borrador:tarifa.borrador,equivalente:null};
  if(referenciaInformativa(cotizacion)){
   resultado.monedaEquivalente=tarifa.moneda==='USD'?'ARS':'USD';
   resultado.equivalente=convertir(total,tarifa.moneda,resultado.monedaEquivalente,cotizacion.valor);
   resultado.fechaReferencia=cotizacion.fecha;
   resultado.referenciaAnterior=cotizacion.fecha<fechaNegocio();
  }
  return resultado;
 }catch{return {disponible:false,motivo:'El resultado supera el rango monetario admitido. Reducí el precio o las noches.'};}
}

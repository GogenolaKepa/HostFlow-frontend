import {unidades,fechaValida,fechaNegocio} from './monedasCalculos.js';
export function vistaBnaValida(q){
 try{return q?.fuente==='BNA'&&q.tipo==='BNA_VENTA_MONEDAPI'&&q.intermediario==='MonedAPI'&&q.persistible===false&&q.categoria==='NO_ACREDITADA'&&
 q.operacion==='VENTA'&&q.monedaBase==='USD'&&q.monedaDestino==='ARS'&&q.urlFuente==='https://monedapi.ar/api/v2/usd/bna'&&
 typeof q.valor==='string'&&unidades(q.valor,8)>0n&&fechaValida(q.fecha)&&q.fecha===fechaNegocio(new Date(q.updatedAt))&&
 Number.isFinite(Date.parse(q.updatedAt))&&Number.isFinite(Date.parse(q.lastScrapedAt))&&Date.parse(q.updatedAt)<=Date.parse(q.lastScrapedAt)&&
 typeof q.comprobacionAntigua==='boolean'&&typeof q.valorDeFechaAnterior==='boolean';}catch{return false;}
}

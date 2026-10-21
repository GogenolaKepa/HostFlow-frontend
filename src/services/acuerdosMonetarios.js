import {unidades,decimal,convertir,cotizacionValida,fechaValida} from './monedasCalculos.js';
export const acuerdoVacio=()=>({moneda:'',importe:'',pagoEquivalenteARS:false,fuenteReferencia:''});
export function acuerdoFormulario(acuerdo){
 if(!['ARS','USD'].includes(acuerdo.moneda)||typeof acuerdo.importe!=='string'||typeof acuerdo.pagoEquivalenteARS!=='boolean')throw Error('Elegí moneda, importe acordado y regla de pago.');
 const importe=decimal(unidades(acuerdo.importe));
 if(acuerdo.pagoEquivalenteARS&&(acuerdo.moneda!=='USD'||!['BCRA','MANUAL'].includes(acuerdo.fuenteReferencia)))throw Error('El pago equivalente ARS requiere un importe USD y una fuente explícita.');
 return {moneda:acuerdo.moneda,importe,pagoEquivalenteARS:acuerdo.pagoEquivalenteARS,...(acuerdo.pagoEquivalenteARS?{fuenteReferencia:acuerdo.fuenteReferencia}:{}),confirmar:true};
}
export function acuerdoValido(a,id){
 try {
  if(!a||a.idReserva!==id||typeof a.importe!=='string'||!/^[a-f0-9]{16}$/i.test(a.versionRegistro)||!['ARS','USD'].includes(a.moneda)||typeof a.pagoEquivalenteARS!=='boolean')return false;
  unidades(a.importe);if(!Number.isInteger(a.idAutor)||a.idAutor<1||!a.fechaAcuerdo||!Number.isFinite(new Date(a.fechaAcuerdo).getTime()))return false;
  const regla=a.pagoEquivalenteARS?'CHECKIN':'SIN_CONVERSION';
  if(a.reglaCambio!==regla||a.monedaPago!==(a.pagoEquivalenteARS?'ARS':a.moneda))return false;
  if(a.pagoEquivalenteARS&&(a.moneda!=='USD'||!['BCRA','MANUAL'].includes(a.fuenteReferencia)||a.tipoReferencia!==(a.fuenteReferencia==='BCRA'?'BCRA_TIPO_COTIZACION':'MANUAL')))return false;
  if(!a.pagoEquivalenteARS)return a.estadoFijacion==='NO_REQUIERE'&&!a.fijadoEn;
  if(!a.fijadoEn)return a.estadoFijacion==='PENDIENTE'&&!a.valorAplicado&&!a.equivalenteARS;
  return a.estadoFijacion==='FIJADA'&&Number.isFinite(new Date(a.fijadoEn).getTime())&&
   cotizacionValida({fuente:a.fuenteAplicada,tipo:a.tipoAplicado,valor:a.valorAplicado,fecha:a.fechaEfectiva})&&
   a.fuenteAplicada===a.fuenteReferencia&&fechaValida(a.fechaCheckinFijada)&&a.fechaEfectiva<=a.fechaCheckinFijada&&Number.isInteger(a.idUsuarioFijacion)&&a.idUsuarioFijacion>0&&typeof a.equivalenteARS==='string'&&convertir(a.importe,'USD','ARS',a.valorAplicado)===a.equivalenteARS;
 }catch{return false;}
}
export const formularioDesdeAcuerdo=a=>a?{moneda:a.moneda,importe:a.importe,pagoEquivalenteARS:a.pagoEquivalenteARS,fuenteReferencia:a.fuenteReferencia||''}:acuerdoVacio();
export function altaAcuerdoConfirmada(reserva,solicitado,verImportes){
 const a=reserva?.acuerdoMonetario;
 if(!Number.isInteger(reserva?.idReserva)||reserva.idReserva<1||a?.idReserva!==reserva.idReserva||a.moneda!==solicitado.moneda||
  a.monedaPago!==(solicitado.pagoEquivalenteARS?'ARS':solicitado.moneda)||a.reglaCambio!==(solicitado.pagoEquivalenteARS?'CHECKIN':'SIN_CONVERSION')||
  a.estadoFijacion!==(solicitado.pagoEquivalenteARS?'PENDIENTE':'NO_REQUIERE'))return false;
 return !verImportes||(acuerdoValido(a,reserva.idReserva)&&a.importe===solicitado.importe&&a.pagoEquivalenteARS===solicitado.pagoEquivalenteARS&&(!solicitado.pagoEquivalenteARS||a.fuenteReferencia===solicitado.fuenteReferencia));
}

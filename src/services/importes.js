import {unidades,MONEDAS} from './monedasCalculos.js';
export function formatearImporte(importe,moneda) {
 if(importe===null||importe===undefined||importe==='')return 'Importe no informado';
 try {
  const n=unidades(importe),numero=new Intl.NumberFormat('es-AR').format(n/100n)+','+String(n%100n).padStart(2,'0');
  return MONEDAS.includes(moneda)?`${moneda} ${numero}`:`${numero} — moneda no declarada`;
 }catch{return 'Importe pendiente de revisión';}
}
export const totalSinMoneda=()=> 'Sin total comparable (moneda no declarada)';
export function formatearTotalMonetario(importe,moneda){
 if(!MONEDAS.includes(moneda)||typeof importe!=='string'||!/^(0|[1-9]\d{0,35})\.\d{2}$/.test(importe))return 'Total no comparable';
 const [entero,centavos]=importe.split('.');
 return `${moneda} ${new Intl.NumberFormat('es-AR').format(BigInt(entero))},${centavos}`;
}

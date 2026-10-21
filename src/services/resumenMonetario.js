import {fechaValida} from './monedasCalculos.js';
import {celdaCsv} from './exportacionTabular.js';
export function resumenMonetarioValido(data,filtros){
 if(!data||typeof data.disponible!=='boolean')return false;
 if(!data.disponible)return typeof data.motivo==='string';
 if(data.criterio!=='IMPORTES_ACORDADOS_ORIGINALES_SIN_COBROS'||!Array.isArray(data.porMoneda)||!/^\d+$/.test(data.sinMoneda)||!/^\d+$/.test(data.totalReservas))return false;
 if(data.filtros?.fechaDesde!==filtros.fechaDesde||data.filtros?.fechaHasta!==filtros.fechaHasta)return false;
 if(!fechaValida(filtros.fechaDesde)||!fechaValida(filtros.fechaHasta)||filtros.fechaDesde>filtros.fechaHasta)return false;
 for(const campo of ['idPropiedad','canal','estado'])if(String(data.filtros?.[campo]||'')!==String(filtros[campo]||''))return false;
 const vistos=new Set();let total=BigInt(data.sinMoneda);
 for(const r of data.porMoneda){if(!['ARS','USD'].includes(r.moneda)||vistos.has(r.moneda)||typeof r.importe!=='string'||!/^(0|[1-9]\d{0,35})\.\d{2}$/.test(r.importe)||typeof r.cantidad!=='string'||!/^\d+$/.test(r.cantidad))return false;vistos.add(r.moneda);total+=BigInt(r.cantidad);}
 return total===BigInt(data.totalReservas);
}
export function csvAcuerdos(data){
 const filas=[['IMPORTES ACORDADOS ORIGINALES - NO SON COBROS'],['Desde',data.filtros.fechaDesde,'Hasta',data.filtros.fechaHasta],['Propiedad',data.filtros.idPropiedad||'Todas','Canal',data.filtros.canal||'Todos','Estado',data.filtros.estado||'Todos'],['Moneda','Importe acordado','Reservas']];
 for(const r of data.porMoneda)filas.push([r.moneda,r.importe,r.cantidad]);
 filas.push(['Sin moneda acreditada','No sumado',data.sinMoneda],['Excluye canceladas y no show']);
 return '\ufeff'+filas.map(f=>f.map(celdaCsv).join(';')).join('\r\n');
}

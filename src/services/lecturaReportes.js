import {validarReporte} from './contratosOperativos.js';

export function parametrosReporte(filtros){
 const params=new URLSearchParams({periodo:filtros.periodo});
 if(filtros.periodo==='personalizado'){params.set('fechaDesde',filtros.fechaDesde);params.set('fechaHasta',filtros.fechaHasta);}
 else params.set('meses',filtros.periodo);
 for(const k of ['idPropiedad','canal','estado'])if(filtros[k])params.set(k,filtros[k]);
 return params.toString();
}
export function reporteParaFiltros(datos,filtros){
 const reporte=validarReporte(datos);
 for(const k of ['idPropiedad','canal','estado'])if(String(reporte.filtros[k]||'')!==String(filtros[k]||''))throw Error('El reporte recibido no corresponde a los filtros aplicados. Volvé a consultar.');
 if(filtros.periodo==='personalizado'&&(reporte.periodo.fechaDesde!==filtros.fechaDesde||reporte.periodo.fechaHasta!==filtros.fechaHasta))throw Error('El período recibido no corresponde a los filtros aplicados.');
 return reporte;
}
// Una lectura nueva invalida las respuestas anteriores, incluso si el transporte ignora abort().
export function crearLecturaReportes(cliente){
 let vigente;
 return {
  cancelar(){vigente?.abort();},
  async consultar(filtros,{inicio,exito,error,fin}){
   vigente?.abort();const control=new AbortController();vigente=control;inicio();
   try{
    const respuesta=await cliente.get(`/dashboard/reportes?${parametrosReporte(filtros)}`,{signal:control.signal});
    if(control.signal.aborted||vigente!==control)return;
    exito(reporteParaFiltros(respuesta.data.reportes,filtros));
   }catch(e){if(!control.signal.aborted&&vigente===control)error(e);}
   finally{if(!control.signal.aborted&&vigente===control)fin();}
  },
 };
}

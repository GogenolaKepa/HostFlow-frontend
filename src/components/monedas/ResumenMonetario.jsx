import {useEffect,useState} from 'react';
import api from '../../services/api';
import {useMonedas} from '../../context/MonedasContext';
import {usePermisos} from '../../context/PermisosContext';
import {fechaNegocio} from '../../services/monedasCalculos';
import {formatearTotalMonetario} from '../../services/importes';
import {resumenMonetarioValido,csvAcuerdos} from '../../services/resumenMonetario';
import {GraficoDistribucion} from '../reportes/GraficosReportes';
export default function ResumenMonetario({filtros={},exportable=false}){
 const {estado}=useMonedas(),permite=usePermisos(),[respuesta,setRespuesta]=useState(null),[error,setError]=useState(''),[intento,setIntento]=useState(0);
 const hoy=fechaNegocio(),[year,mes]=hoy.split('-').map(Number),finMes=new Date(Date.UTC(year,mes,0)).toISOString().slice(0,10);
 const clave=JSON.stringify({fechaDesde:filtros.fechaDesde||hoy.slice(0,7)+'-01',fechaHasta:filtros.fechaHasta||finMes,
  ...(filtros.idPropiedad?{idPropiedad:String(filtros.idPropiedad)}:{}),...(filtros.canal?{canal:filtros.canal}:{}),...(filtros.estado?{estado:filtros.estado}:{})});
 const data=respuesta?.clave===clave?respuesta.data:null;
 useEffect(()=>{
  if(!estado?.reservas||!permite('reportes.economia'))return;
  const controller=new AbortController();setRespuesta(null);setError('');const parametros=JSON.parse(clave);
  api.get('/monedas/resumen',{params:parametros,signal:controller.signal}).then(({data:r})=>{
   if(!resumenMonetarioValido(r,parametros))throw Error('Resumen incompleto');if(!controller.signal.aborted)setRespuesta({clave,data:r});
  }).catch(()=>{if(!controller.signal.aborted)setError('No se pudieron acreditar los importes por moneda. Las métricas operativas se conservan.');});return()=>controller.abort();
 },[clave,estado?.reservas,intento,permite]);
 const descargar=()=>{if(!data?.disponible||!permite('reportes.exportar'))return;const url=URL.createObjectURL(new Blob([csvAcuerdos(data)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`hostflow-acuerdos-${data.filtros.fechaDesde}-${data.filtros.fechaHasta}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <details className="monedas-resumen" aria-label="Importes acordados por moneda"><summary><h3>Importes acordados por moneda</h3><span className="monetary-module-status">{error?'Revisar consulta':data?.disponible?`${data.totalReservas} reservas · ${data.sinMoneda} sin moneda declarada`:'Ver detalle ARS / USD'}</span></summary><div className="monetary-module-body"><p className="monetary-description">Acuerdos de reservas con ingreso en el período. No son cobros: ARS y USD se muestran por separado, sin sumar equivalencias. Excluye Cancelada y No show.</p>
  {!estado?.reservas?<p>Acuerdos monetarios no activados. Los importes históricos continúan sin moneda acreditada.</p>:error?<p role="alert">{error}</p>:!data?<p role="status">Consultando acuerdos…</p>:!data.disponible?<p>{data.motivo}</p>:<>
   <p>{data.filtros.fechaDesde} → {data.filtros.fechaHasta}</p><div className="monetary-visual-grid"><div><div className="monetary-count"><strong>{(BigInt(data.totalReservas)-BigInt(data.sinMoneda)).toString()}</strong><span>reservas con moneda declarada</span></div><ul>{data.porMoneda.map(r=><li key={r.moneda}><strong>{formatearTotalMonetario(r.importe,r.moneda)}</strong> · {r.cantidad} reservas</li>)}</ul></div><div><h4>Composición por cantidad de reservas</h4><GraficoDistribucion titulo="Cantidad de acuerdos por moneda" filas={[...data.porMoneda.map(r=>({etiqueta:r.moneda,valor:r.cantidad})),{etiqueta:'Sin moneda',valor:data.sinMoneda}]}/></div></div>
   {data.porMoneda.length===0&&<p>Sin importes contractuales declarados en este periodo.</p>}<p>{data.sinMoneda} reservas sin moneda acreditada, excluidas de los totales. {data.totalReservas} reservas consideradas.</p>
   {exportable&&permite('reportes.exportar')&&<button type="button" className="secondary-button" onClick={descargar}>Exportar acuerdos por moneda (CSV)</button>}
  </>}
  {estado?.reservas&&<button type="button" className="secondary-button" onClick={()=>{setRespuesta(null);setIntento(i=>i+1);}}>Recargar importes acordados</button>}
 </div></details>;
}

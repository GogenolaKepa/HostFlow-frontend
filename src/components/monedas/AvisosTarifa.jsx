import {useEffect,useState} from 'react';
import api from '../../services/api';
import {usePermisos} from '../../context/PermisosContext';
export default function AvisosTarifa({onVerMonedas,onVerPropiedades}) {
 const permite=usePermisos();const [datos,setDatos]=useState(null),[error,setError]=useState(''),[intento,setIntento]=useState(0);
 useEffect(()=>{const c=new AbortController();api.get('/monedas/alertas',{signal:c.signal}).then(({data})=>{
  if(!Array.isArray(data.alertas)||typeof data.disponible!=='boolean')throw Error('Contrato incompleto');
  if(!c.signal.aborted){setDatos({...data,alertas:[...new Map(data.alertas.map(a=>[a.idPropiedad,a])).values()]});setError('');}
 }).catch(()=>{if(!c.signal.aborted)setError('No se pudieron consultar los avisos de tarifa.');});return()=>c.abort();},[intento]);
 return <details className="monedas-avisos" aria-label="Revisión de tarifas" open={Boolean(error)||Boolean(datos?.alertas.length)}>
  <summary><span>Revisión de tarifas</span><span className="monetary-module-status">{error?'Revisar consulta':!datos?'Consultando…':datos.alertas.length?`${datos.alertas.length} avisos de tarifa`:'Sin avisos de tarifa'}</span></summary>
  <div className="monetary-module-body"><p>La variación de referencia no cambia precios ni reservas. Los avisos se consultan aquí y en FlowIA; no son notificaciones personales.</p>
  <button type="button" className="secondary-button" onClick={()=>setIntento(i=>i+1)}>Recargar avisos de tarifa</button>
  {error?<p role="alert">{error}</p>:!datos?<p role="status">Consultando referencias…</p>:!datos.disponible?<p>{datos.motivo}</p>:<>
   {datos.alertas.length===0&&<p>No hay avisos calculables con las referencias disponibles. {datos.motivo}</p>}
   {datos.alertas.map(a=><article key={a.id} className="monedas-aviso"><h4>{a.propiedad}: {a.titulo}</h4><p>{a.mensaje}</p><p>{a.fuente} · {a.tipo} · {a.fecha}</p>
    {permite('configuracion.ver')?<button type="button" className="secondary-button" onClick={onVerMonedas}>Monedas y cotizaciones</button>:<button type="button" className="secondary-button" onClick={onVerPropiedades}>Ver propiedades</button>}</article>)}
  </>}
  </div>
 </details>;
}

import {useState} from 'react';
import {useMonedas} from '../../context/MonedasContext';
import {usePermisos} from '../../context/PermisosContext';
import {avisoMonetarioOculto,ocultarAvisoMonetario} from '../../services/avisosInterfaz';
export default function AvisoMonetarioInicio({idUsuario,onVerReportes,onVerMonedas}){
 const {estado}=useMonedas(),permite=usePermisos();
 const [oculto,setOculto]=useState(()=>avisoMonetarioOculto(idUsuario)),[temporal,setTemporal]=useState(false);
 if(oculto)return temporal?<p className="ux-storage-status" role="status">Aviso oculto durante esta visita. El navegador no pudo recordar tu elección.</p>:null;
 return <aside className="monetary-notice" aria-label="Información monetaria">
  <div><strong>Importes por moneda</strong><p>{estado?.reservas?'Consultá los acuerdos ARS/USD en Reportes. Los importes históricos sin moneda quedan fuera de esos totales.':'Los importes históricos siguen sin moneda declarada. Podés revisar la disponibilidad en Configuración.'}</p></div>
  <div className="page-actions">
   {permite('reportes.economia')&&<button type="button" className="secondary-button" onClick={onVerReportes}>Ver importes en Reportes</button>}
   {permite('configuracion.ver')&&<button type="button" className="ux-text-button" onClick={onVerMonedas}>Monedas y cotizaciones</button>}
   <button type="button" className="notice-dismiss" aria-label="Descartar aviso monetario" title="La información seguirá en Reportes y Configuración" onClick={()=>{setTemporal(!ocultarAvisoMonetario(idUsuario));setOculto(true);}}>×</button>
  </div>
 </aside>;
}

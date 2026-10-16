import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { guardarMovimiento, snapshotMovimiento, suscribirMovimiento } from '../../services/preferenciasNavegador';
import { SecurityIcon } from '../security/SecurityUI';
const servidor=()=> 'sistema';
export function PreferenciasNavegadorBootstrap(){
  const modo=useSyncExternalStore(suscribirMovimiento,snapshotMovimiento,servidor);
  useLayoutEffect(()=>{document.documentElement.dataset.reduceMotion=String(modo==='reducido');},[modo]);
  return null;
}
export default function PreferenciasGenerales(){
  const modo=useSyncExternalStore(suscribirMovimiento,snapshotMovimiento,servidor);
  const [estado,setEstado]=useState('');
  return <div className="settings-card general-preferences">
    <div className="settings-card-heading"><span className="settings-icon"><SecurityIcon name="person" /></span><div><h2>Preferencias generales</h2><p>Accesibilidad en este navegador.</p></div></div>
    <p>Esta preferencia se aplica a HostFlow en este navegador, incluso al volver a ingresar. No cambia tu cuenta, los datos de la empresa ni los horarios operativos.</p>
    <div className="settings-field"><label htmlFor="preferencia-movimiento">Animaciones y movimiento</label><select id="preferencia-movimiento" value={modo} onChange={e=>setEstado(guardarMovimiento(e.target.value)?'Preferencia guardada en este navegador.':'Aplicada temporalmente. El navegador no permitió conservarla.')}>
      <option value="sistema">Respetar preferencia del sistema</option><option value="reducido">Reducir movimiento</option>
    </select><p>Reducir movimiento desactiva las animaciones y los desplazamientos suaves. La opción del sistema respeta su configuración de accesibilidad.</p></div>
    <p role="status">{estado}</p>
    <dl className="settings-readonly"><div><dt>Fechas y horas operativas</dt><dd>Formato actual de HostFlow y zona America/Argentina/Buenos_Aires. No se modifican desde esta sección.</dd></div><div><dt>Aspecto visual</dt><dd>Claro, Oscuro y Automático se administran desde Apariencia.</dd></div></dl>
  </div>;
}

import { useEffect, useState } from 'react';
import api from '../services/api';
import { usePermisos } from '../context/PermisosContext';
import { SecurityDialog, SecurityIcon } from '../components/security/SecurityUI';
import '../styles/notifications.css';
import { avisosValidos, PRIORIDADES_AVISO, cantidadAvisos, estadoErrorNotificaciones } from '../services/notificaciones';

const fechaAviso = valor => {
  if(!valor||!Number.isFinite(new Date(valor).getTime()))return null;
  return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(valor));
};
export default function Notificaciones({ onNavegar }) {
  const permite=usePermisos();
  const [categoria,setCategoria]=useState('todas'),[prioridad,setPrioridad]=useState('todas'),[pagina,setPagina]=useState(1),[intento,setIntento]=useState(0);
  const [datos,setDatos]=useState(null),[cargando,setCargando]=useState(true),[error,setError]=useState(null),[gestion,setGestion]=useState(false);
  useEffect(()=>{
    if(!permite('notificaciones.ver'))return;
    const controller=new AbortController();setCargando(true);setError(null);
    const timer=setTimeout(()=>api.get('/notificaciones/avisos',{params:{categoria,prioridad,pagina,limite:20},signal:controller.signal}).then(({data})=>{
      if(controller.signal.aborted)return;
      if(!avisosValidos(data))throw Object.assign(Error('Contrato incompleto'),{codigo:'CONTRATO_INCOMPLETO'});
      if(pagina>data.paginacion.paginas){setPagina(data.paginacion.paginas);return;}
      setDatos(data);
    }).catch(e=>{if(!controller.signal.aborted)setError(estadoErrorNotificaciones(e));}).finally(()=>{if(!controller.signal.aborted)setCargando(false);}),120);
    return()=>{clearTimeout(timer);controller.abort();};
  },[categoria,prioridad,pagina,intento,permite]);
  if(!permite('notificaciones.ver'))return <section className="notifications-page"><h1>Notificaciones</h1><p>No tenés acceso a esta sección.</p></section>;
  const cambiar=(setter,valor)=>{setter(valor);setPagina(1);};
  return <section className="notifications-page" aria-busy={cargando}>
    <div className="notifications-heading"><div><span className="notifications-eyebrow"><SecurityIcon name="bell" />Tu operación, en contexto</span><h1>Notificaciones</h1><p>Avisos operativos disponibles</p></div>
      <button className="settings-button" type="button" disabled={cargando} onClick={()=>setIntento(n=>n+1)}>{cargando?(datos?'Actualizando…':'Cargando…'):'Actualizar avisos'}</button></div>
    <div className="notifications-scope"><SecurityIcon name="info" /><p>Consulta de alertas guardadas pendientes de resolución. No revalida su vigencia, no registra lecturas personales ni genera nuevos avisos al abrirse.</p></div>
    <div className="notifications-toolbar">
      <label>Categoría<select value={categoria} onChange={e=>cambiar(setCategoria,e.target.value)}><option value="todas">Todas las categorías</option><option value="reservas">Reservas</option><option value="alertas">Alertas operativas</option></select></label>
      <label>Prioridad<select value={prioridad} onChange={e=>cambiar(setPrioridad,e.target.value)}><option value="todas">Todas las prioridades</option>{Object.entries(PRIORIDADES_AVISO).map(([codigo,label])=><option key={codigo} value={codigo}>{label}</option>)}</select></label>
      {datos&&!cargando&&!error&&<p role="status">{cantidadAvisos(datos.paginacion.total)}</p>}
    </div>
    {error&&<div className="notifications-state" role="alert"><SecurityIcon name="alert" /><h2>{error.titulo}</h2><p>{error.descripcion}</p>{error.reintentar&&<button className="settings-button" disabled={cargando} onClick={()=>setIntento(n=>n+1)}>Reintentar</button>}</div>}
    {cargando&&<p className="notifications-loading" role="status">{datos?'Actualizando avisos guardados…':'Consultando avisos guardados…'}</p>}
    {!error&&!cargando&&datos&&(!datos.avisos.length?<div className="notifications-state" role="status"><SecurityIcon name="bell" /><h2>{datos.paginacion.totalSinFiltros>0?'Sin resultados para estos filtros':'No hay avisos para mostrar'}</h2><p>{datos.paginacion.totalSinFiltros>0?'Probá otra categoría o prioridad.':'Todavía no hay alertas activas guardadas disponibles para esta bandeja.'}</p></div>:<ul className="notifications-list" aria-label="Avisos operativos">
      {datos.avisos.map(aviso=><li className="notification-card" key={aviso.idAviso}>
        <span className="notification-icon"><SecurityIcon name={aviso.categoria==='reservas'?'calendar':'alert'} /></span>
        <div className="notification-content"><div className="notification-meta"><span>{aviso.categoria==='reservas'?'Reservas':'Alertas operativas'}</span><span className={`notification-priority notification-priority--${aviso.prioridad.toLowerCase()}`}>{PRIORIDADES_AVISO[aviso.prioridad]}</span></div>
          <h2>{aviso.titulo}</h2><p>{aviso.descripcion}</p>
          {fechaAviso(aviso.fecha)&&<time dateTime={aviso.fecha}>Registro original: {fechaAviso(aviso.fecha)} · Buenos Aires</time>}
        </div>
        {permite('alertas.ver')&&<button className="notification-action" type="button" onClick={()=>setGestion(true)} aria-label={`Abrir gestión de alertas: ${aviso.titulo}`}><span>Abrir gestión de alertas</span><SecurityIcon name="right" /></button>}
      </li>)}
    </ul>)}
    {datos&&!error&&<nav className="notifications-pagination" aria-label="Páginas de avisos"><button className="settings-button" disabled={cargando||pagina<=1} onClick={()=>setPagina(n=>n-1)}>Anterior</button><span>Página {pagina} de {datos.paginacion.paginas}</span><button className="settings-button" disabled={cargando||pagina>=datos.paginacion.paginas} onClick={()=>setPagina(n=>n+1)}>Siguiente</button></nav>}
    {gestion&&<SecurityDialog compact title="Abrir Centro de Alertas" description="El Centro de Alertas ejecuta sus sincronizaciones habituales y puede crear, actualizar o resolver alertas operativas al abrirse. Esta acción sale de la bandeja de solo lectura." onClose={()=>setGestion(false)}><footer className="security-dialog-actions"><button className="settings-button" onClick={()=>setGestion(false)}>Cancelar</button><button className="settings-button settings-button--primary" onClick={()=>{setGestion(false);onNavegar('alertas');}}>Abrir gestión</button></footer></SecurityDialog>}
  </section>;
}

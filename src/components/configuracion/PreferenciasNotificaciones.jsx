import CargaPagina from "../CargaPagina";
import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { usePermisos } from '../../context/PermisosContext';
import { useBorradorProtegido } from '../../context/BorradoresContext';
import { SecurityDialog, SecurityFeedback, SecurityIcon } from '../security/SecurityUI';
import { preferenciasValidas, guardadoPreferenciasValido, TIPOS_NOTIFICACION, estadoErrorNotificaciones } from '../../services/notificaciones';
import '../../styles/notifications.css';

export default function PreferenciasNotificaciones({onNavegar}) {
  const permite=usePermisos(),enviando=useRef(false);
  const [data,setData]=useState(null),[original,setOriginal]=useState(null),[intento,setIntento]=useState(0);
  const [cargando,setCargando]=useState(true),[guardando,setGuardando]=useState(false),[confirmar,setConfirmar]=useState(false);
  const [error,setError]=useState(''),[pendiente,setPendiente]=useState(false),[conflicto,setConflicto]=useState(false),[mensaje,setMensaje]=useState('');
  const dirty=Boolean(data&&original&&JSON.stringify(data.preferencias)!==JSON.stringify(original.preferencias));
  useBorradorProtegido(dirty,guardando);
  useEffect(()=>{
    if(!permite('notificaciones.preferencias'))return;
    const controller=new AbortController();setCargando(true);setError('');setPendiente(false);
    api.get('/notificaciones/preferencias',{signal:controller.signal}).then(({data:res})=>{
      if(controller.signal.aborted)return;if(!preferenciasValidas(res))throw Object.assign(Error('Respuesta incompleta'),{codigo:'CONTRATO_INCOMPLETO'});
      setData(res);setOriginal(res);setConflicto(false);setMensaje('');
    }).catch(e=>{if(!controller.signal.aborted){const estado=estadoErrorNotificaciones(e);setPendiente(estado.reintentar?null:estado);setData(null);setOriginal(null);setError(`${estado.titulo}. ${estado.descripcion}`);}})
      .finally(()=>{if(!controller.signal.aborted)setCargando(false);});
    return()=>controller.abort();
  },[intento,permite]);
  const guardar=async()=>{
    if(enviando.current)return;enviando.current=true;setGuardando(true);setError('');setMensaje('');
    try{
      const solicitadas=data.preferencias.map(({tipo,habilitada,versionRegistro})=>({tipo,habilitada,versionRegistro}));
      const {data:res}=await api.put('/notificaciones/preferencias',{preferencias:solicitadas});
      if(!guardadoPreferenciasValido(res,solicitadas))throw Error('Confirmación incompleta');setData(res);setOriginal(res);setMensaje('Preferencias guardadas.');
    }catch(e){
      const codigo=e.response?.data?.codigo;
      setError(codigo==='NOTIFICACIONES_CONFLICTO'?'Otra sesión cambió tus preferencias. Tu borrador se conserva; recargá antes de guardar.':'No pudimos confirmar el guardado. Recargá para comprobar el estado antes de reintentar.');
      setConflicto(true);
      if(['NOTIFICACIONES_SOLO_LECTURA','NOTIFICACIONES_NO_ACTIVADAS','NOTIFICACIONES_MODELO_PENDIENTE'].includes(codigo))setData(d=>({...d,estado:{persistencia:'sql',soloLectura:true}}));
    }finally{enviando.current=false;setGuardando(false);setConfirmar(false);}
  };
  if(!permite('notificaciones.preferencias'))return <p>No tenés acceso a estas preferencias.</p>;
  const editable=data&&!data.estado.soloLectura&&!cargando;
  return <div className="settings-card notification-settings" aria-busy={cargando||guardando}>
    <div className="settings-card-heading"><span className="settings-icon"><SecurityIcon name="bell" /></span><div><h2>Preferencias de notificaciones</h2><p>Preferencias personales de tu cuenta.</p></div></div>
    <p>Estas opciones se aplicarán a futuras notificaciones personales. No silencian la bandeja operativa actual, la detección de conflictos ni las limpiezas.</p>
    {cargando?<CargaPagina variante="preferencias" />:pendiente?<div className="settings-activation" role="status"><h3>{pendiente.titulo}</h3><p>{pendiente.descripcion}</p></div>:<>
      {error&&<SecurityFeedback error>{error}</SecurityFeedback>}{mensaje&&<SecurityFeedback>{mensaje}</SecurityFeedback>}
      {data?<form onSubmit={e=>{e.preventDefault();if(editable&&dirty&&!conflicto&&!enviando.current)setConfirmar(true);}}>
        {data.estado.soloLectura&&<p role="status">Preferencias en modo de solo lectura.</p>}
        {data.preferencias.some(p=>!p.persistida)&&<p>Todavía hay opciones sin una preferencia guardada. Inicialmente se muestran desactivadas, sin representar una elección previa.</p>}
        <fieldset className="notification-preferences" disabled={!editable||guardando}><legend className="sr-only">Tipos de avisos personales</legend>
          {data.preferencias.map(p=><label key={p.tipo}><input type="checkbox" checked={p.habilitada} onChange={e=>setData(d=>({...d,preferencias:d.preferencias.map(x=>x.tipo===p.tipo?{...x,habilitada:e.target.checked}:x)}))} /><span><strong>{TIPOS_NOTIFICACION[p.tipo][0]}</strong><small>{TIPOS_NOTIFICACION[p.tipo][1]}</small></span></label>)}
        </fieldset><div className="settings-form-actions"><span>{dirty?'Cambios sin guardar':'Sin cambios pendientes'}</span><button className="settings-button" type="button" disabled={guardando} onClick={()=>dirty?setConfirmar('recargar'):setIntento(n=>n+1)}>Recargar preferencias</button>
          {editable&&<button className="settings-button settings-button--primary" disabled={guardando||!dirty||conflicto}>Guardar preferencias</button>}</div>
      </form>:<button className="settings-button" onClick={()=>setIntento(n=>n+1)}>Reintentar consulta</button>}
    </>}
    {permite('notificaciones.ver')&&<button className="settings-button" type="button" disabled={guardando} onClick={()=>onNavegar('notificaciones')}>Ir al centro de notificaciones</button>}
    <p className="settings-required">Las políticas empresariales y la producción de notificaciones personales requieren una etapa posterior. No se envían emails, SMS o push.</p>
    {confirmar&&<SecurityDialog compact title={confirmar==='recargar'?'Descartar preferencias pendientes':'Guardar preferencias personales'} description={confirmar==='recargar'?'Se perderán las opciones que todavía no guardaste.':'Se actualizarán únicamente las preferencias de tu cuenta.'} busy={guardando} onClose={()=>setConfirmar(false)}>
      <footer className="security-dialog-actions"><button className="settings-button" disabled={guardando} onClick={()=>setConfirmar(false)}>Cancelar</button><button className="settings-button settings-button--primary" disabled={guardando} onClick={()=>{if(confirmar==='recargar'){setConfirmar(false);setData(original);setIntento(n=>n+1);}else guardar();}}>{guardando?'Guardando…':confirmar==='recargar'?'Descartar y recargar':'Confirmar guardado'}</button></footer>
    </SecurityDialog>}
  </div>;
}

import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { usePermisos } from '../../context/PermisosContext';
import { validarConfiguracion, mensajeConfiguracion, respuestaConfiguracionValida, estadoConfiguracionValido } from '../../services/configuracion';
import { SecurityDialog, SecurityFeedback, SecurityIcon } from '../security/SecurityUI';
import FormularioEmpresa from './FormularioEmpresa';
import FormularioOperativas from './FormularioOperativas';
import { useBorradorProtegido } from '../../context/BorradoresContext';

const detalle = {
  empresa: { title: 'Datos de empresa', icon: 'building', description: 'Información de contacto e identidad de tu negocio.', key: 'empresa' },
  operativas: { title: 'Preferencias operativas', icon: 'calendar', description: 'Horarios iniciales para nuevas reservas manuales.', key: 'preferencias' },
};

export default function PanelConfiguracion({ tipo }) {
  const permite = usePermisos();
  const [datos,setDatos] = useState(null), [original,setOriginal] = useState(null);
  const [estadoPersistencia,setEstadoPersistencia] = useState(null);
  const [cargando,setCargando] = useState(true), [guardando,setGuardando] = useState(false);
  const [error,setError] = useState(''), [codigo,setCodigo] = useState(''), [mensaje,setMensaje] = useState('');
  const [errores,setErrores] = useState({}), [confirmacion,setConfirmacion] = useState(null), [intento,setIntento] = useState(0);
  const { title,icon,description,key } = detalle[tipo];
  const pendiente = ['CONFIGURACION_PENDIENTE','EMPRESA_NO_CONFIGURADA','MODELO_CONFIGURACION_PENDIENTE','CONFIGURACION_SQL_REQUERIDA'].includes(codigo);
  const dirty = Boolean(datos && original && JSON.stringify(datos)!==JSON.stringify(original));
  const estadoValido = estadoConfiguracionValido(estadoPersistencia);
  const editable = permite('configuracion.modificar') && estadoValido && !estadoPersistencia.soloLectura;
  const envioEnCurso = useRef(false);
  const requiereRecarga = ['CONFIGURACION_CONFLICTO','CONFIGURACION_CONFIRMACION_PENDIENTE'].includes(codigo);

  useBorradorProtegido(dirty, guardando);
  useEffect(() => {
    const controller = new AbortController();
    setCargando(true); setError(''); setCodigo(''); setDatos(null); setOriginal(null); setMensaje(''); setEstadoPersistencia(null);
    api.get(`/configuracion/${tipo}`,{signal:controller.signal}).then(({data})=>{
      if(controller.signal.aborted) return;
      const actual = data[key];
      if(!respuestaConfiguracionValida(tipo,actual)) throw Error('Respuesta incompleta.');
      setDatos(actual); setOriginal(actual);
      setEstadoPersistencia(estadoConfiguracionValido(data.estado) ? data.estado : null);
    }).catch(e=>{if(!controller.signal.aborted){setError(mensajeConfiguracion(e));setCodigo(e.response?.data?.codigo || '');}})
      .finally(()=>{if(!controller.signal.aborted)setCargando(false);});
    return () => controller.abort();
  },[tipo,key,intento]);

  const cambio = event => {
    const {name,value}=event.target;
    setDatos(actual=>({...actual,[name]:value})); setErrores(actual=>({...actual,[name]:undefined})); setMensaje('');
  };
  const solicitarGuardado = event => {
    event.preventDefault();
    if (envioEnCurso.current || !editable || !dirty || requiereRecarga) return;
    const validacion = validarConfiguracion(tipo,datos); setErrores(validacion); setMensaje('');
    if(Object.keys(validacion).length) { setError('Revisá los campos indicados antes de guardar.'); return; }
    setError(''); setConfirmacion('guardar');
  };
  const guardar = async () => {
    if (envioEnCurso.current) return;
    envioEnCurso.current = true;
    setGuardando(true); setError(''); setMensaje('');
    try {
      const payload = {...datos}; delete payload.zonaHoraria;
      const { data } = await api.put(`/configuracion/${tipo}`,payload);
      if(!respuestaConfiguracionValida(tipo,data?.[key])) throw Object.assign(Error('Respuesta incompleta.'), { codigo: 'CONFIGURACION_CONFIRMACION_PENDIENTE' });
      setDatos(data[key]); setOriginal(data[key]); setCodigo(''); setMensaje('Cambios guardados correctamente.');
    } catch(e) {
      setError(mensajeConfiguracion(e));setCodigo(e.response?.data?.codigo || e.codigo || '');
      if(e.response?.data?.codigo === 'CONFIGURACION_SOLO_LECTURA') setEstadoPersistencia({persistencia:'sql',soloLectura:true});
    }
    finally { envioEnCurso.current = false; setGuardando(false); setConfirmacion(null); }
  };
  const descartar = () => { setDatos(original);setErrores({});setMensaje('');setError(''); };
  const confirmar = () => {
    if(confirmacion==='guardar') return guardar();
    setConfirmacion(null); descartar(); if(confirmacion==='recargar')setIntento(i=>i+1);
  };

  return <div className="settings-card settings-editor" aria-busy={cargando||guardando}>
    <div className="settings-card-heading"><span className="settings-icon"><SecurityIcon name={icon} /></span><div><h2>{title}</h2><p>{description}</p></div></div>
    {cargando ? <p role="status">Cargando configuración…</p> : !datos ? <div className="settings-activation">
      <SecurityIcon name={pendiente?'shield':'alert'} /><h3>{pendiente?'Pendiente de activar persistencia':'No pudimos cargar la configuración'}</h3><p role="alert">{error}</p>
      {pendiente && <p>Esta sección requiere la vinculación SQL aprobada. No se realizan guardados simulados ni se crean datos al abrirla.</p>}
      <button className="settings-button" type="button" onClick={()=>setIntento(i=>i+1)}>Reintentar</button>
    </div> : <>
      <div className={`settings-persistence ${editable?'':'settings-persistence--readonly'}`} role="status">
        <SecurityIcon name={editable?'check':'lock'} /><div><strong>{!estadoValido?'Guardado no disponible':estadoPersistencia.soloLectura?'Conectada · Solo lectura temporal':'Configuración empresarial conectada'}</strong>
          <p>{!estadoValido?'El servidor no informó la disponibilidad del guardado. Podés consultar los datos; recargá antes de intentar editarlos.':estadoPersistencia.soloLectura?'Los datos se consultan desde la empresa vinculada. El guardado está bloqueado temporalmente por el servidor.':'Los cambios confirmados se guardan para esta instalación. La apariencia se conserva únicamente en este navegador.'}</p></div>
      </div>
      {error && <SecurityFeedback error>{error}{requiereRecarga && <p>Tu borrador se conserva. Recargá para obtener la versión actual.</p>}</SecurityFeedback>}
      {mensaje && <SecurityFeedback>{mensaje}</SecurityFeedback>}
      <form onSubmit={solicitarGuardado} noValidate>
        {editable && <p className="settings-required">{tipo==='empresa'?'Solo el nombre comercial es obligatorio; completá los demás datos si corresponden.':'Ambos horarios son obligatorios.'}</p>}
        {tipo==='empresa' ? <FormularioEmpresa datos={datos} onChange={cambio} errores={errores} disabled={guardando||!editable} /> : <FormularioOperativas datos={datos} onChange={cambio} errores={errores} disabled={guardando||!editable} />}
        <div className="settings-form-actions"><span role="status">{guardando?'Guardando…':dirty?'Hay cambios sin guardar':'Sin cambios pendientes'}</span>
          <button className="settings-button" type="button" disabled={guardando} onClick={()=>dirty?setConfirmacion('recargar'):setIntento(i=>i+1)}>Recargar datos</button>
          <button className="settings-button" type="button" disabled={guardando||!dirty} onClick={()=>setConfirmacion('descartar')}>Descartar</button>
          {editable && <button className="settings-button settings-button--primary" type="submit" disabled={guardando||!dirty||requiereRecarga}>Guardar cambios</button>}
        </div>
      </form>
    </>}
    {confirmacion && <SecurityDialog compact title={confirmacion==='guardar'?`Guardar ${title.toLowerCase()}`:'Descartar cambios pendientes'}
      description={confirmacion==='guardar'?(tipo==='empresa'?'Se actualizará la información de la empresa vinculada a esta instalación.':'Estos horarios se propondrán en nuevas reservas manuales. Las reservas existentes y los canales mantienen sus horarios.'):'Se perderán los cambios que todavía no guardaste.'}
      busy={guardando} onClose={()=>setConfirmacion(null)}>
      <footer className="security-dialog-actions"><button type="button" className="settings-button" disabled={guardando} onClick={()=>setConfirmacion(null)}>Cancelar</button><button type="button" className="settings-button settings-button--primary" disabled={guardando} onClick={confirmar}>{guardando?'Guardando…':confirmacion==='guardar'?'Confirmar guardado':'Descartar cambios'}</button></footer>
    </SecurityDialog>}
  </div>;
}

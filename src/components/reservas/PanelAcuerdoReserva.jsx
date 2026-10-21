import {useCallback,useEffect,useRef,useState} from 'react';
import api from '../../services/api';
import {usePermisos} from '../../context/PermisosContext';
import {useMonedas} from '../../context/MonedasContext';
import {useBorradorProtegido,useProtectorBorradores} from '../../context/BorradoresContext';
import {SecurityDialog} from '../security/SecurityUI';
import FormularioAcuerdo from './FormularioAcuerdo';
import {acuerdoVacio,acuerdoFormulario,acuerdoValido,formularioDesdeAcuerdo} from '../../services/acuerdosMonetarios';
import {cotizacionValida,fechaNegocio,convertir} from '../../services/monedasCalculos';
import {formatearImporte} from '../../services/importes';
const ADVERTENCIA='Esta cotización fue establecida manualmente por el administrador y puede diferir de los valores publicados por entidades financieras. HostFlow no verifica su exactitud. Se recomienda utilizar fuentes oficiales y revisar los importes antes de confirmar operaciones.';
const fechaHora=v=>v&&Number.isFinite(new Date(v).getTime())?new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'No informada';
export default function PanelAcuerdoReserva({reserva,onActualizado}){
 const permite=usePermisos(),{estado}=useMonedas(),{protector}=useProtectorBorradores();
 const [acuerdo,setAcuerdo]=useState(undefined),[form,setForm]=useState(acuerdoVacio),[editando,setEditando]=useState(false);
 const [error,setError]=useState(''),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false),[bloqueado,setBloqueado]=useState(false),[confirmar,setConfirmar]=useState('');
 const [leyendo,setLeyendo]=useState(false);
 const [cotizacion,setCotizacion]=useState(null),[aceptarUltima,setAceptarUltima]=useState(false),[aceptarManual,setAceptarManual]=useState(false);
 const envio=useRef(false),montado=useRef(true),lectura=useRef(null);
 const habilitado=estado?.reservas===true&&reserva.canal==='Manual'&&permite('reservas.importes');
 const dirty=editando&&JSON.stringify(form)!==JSON.stringify(formularioDesdeAcuerdo(acuerdo));
 useBorradorProtegido(dirty,ocupado);
 const cargar=useCallback(async()=>{
  lectura.current?.abort();const controller=new AbortController();lectura.current=controller;const signal=controller.signal;
  setLeyendo(true);
  try{const {data}=await api.get(`/monedas/reservas/${reserva.idReserva}/acuerdo`,{signal});
   if(data.acuerdo!==null&&!acuerdoValido(data.acuerdo,reserva.idReserva))throw Error('Contrato monetario incompleto.');
   if(!signal?.aborted&&montado.current){setAcuerdo(data.acuerdo);setError('');setBloqueado(false);setEditando(false);setCotizacion(null);}
  }catch(e){if(!signal?.aborted&&montado.current){setError(e.response?.data?.mensaje||'No se pudo comprobar el acuerdo. No se presume un guardado.');setBloqueado(true);}}
  finally{if(!signal?.aborted&&montado.current)setLeyendo(false);}
 },[reserva.idReserva]);
 useEffect(()=>{montado.current=true;if(habilitado)cargar();return()=>{montado.current=false;lectura.current?.abort();};},[cargar,habilitado]);
 const operar=async accion=>{
  if(envio.current||bloqueado)return;envio.current=true;setOcupado(true);setError('');setMensaje('');
  try{await accion();}catch(e){if(montado.current){setError(e.response?.data?.mensaje||e.message||'No se pudo completar la operación.');if(!e.response||e.response.status===409||e.response.status>=500)setBloqueado(true);}}
  finally{envio.current=false;if(montado.current){setOcupado(false);setConfirmar('');}}
 };
 const consultar=()=>operar(async()=>{
  setCotizacion(null);setAceptarUltima(false);setAceptarManual(false);
  const oficial=acuerdo.fuenteReferencia==='BCRA';
  const {data}=oficial?await api.post('/monedas/consultar-bcra',{confirmar:true}):await api.get('/monedas/configuracion');
  const q=oficial?data.cotizacion:data.configuracion;
  if(!cotizacionValida(q)||q.fuente!==acuerdo.fuenteReferencia)throw Error('No hay cotización válida de la fuente acordada.');
  setCotizacion(q);
 });
 const guardar=()=>operar(async()=>{
  const {data}=await api.put(`/monedas/reservas/${reserva.idReserva}/acuerdo`,{acuerdo:acuerdoFormulario(form),revision:acuerdo?.versionRegistro||null});
  if(!acuerdoValido(data.acuerdo,reserva.idReserva))throw Error('No se recibió confirmación completa. Recargá antes de reintentar.');
  setAcuerdo(data.acuerdo);setEditando(false);setCotizacion(null);setMensaje('Acuerdo confirmado con historial. No se registró ningún pago.');await onActualizado?.(data.acuerdo);
 });
 const fijar=()=>operar(async()=>{
  const body={revision:acuerdo.versionRegistro,confirmar:true,aceptarUltimaOficial:aceptarUltima,...(acuerdo.fuenteReferencia==='BCRA'?{cotizacionId:cotizacion.id}:{confirmarManual:aceptarManual})};
  const {data}=await api.post(`/monedas/reservas/${reserva.idReserva}/fijacion`,body);
  if(!acuerdoValido(data.acuerdo,reserva.idReserva)||data.acuerdo.estadoFijacion!=='FIJADA')throw Error('No se pudo acreditar la fijación. Recargá antes de reintentar.');
  setAcuerdo(data.acuerdo);setCotizacion(null);setMensaje('Cotización fijada una sola vez con historial. El importe original permanece intacto.');await onActualizado?.(data.acuerdo);
 });
 const cerrada=!['Confirmada','Pendiente'].includes(reserva.estado),editable=habilitado&&estado.acuerdosEscritura===true&&!cerrada&&!bloqueado&&!ocupado&&!leyendo;
 let estimacion='';try{if(acuerdo&&cotizacion)estimacion=convertir(acuerdo.importe,'USD','ARS',cotizacion.valor);}catch{/* Falta una referencia válida. */}
 if(reserva.canal!=='Manual')return <section className="reservation-detail-card"><h4>Moneda contractual</h4><p>El canal no informó una moneda acreditada. No se convierte su importe.</p></section>;
 if(!habilitado)return <section className="reservation-detail-card"><h4>Acuerdo monetario</h4><p>{!permite('reservas.importes')?'Los importes y la fijación se consultan con los permisos económicos existentes.':'Persistencia de acuerdos deshabilitada; no se presume moneda ni cotización para esta reserva.'}</p></section>;
 return <section className="reservation-detail-card reservation-detail-card--wide monedas-panel monedas-reserva">
  <h4>Acuerdo monetario de la reserva</h4>{error&&<p role="alert" className="error">{error}</p>}{mensaje&&<p role="status" className="success-message">{mensaje}</p>}
  {bloqueado&&<p role="alert">Recargá el acuerdo antes de volver a guardar; no se reenvía automáticamente.</p>}
  <button type="button" className="secondary-button" disabled={ocupado} onClick={()=>protector.solicitar(()=>cargar())}>Recargar acuerdo</button>
  {acuerdo===undefined?<p>Consultando acuerdo…</p>:acuerdo===null?<p>Sin acuerdo declarado. El monto estimado histórico no acredita una moneda ni se transforma automáticamente en contrato.</p>:<dl className="monedas-cotizacion">
   <dt>Importe original acordado</dt><dd>{formatearImporte(acuerdo.importe,acuerdo.moneda)}</dd><dt>Moneda de pago / regla</dt><dd>{acuerdo.monedaPago} / {acuerdo.reglaCambio}</dd><dt>Estado de fijación</dt><dd>{acuerdo.estadoFijacion}</dd>
   <dt>Fuente acordada</dt><dd>{acuerdo.fuenteReferencia||'Sin conversión'}</dd><dt>Autor del acuerdo</dt><dd>#{acuerdo.idAutor} · {fechaHora(acuerdo.fechaAcuerdo)}</dd>
   {acuerdo.fijadoEn&&<><dt>Valor / fecha efectiva</dt><dd>{acuerdo.valorAplicado} · {acuerdo.fechaEfectiva} · {acuerdo.fuenteAplicada} / {acuerdo.tipoAplicado}</dd><dt>Equivalente fijado, sin cobro</dt><dd>{formatearImporte(acuerdo.equivalenteARS,'ARS')}</dd><dt>Fijación</dt><dd>#{acuerdo.idUsuarioFijacion} · {fechaHora(acuerdo.fijadoEn)}</dd></>}
  </dl>}
  {cerrada&&<p>La reserva está {reserva.estado}. Su acuerdo e historial se conservan; no se reabre ni se fija una nueva cotización.</p>}
  {!estado.acuerdosEscritura&&<p>Modo de solo lectura: las acciones de acuerdo y fijación están deshabilitadas.</p>}
  {editable&&!acuerdo?.fijadoEn&&!editando&&acuerdo!==undefined&&<button type="button" className="secondary-button" onClick={()=>{setForm(formularioDesdeAcuerdo(acuerdo));setEditando(true);setMensaje('');}}>{acuerdo?'Revisar acuerdo':'Declarar acuerdo explícito'}</button>}
  {editando&&<><FormularioAcuerdo valor={form} onChange={setForm} disabled={!editable} prefijo="revisar-acuerdo" /><button type="button" className="primary-button" disabled={!editable} onClick={()=>{try{acuerdoFormulario(form);setConfirmar('guardar');setError('');}catch(e){setError(e.message);}}}>Revisar y confirmar acuerdo</button><button type="button" className="secondary-button" disabled={ocupado} onClick={()=>protector.solicitar(()=>setEditando(false))}>Cancelar edición del acuerdo</button></>}
  {acuerdo?.pagoEquivalenteARS&&!acuerdo.fijadoEn&&!cerrada&&<>
   <p>Check-in {reserva.fechaIngreso}. Antes de ese día solo se muestra una estimación; no se registra como pago ni valor definitivo.</p>
   <button type="button" className="secondary-button" disabled={!editable||editando} onClick={consultar}>{acuerdo.fuenteReferencia==='BCRA'?'Consultar BCRA para este acuerdo':'Ver cotización manual guardada'}</button>
   {cotizacion&&<><p className="monedas-estimacion">{formatearImporte(estimacion,'ARS')} — estimación NO fijada · {cotizacion.fuente} / {cotizacion.tipo} · fecha {cotizacion.fecha} · publicación: {cotizacion.horaPublicacion||'hora no informada'} · consulta: {String(cotizacion.consultadaEn||'')}</p>
    {cotizacion.fecha<reserva.fechaIngreso&&cotizacion.fuente==='BCRA'&&<label><input type="checkbox" checked={aceptarUltima} onChange={e=>setAceptarUltima(e.target.checked)} />No hay publicación acreditada del check-in: acepto la última oficial de fecha {cotizacion.fecha}</label>}
    {cotizacion.fuente==='MANUAL'&&<><p className="monedas-advertencia">{ADVERTENCIA}</p><label><input type="checkbox" checked={aceptarManual} onChange={e=>setAceptarManual(e.target.checked)} />Confirmo el uso de esta cotización manual y su advertencia</label></>}
    {cotizacion.fecha>reserva.fechaIngreso&&<p>No se reconstruye un check-in pasado con una cotización posterior.</p>}
    <button type="button" className="primary-button" disabled={!editable||editando||reserva.fechaIngreso>fechaNegocio()||cotizacion.fecha>reserva.fechaIngreso||(cotizacion.fuente==='MANUAL'&&!aceptarManual)||(cotizacion.fecha<reserva.fechaIngreso&&!aceptarUltima)} onClick={()=>setConfirmar('fijar')}>Fijar cotización de check-in</button>
   </>}
  </>}
  {confirmar&&<SecurityDialog title={confirmar==='guardar'?'Confirmar acuerdo monetario':'Fijar cotización una sola vez'} description={confirmar==='guardar'?`${formatearImporte(form.importe,form.moneda)}. Esta acción no modifica el monto estimado ni registra un pago.`:`Se conservará el importe USD y el snapshot ${cotizacion?.fuente}, ${cotizacion?.fecha}, ${cotizacion?.valor}. La fijación será inmutable.`} busy={ocupado} onClose={()=>{if(!ocupado)setConfirmar('');}}><button type="button" className="secondary-button" disabled={ocupado} onClick={()=>setConfirmar('')}>Cancelar</button><button type="button" className="primary-button" disabled={ocupado} onClick={confirmar==='guardar'?guardar:fijar}>Confirmar</button></SecurityDialog>}
 </section>;
}

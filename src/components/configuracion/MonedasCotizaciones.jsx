import {useEffect,useRef,useState} from 'react';
import api from '../../services/api';
import {useMonedas} from '../../context/MonedasContext';
import {usePermisos} from '../../context/PermisosContext';
import {useBorradorProtegido} from '../../context/BorradoresContext';
import {SecurityDialog} from '../security/SecurityUI';
import {convertir,unidades,decimal,fechaNegocio,fijarCheckin,cotizacionValida} from '../../services/monedasCalculos';
import {formatearImporte} from '../../services/importes';
import {tarifaModificada} from '../../services/borradorTarifa';
import {vistaBnaValida} from '../../services/vistaBna';
import {MAX_NOCHES,resolverTarifa,presupuestoEstadia,referenciaInformativa} from '../../services/simuladorEstadia';
const ADVERTENCIA='Esta cotización fue establecida manualmente por el administrador y puede diferir de los valores publicados por entidades financieras. HostFlow no verifica su exactitud. Se recomienda utilizar fuentes oficiales y revisar los importes antes de confirmar operaciones.';
const revisionValida=valor=>typeof valor==='string'&&/^[a-f0-9]{16}$/i.test(valor);
const fechaHora=valor=>valor?new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'}).format(new Date(valor)):'No informada';
const cotizacionVisible=valor=>{const [entero,decimales='']=valor.split('.');return `ARS ${new Intl.NumberFormat('es-AR').format(BigInt(entero))},${decimales.replace(/0+$/,'').padEnd(2,'0')}`;};
export default function MonedasCotizaciones() {
 const {estado,tarifas,error:errorEstado,recargar}=useMonedas(),permite=usePermisos();
 const [fuente,setFuente]=useState('MANUAL'),[valor,setValor]=useState(''),[cotizacion,setCotizacion]=useState(null),[config,setConfig]=useState(null),[configLeida,setConfigLeida]=useState(false);
 const [error,setError]=useState(''),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false),[confirmar,setConfirmar]=useState(null),[referenciaDirty,setReferenciaDirty]=useState(false);
 const [propiedades,setPropiedades]=useState([]),[id,setId]=useState(''),[moneda,setMoneda]=useState(''),[precio,setPrecio]=useState('');
 const [tarifaBase,setTarifaBase]=useState(null),[propiedadPendiente,setPropiedadPendiente]=useState(null);
 const tarifaDirty=tarifaModificada(moneda,precio,tarifaBase);
 const [importe,setImporte]=useState(''),[origen,setOrigen]=useState('USD'),[equivalencia,setEquivalencia]=useState(null);
 const [noches,setNoches]=useState('1'),[importeCheckin,setImporteCheckin]=useState('');
 const [fechaCheckin,setFechaCheckin]=useState(''),[acuerdo,setAcuerdo]=useState(false),[ultima,setUltima]=useState(false),[fijacion,setFijacion]=useState(null);
 const bloqueo=useRef(false),referenciaEditada=useRef(false),[invalida,setInvalida]=useState(false);
 const editable=estado?.escritura===true&&configLeida&&permite('configuracion.modificar')&&!invalida;
 useBorradorProtegido(referenciaDirty||tarifaDirty,ocupado);
 useEffect(()=>{const c=new AbortController();api.get('/propiedades',{signal:c.signal}).then(({data})=>{
  if(!Array.isArray(data.propiedades))throw Error('Lista incompleta');if(!c.signal.aborted)setPropiedades(data.propiedades);
 }).catch(()=>{if(!c.signal.aborted)setError('No se pudieron cargar las propiedades para seleccionar su tarifa.');});return()=>c.abort();},[]);
 useEffect(()=>{if(!estado?.activado){setConfigLeida(false);return;}const c=new AbortController();
  api.get('/monedas/configuracion',{signal:c.signal}).then(({data})=>{
   if(data.configuracion!==null&&(!cotizacionValida(data.configuracion)||!revisionValida(data.configuracion.versionRegistro)))throw Error('Contrato incompleto');
   if(!c.signal.aborted){setConfig(data.configuracion);if(!referenciaEditada.current){setCotizacion(data.configuracion);setFuente(data.configuracion?.fuente||'MANUAL');setValor(data.configuracion?.fuente==='MANUAL'?data.configuracion.valor:'');}setConfigLeida(true);}
  }).catch(()=>{if(!c.signal.aborted){setConfigLeida(false);setError('No se pudo cargar la configuración monetaria. El guardado permanece bloqueado.');}});return()=>c.abort();
 },[estado?.activado]);
 const cambiar=(setter,v)=>{setter(v);setReferenciaDirty(true);setMensaje('');setError('');};
 const ejecutar=async accion=>{if(bloqueo.current)return;bloqueo.current=true;setOcupado(true);setError('');setMensaje('');try{await accion();}catch(e){setError(e.response?.data?.mensaje||e.message||'No se pudo completar la operación.');if(e.response?.status===409||e.response?.data?.codigo==='OPERACION_RESULTADO_INCIERTO')setInvalida(true);}finally{bloqueo.current=false;setOcupado(false);setConfirmar(null);}};
 const consultar=()=>ejecutar(async()=>{setCotizacion(null);setEquivalencia(null);setFijacion(null);const {data}=await api.post('/monedas/consultar-bcra',{confirmar:true});if(!cotizacionValida(data.cotizacion)||data.persistida!==false)throw Error('La fuente devolvió una respuesta incompleta.');setCotizacion(data.cotizacion);setMensaje('Consulta oficial informativa, todavía no guardada.');});
 const consultarBna=()=>ejecutar(async()=>{setCotizacion(null);setEquivalencia(null);setFijacion(null);const {data}=await api.post('/monedas/consultar-bna',{confirmar:true}).catch(e=>{if(!e.response)throw Error('No se pudo consultar Banco Nación vía MonedAPI. No hay una referencia nueva disponible.');throw e;});if(!vistaBnaValida(data.cotizacion)||data.persistida!==false)throw Error('MonedAPI devolvió una respuesta incompatible. Contrastá en la web oficial del Banco Nación.');setCotizacion(data.cotizacion);setMensaje('Venta informativa reportada por MonedAPI; no guardada.');});
 const prepararManual=()=>{try{if(unidades(valor,8)<=0n)throw Error('La cotización debe ser positiva.');setError('');setConfirmar('manual');}catch(e){setError(e.message);}};
 const guardar=()=>ejecutar(async()=>{
  if(!editable||!cotizacion||!['MANUAL','BCRA'].includes(cotizacion.fuente))throw Error('La escritura todavía no está habilitada o la fuente no admite guardado.');
  const body=cotizacion.fuente==='MANUAL'?{fuente:'MANUAL',valor:cotizacion.valor,confirmarManual:true,revision:config?.versionRegistro||null}:{fuente:'BCRA',cotizacionId:cotizacion.id,revision:config?.versionRegistro||null};
  const {data}=await api.put('/monedas/configuracion',body);
  if(!cotizacionValida(data.configuracion)||!revisionValida(data.configuracion.versionRegistro)){setInvalida(true);throw Error('No se recibió confirmación válida. Recargá para comprobar el estado antes de reintentar.');}
  setConfig(data.configuracion);setCotizacion(data.configuracion);setReferenciaDirty(false);setMensaje('Cotización guardada con autor y revisión.');
 });
 const cargarTarifa=valor=>{const t=tarifas.find(x=>x.idPropiedad===Number(valor));setId(valor);setTarifaBase(t||null);setMoneda(t?.moneda||'');setPrecio(t?.precio??'');setMensaje('');setError('');setEquivalencia(null);setFijacion(null);};
 const seleccionarPropiedad=valor=>{if(tarifaDirty){setPropiedadPendiente(valor);return;}cargarTarifa(valor);};
 const editarTarifa=(setter,valor)=>{setter(valor);setMensaje('');setError('');};
 const tarifa=tarifas.find(t=>t.idPropiedad===Number(id));
 const tarifaActual=resolverTarifa({id,moneda,precio,guardada:tarifa});
 const porNoche=presupuestoEstadia(tarifaActual,1,cotizacion);
 const estadia=presupuestoEstadia(tarifaActual,noches,cotizacion);
 const nombrePropiedad=propiedades.find(p=>p.idPropiedad===Number(id))?.nombre;
 const referencia=referenciaInformativa(cotizacion)?cotizacion:null;
 const detalleReferencia=referencia?`${referencia.fuente==='BNA'?'Banco Nación vía MonedAPI':referencia.fuente} · ${referencia.fecha}${referencia.fecha<fechaNegocio()?' · referencia de una fecha anterior':''}`:'Consultá o confirmá una referencia en la tarjeta 01 para ver el equivalente.';
 const previsualizarTarifa=()=>{try{if(!id||!['ARS','USD'].includes(moneda)||unidades(precio)<=0n)throw Error('Elegí propiedad, moneda y un precio positivo.');setError('');setConfirmar('tarifa');}catch(e){setError(e.message);}};
 const guardarTarifa=()=>ejecutar(async()=>{
  if(!editable||!permite('propiedades.gestionar'))throw Error('El guardado todavía no está habilitado.');
  const {data}=await api.put(`/monedas/tarifas/${id}`,{moneda,precio:decimal(unidades(precio)),revision:tarifa?.versionRegistro||null,confirmar:true});
  if(!data.tarifa||data.tarifa.idPropiedad!==Number(id)||!revisionValida(data.tarifa.versionRegistro)||data.tarifa.moneda!==moneda||data.tarifa.precio!==decimal(unidades(precio))){setInvalida(true);throw Error('No se recibió una confirmación válida. Recargá los datos.');}
  setTarifaBase(data.tarifa);await recargar();setMensaje('Tarifa declarada guardada. No se publicaron canales ni se cambiaron reservas.');
 });
 const calcular=()=>{try{if(!cotizacionValida(cotizacion)&&!vistaBnaValida(cotizacion))throw Error('Consultá o confirmá una cotización válida.');setEquivalencia(convertir(importe,origen,origen==='USD'?'ARS':'USD',cotizacion.valor));setError('');}catch(e){setEquivalencia(null);setError(e.message);}};
 const simularCheckin=()=>{try{if(fuente==='BNA')throw Error('BNA vía MonedAPI solo admite consulta y equivalencia informativa. No se usa para check-in.');if(!importeCheckin)throw Error('Indicá un importe original en USD para simular el acuerdo de check-in.');if(cotizacion?.fuente==='BCRA'&&cotizacion.fecha!==fechaCheckin&&!cotizacion.id)throw Error('Consultá BCRA nuevamente para acreditar la última cotización disponible.');setFijacion(fijarCheckin({canal:'Manual',moneda:'USD',importe:importeCheckin,pagoEquivalenteARS:acuerdo,fechaIngreso:fechaCheckin,cotizacion,aceptarUltimaOficial:ultima}));setError('');}catch(e){setFijacion(null);setError(e.message);}};
 const motivoBloqueo=fuente==='BNA'?'BNA vía MonedAPI: solo consulta y equivalencia informativa, sin guardado ni check-in.':invalida?'Recargá para comprobar el último resultado.':!estado?'Comprobando disponibilidad…':!estado.activado?'Persistencia pendiente de aprobación. Las vistas previas no se guardan.':!estado.escritura?'La escritura monetaria está desactivada. Podés consultar y simular, sin guardar cambios.':!configLeida?'Esperá la lectura de la configuración.':!permite('configuracion.modificar')?'Tu cuenta no tiene permiso para guardar.':!cotizacion?'Primero consultá o confirmá una cotización.':ocupado?'Hay una operación en curso.':'';
 return <section className="monedas-panel monedas-experiencia">
  <header className="currency-intro"><div><span className="chart-eyebrow">PRECIOS Y REFERENCIAS</span><h2>Monedas y cotizaciones</h2><p>Consultá referencias, definí tarifas y explorá equivalencias. Tus reservas no cambian con el dólar.</p></div><span className={'currency-badge '+(editable?'currency-badge--enabled':'')} role="status">{!estado?'Comprobando disponibilidad…':!estado.activado?'Persistencia pendiente de aprobación. Las vistas previas no se guardan.':!estado.escritura?'Modo de solo lectura.':'Persistencia habilitada por el servidor.'}</span></header>
  {errorEstado&&<p role="alert">{errorEstado}</p>}
  {error&&<p role="alert" className="error">{error}</p>}{mensaje&&<p role="status" className="success-message">{mensaje}</p>}
  {invalida&&<p role="alert">Recargá la página para comprobar el resultado antes de volver a guardar.</p>}
  <div className="currency-grid">
   <article className="currency-card currency-card--quote" aria-labelledby="quote-title">
    <header className="currency-card-heading"><span className="currency-step" aria-hidden="true">01</span><div><h3 id="quote-title">Cotización actual</h3><p>Elegí una referencia para tus cálculos informativos.</p></div><span className="currency-badge">{config?'Guardada':'Sin configurar'}</span></header>
    <div className="currency-spotlight"><span>1 USD equivale a</span><strong>{config?cotizacionVisible(config.valor):'Sin cotización guardada'}</strong><span>{config?config.fuente+' · '+config.fecha:'Podés preparar una vista previa para explorar equivalencias.'}</span></div>
    <div className="currency-form-section"><h4>Preparar una referencia informativa</h4><p className="currency-hint">Consultar o confirmar no guarda una configuración global ni cambia el método de pago de las reservas.</p><div className="form-grid"><div><label htmlFor="monedas-fuente">Fuente</label><select id="monedas-fuente" value={fuente} disabled={ocupado} onChange={e=>{referenciaEditada.current=true;cambiar(setFuente,e.target.value);setCotizacion(null);setEquivalencia(null);setFijacion(null);}}><option value="MANUAL">Manual</option><option value="BCRA">BCRA — referencia estadística de divisas</option><option value="BNA">Banco Nación — venta vía MonedAPI</option></select></div>
     {fuente==='MANUAL'&&<div><label htmlFor="monedas-valor">ARS por USD (hasta 8 decimales)</label><input id="monedas-valor" inputMode="decimal" value={valor} disabled={ocupado} onChange={e=>{referenciaEditada.current=true;cambiar(setValor,e.target.value);setCotizacion(null);setEquivalencia(null);setFijacion(null);}} /></div>}</div>
     {fuente==='BNA'?<div className="currency-hint"><p><strong>Venta reportada por MonedAPI · fuente no oficial</strong></p><p>Referencia informativa en ARS por USD. No se acredita la categoría billete/divisa ni se usa en contratos.</p><button type="button" className="secondary-button" disabled={ocupado} onClick={consultarBna}>Consultar Banco Nación</button>{cotizacion?.fuente==='BNA'&&<div className="currency-result"><strong>{cotizacionVisible(cotizacion.valor)} por USD</strong><p>Valor observado desde: {fechaHora(cotizacion.updatedAt)}. Última comprobación del proveedor: {fechaHora(cotizacion.lastScrapedAt)}.</p><p>Consulta HostFlow: {fechaHora(cotizacion.consultadaEn)}.</p>{cotizacion.valorDeFechaAnterior&&<p>El valor fue observado en una fecha anterior. Puede seguir sin cambios; revisá cuándo se comprobó.</p>}{cotizacion.comprobacionAntigua&&<p role="status">La última comprobación de MonedAPI supera 15 minutos; contrastá el dato antes de usarlo.</p>}<p>Vista previa no guardada. No modifica la reserva ni su acuerdo.</p></div>}<p><a href="https://www.bna.com.ar/Personas" target="_blank" rel="noreferrer">Contrastar en Banco Nación</a> · <a href="https://monedapi.ar/docs/currencies" target="_blank" rel="noreferrer">Fuente: MonedAPI</a></p><details className="currency-help"><summary>Alcance de esta referencia</summary><p>MonedAPI es un intermediario de datos públicos, sin garantía de exactitud o disponibilidad. updatedAt indica cuándo observó el valor actual; lastScrapedAt, su última comprobación. Ninguno acredita la hora oficial de publicación del banco. Fines de semana y días sin cambios pueden conservar una fecha anterior. No hay guardado BNA ni fijación de check-in.</p></details></div>:fuente==='MANUAL'?<><p className="currency-hint">Ingresá un valor y confirmá su vista previa. Confirmar no es guardar.</p><details className="currency-help"><summary>Sobre las referencias manuales</summary><p className="monedas-advertencia">{ADVERTENCIA}</p></details><button type="button" className="secondary-button" disabled={ocupado} onClick={prepararManual}>Confirmar vista previa manual</button></>:<><p className="currency-hint">Referencia estadística de divisas. La consulta no guarda cambios.</p><details className="currency-help"><summary>Qué informa BCRA</summary><p>BCRA informa el campo tipoCotizacion de su estadística de divisas. No equivale a compra/venta minorista ni se lo identifica como A3500. No informa hora de publicación.</p></details><button type="button" className="secondary-button" disabled={ocupado} onClick={consultar}>Consultar BCRA</button></>}
    </div>
    {cotizacion&&<div className="currency-preview"><span className="currency-badge">{cotizacion.versionRegistro?'Referencia guardada':'Vista previa · no guardada'}</span><details className="currency-help currency-reference-details"><summary>Ver detalle de la referencia{!cotizacion.versionRegistro&&<> · {cotizacionVisible(cotizacion.valor)}</>}</summary><dl className="monedas-cotizacion"><dt>Fuente / tipo</dt><dd>{cotizacion.fuente} / {cotizacion.tipo}</dd><dt>Valor ARS/USD</dt><dd>{cotizacion.valor}</dd><dt>{cotizacion.fuente==='BNA'?'Fecha del valor observado por MonedAPI':'Fecha de cotización'}</dt><dd>{cotizacion.fecha}</dd><dt>Estado</dt><dd>{cotizacion.fuente==='BNA'?'Revisá las fechas del valor y de comprobación del intermediario':cotizacion.fecha===fechaNegocio()?'Fecha del día de hoy':'Última fecha informada; no es una cotización del día de hoy'}</dd><dt>Hora de publicación</dt><dd>{cotizacion.horaPublicacion||'No informada por la fuente'}</dd><dt>Última consulta / establecimiento</dt><dd>{fechaHora(cotizacion.consultadaEn)}</dd><dt>Persistencia</dt><dd>{cotizacion.versionRegistro?'Guardada':'Vista previa no guardada'}</dd></dl></details></div>}
    <div className="currency-card-action"><button type="button" className="primary-button" disabled={!editable||!cotizacion||ocupado||fuente==='BNA'} aria-describedby="quote-save-reason" onClick={()=>setConfirmar('guardar')}>Guardar cotización</button><p id="quote-save-reason" className="currency-hint">{motivoBloqueo||'El guardado requiere tu confirmación y conserva su autor y revisión.'}</p></div>
   </article>
   <article className="currency-card currency-card--rate" aria-labelledby="rate-title">
    <header className="currency-card-heading"><span className="currency-step" aria-hidden="true">02</span><div><h3 id="rate-title">Tarifa por propiedad</h3><p>Un precio por noche, en su moneda original.</p></div><span className="currency-badge">{editable?'Revisión previa':'Vista previa'}</span></header>
    <div className="currency-symbols" aria-hidden="true"><span>ARS</span><span>USD</span></div>
    <div className="form-grid"><div className="currency-field-wide"><label htmlFor="monedas-propiedad">Propiedad</label><select id="monedas-propiedad" value={id} disabled={ocupado} onChange={e=>seleccionarPropiedad(e.target.value)}><option value="">Seleccioná una propiedad</option>{propiedades.map(p=><option key={p.idPropiedad} value={p.idPropiedad}>{p.nombre} (#{p.idPropiedad})</option>)}</select></div>
     <div><label htmlFor="monedas-moneda">Moneda de publicación</label><select id="monedas-moneda" value={moneda} disabled={ocupado} onChange={e=>editarTarifa(setMoneda,e.target.value)}><option value="">Elegí una moneda</option><option>ARS</option><option>USD</option></select></div><div><label htmlFor="monedas-precio">Precio por noche</label><input id="monedas-precio" inputMode="decimal" value={precio} disabled={ocupado} onChange={e=>editarTarifa(setPrecio,e.target.value)} /></div></div>
    {tarifa?<p className="currency-result">Tarifa guardada: <strong>{formatearImporte(tarifa.precio,tarifa.moneda)}</strong>. Su importe y moneda se conservan hasta guardar una revisión.</p>:<p className="currency-hint">{id?'Esta propiedad no tiene tarifa declarada. Su precio histórico conserva la moneda sin declarar.':'Seleccioná una propiedad para consultar su tarifa.'}</p>}
    {tarifaActual.disponible?<div className="currency-result currency-rate-equivalence" aria-live="polite">
     <span className="currency-badge">{tarifaActual.borrador?'Vista previa de tarifa — sin guardar':'Tarifa guardada'}</span>
     <dl className="currency-amounts"><dt>Precio por noche</dt><dd>{formatearImporte(tarifaActual.precio,tarifaActual.moneda)}</dd>
      {porNoche.disponible&&porNoche.equivalente!==null&&<><dt>Equivalente informativo por noche</dt><dd>{formatearImporte(porNoche.equivalente,porNoche.monedaEquivalente)}</dd></>}</dl>
     <p className="currency-hint">{detalleReferencia}</p><p className="currency-hint">{referencia?'Calculado con la referencia seleccionada. No modifica la tarifa guardada.':'La tarifa original se conserva, sin calcular un equivalente.'}</p>
    </div>:id&&<p className="currency-hint" role="status">{tarifaActual.motivo}</p>}
    <details className="currency-help"><summary>Qué cambia al declarar una tarifa</summary><p>Una tarifa declarada se conserva en su moneda. Los precios históricos sin moneda no se reinterpretan ni se convierten automáticamente.</p><p>Cuando el modelo está activado, la tarifa declarada es el precio autoritativo por noche y su moneda. El precio histórico queda archivado; editar otros datos no modifica la tarifa. Los canales simulados usan la tarifa declarada al publicar o sincronizar explícitamente; revisarla aquí no republica canales ni cambia acuerdos de reservas.</p></details>
    <div className="currency-card-action"><button type="button" className="secondary-button" disabled={ocupado} onClick={previsualizarTarifa}>{editable?'Revisar y guardar tarifa':'Previsualizar tarifa sin guardar'}</button><p className="currency-hint">{editable?'Revisá el detalle antes de confirmar.':'Solo consulta y vista previa: no se guardan cambios.'}</p></div>
   </article>
   <article className="currency-card currency-card--convert" aria-labelledby="convert-title">
    <header className="currency-card-heading"><span className="currency-step" aria-hidden="true">03</span><div><h3 id="convert-title">Simulador de estadía</h3><p>Usá la tarifa elegida y ajustá solamente las noches.</p></div><span className="currency-badge">Presupuesto local</span></header>
    <p className="currency-hint">{nombrePropiedad?`${nombrePropiedad} (#${id})`:'La propiedad y su tarifa se eligen en la tarjeta 02.'}</p>
    <div><label htmlFor="monedas-noches">Cantidad de noches</label><div className="currency-night-control">
     <button type="button" className="secondary-button" aria-label="Quitar una noche" disabled={!/^[1-9]\d*$/.test(noches)||Number(noches)<=1||Number(noches)>MAX_NOCHES} onClick={()=>setNoches(String(Number(noches)-1))}>−</button>
     <input id="monedas-noches" type="number" inputMode="numeric" min="1" max={MAX_NOCHES} step="1" value={noches} onChange={e=>setNoches(e.target.value)} aria-describedby="night-limit" />
     <button type="button" className="secondary-button" aria-label="Agregar una noche" disabled={!/^[1-9]\d*$/.test(noches)||Number(noches)>=MAX_NOCHES} onClick={()=>setNoches(String(Number(noches)+1))}>+</button>
    </div><p id="night-limit" className="currency-hint">Entre 1 y {MAX_NOCHES} noches. Sin cargos adicionales.</p></div>
    {estadia.disponible?<div className="currency-result currency-stay-result" aria-live="polite">
     <span className="currency-badge">{estadia.borrador?'Usando tarifa de vista previa — sin guardar':'Usando tarifa guardada'}</span>
     <dl className="currency-amounts"><dt>Tarifa por noche</dt><dd>{formatearImporte(estadia.precio,estadia.moneda)}</dd><dt>Total original · {estadia.noches} {estadia.noches===1?'noche':'noches'}</dt><dd>{formatearImporte(estadia.total,estadia.moneda)}</dd>
      {estadia.equivalente!==null&&<><dt>Equivalente estimado</dt><dd>{formatearImporte(estadia.equivalente,estadia.monedaEquivalente)}</dd></>}</dl>
     <p className="currency-hint">{detalleReferencia}</p>
    </div>:<div className="currency-empty-result" role="status">{estadia.motivo}</div>}
    <p className="currency-hint">Presupuesto orientativo. No constituye un cobro ni modifica reservas o acuerdos.</p>
    <details className="currency-help currency-free-converter"><summary>Convertir otro importe</summary>
     <p>Conversión independiente de la propiedad y del presupuesto, con la referencia de la tarjeta 01.</p>
     <div className="form-grid"><div><label htmlFor="monedas-importe">Importe</label><input id="monedas-importe" inputMode="decimal" value={importe} onChange={e=>{setImporte(e.target.value);setEquivalencia(null);}} /></div><div><label htmlFor="monedas-origen">Moneda original</label><select id="monedas-origen" value={origen} onChange={e=>{setOrigen(e.target.value);setEquivalencia(null);}}><option>USD</option><option>ARS</option></select></div></div>
     <p className="currency-hint">{detalleReferencia}</p>
     <div className="currency-card-action"><button type="button" className="secondary-button" onClick={calcular}>Calcular equivalencia</button>{equivalencia!==null&&<p className="monedas-equivalencia" role="status"><strong>{formatearImporte(equivalencia,origen==='USD'?'ARS':'USD')}</strong>Equivalencia informativa, redondeo a centavos, mitad hacia arriba. El importe original no cambia.</p>}</div>
    </details>
   </article>
   <article className="currency-card currency-card--checkin" aria-labelledby="checkin-title">
    <header className="currency-card-heading"><span className="currency-step" aria-hidden="true">04</span><div><h3 id="checkin-title">Referencia del check-in — simulación local</h3><p>Comprobá un posible pago equivalente en ARS.</p></div><span className="currency-badge">Sin guardado</span></header>
    <p className="currency-hint">Consulta independiente del presupuesto. Solo acuerdos Manuales en USD y referencias Manual/BCRA válidas; no aplica a Booking/Airbnb ni fija contratos.</p>
    <div><label htmlFor="monedas-checkin-importe">Importe original del acuerdo en USD</label><input id="monedas-checkin-importe" inputMode="decimal" value={importeCheckin} onChange={e=>{setImporteCheckin(e.target.value);setFijacion(null);}} /></div>
    <button type="button" className="secondary-button" disabled={!estadia.disponible||estadia.moneda!=='USD'} onClick={()=>{setImporteCheckin(estadia.total);setFijacion(null);}}>Usar total USD de la estadía</button>
    <p className="currency-hint">Copiar el total no crea un acuerdo. Si cambia el presupuesto, este importe se conserva hasta que decidas copiarlo otra vez.</p>
    {fuente==='BNA'&&<p className="currency-hint" role="status">Banco Nación vía MonedAPI no admite esta simulación contractual. Elegí y consultá BCRA, o confirmá una referencia Manual válida, en la tarjeta 01.</p>}
    <div><label htmlFor="monedas-checkin">Fecha de check-in</label><input id="monedas-checkin" type="date" value={fechaCheckin} onChange={e=>{setFechaCheckin(e.target.value);setFijacion(null);}} /></div>
    <label className="currency-check"><input type="checkbox" checked={acuerdo} onChange={e=>{setAcuerdo(e.target.checked);setFijacion(null);}} /><span>Acuerdo explícito de pago en ARS equivalente al importe USD indicado</span></label>
    <label className="currency-check"><input type="checkbox" checked={ultima} onChange={e=>{setUltima(e.target.checked);setFijacion(null);}} /><span>Aceptar la última cotización oficial disponible, identificando su fecha real</span></label>
    <div className="currency-card-action"><button type="button" className="secondary-button" disabled={fuente==='BNA'} onClick={simularCheckin}>Simular referencia de check-in</button>{fijacion&&<p className="currency-result" role="status">Simulación NO guardada: {formatearImporte(fijacion.equivalenteARS,'ARS')} · {fijacion.fuente} · fecha efectiva {fijacion.fechaEfectiva}.</p>}</div>
   </article>
  </div>
  <details className="currency-help currency-sources"><summary>Fuentes y alcance de la información</summary><p>Banco Nación se consulta mediante MonedAPI, un intermediario no oficial. La venta reportada solo se usa en vistas previas y equivalencias, nunca como BCRA/Manual ni para guardar o fijar check-in. La web oficial permite contrastar billetes y divisas, con compra y venta distintas.</p><p>Fuentes: <a href="https://www.bcra.gob.ar/apis-banco-central/" target="_blank" rel="noreferrer">BCRA</a> · <a href="https://www.bna.com.ar/Personas" target="_blank" rel="noreferrer">Banco Nación</a>. Fechas y horas se muestran en Buenos Aires. Datos públicos con fines informativos y académicos.</p></details>
  {propiedadPendiente!==null&&<SecurityDialog title="Cambiar de propiedad" description="La tarifa que estás preparando tiene cambios sin guardar. Si continuás, se descartará solo ese borrador; la referencia de cotización se conserva." busy={ocupado} onClose={()=>setPropiedadPendiente(null)}>
   <button type="button" className="secondary-button" onClick={()=>setPropiedadPendiente(null)}>Seguir editando tarifa</button>
   <button type="button" className="primary-button" onClick={()=>{cargarTarifa(propiedadPendiente);setPropiedadPendiente(null);}}>Descartar tarifa y cambiar</button>
  </SecurityDialog>}
  {confirmar&&<SecurityDialog title={confirmar==='manual'?'Confirmar cotización manual':confirmar==='tarifa'?'Revisar tarifa':'Guardar cotización'} description={confirmar==='manual'?ADVERTENCIA:confirmar==='tarifa'?`${formatearImporte(precio,moneda)}. ${editable?'Se usará la cotización GUARDADA, no la vista previa.':'Es una vista previa, no se guardará.'}`:'Se registrará la fuente, fecha, valor y autor. Las reservas no cambian.'} busy={ocupado} onClose={()=>{if(!ocupado)setConfirmar(null);}}>
   <button type="button" className="secondary-button" disabled={ocupado} onClick={()=>setConfirmar(null)}>Cancelar</button><button type="button" className="primary-button" disabled={ocupado} onClick={()=>{
    if(confirmar==='manual'){setCotizacion({fuente:'MANUAL',tipo:'MANUAL',valor:decimal(unidades(valor,8),8),fecha:estado?.fechaNegocio||fechaNegocio(),horaPublicacion:null,consultadaEn:new Date().toISOString()});setConfirmar(null);setMensaje('Vista previa manual confirmada; no guardada.');}
    else if(confirmar==='tarifa'){if(editable)guardarTarifa();else{setMensaje(`Vista previa NO guardada: ${formatearImporte(precio,moneda)}.`);setConfirmar(null);}}
    else guardar();
   }}>{ocupado?'Procesando…':'Confirmar'}</button>
  </SecurityDialog>}
 </section>;
}

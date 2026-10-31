import { useEffect, useRef, useState } from 'react';
import { useFondoLogin } from '../../hooks/useFondoLogin';
import { emailValido, tokenValido, validarPasswordNueva, MENSAJE_NEUTRAL } from '../../services/autenticacionComercial';
import './autenticacion-comercial.css';

function useOperacion() {
  const [estado, setEstado] = useState('lista');
  const [error, setError] = useState('');
  const bloqueo = useRef(false), controlador = useRef(null), activo = useRef(true);
  useEffect(() => { activo.current = true; return () => { activo.current = false; controlador.current?.abort(); }; }, []);
  async function ejecutar(tarea, despues) {
    if (bloqueo.current) return;
    bloqueo.current = true; setEstado('cargando'); setError('');
    controlador.current = new AbortController();
    try { const r = await tarea(controlador.current.signal); if (activo.current) { setEstado('lista'); despues?.(r); } }
    catch (e) { if (activo.current) { setError(e.message || 'No pudimos completar la operación.'); setEstado(['INCIERTO','RESPUESTA_INVALIDA'].includes(e.codigo) ? 'incierto' : e.codigo === 'ENLACE_INVALIDO' ? 'invalido' : 'error'); } }
    finally { if (activo.current) bloqueo.current = false; }
  }
  return { estado, error, ejecutar, ocupado: estado === 'cargando' || estado === 'incierto' };
}
export function MarcoCuenta({ children, volver }) {
  const fondo = useFondoLogin();
  return <main className="ac-experiencia" data-fondo={fondo.estado}>
    <div className="ac-foto" aria-hidden="true" style={fondo.url ? { backgroundImage: `url("${fondo.url}")` } : undefined} />
    <section className="ac-marca" aria-label="HostFlow"><span className="ac-sello">TU OPERACIÓN, EN BUENAS MANOS</span><h1>HostFlow<span>Sentite en casa.</span></h1><p>Un acceso seguro a todo lo que necesitás para gestionar tus alojamientos.</p><div className="ac-confianza"><span aria-hidden="true">◇</span> Privacidad y control, en cada paso.</div></section>
    <section className="ac-panel" aria-label="Acceso a tu cuenta"><button className="ac-volver" onClick={volver}>← Volver al inicio de sesión</button>{children}<footer>Tu contraseña es personal. HostFlow nunca te la pedirá por correo.</footer></section>
  </main>;
}
function Aviso({ children }) { return children ? <p className="ac-aviso" role="alert">{children}</p> : null; }
function Resultado({ titulo, children, volver }) { const ref = useRef(null); useEffect(() => { ref.current?.focus(); }, []); return <div className="ac-resultado"><span className="ac-icono" aria-hidden="true">✓</span><h2 ref={ref} tabIndex={-1}>{titulo}</h2><p>{children}</p><button className="ac-primario" onClick={volver}>Volver al inicio de sesión</button></div>; }

export function SolicitarRecuperacion({ cliente, volver }) {
  const [email, setEmail] = useState(''), [enviada, setEnviada] = useState(false), [validacion, setValidacion] = useState('');
  const op = useOperacion();
  return <MarcoCuenta volver={volver}>{enviada ? <Resultado titulo="Revisá tu correo" volver={volver}>{MENSAJE_NEUTRAL} Puede tardar unos minutos. Revisá también spam. El enlace es temporal y de un solo uso.</Resultado> : <>
    <span className="ac-paso">RECUPERÁ TU ACCESO · 1 DE 2</span><h2>¿Olvidaste tu contraseña?</h2><p className="ac-intro">Te ayudamos a volver a HostFlow. Ingresá el correo de tu cuenta para solicitar un enlace seguro.</p>
    <form noValidate onSubmit={e => { e.preventDefault(); if (!emailValido(email)) { setValidacion('Ingresá un correo electrónico válido.'); return; } setValidacion(''); op.ejecutar(s => cliente.solicitar(email,s), () => { setEmail(''); setEnviada(true); }); }}>
      <label htmlFor="ac-email">Correo electrónico</label><input id="ac-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!validacion} aria-describedby="ac-ayuda-email" />
      <small id="ac-ayuda-email">Por privacidad, la respuesta es la misma para todas las cuentas.</small><Aviso>{validacion || op.error}</Aviso>
      <button className="ac-primario" disabled={op.ocupado}>{op.estado === 'cargando' ? 'Solicitando enlace…' : 'Solicitar enlace seguro'}</button>
    </form><details><summary>¿No recibiste el enlace?</summary><p>Esperá unos minutos y comprobá la dirección. Si no tenés un correo verificado, contactá al administrador de tu equipo.</p></details>
  </>}</MarcoCuenta>;
}

export function ConfirmarCuenta({ tipo, tokenInicial, cliente, volver }) {
  const [token, setToken] = useState(tokenInicial), [validando, setValidando] = useState(true), [valido,setValido] = useState(false);
  const [errorEnlace,setErrorEnlace] = useState(''), [revisionEnlace,setRevisionEnlace] = useState(0);
  const [password,setPassword] = useState(''), [confirmacion,setConfirmacion] = useState(''), [validacion,setValidacion] = useState(''), [hecho,setHecho] = useState(false);
  const op = useOperacion();
  useEffect(() => {
    let vivo = true; const abort = new AbortController(); setValidando(true); setErrorEnlace('');
    if (!tokenValido(tokenInicial)) { setValidando(false); return () => abort.abort(); }
    cliente.validar(tipo, tokenInicial, abort.signal).then(() => { if(vivo) setValido(true); }).catch(e => { if(vivo) { setValido(false); if(e.codigo!=='ENLACE_INVALIDO') setErrorEnlace('No pudimos comprobar el enlace. Tu contraseña no se modificó.'); } }).finally(() => { if(vivo) setValidando(false); });
    return () => { vivo = false; abort.abort(); };
  }, [cliente,tipo,tokenInicial,revisionEnlace]);
  const invitacion = tipo === 'invitaciones';
  const titulo = invitacion ? 'Tu equipo te está esperando' : 'Elegí una nueva contraseña';
  return <MarcoCuenta volver={volver}>{hecho ? <Resultado titulo={invitacion ? 'Ya sos parte del equipo' : 'Tu contraseña fue actualizada'} volver={volver}>{invitacion ? 'Tu cuenta de Operador está lista. Iniciá sesión para continuar.' : 'Tus sesiones anteriores fueron invalidadas. Iniciá sesión con tu nueva contraseña.'}</Resultado> : validando ? <div className="ac-validando" role="status"><span className="ac-linea" /><h2>Comprobando tu enlace</h2><p>Un momento, estamos verificando que siga vigente.</p></div> : errorEnlace ? <div><h2>No pudimos verificar el enlace</h2><Aviso>{errorEnlace}</Aviso><button className="ac-primario" onClick={()=>setRevisionEnlace(r=>r+1)}>Reintentar verificación</button></div> : !valido || op.estado === 'invalido' ? <div className="ac-resultado"><span className="ac-icono ac-icono-aviso" aria-hidden="true">↗</span><h2>Este enlace ya no está disponible</h2><p>Puede haber vencido, haber sido revocado o haberse utilizado. {invitacion ? 'Pedile una nueva invitación al administrador.' : 'Solicitá un nuevo enlace para recuperar tu acceso.'}</p><button className="ac-primario" onClick={volver}>Volver al inicio</button></div> : <>
    <span className="ac-paso">{invitacion ? 'INVITACIÓN A TU EQUIPO' : 'RECUPERÁ TU ACCESO · 2 DE 2'}</span><h2>{titulo}</h2><p className="ac-intro">{invitacion ? 'Definí tu contraseña para aceptar la invitación. Accederás como Operador; los permisos los administra tu equipo.' : 'Creá una contraseña personal y segura. Este enlace solo se puede utilizar una vez.'}</p>
    <form noValidate onSubmit={e => { e.preventDefault(); const error = validarPasswordNueva(password,confirmacion); if(error) { setValidacion(error); return; } setValidacion(''); op.ejecutar(s => cliente.confirmar(tipo,token,password,s), () => { setPassword(''); setConfirmacion(''); setToken(null); setHecho(true); }); }}>
      <label htmlFor="ac-password">Nueva contraseña</label><input id="ac-password" type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} aria-describedby="ac-password-ayuda" />
      <small id="ac-password-ayuda">Al menos 12 caracteres y hasta 72 bytes. Usá una frase larga y única.</small>
      <label htmlFor="ac-confirmacion">Confirmar contraseña</label><input id="ac-confirmacion" type="password" autoComplete="new-password" required value={confirmacion} onChange={e => setConfirmacion(e.target.value)} aria-invalid={!!validacion} />
      <Aviso>{validacion || op.error}</Aviso><button className="ac-primario" disabled={op.ocupado}>{op.estado === 'cargando' ? 'Confirmando…' : invitacion ? 'Aceptar invitación' : 'Actualizar contraseña'}</button>
    </form>
  </>}</MarcoCuenta>;
}

export function GestionInvitaciones({ cliente, usuario }) {
  const autorizado = usuario?.rol === 'Administrador' && usuario?.permisos?.includes('usuarios.crear');
  return autorizado ? <PanelInvitaciones cliente={cliente} /> : <section className="ac-gestion"><h2>Acceso restringido</h2><p>Solo un Administrador puede gestionar invitaciones.</p></section>;
}
function PanelInvitaciones({ cliente }) {
  const [items,setItems] = useState([]), [carga,setCarga] = useState(true), [errorCarga,setErrorCarga] = useState(''), [revision,setRevision] = useState(0);
  const [pagina,setPagina] = useState(1), [hayMas,setHayMas] = useState(false);
  const [nombre,setNombre] = useState(''), [email,setEmail] = useState(''), [validacion,setValidacion] = useState(''), [aviso,setAviso] = useState(''), [revocar,setRevocar] = useState(null);
  const op = useOperacion(), cancelarRef=useRef(null), origenFoco=useRef(null);
  useEffect(() => { let vivo=true; const abort = new AbortController(); setCarga(true); setErrorCarga(''); cliente.listar(abort.signal,pagina).then(r => { if(vivo) {setItems(r.invitaciones);setHayMas(r.hayMas);} }).catch(() => { if(vivo) setErrorCarga('No pudimos cargar las invitaciones.'); }).finally(() => { if(vivo) setCarga(false); }); return () => { vivo=false; abort.abort(); }; },[cliente,revision,pagina]);
  useEffect(() => { if(revocar) cancelarRef.current?.focus(); else origenFoco.current?.focus(); },[revocar]);
  return <section className="ac-gestion"><header><div><span className="ac-paso">PERSONAS Y ACCESOS</span><h1>Tu equipo, conectado</h1><p>Invitá Operadores sin compartir contraseñas. Cada persona define la suya.</p></div><span className="ac-badge">Solo Administradores</span></header>
    <div className="ac-gestion-grid"><section className="ac-card"><h2>Invitar a un Operador</h2><p>El acceso queda pendiente hasta que acepte el enlace del correo.</p><form noValidate onSubmit={e => { e.preventDefault(); if(!nombre.trim() || nombre.trim().length>120 || !emailValido(email)) { setValidacion('Completá un nombre y un correo válidos.'); return; } setValidacion(''); setAviso(''); op.ejecutar(s => cliente.invitar(nombre,email,s), () => { setNombre(''); setEmail(''); setAviso(MENSAJE_NEUTRAL); setPagina(1); setRevision(r=>r+1); }); }}>
      <label htmlFor="ac-nombre">Nombre</label><input id="ac-nombre" autoComplete="name" maxLength={120} value={nombre} onChange={e=>setNombre(e.target.value)} />
      <label htmlFor="ac-inv-email">Correo del nuevo Operador</label><input id="ac-inv-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /><small>Rol asignado por el servidor: Operador.</small>
      <Aviso>{validacion || op.error}</Aviso>{aviso && <p role="status" className="ac-ok">{aviso}</p>}<button className="ac-primario" disabled={op.ocupado}>{op.estado==='cargando'?'Procesando…':'Enviar invitación'}</button>
    </form></section><section className="ac-card"><div className="ac-lista-header"><h2>Invitaciones del equipo</h2><button className="ac-secundario" disabled={carga || op.estado === 'cargando'} onClick={()=>setRevision(r=>r+1)}>Actualizar</button></div>
      {carga ? <div role="status"><span className="ac-linea"/><span className="ac-linea"/>Cargando invitaciones…</div> : errorCarga ? <Aviso>{errorCarga} Usá Actualizar para reintentar.</Aviso> : !items.length ? <div className="ac-vacio"><h3>El próximo integrante empieza acá</h3><p>Aún no hay invitaciones. Cuando invites a alguien, podrás seguir su estado desde este panel.</p></div> : <ul className="ac-invitaciones">{items.map(i=><li key={i.id}><div><strong>{i.nombre}</strong><span>{i.email}</span><small>Expira: {new Date(i.expiraEn).toLocaleDateString('es-AR')}</small></div><div><span className={`ac-badge ac-estado-${i.estado.toLowerCase()}`}>{i.estado}</span>{i.estado==='Pendiente' && <button className="ac-revocar" disabled={op.ocupado} onClick={e=>{ origenFoco.current=e.currentTarget; setAviso(''); setRevocar(i); }}>Revocar invitación</button>}</div></li>)}</ul>}
      {!carga && !errorCarga && <nav className="ac-paginacion" aria-label="Páginas de invitaciones"><button className="ac-secundario" disabled={pagina===1} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Página {pagina}</span><button className="ac-secundario" disabled={!hayMas} onClick={()=>setPagina(p=>p+1)}>Siguiente</button></nav>}
    </section></div>{revocar && <div className="ac-modal-fondo"><section className="ac-modal" role="dialog" aria-modal="true" aria-labelledby="ac-revocar-titulo" onKeyDown={e=>{ if(e.key==='Escape' && op.estado!=='cargando') setRevocar(null); if(e.key==='Tab') { const botones=Array.from(e.currentTarget.querySelectorAll('button:not(:disabled)')); if(!botones.length) return; if(e.shiftKey && document.activeElement===botones[0]) {e.preventDefault(); botones.at(-1).focus();} else if(!e.shiftKey && document.activeElement===botones.at(-1)) {e.preventDefault(); botones[0].focus();} } }}><h2 id="ac-revocar-titulo">¿Revocar esta invitación?</h2><p>El enlace enviado a <strong>{revocar.email}</strong> dejará de funcionar. No se elimina ninguna cuenta existente.</p><button ref={cancelarRef} className="ac-secundario" disabled={op.estado==='cargando'} onClick={()=>setRevocar(null)}>Conservar invitación</button><button className="ac-primario" disabled={op.ocupado} onClick={()=>op.ejecutar(s=>cliente.revocar(revocar.id,s),()=>{setRevocar(null); setRevision(r=>r+1);})}>Confirmar revocación</button><Aviso>{op.error}</Aviso></section></div>}
  </section>;
}

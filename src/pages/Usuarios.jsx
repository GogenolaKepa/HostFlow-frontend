import { useEffect, useState } from "react";
import api from "../services/api";
import { usePermisos } from "../context/PermisosContext";
import { limpiarSesion } from "../services/session";
import { mensajeCuenta, validarPasswordNueva } from "../services/cuentas";
import { AccountAvatar, PasswordField, PasswordRules, RoleBadge, SecurityDialog, SecurityFeedback, SecurityIcon } from "../components/security/SecurityUI";
import {InvitacionesDelProducto} from '../components/autenticacion/ProductoComercial';

function Usuarios({ usuarioActual, onSesionActualizada }) {
  const permite = usePermisos();
  const [datos, setDatos] = useState({ usuarios: [], total: 0 });
  const [roles, setRoles] = useState([]);
  const [filtros, setFiltros] = useState({ busqueda: "", estado: "", pagina: 1 });
  const [busqueda, setBusqueda] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [formulario, setFormulario] = useState(null);
  const [reset, setReset] = useState(null);
  const [passwordTemporal, setPasswordTemporal] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [accion, setAccion] = useState(null);

  useEffect(() => {
    if (!permite("usuarios.ver")) return undefined;
    const controller = new AbortController();
    setCargando(true); setError("");
    Promise.all([
      api.get("/usuarios", { params: { ...filtros, limite: 25 }, signal: controller.signal }),
      api.get("/roles", { signal: controller.signal }),
    ]).then(([lista, catalogo]) => {
      if (!controller.signal.aborted) { setDatos(lista.data); setRoles(catalogo.data.roles); }
    }).catch((fallo) => { if (!controller.signal.aborted) setError(mensajeCuenta(fallo)); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [filtros, recarga, permite]);

  function abrirFormulario(usuario) {
    setError(""); setMensaje(""); setReset(null); setPasswordTemporal(""); setConfirmacion("");
    setFormulario(usuario ? { idUsuario: usuario.idUsuario, nombre: usuario.nombre, email: usuario.email,
      rol: roles.some((r) => r.nombre === usuario.rol) ? usuario.rol : "", versionRegistro: usuario.versionRegistro }
      : { nombre: "", email: "", rol: "Operador" });
  }

  async function guardar(event, confirmado = false) {
    event?.preventDefault();
    const creando = !formulario.idUsuario;
    const validacion = creando ? validarPasswordNueva(passwordTemporal, confirmacion) : "";
    if (validacion) { setError(validacion); return; }
    if (!confirmado && formulario.idUsuario === usuarioActual.idUsuario &&
        (formulario.email !== usuarioActual.email || formulario.rol !== usuarioActual.rol)) {
      setAccion({ tipo: "guardar", titulo: "Confirmar cambios en tu cuenta", descripcion: "Cambiar tu correo o rol cerrará todas tus sesiones. Tendrás que volver a iniciar sesión con los datos actualizados.", boton: "Confirmar cambios" });
      return;
    }
    setOcupado(true); setError(""); setMensaje("");
    try {
      const { idUsuario, ...campos } = formulario;
      const response = creando ? await api.post("/usuarios", { ...campos, passwordTemporal })
        : await api.put(`/usuarios/${idUsuario}`, campos);
      setFormulario(null); setPasswordTemporal(""); setConfirmacion("");
      if (response.data.sesionRevocada) { limpiarSesion(); return; }
      if (!creando && idUsuario === usuarioActual.idUsuario) onSesionActualizada(response.data, response.config.tokenSesion);
      setMensaje(creando ? "Cuenta creada. Compartí la contraseña temporal por un medio privado; deberá cambiarla al ingresar." : "Cuenta actualizada.");
      setRecarga((n) => n + 1);
    } catch (fallo) { setError(mensajeCuenta(fallo)); }
    finally { setOcupado(false); }
  }

  async function cambiarEstado(usuario) {
    const nuevo = usuario.estado === "Activo" ? "Inactivo" : "Activo";
    setOcupado(true); setError(""); setMensaje("");
    try {
      const response = await api.patch(`/usuarios/${usuario.idUsuario}/estado`, { estado: nuevo, versionRegistro: usuario.versionRegistro });
      if (response.data.sesionRevocada) { limpiarSesion(); return; }
      setRecarga((n) => n + 1); setMensaje("Estado actualizado.");
    } catch (fallo) { setError(mensajeCuenta(fallo)); }
    finally { setOcupado(false); }
  }

  async function confirmarAccion() {
    if (accion.tipo === "guardar") await guardar(null, true);
    else await cambiarEstado(accion.usuario);
    setAccion(null);
  }

  async function restablecer(event) {
    event.preventDefault();
    const validacion = validarPasswordNueva(passwordTemporal, confirmacion);
    if (validacion) { setError(validacion); return; }
    setOcupado(true); setError(""); setMensaje("");
    try {
      await api.post(`/usuarios/${reset.idUsuario}/restablecer-password`, { passwordTemporal, versionRegistro: reset.versionRegistro });
      setReset(null); setPasswordTemporal(""); setConfirmacion(""); setRecarga((n) => n + 1);
      setMensaje("Contraseña restablecida. Se cerraron las sesiones y deberá cambiarla al ingresar. El estado de la cuenta se conserva.");
    } catch (fallo) { setError(mensajeCuenta(fallo)); }
    finally { setOcupado(false); }
  }

  function cerrarFormulario() { setFormulario(null); setReset(null); setPasswordTemporal(""); setConfirmacion(""); setError(""); }
  function limpiarFiltros() { setBusqueda(""); setFiltros({ busqueda: "", estado: "", pagina: 1 }); }
  const tieneFiltros = Boolean(filtros.busqueda || filtros.estado);
  const totalPaginas = Math.max(1, Math.ceil(datos.total / 25));
  const conPassword = Boolean(reset || (formulario && !formulario.idUsuario));

  if (!permite("usuarios.ver")) return <p role="alert">No tenés permiso para administrar usuarios.</p>;
  return (
    <section className="security-page security-users">
      <header className="section-header security-heading">
        <div><span className="security-eyebrow"><SecurityIcon name="shield" />Equipo y acceso</span><h1>Usuarios</h1><p>Organizá tu equipo y gestioná quién puede acceder a HostFlow.</p></div>
        {permite("usuarios.crear") && <button type="button" className="primary-button" disabled={ocupado || cargando} onClick={() => abrirFormulario(null)}><SecurityIcon name="plus" />Nuevo usuario</button>}
      </header>
      <InvitacionesDelProducto usuario={usuarioActual}/>
      {error && !formulario && !reset && <SecurityFeedback error>{error}<button type="button" disabled={ocupado} onClick={() => setRecarga(n => n + 1)}>Recargar datos</button></SecurityFeedback>}
      {mensaje && <SecurityFeedback>{mensaje}</SecurityFeedback>}

      <div className="security-directory" aria-busy={cargando}>
        <div className="security-directory-heading"><div className="security-title-with-icon"><span className="security-heading-icon"><SecurityIcon name="users" /></span><div><h2>Equipo de HostFlow</h2><p>Cuentas y permisos de acceso</p></div></div>{!cargando && <span className="security-count">{datos.total} {datos.total === 1 ? "cuenta" : "cuentas"}{tieneFiltros ? " encontradas" : ""}</span>}</div>
        <form className="security-filters" onSubmit={(e) => { e.preventDefault(); setFiltros({ ...filtros, busqueda, pagina: 1 }); }}>
          <div className="security-field security-search-field"><label htmlFor="usuarios-busqueda">Buscar usuario</label><div className="security-search"><SecurityIcon name="search" /><input id="usuarios-busqueda" value={busqueda} maxLength={120} placeholder="Nombre o correo electrónico" onChange={(e) => setBusqueda(e.target.value)} /></div></div>
          <div className="security-field"><label htmlFor="usuarios-estado">Estado</label><select id="usuarios-estado" value={filtros.estado} disabled={ocupado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value, pagina: 1 })}><option value="">Todos los estados</option><option>Activo</option><option>Inactivo</option></select></div>
          <button className="secondary-button" disabled={ocupado || cargando}>Buscar</button>
          {(tieneFiltros || busqueda) && <button type="button" className="security-text-button" disabled={ocupado || cargando} onClick={limpiarFiltros}>Limpiar filtros</button>}
        </form>
        {cargando ? <div className="security-empty" role="status"><span className="security-spinner" aria-hidden="true" /><h3>Cargando usuarios</h3><p>Estamos consultando las cuentas de tu equipo.</p></div> : <div className="security-table-wrap"><table className="security-table"><caption className="security-sr-only">Usuarios de HostFlow, roles, estados y acciones autorizadas</caption><thead><tr><th scope="col">Usuario</th><th scope="col">Correo electrónico</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
          <tbody>{datos.usuarios.map((usuario) => <tr key={usuario.idUsuario}>
            <td data-label="Usuario"><div className="security-user-identity"><AccountAvatar nombre={usuario.nombre} /><div><strong>{usuario.nombre}</strong>{usuario.idUsuario === usuarioActual.idUsuario && <span className="security-self">Tu cuenta</span>}{usuario.debeCambiarPassword && <small><SecurityIcon name="lock" />Cambio de contraseña pendiente</small>}</div></div></td>
            <td data-label="Correo" className="security-email">{usuario.email}</td>
            <td data-label="Rol"><RoleBadge rol={usuario.rol} /></td>
            <td data-label="Estado"><span className={`security-badge ${usuario.estado === "Activo" ? "" : "security-badge--inactive"}`}><span className="security-status-dot" aria-hidden="true" />{usuario.estado}</span></td>
            <td data-label="Acciones"><div className="security-actions security-row-actions">
              {permite("usuarios.modificar") && <button type="button" className="security-row-action" disabled={ocupado} onClick={() => abrirFormulario(usuario)}><SecurityIcon name="edit" />Editar</button>}
              {permite("usuarios.estado") && <button type="button" className={`security-row-action ${usuario.estado === "Activo" ? "security-row-action--danger" : "security-row-action--positive"}`} disabled={ocupado} onClick={() => { setError(""); setMensaje(""); setAccion({ tipo: "estado", usuario, titulo: `${usuario.estado === "Activo" ? "Desactivar" : "Activar"} usuario`, descripcion: `${usuario.nombre}: ${usuario.estado === "Activo" ? "no podrá iniciar sesión hasta que vuelvas a activar su cuenta" : "volverá a tener acceso con su rol actual"}. Se invalidarán sus sesiones anteriores.`, boton: usuario.estado === "Activo" ? "Desactivar cuenta" : "Activar cuenta", danger: usuario.estado === "Activo" }); }}><SecurityIcon name={usuario.estado === "Activo" ? "off" : "check"} />{usuario.estado === "Activo" ? "Desactivar" : "Activar"}</button>}
              {permite("usuarios.restablecer") && usuario.idUsuario !== usuarioActual.idUsuario && <button type="button" className="security-row-action" disabled={ocupado} onClick={() => { setFormulario(null); setReset(usuario); setPasswordTemporal(""); setConfirmacion(""); setError(""); setMensaje(""); }}><SecurityIcon name="lock" />Restablecer</button>}
            </div></td>
          </tr>)}{datos.usuarios.length === 0 && <tr className="security-empty-row"><td colSpan={5}><div className="security-empty"><span className="security-empty-icon"><SecurityIcon name={tieneFiltros ? "search" : "users"} /></span><h3>{error ? "No se pudo cargar el equipo" : tieneFiltros ? "No encontramos usuarios" : "Tu equipo empieza acá"}</h3><p>{error ? "Reintentá la consulta con el botón Recargar datos." : tieneFiltros ? "Probá con otro nombre, correo o estado." : "Creá una cuenta para darle acceso a otro integrante."}</p>{tieneFiltros && <button type="button" className="secondary-button" onClick={limpiarFiltros}>Limpiar filtros</button>}</div></td></tr>}</tbody>
        </table></div>}
        <footer className="security-pagination"><span>{datos.total ? `${(filtros.pagina - 1) * 25 + 1}–${Math.min(filtros.pagina * 25, datos.total)} de ${datos.total} cuentas` : "0 cuentas"}</span><div><span>Página {filtros.pagina} de {totalPaginas}</span><button type="button" aria-label="Página anterior" disabled={cargando || ocupado || filtros.pagina === 1} onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina - 1 })}><SecurityIcon name="left" />Anterior</button><button type="button" aria-label="Página siguiente" disabled={cargando || ocupado || filtros.pagina * 25 >= datos.total} onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina + 1 })}>Siguiente<SecurityIcon name="right" /></button></div></footer>
      </div>
      <p className="security-footer-note"><SecurityIcon name="shield" />Los cambios de rol, estado o contraseña invalidan las sesiones de la cuenta.</p>

      {(formulario || reset) && <SecurityDialog title={reset ? "Restablecer contraseña" : formulario.idUsuario ? "Editar usuario" : "Nuevo usuario"} description={reset ? `Asigná una contraseña temporal para ${reset.nombre}.` : formulario.idUsuario ? "Actualizá los datos y el acceso de esta cuenta." : "Sumá un integrante con el acceso que necesita."} onClose={cerrarFormulario} busy={ocupado}>
        <form className="security-user-form" onSubmit={reset ? restablecer : guardar} aria-busy={ocupado}>
          {error && <SecurityFeedback error>{error}<button type="button" disabled={ocupado} aria-label="Descartar formulario y recargar datos" onClick={() => { cerrarFormulario(); setRecarga(n => n + 1); }}>Recargar datos</button></SecurityFeedback>}
          {formulario && <div className="security-form-grid">
            <div className="security-field"><label htmlFor="usuario-nombre">Nombre completo</label><input id="usuario-nombre" value={formulario.nombre} maxLength={120} required disabled={ocupado} autoComplete="off" onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} /></div>
            <div className="security-field"><label htmlFor="usuario-email">Correo electrónico</label><input id="usuario-email" type="email" value={formulario.email} maxLength={254} required disabled={ocupado} autoComplete="off" onChange={(e) => setFormulario({ ...formulario, email: e.target.value })} /></div>
            <div className="security-field security-field--wide"><label htmlFor="usuario-rol">Rol de acceso</label><select id="usuario-rol" value={formulario.rol} required disabled={ocupado} aria-describedby="usuario-rol-ayuda" onChange={(e) => setFormulario({ ...formulario, rol: e.target.value })}><option value="" disabled>Seleccioná un rol</option>{roles.map((rol) => <option key={rol.nombre} value={rol.nombre}>{rol.nombre}</option>)}</select><p id="usuario-rol-ayuda" className="security-field-help">{formulario.rol === "Administrador" ? "Gestiona usuarios, seguridad y todas las funciones de HostFlow." : formulario.rol === "Operador" ? "Realiza tareas operativas, sin administrar usuarios ni acceder a información económica." : "Elegí uno de los roles habilitados."}</p></div>
          </div>}
          {conPassword && <><div className="security-form-grid security-form-passwords"><PasswordField id="usuario-password" label="Contraseña temporal" value={passwordTemporal} disabled={ocupado} describedBy="usuario-password-ayuda" onChange={(e) => setPasswordTemporal(e.target.value)} /><PasswordField id="usuario-confirmacion" label="Repetir contraseña temporal" value={confirmacion} disabled={ocupado} describedBy="usuario-password-ayuda" onChange={(e) => setConfirmacion(e.target.value)} /></div><PasswordRules id="usuario-password-ayuda" password={passwordTemporal} confirmacion={confirmacion} /></>}
          <div className="security-notice"><SecurityIcon name="lock" /><p>{reset ? "Se cerrarán sus sesiones y deberá cambiar esta contraseña al ingresar. El estado de la cuenta no cambia." : conPassword ? "Compartí la contraseña temporal por un medio privado. Deberá cambiarla en su primer ingreso." : "Cambiar el correo o el rol cerrará todas las sesiones de esta cuenta. La protección del último Administrador sigue vigente."}</p></div>
          <div className="security-dialog-actions"><button type="button" className="secondary-button" disabled={ocupado} onClick={cerrarFormulario}>Cancelar</button><button className="primary-button" disabled={ocupado}>{ocupado ? "Guardando…" : reset ? "Restablecer contraseña" : formulario.idUsuario ? "Guardar cambios" : "Crear usuario"}</button></div>
        </form>
      </SecurityDialog>}
      {accion && <SecurityDialog compact title={accion.titulo} description={accion.descripcion} onClose={() => setAccion(null)} busy={ocupado}><div className="security-dialog-actions"><button type="button" className="secondary-button" disabled={ocupado} onClick={() => setAccion(null)}>Cancelar</button><button type="button" className={accion.danger ? "security-danger-button" : "primary-button"} disabled={ocupado} onClick={confirmarAccion}>{ocupado ? "Guardando…" : accion.boton}</button></div></SecurityDialog>}
    </section>
  );
}
export default Usuarios;

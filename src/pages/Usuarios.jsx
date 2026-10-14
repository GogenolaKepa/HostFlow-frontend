import { useEffect, useState } from "react";
import api from "../services/api";
import { usePermisos } from "../context/PermisosContext";
import { limpiarSesion } from "../services/session";
import { mensajeCuenta, validarPasswordNueva } from "../services/cuentas";

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

  useEffect(() => {
    if (!permite("usuarios.ver")) return undefined;
    const controller = new AbortController();
    setCargando(true); setError("");
    Promise.all([
      api.get("/usuarios", { params: { ...filtros, limite: 25 }, signal: controller.signal }),
      api.get("/roles", { signal: controller.signal }),
    ]).then(([lista, catalogo]) => {
      setDatos(lista.data); setRoles(catalogo.data.roles);
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

  async function guardar(event) {
    event.preventDefault();
    const creando = !formulario.idUsuario;
    const validacion = creando ? validarPasswordNueva(passwordTemporal, confirmacion) : "";
    if (validacion) { setError(validacion); return; }
    if (formulario.idUsuario === usuarioActual.idUsuario && (formulario.email !== usuarioActual.email || formulario.rol !== usuarioActual.rol) &&
        !window.confirm("Cambiar tu correo o rol cerrará todas tus sesiones. ¿Continuar?")) return;
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

  async function estado(usuario) {
    const nuevo = usuario.estado === "Activo" ? "Inactivo" : "Activo";
    if (!window.confirm(`${nuevo === "Activo" ? "Activar" : "Desactivar"} la cuenta de ${usuario.nombre}. Se invalidarán sus sesiones. ¿Continuar?`)) return;
    setOcupado(true); setError(""); setMensaje("");
    try {
      const response = await api.patch(`/usuarios/${usuario.idUsuario}/estado`, { estado: nuevo, versionRegistro: usuario.versionRegistro });
      if (response.data.sesionRevocada) { limpiarSesion(); return; }
      setRecarga((n) => n + 1); setMensaje("Estado actualizado.");
    } catch (fallo) { setError(mensajeCuenta(fallo)); }
    finally { setOcupado(false); }
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

  function cerrarFormulario() { setFormulario(null); setReset(null); setPasswordTemporal(""); setConfirmacion(""); }

  if (!permite("usuarios.ver")) return <p role="alert">No tenés permiso para administrar usuarios.</p>;
  return (
    <section className="security-page">
      <header className="section-header"><div><span className="security-eyebrow">HostFlow · Seguridad</span><h1>Usuarios</h1><p>Gestioná cuentas, acceso y roles de tu equipo.</p></div>
        {permite("usuarios.crear") && <button className="primary-button" disabled={ocupado || cargando} onClick={() => abrirFormulario(null)}>Nuevo usuario</button>}
      </header>
      {error && <div className="security-feedback security-feedback--error" role="alert">{error}
        <button type="button" disabled={ocupado} onClick={() => { cerrarFormulario(); setRecarga((n) => n + 1); }}>Recargar datos</button></div>}
      {mensaje && <p className="security-feedback" role="status">{mensaje}</p>}
      {(formulario || reset) && <form className="security-card security-user-form" onSubmit={reset ? restablecer : guardar}>
        <h2>{reset ? `Restablecer contraseña: ${reset.nombre}` : formulario.idUsuario ? "Editar usuario" : "Nuevo usuario"}</h2>
        {formulario && <div className="form-grid">
          <div><label htmlFor="usuario-nombre">Nombre</label><input id="usuario-nombre" value={formulario.nombre} maxLength={120} required onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} /></div>
          <div><label htmlFor="usuario-email">Correo</label><input id="usuario-email" type="email" value={formulario.email} maxLength={254} required autoComplete="off" onChange={(e) => setFormulario({ ...formulario, email: e.target.value })} /></div>
          <div><label htmlFor="usuario-rol">Rol</label><select id="usuario-rol" value={formulario.rol} required onChange={(e) => setFormulario({ ...formulario, rol: e.target.value })}>
            <option value="" disabled>Seleccioná un rol</option>{roles.map((rol) => <option key={rol.nombre} value={rol.nombre}>{rol.nombre}</option>)}
          </select></div>
        </div>}
        {(reset || !formulario.idUsuario) && <div className="form-grid">
          <div><label htmlFor="usuario-password">Contraseña temporal</label><input id="usuario-password" type="password" value={passwordTemporal} required autoComplete="new-password" onChange={(e) => setPasswordTemporal(e.target.value)} /></div>
          <div><label htmlFor="usuario-confirmacion">Repetir contraseña temporal</label><input id="usuario-confirmacion" type="password" value={confirmacion} required autoComplete="new-password" onChange={(e) => setConfirmacion(e.target.value)} /></div>
        </div>}
        <p>{reset || !formulario.idUsuario ? "Mínimo 12 caracteres, máximo 72 bytes UTF-8. Compartila por un medio privado. El cambio será obligatorio al ingresar." : "Cambiar el correo o rol revoca las sesiones de la cuenta."}</p>
        <div className="security-actions"><button className="primary-button" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</button><button type="button" className="secondary-button" disabled={ocupado} onClick={cerrarFormulario}>Cancelar</button></div>
      </form>}
      <form className="security-filters" onSubmit={(e) => { e.preventDefault(); setFiltros({ ...filtros, busqueda, pagina: 1 }); }}>
        <label htmlFor="usuarios-busqueda">Buscar<input id="usuarios-busqueda" value={busqueda} maxLength={120} placeholder="Nombre o correo" onChange={(e) => setBusqueda(e.target.value)} /></label>
        <label htmlFor="usuarios-estado">Estado<select id="usuarios-estado" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value, pagina: 1 })}><option value="">Todos</option><option>Activo</option><option>Inactivo</option></select></label>
        <button className="secondary-button" disabled={ocupado}>Buscar</button>
      </form>
      {cargando ? <p role="status">Cargando usuarios…</p> : <div className="security-table-wrap"><table className="security-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>{datos.usuarios.map((usuario) => <tr key={usuario.idUsuario}><td><strong>{usuario.nombre}</strong>{usuario.debeCambiarPassword && <small>Cambio de contraseña pendiente</small>}</td><td>{usuario.email}</td><td>{usuario.rol}</td><td><span className={`security-badge ${usuario.estado === "Activo" ? "" : "security-badge--inactive"}`}>{usuario.estado}</span></td><td><div className="security-actions">
          {permite("usuarios.modificar") && <button disabled={ocupado} onClick={() => abrirFormulario(usuario)}>Editar</button>}
          {permite("usuarios.estado") && <button disabled={ocupado} onClick={() => estado(usuario)}>{usuario.estado === "Activo" ? "Desactivar" : "Activar"}</button>}
          {permite("usuarios.restablecer") && usuario.idUsuario !== usuarioActual.idUsuario && <button disabled={ocupado} onClick={() => { setFormulario(null); setReset(usuario); setPasswordTemporal(""); setConfirmacion(""); setError(""); setMensaje(""); }}>Restablecer</button>}
        </div></td></tr>)}{datos.usuarios.length === 0 && <tr><td colSpan={5}>No hay usuarios para estos filtros.</td></tr>}</tbody>
      </table></div>}
      <footer className="security-pagination"><span>{datos.total} cuentas · Página {filtros.pagina}</span><button disabled={cargando || ocupado || filtros.pagina === 1} onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina - 1 })}>Anterior</button><button disabled={cargando || ocupado || filtros.pagina * 25 >= datos.total} onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina + 1 })}>Siguiente</button></footer>
    </section>
  );
}
export default Usuarios;

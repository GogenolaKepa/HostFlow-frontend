import { useState } from "react";
import api from "../services/api";
import { mensajeCuenta, validarPasswordNueva } from "../services/cuentas";

function MiCuenta({ usuario, onSesionActualizada, onLogout, obligatorio = false }) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function guardarNombre(event) {
    event.preventDefault();
    setOcupado(true); setError(""); setMensaje("");
    try {
      const response = await api.patch("/auth/me", { nombre, versionRegistro: usuario.versionRegistro });
      onSesionActualizada(response.data, response.config.tokenSesion);
      setMensaje("Tu nombre fue actualizado.");
    } catch (fallo) { setError(mensajeCuenta(fallo)); }
    finally { setOcupado(false); }
  }

  async function cambiarPassword(event) {
    event.preventDefault();
    const validacion = validarPasswordNueva(passwordNueva, confirmacion);
    if (validacion) { setError(validacion); return; }
    setOcupado(true); setError(""); setMensaje("");
    try {
      const response = await api.post("/auth/cambiar-password", {
        passwordActual, passwordNueva, versionRegistro: usuario.versionRegistro,
      });
      setPasswordActual(""); setPasswordNueva(""); setConfirmacion("");
      onSesionActualizada(response.data, response.config.tokenSesion);
      setMensaje("Contraseña actualizada. Tus sesiones anteriores fueron cerradas.");
    } catch (fallo) { setError(mensajeCuenta(fallo)); }
    finally { setOcupado(false); }
  }

  return (
    <section className={`security-page ${obligatorio ? "security-page--required" : ""}`}>
      <header className="section-header">
        <div><span className="security-eyebrow">HostFlow · Seguridad</span>
          <h1>{obligatorio ? "Actualizá tu contraseña" : "Mi cuenta"}</h1>
          <p>{obligatorio ? "Para continuar, reemplazá tu contraseña temporal por una privada." : "Administrá tus datos personales y tu contraseña."}</p>
        </div>
        {obligatorio && <button type="button" className="secondary-button" disabled={ocupado} onClick={onLogout}>Cerrar sesión</button>}
      </header>
      <div className="security-profile"><strong>{usuario.nombre}</strong><span>{usuario.email}</span><span className="security-badge">{usuario.rol}</span></div>
      {error && <p className="security-feedback security-feedback--error" role="alert">{error}
        {error.includes("Recarg") && <button type="button" onClick={() => window.location.reload()}>Recargar cuenta</button>}
      </p>}
      {mensaje && <p className="security-feedback" role="status">{mensaje}</p>}
      {!usuario.gestionCuentasDisponible ? <p className="security-card">Los cambios de cuenta estarán disponibles cuando se habilite la gestión de usuarios.</p> : (
        <div className="security-grid">
          {!obligatorio && <form className="security-card" onSubmit={guardarNombre}>
            <h2>Datos personales</h2>
            <label htmlFor="cuenta-nombre">Nombre</label>
            <input id="cuenta-nombre" value={nombre} maxLength={120} required autoComplete="name" onChange={(e) => setNombre(e.target.value)} />
            <p>El correo y el rol los administra un Administrador.</p>
            <button className="primary-button" disabled={ocupado}>Guardar nombre</button>
          </form>}
          <form className="security-card" onSubmit={cambiarPassword}>
            <h2>{obligatorio ? "Nueva contraseña" : "Cambiar contraseña"}</h2>
            <label htmlFor="cuenta-actual">Contraseña actual</label>
            <input id="cuenta-actual" type="password" value={passwordActual} required autoComplete="current-password" onChange={(e) => setPasswordActual(e.target.value)} />
            <label htmlFor="cuenta-nueva">Nueva contraseña</label>
            <input id="cuenta-nueva" type="password" value={passwordNueva} required autoComplete="new-password" onChange={(e) => setPasswordNueva(e.target.value)} />
            <label htmlFor="cuenta-confirmacion">Repetir nueva contraseña</label>
            <input id="cuenta-confirmacion" type="password" value={confirmacion} required autoComplete="new-password" onChange={(e) => setConfirmacion(e.target.value)} />
            <p>Al menos 12 caracteres y hasta 72 bytes UTF-8. Se cerrarán tus otras sesiones.</p>
            <button className="primary-button" disabled={ocupado}>{ocupado ? "Guardando…" : "Actualizar contraseña"}</button>
          </form>
        </div>
      )}
    </section>
  );
}

export default MiCuenta;

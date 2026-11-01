import { useState } from "react";
import api from "../services/api";
import { mensajeCuenta, validarPasswordNueva } from "../services/cuentas";
import { AccountAvatar, PasswordField, PasswordRules, RoleBadge, SecurityFeedback, SecurityIcon } from "../components/security/SecurityUI";
import {ContactoDelProducto} from '../components/autenticacion/ProductoComercial';

function MiCuenta({ usuario, onSesionActualizada, onLogout, obligatorio = false }) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [operacion, setOperacion] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function guardarNombre(event) {
    event.preventDefault();
    setOcupado(true); setOperacion("nombre"); setError(""); setMensaje("");
    try {
      const response = await api.patch("/auth/me", { nombre, versionRegistro: usuario.versionRegistro });
      onSesionActualizada(response.data, response.config.tokenSesion);
      setMensaje("Tu nombre fue actualizado.");
    } catch (fallo) { setError(mensajeCuenta(fallo)); }
    finally { setOcupado(false); setOperacion(""); }
  }

  async function cambiarPassword(event) {
    event.preventDefault();
    const validacion = validarPasswordNueva(passwordNueva, confirmacion);
    if (validacion) { setError(validacion); return; }
    setOcupado(true); setOperacion("password"); setError(""); setMensaje("");
    try {
      const response = await api.post("/auth/cambiar-password", {
        passwordActual, passwordNueva, versionRegistro: usuario.versionRegistro,
      });
      setPasswordActual(""); setPasswordNueva(""); setConfirmacion("");
      onSesionActualizada(response.data, response.config.tokenSesion);
      setMensaje("Contraseña actualizada. Tus sesiones anteriores fueron cerradas.");
    } catch (fallo) { setError(mensajeCuenta(fallo)); }
    finally { setOcupado(false); setOperacion(""); }
  }

  return (
    <section className={`security-page security-account ${obligatorio ? "security-page--required" : ""}`}>
      <header className="section-header security-heading">
        <div><span className="security-eyebrow"><SecurityIcon name="shield" />{obligatorio ? "Protegé tu acceso" : "Tu espacio personal"}</span>
          <h1>{obligatorio ? "Actualizá tu contraseña" : "Mi cuenta"}</h1>
          <p>{obligatorio ? "Reemplazá la contraseña temporal para empezar a usar HostFlow." : "Tus datos y la seguridad de tu acceso, en un solo lugar."}</p>
        </div>
        {obligatorio && <button type="button" className="secondary-button" disabled={ocupado} onClick={onLogout}>Cerrar sesión</button>}
      </header>
      <div className="security-profile"><AccountAvatar nombre={usuario.nombre} large /><div className="security-profile-identity"><span className="security-profile-label">Tu perfil en HostFlow</span><strong>{usuario.nombre}</strong><span>{usuario.email}</span></div><RoleBadge rol={usuario.rol} /></div>
      {error && <SecurityFeedback error>{error}{error.includes("Recarg") && <button type="button" disabled={ocupado} onClick={() => window.location.reload()}>Recargar cuenta</button>}</SecurityFeedback>}
      {mensaje && <SecurityFeedback>{mensaje}</SecurityFeedback>}
      {!usuario.gestionCuentasDisponible ? <div className="security-card security-notice"><SecurityIcon name="info" /><p>Los cambios de cuenta estarán disponibles cuando se habilite la gestión de usuarios.</p></div> : (
        <div className={`security-grid ${obligatorio ? "security-grid--required" : ""}`}>
          {!obligatorio && <form className="security-card security-personal-card" onSubmit={guardarNombre} aria-busy={ocupado && operacion === "nombre"}>
            <div className="security-card-heading"><span className="security-heading-icon"><SecurityIcon name="person" /></span><div><h2>Datos personales</h2><p>Así te identifica tu equipo.</p></div></div>
            <div className="security-field"><label htmlFor="cuenta-nombre">Nombre completo</label><input id="cuenta-nombre" value={nombre} maxLength={120} required disabled={ocupado} autoComplete="name" onChange={(e) => setNombre(e.target.value)} /></div>
            <dl className="security-account-details"><div><dt>Correo electrónico</dt><dd>{usuario.email}</dd></div><div><dt>Rol de acceso</dt><dd><RoleBadge rol={usuario.rol} /></dd></div></dl>
            <div className="security-notice"><SecurityIcon name="info" /><p>Un Administrador gestiona los cambios de correo y rol.</p></div>
            <div className="security-card-actions"><button className="primary-button" disabled={ocupado}>{operacion === "nombre" ? "Guardando…" : "Guardar nombre"}</button></div>
          </form>}
          <form className="security-card" onSubmit={cambiarPassword} aria-busy={ocupado && operacion === "password"}>
            <div className="security-card-heading"><span className="security-heading-icon"><SecurityIcon name="lock" /></span><div><h2>{obligatorio ? "Nueva contraseña" : "Cambiar contraseña"}</h2><p>Elegí una contraseña privada que no uses en otros sitios.</p></div></div>
            <PasswordField id="cuenta-actual" label="Contraseña actual" value={passwordActual} disabled={ocupado} autoComplete="current-password" onChange={(e) => setPasswordActual(e.target.value)} />
            <PasswordField id="cuenta-nueva" label="Nueva contraseña" value={passwordNueva} disabled={ocupado} describedBy="cuenta-password-ayuda" onChange={(e) => setPasswordNueva(e.target.value)} />
            <PasswordField id="cuenta-confirmacion" label="Repetir nueva contraseña" value={confirmacion} disabled={ocupado} describedBy="cuenta-password-ayuda" onChange={(e) => setConfirmacion(e.target.value)} />
            <PasswordRules id="cuenta-password-ayuda" password={passwordNueva} confirmacion={confirmacion} />
            <div className="security-notice"><SecurityIcon name="shield" /><p>Al actualizarla, se cerrarán tus otras sesiones. Esta sesión continuará con la nueva contraseña.</p></div>
            <div className="security-card-actions"><button className="primary-button" disabled={ocupado}>{operacion === "password" ? "Guardando…" : "Actualizar contraseña"}</button></div>
          </form>
        </div>
      )}
      {!obligatorio && <ContactoDelProducto usuario={usuario}/>}
    </section>
  );
}

export default MiCuenta;

import { useState } from "react";
import { useTheme } from "../context/theme";
import { usePermisos } from "../context/PermisosContext";
import { SecurityIcon } from "../components/security/SecurityUI";

const sections = [
  { id: "apariencia", title: "Apariencia", icon: "appearance", description: "Personalizá tu espacio de trabajo." },
  { id: "generales", title: "Preferencias generales", icon: "settings" },
  { id: "operativas", title: "Preferencias operativas", icon: "calendar" },
  { id: "empresa", title: "Datos de empresa", icon: "building" },
  { id: "notificaciones", title: "Notificaciones", icon: "bell" },
  { id: "integraciones", title: "Integraciones", icon: "link" },
  { id: "seguridad", title: "Seguridad y acceso", icon: "shield" },
];
const choices = [
  { id: "claro", title: "Claro", description: "Superficies claras y azules de HostFlow.", icon: "sun" },
  { id: "oscuro", title: "Oscuro", description: "Una paleta oscura para tu espacio de trabajo.", icon: "moon" },
  { id: "automatico", title: "Automático", description: "Se adapta a la apariencia de tu sistema.", icon: "monitor" },
];

export default function Configuracion({ onNavegar, gestionCuentasDisponible = false }) {
  const appearance = useTheme();
  const permite = usePermisos();
  const general = permite("usuarios.ver");
  const [section, setSection] = useState("apariencia");
  const current = sections.find(item => item.id === section);
  return <section className="settings-page">
    <header className="settings-heading"><span className="settings-eyebrow"><SecurityIcon name="settings" />Tu espacio en HostFlow</span><h1>Configuración</h1><p>{general ? "Personalizá tu experiencia y consultá las opciones de tu equipo." : "Elegí cómo querés ver HostFlow en este navegador."}</p></header>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Secciones de configuración">
        {(general ? sections : sections.slice(0, 1)).map(item => <button key={item.id} type="button" className={section === item.id ? "is-active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}><SecurityIcon name={item.icon} /><span>{item.title}</span>{!["apariencia", "seguridad"].includes(item.id) && <small>Próximamente</small>}</button>)}
        <p><SecurityIcon name="monitor" />La apariencia es personal y se guarda en este navegador.</p>
      </nav>
      <div className="settings-content">
        {section === "apariencia" ? <>
          <div className="settings-card">
            <div className="settings-card-heading"><span className="settings-icon"><SecurityIcon name="appearance" /></span><div><h2>Apariencia</h2><p>Elegí el tema que te resulte más cómodo. Se aplica al instante.</p></div></div>
            <fieldset className="theme-options"><legend className="security-sr-only">Elegir apariencia</legend>
              {choices.map(choice => <label key={choice.id} className={`theme-option ${appearance.preference === choice.id ? "is-selected" : ""}`}>
                <input type="radio" name="apariencia" value={choice.id} checked={appearance.preference === choice.id} onChange={() => appearance.setPreference(choice.id)} />
                <span className={`theme-preview theme-preview--${choice.id}`} aria-hidden="true"><span className="theme-preview-sidebar"><i /><i /><i /></span><span className="theme-preview-main"><i /><span><i /><i /></span><i /></span>{choice.id === "automatico" && <span className="theme-preview-system"><SecurityIcon name="monitor" /></span>}</span>
                <span className="theme-option-title"><SecurityIcon name={choice.icon} />{choice.title}<span className="theme-radio-mark" aria-hidden="true" /></span><span className="theme-option-description">{choice.description}</span>
              </label>)}
            </fieldset>
            <div className="theme-status" role="status"><SecurityIcon name="check" /><div><strong>Tema {appearance.theme === "dark" ? "oscuro" : "claro"} activo</strong><p>{!appearance.storageAvailable ? "Se aplicó el tema, pero este navegador no permite guardar la preferencia. Se perderá al recargar." : appearance.persisted ? "Preferencia guardada en este navegador. Se conserva al recargar y cerrar sesión." : "Claro es el tema predeterminado. Tu elección se guardará al seleccionar una opción."}</p></div></div>
          </div>
          <div className="settings-note"><SecurityIcon name="monitor" /><div><h3>Tu sistema, tu preferencia</h3><p>En Automático, HostFlow sigue el tema del sistema y responde a sus cambios. Actualmente el sistema usa apariencia {appearance.system === "dark" ? "oscura" : "clara"}.</p><p>Esta elección no cambia la apariencia de otros dispositivos ni los permisos de tu cuenta.</p></div></div>
        </> : section === "seguridad" && general ? <div className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><SecurityIcon name="shield" /></span><div><h2>Seguridad y acceso</h2><p>Las cuentas y los roles se administran desde Usuarios.</p></div></div><p>Tu perfil y tu contraseña están disponibles en Mi cuenta. Estos accesos conservan los permisos y las validaciones existentes.</p><div className="settings-links">{gestionCuentasDisponible ? <button type="button" onClick={() => onNavegar("usuarios")}>Gestionar usuarios<SecurityIcon name="right" /></button> : <p>La gestión de usuarios no está disponible en la configuración actual.</p>}<button type="button" onClick={() => onNavegar("mi-cuenta")}>Ir a Mi cuenta<SecurityIcon name="right" /></button></div></div> : <div className="settings-card settings-unavailable"><span className="settings-icon"><SecurityIcon name={current.icon} /></span><span className="settings-coming">Próximamente</span><h2>{current.title}</h2><p>Esta configuración todavía no está disponible. Se incorporará en una próxima etapa.</p><p>No hay cambios para guardar en esta sección.</p></div>}
      </div>
    </div>
  </section>;
}

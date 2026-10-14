import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { validarPasswordNueva } from "../../services/cuentas";

const paths = {
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  edit: <><path d="m16 3 5 5-12 12-6 1 1-6Z" /><path d="m14 5 5 5" /></>,
  search: <><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 5 5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  alert: <><path d="m12 3 10 18H2Z" /><path d="M12 9v4M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  off: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
  left: <path d="m14 6-6 6 6 6" />,
  right: <path d="m10 6 6 6-6 6" />,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="m3 3 18 18M10.6 5.1 12 5c6 0 10 7 10 7a20 20 0 0 1-3 3.6M6.3 6.3A22 22 0 0 0 2 12s4 7 10 7a13 13 0 0 0 5.7-1.3M10 10a3 3 0 0 0 4 4" /></>,
};

export function SecurityIcon({ name, className = "" }) {
  return <svg className={`security-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.info}</svg>;
}

export function AccountAvatar({ nombre, large = false }) {
  const initials = nombre?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => [...p][0]).join("").toLocaleUpperCase() || "U";
  return <span className={`security-avatar ${large ? "security-avatar--large" : ""}`} aria-hidden="true">{initials}</span>;
}

export function RoleBadge({ rol }) {
  return <span className={`security-role ${rol === "Administrador" ? "security-role--admin" : ""}`}><SecurityIcon name={rol === "Administrador" ? "shield" : "person"} />{rol}</span>;
}

export function SecurityFeedback({ error = false, children }) {
  return <div className={`security-feedback ${error ? "security-feedback--error" : ""}`} role={error ? "alert" : "status"}><SecurityIcon name={error ? "alert" : "check"} /><div>{children}</div></div>;
}

export function PasswordField({ id, label, value, onChange, disabled, autoComplete = "new-password", describedBy }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!value) setVisible(false); }, [value]);
  return <div className="security-field">
    <label htmlFor={id}>{label}</label>
    <div className="security-password">
      <input id={id} type={visible ? "text" : "password"} value={value} required disabled={disabled} autoComplete={autoComplete} aria-describedby={describedBy} onChange={onChange} />
      <button type="button" className="security-password-toggle" disabled={disabled} aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLocaleLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(v => !v)}><SecurityIcon name={visible ? "eyeOff" : "eye"} /></button>
    </div>
  </div>;
}

export function PasswordRules({ password, confirmacion, id }) {
  const valida = Boolean(password) && !validarPasswordNueva(password, password);
  const coincide = Boolean(confirmacion) && password === confirmacion;
  return <div id={id} className="security-password-rules">
    <span className={valida ? "is-valid" : ""}><SecurityIcon name={valida ? "check" : "info"} />Mínimo 12 caracteres, máximo 72 bytes UTF-8; sin caracteres de control.</span>
    <span className={coincide ? "is-valid" : ""}><SecurityIcon name={coincide ? "check" : "info"} />{confirmacion ? coincide ? "Las contraseñas coinciden." : "Las contraseñas deben coincidir." : "Repetí la contraseña para confirmarla."}</span>
  </div>;
}

// El dialogo nativo contiene el foco; devolverlo explicitamente al desmontar React.
export function SecurityDialog({ title, description, children, onClose, busy = false, compact = false }) {
  const ref = useRef(null);
  const titleId = useId(), descriptionId = useId();
  useLayoutEffect(() => {
    const dialog = ref.current, opener = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => { dialog.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={ref} className={`security-dialog ${compact ? "security-dialog--compact" : ""}`} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <header className="security-dialog-header"><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div><button type="button" className="security-close" aria-label="Cerrar diálogo" disabled={busy} onClick={onClose}><SecurityIcon name="close" /></button></header>
    {children}
  </dialog>;
}

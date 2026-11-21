import { useState } from 'react';

// Mantiene el input y su valor: no rompe autocompletado ni gestores de contraseñas.
export default function CampoPassword({ id, label, name = id, icono = false, ...props }) {
  const [visible, setVisible] = useState(false);
  return <>
    <label htmlFor={id}>{label}</label>
    <div className="ac-password-campo">
      <input {...props} id={id} name={name} type={visible ? 'text' : 'password'} />
      <button type="button" className="ac-password-visibilidad" disabled={props.disabled}
        aria-controls={id} aria-pressed={icono ? undefined : visible}
        aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
        onClick={() => setVisible(v => !v)}>{icono ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="2.5" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        ) : visible ? 'Ocultar' : 'Mostrar'}</button>
    </div>
  </>;
}

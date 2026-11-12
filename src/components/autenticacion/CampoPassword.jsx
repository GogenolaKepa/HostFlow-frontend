import { useState } from 'react';

// Mantiene el input y su valor: no rompe autocompletado ni gestores de contraseñas.
export default function CampoPassword({ id, label, ...props }) {
  const [visible, setVisible] = useState(false);
  return <>
    <label htmlFor={id}>{label}</label>
    <div className="ac-password-campo">
      <input {...props} id={id} name={id} type={visible ? 'text' : 'password'} />
      <button type="button" className="ac-password-visibilidad" disabled={props.disabled}
        aria-controls={id} aria-pressed={visible}
        aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
        onClick={() => setVisible(v => !v)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
    </div>
  </>;
}

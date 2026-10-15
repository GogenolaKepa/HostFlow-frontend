export default function CampoConfiguracion({ campo, label, value, onChange, error, multiline = false, ...props }) {
  const id = `config-${campo}`;
  const input = { id, name: campo, value, onChange, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined, ...props };
  return <div className={`settings-field ${multiline ? 'settings-field--full' : ''}`}>
    <label htmlFor={id}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
    {multiline ? <textarea {...input} rows={4} /> : <input {...input} />}
    {error && <span id={`${id}-error`} className="settings-field-error">{error}</span>}
  </div>;
}

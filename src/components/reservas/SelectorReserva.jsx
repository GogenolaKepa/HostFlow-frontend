export default function SelectorReserva({ campo, etiqueta, singular, catalogo, valor, onChange, recargar, bloqueado }) {
  const id = `reserva-${campo}`, estado = `${id}-estado`;
  const disponible = catalogo.items.some(item => String(item.id) === String(valor));
  return <div>
    <label htmlFor={id}>{etiqueta}</label>
    <select id={id} name={campo} value={valor} onChange={onChange} required
      disabled={bloqueado || catalogo.cargando || Boolean(catalogo.error) || !catalogo.items.length} aria-describedby={estado}>
      <option value="">Seleccioná {singular}</option>
      {valor && !disponible && <option value={valor} disabled>Selección pendiente de comprobar</option>}
      {catalogo.items.map(item => <option key={item.id} value={item.id}>{item.nombre} (#{item.id})</option>)}
    </select>
    <p id={estado} role={catalogo.error ? 'alert' : 'status'}>
      {catalogo.cargando ? `Cargando ${etiqueta.toLowerCase()}…` : catalogo.error || (!catalogo.items.length ? `No hay ${etiqueta.toLowerCase()} disponibles.` : '')}
    </p>
    {catalogo.error && <button type="button" className="secondary-button" onClick={recargar}>Reintentar carga de {etiqueta.toLowerCase()}</button>}
  </div>;
}

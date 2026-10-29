import './CargaPagina.css';

const etiquetas = {
  dashboard: 'Cargando dashboard...',
  huespedes: 'Cargando huéspedes...',
  calendario: 'Cargando calendario...',
  reportes: 'Cargando reportes...',
  operativas: 'Cargando preferencias operativas...',
  empresa: 'Cargando datos de empresa...',
  preferencias: 'Cargando preferencias de notificaciones...',
  propiedades: 'Cargando propiedades...',
  reservas: 'Cargando reservas...',
  limpiezas: 'Cargando tareas de limpieza...',
};

function Trazo({ ancho = '100%', alto = '1rem' }) {
  return <span className="hf-skeleton-trazo" style={{ width: ancho, height: alto }} />;
}

function Tarjeta({ imagen = false }) {
  return <div className="hf-skeleton-tarjeta">
    {imagen && <div className="hf-skeleton-imagen"><Trazo alto="100%" /></div>}
    <div className="hf-skeleton-contenido">
      <Trazo ancho="65%" alto="1.35rem" />
      <Trazo ancho="30%" />
      <Trazo ancho="88%" /><Trazo ancho="72%" />
      <div className="hf-skeleton-acciones"><Trazo alto="2.5rem" /><Trazo alto="2.5rem" /></div>
    </div>
  </div>;
}

/** Solo presentación: el retraso CSS evita destellos sin demorar los datos. */
export default function CargaPagina({ variante = 'dashboard' }) {
  const formulario = ['operativas', 'empresa', 'preferencias'].includes(variante);
  if (formulario) return <section className={`hf-skeleton hf-skeleton--formulario hf-skeleton--${variante}`} role="status" aria-live="polite" aria-busy="true">
    <span className="hf-skeleton-etiqueta">{etiquetas[variante]}</span>
    <div className="hf-skeleton-visual" aria-hidden="true"><div className="hf-skeleton-campos">
      {Array.from({ length: variante === 'empresa' ? 8 : variante === 'preferencias' ? 5 : 2 }, (_, i) => <div className="hf-skeleton-campo" key={i}><Trazo ancho="45%" /><Trazo alto="2.75rem" /></div>)}
    </div><Trazo ancho="min(100%, 15rem)" alto="2.5rem" /></div>
  </section>;
  return <section className={`hf-skeleton hf-skeleton--${variante}`} role="status" aria-live="polite" aria-busy="true">
    <span className="hf-skeleton-etiqueta">{etiquetas[variante] || etiquetas.dashboard}</span>
    <div className="hf-skeleton-visual" aria-hidden="true">
      <div className="hf-skeleton-cabecera"><Trazo ancho="min(70%, 22rem)" alto="2rem" /><Trazo ancho="min(85%, 32rem)" /></div>
      {(variante === 'dashboard' || variante === 'limpiezas' || variante === 'reportes') && <div className="hf-skeleton-metricas">
        {Array.from({ length: 4 }, (_, i) => <div className="hf-skeleton-metrica" key={i}><Trazo ancho="65%" /><Trazo ancho="35%" alto="2rem" /></div>)}
      </div>}
      {variante === 'huespedes' && <div className="hf-skeleton-cabecera"><Trazo ancho="30%" /><Trazo alto="2.75rem" /></div>}
      {variante === 'calendario' ? <div className="hf-skeleton-calendario">
        {Array.from({ length: 6 }, (_, i) => <div className="hf-skeleton-semana" key={i}>
          {Array.from({ length: 7 }, (_, j) => <div className="hf-skeleton-dia" key={j}><Trazo ancho="35%" /><Trazo alto="1.5rem" /></div>)}
        </div>)}
      </div> : variante === 'reservas' || variante === 'huespedes' ? <div className="hf-skeleton-tabla">
        {Array.from({ length: 7 }, (_, i) => <div className="hf-skeleton-fila" key={i}>
          {Array.from({ length: 5 }, (_, j) => <Trazo key={j} ancho={j === 0 ? '85%' : '65%'} />)}
        </div>)}
      </div> : <div className="hf-skeleton-tarjetas">
        {Array.from({ length: ['dashboard', 'reportes'].includes(variante) ? 2 : 4 }, (_, i) => <Tarjeta key={i} imagen={variante === 'propiedades'} />)}
      </div>}
    </div>
  </section>;
}

import './EstadoReserva.css';

export default function EstadoReserva({ estado, finalizacionPendiente }) {
  const clase = String(estado).toLowerCase().replace(/\s+/g, '-');
  return <div className="reserva-estados">
    <span className={`estado ${clase}`}>{estado}</span>
    {finalizacionPendiente && <span className="reserva-finalizacion-pendiente">Finalización pendiente</span>}
  </div>;
}

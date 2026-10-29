import {formatearImporte} from '../../services/importes';
import './ImportesReserva.css';

// El acuerdo no declara retroactivamente la moneda de la estimación histórica.
export default function ImportesReserva({reserva, puedeVerImportes}) {
  if (!puedeVerImportes) return <span>Importes restringidos</span>;
  const acuerdo = reserva.acuerdoMonetario;
  return <span className="reserva-importes">
    <span>Estimación histórica: {formatearImporte(reserva.montoEstimado)}</span>
    {acuerdo && <span><strong>Acuerdo contractual: {formatearImporte(acuerdo.importe, acuerdo.moneda)}</strong></span>}
  </span>;
}

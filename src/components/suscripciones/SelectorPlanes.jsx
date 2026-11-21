import { useId, useState } from 'react';
import {
  ciclosParaSeleccion,
  crearSeleccionPlan,
  planesParaSeleccion,
} from '../../services/seleccionPlan.js';
import { ahorroAnual, descuentoAnual, precioPlan } from '../../services/catalogoComercial.js';
import './planes-suscripciones.css';

export default function SelectorPlanes({ seleccionInicial, onConfirmar }) {
  const id = useId();
  const [plan, setPlan] = useState(seleccionInicial?.plan ?? '');
  const [ciclo, setCiclo] = useState(seleccionInicial?.ciclo ?? 'mensual');

  function confirmar(evento) {
    evento.preventDefault();
    onConfirmar(crearSeleccionPlan(plan, ciclo));
  }

  return (
    <form className="hf-selector-planes" aria-label="Selección de plan" onSubmit={confirmar}>
      <fieldset className="hf-selector-planes__periodicidad">
        <legend>Periodicidad</legend>
        <div className="hf-selector-planes__ciclos">
          {Object.entries(ciclosParaSeleccion).map(([codigo, nombre]) => (
            <label key={codigo}>
              <input
                type="radio"
                name={`${id}-ciclo`}
                value={codigo}
                checked={ciclo === codigo}
                onChange={() => setCiclo(codigo)}
                required
              />
              {nombre}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="hf-selector-planes__ahorro">12 meses por el precio de 11 · {descuentoAnual} de ahorro aprox.</p>
      <fieldset>
        <legend>Planes por empresa</legend>
        <div className="hf-selector-planes__tarjetas">
          {planesParaSeleccion.map(opcion => (
            <label className="hf-selector-planes__tarjeta" key={opcion.id}>
              <span className="hf-selector-planes__opcion">
                <input
                  type="radio"
                  name={`${id}-plan`}
                  value={opcion.id}
                  aria-labelledby={`${id}-${opcion.id}-nombre`}
                  aria-describedby={`${id}-${opcion.id}-descripcion ${id}-${opcion.id}-precio ${id}-${opcion.id}-cupos`}
                  checked={plan === opcion.id}
                  onChange={() => setPlan(opcion.id)}
                  required
                />
                <strong id={`${id}-${opcion.id}-nombre`}>{opcion.nombre}</strong>
              </span>
              <span id={`${id}-${opcion.id}-descripcion`}>{opcion.descripcion}</span>
              <span className="hf-selector-planes__precio" id={`${id}-${opcion.id}-precio`}>
                <b>{precioPlan(opcion, ciclo)}</b> <span>/ {ciclo === 'anual' ? 'año' : 'mes'}</span>
              </span>
              {ciclo === 'anual' && <span className="hf-selector-planes__diferencia">Ahorrás {ahorroAnual(opcion)} frente a 12 pagos mensuales.</span>}
              <span className="hf-selector-planes__cupos" id={`${id}-${opcion.id}-cupos`}>
                <span>Hasta <b>{opcion.propiedades}</b> propiedades</span>
                <span><b>{opcion.usuarios}</b> {opcion.usuarios === 1 ? 'usuario con acceso' : 'usuarios con acceso'}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="hf-selector-planes__acciones">
        <p>Importes en dólares estadounidenses. La selección no genera cobros.</p>
        <button type="submit">Continuar con mi plan</button>
      </div>
    </form>
  );
}

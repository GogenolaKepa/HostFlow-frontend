import { useId, useState } from 'react';
import {
  ciclosParaSeleccion,
  crearSeleccionPlan,
  planesParaSeleccion,
} from '../../services/seleccionPlan.js';
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
      <fieldset>
        <legend>Ciclo de suscripción</legend>
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
                  aria-describedby={`${id}-${opcion.id}-descripcion ${id}-${opcion.id}-cupos`}
                  checked={plan === opcion.id}
                  onChange={() => setPlan(opcion.id)}
                  required
                />
                <strong id={`${id}-${opcion.id}-nombre`}>{opcion.nombre}</strong>
              </span>
              <span id={`${id}-${opcion.id}-descripcion`}>{opcion.descripcion}</span>
              <span className="hf-selector-planes__cupos" id={`${id}-${opcion.id}-cupos`}>
                <span>Hasta <b>{opcion.propiedades}</b> propiedades</span>
                <span><b>{opcion.usuarios}</b> {opcion.usuarios === 1 ? 'usuario con acceso' : 'usuarios con acceso'}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="hf-selector-planes__acciones">
        <p>Precios pendientes de confirmación.</p>
        <button type="submit">Confirmar selección</button>
      </div>
    </form>
  );
}

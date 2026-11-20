import { planes } from './catalogoComercial.js';

export const planesParaSeleccion = Object.freeze(planes.map(({
  id, nombre, descripcion, propiedades, usuarios,
}) => Object.freeze({ id, nombre, descripcion, propiedades, usuarios })));

export const ciclosParaSeleccion = Object.freeze({
  mensual: 'Mensual',
  anual: 'Anual',
});

export function crearSeleccionPlan(plan, ciclo) {
  if (!planesParaSeleccion.some(({ id }) => id === plan) ||
      typeof ciclo !== 'string' || !Object.hasOwn(ciclosParaSeleccion, ciclo)) {
    throw new TypeError('Elegí un plan y un ciclo disponibles.');
  }
  return Object.freeze({ plan, ciclo });
}

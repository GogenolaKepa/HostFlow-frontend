import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearProtectorBorradores } from '../src/services/borradores.js';

test('borrador: cancelar no ejecuta la navegación ni pierde estado; confirmar continúa una sola vez', () => {
  const protector = crearProtectorBorradores();
  const registro = protector.registrar();
  registro.actualizar(true, false);
  let salidas = 0;
  assert.equal(protector.solicitar(() => salidas++), false);
  protector.cancelar();
  assert.equal(salidas, 0);
  assert.equal(protector.estado().tieneCambios, true);
  protector.solicitar(() => salidas++);
  protector.solicitar(() => { throw Error('No reemplazar la salida pendiente.'); });
  assert.equal(protector.confirmar(), true);
  assert.equal(protector.confirmar(), false);
  assert.equal(salidas, 1);
});

test('sin cambios no confirma; guardado en curso bloquea salidas, incluso sin un borrador', () => {
  const protector = crearProtectorBorradores();
  const registro = protector.registrar();
  let salidas = 0;
  assert.equal(protector.solicitar(() => salidas++), true);
  registro.actualizar(false, true);
  assert.equal(protector.solicitar(() => salidas++), false);
  assert.equal(protector.estado().pendiente, false);
  registro.actualizar(true, false);
  protector.solicitar(() => salidas++);
  registro.actualizar(true, true);
  assert.equal(protector.confirmar(), false);
  registro.actualizar(false, false);
  assert.equal(protector.confirmar(), true);
  assert.equal(salidas, 2);
});

test('desmontar libera el registro; una nueva sesión no hereda borradores ni acciones', () => {
  const protector = crearProtectorBorradores();
  const registro = protector.registrar();
  registro.actualizar(true, false);
  registro.liberar();
  assert.deepEqual(protector.estado(), { pendiente: false, ocupado: false, tieneCambios: false });
  const nuevaSesion = crearProtectorBorradores();
  assert.deepEqual(nuevaSesion.estado(), protector.estado());
});

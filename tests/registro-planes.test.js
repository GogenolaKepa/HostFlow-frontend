import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearClienteRegistro } from '../src/services/registroClientes.js';
import { ciclosParaSeleccion, planesParaSeleccion } from '../src/services/seleccionPlan.js';

test('el catálogo y los ciclos ofrecidos coinciden con el contrato de Registro V1', async () => {
  const datos = {
    email: 'cliente@example.invalid',
    nombre: 'Cliente ficticio',
    password: 'Contraseña solamente ficticia 2026',
  };
  const solicitudes = [];
  const cliente = crearClienteRegistro({
    transportar: async (ruta, opciones) => {
      if (ruta === '/api/clientes/csrf') return Response.json({ csrf: 'a'.repeat(43) });
      assert.equal(ruta, '/api/clientes/registro');
      solicitudes.push(JSON.parse(opciones.body));
      return Response.json({ mensaje: 'Respuesta neutral de prueba.' }, { status: 202 });
    },
  });

  for (const { id: plan } of planesParaSeleccion) {
    for (const ciclo of Object.keys(ciclosParaSeleccion)) {
      await cliente.registrar({ ...datos, plan, ciclo });
    }
  }

  assert.deepEqual(solicitudes.map(({ plan, ciclo }) => ({ plan, ciclo })), [
    { plan: 'inicial', ciclo: 'mensual' },
    { plan: 'inicial', ciclo: 'anual' },
    { plan: 'profesional', ciclo: 'mensual' },
    { plan: 'profesional', ciclo: 'anual' },
    { plan: 'gestion', ciclo: 'mensual' },
    { plan: 'gestion', ciclo: 'anual' },
  ]);
});

test('las selecciones fuera de contrato no llegan a CSRF ni se envían', async t => {
  const transportar = t.mock.fn();
  const cliente = crearClienteRegistro({ transportar });
  for (const seleccion of [
    {},
    { plan: 'inicial' },
    { plan: 'inicial', ciclo: 'trimestral' },
    { plan: 'premium', ciclo: 'anual' },
    { plan: 'gestion', ciclo: ['anual'] },
  ]) {
    await assert.rejects(cliente.registrar(seleccion), { codigo: 'SELECCION_REGISTRO_INVALIDA' });
  }
  assert.equal(transportar.mock.callCount(), 0);
});

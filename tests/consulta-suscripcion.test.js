import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  consultarSuscripcionEmpresa,
  listarEmpresasSuscripcion,
} from '../src/services/consultaSuscripcion.js';
import {
  capacidades, contextos, crearApiSimulada, datosCosta, empresas,
} from './fixtures/consultaSuscripcionSimulada.js';

const operador = { idUsuario: 702, rol: 'Operador', debeCambiarPassword: false };

function contextoCosta() {
  return { contexto: contextos.get(101), expiraEn: new Date(Date.now() + 300000).toISOString() };
}

test('consulta solo las rutas de lectura y usa el contexto en la cabecera de su empresa', async t => {
  const api = {
    get: t.mock.fn(async ruta => ({ data: {
      '/suscripcion/capacidades': capacidades,
      '/suscripcion/empresas': empresas,
      '/suscripcion/actual': datosCosta,
    }[ruta] })),
    post: t.mock.fn(async () => ({ data: contextoCosta() })),
  };
  const { signal } = new AbortController();
  assert.deepEqual(await listarEmpresasSuscripcion(api, signal), empresas);
  assert.deepEqual(await consultarSuscripcionEmpresa(api, 101, signal), {
    nombrePlan: 'Profesional',
    ciclo: 'Anual',
    limitePropiedades: 10,
    limiteUsuarios: 3,
    propiedadesActivas: 2,
    usuariosActivos: 2,
    invitacionesPendientes: 1,
    cuposUsuariosOcupados: 3,
  });
  const opciones = { signal, timeout: 15000 };
  assert.deepEqual(api.get.mock.calls.map(llamada => llamada.arguments), [
    ['/suscripcion/capacidades', opciones],
    ['/suscripcion/empresas', opciones],
    ['/suscripcion/actual', { ...opciones, headers: { 'X-HostFlow-Empresa': contextos.get(101) } }],
  ]);
  assert.deepEqual(api.post.mock.calls.map(llamada => llamada.arguments),
    [['/suscripcion/contexto', { idEmpresa: 101 }, opciones]]);
});

test('descarta accesos sin membresía y datos atribuidos a otra empresa', async () => {
  const api = crearApiSimulada(operador);
  assert.deepEqual(await listarEmpresasSuscripcion(api), [empresas[1]]);
  await assert.rejects(consultarSuscripcionEmpresa(api, 101), { response: { status: 404 } });

  await assert.rejects(consultarSuscripcionEmpresa({
    post: async () => ({ data: contextoCosta() }),
    get: async () => ({ data: { ...datosCosta, empresaId: 102 } }),
  }, 101), { codigo: 'SUSCRIPCION_NO_ACREDITADA' });
});

test('una capacidad incompatible, contexto vencido o una cancelación impiden continuar', async t => {
  const recibirCapacidades = t.mock.fn(async () => ({ data: { ...capacidades, disponible: false } }));
  await assert.rejects(listarEmpresasSuscripcion({ get: recibirCapacidades }), { codigo: 'CONSULTA_NO_DISPONIBLE' });
  assert.equal(recibirCapacidades.mock.callCount(), 1);

  const consultar = t.mock.fn();
  await assert.rejects(consultarSuscripcionEmpresa({
    post: async () => ({ data: { ...contextoCosta(), expiraEn: '2000-01-01T00:00:00.000Z' } }),
    get: consultar,
  }, 101), { codigo: 'CONTEXTO_NO_ACREDITADO' });

  const contextoDemorado = Promise.withResolvers();
  const solicitud = new AbortController();
  const resultado = consultarSuscripcionEmpresa({
    post: () => contextoDemorado.promise,
    get: consultar,
  }, 101, solicitud.signal);
  solicitud.abort();
  contextoDemorado.resolve({ data: contextoCosta() });
  await assert.rejects(resultado, { name: 'AbortError' });
  assert.equal(consultar.mock.callCount(), 0);
});

test('rechaza consumo inconsistente y conserva el consumo verificado aun si excede el cupo', async () => {
  const api = consumo => ({
    post: async () => ({ data: contextoCosta() }),
    get: async () => ({ data: { ...datosCosta, consumo: { ...datosCosta.consumo, ...consumo } } }),
  });
  await assert.rejects(consultarSuscripcionEmpresa(api({ usuariosOcupados: 1 }), 101),
    { codigo: 'SUSCRIPCION_NO_ACREDITADA' });
  const resumen = await consultarSuscripcionEmpresa(api({ usuarios: 3, usuariosOcupados: 4 }), 101);
  assert.equal(resumen.cuposUsuariosOcupados, 4);
  assert.equal(resumen.limiteUsuarios, 3);
});

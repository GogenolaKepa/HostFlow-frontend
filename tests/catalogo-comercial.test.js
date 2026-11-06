import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogoComercial, planes, precioPlan, formatoUSD, descuentoAnualPuntosBase,
  prepararSolicitudComercial, presentarModalidad, orientarModalidad, prepararCorreoComercial,
} from '../src/services/catalogoComercial.js';

test('solo los tres planes aprobados, por empresa, con importes enteros y sin contratación activa', () => {
  assert.equal(catalogoComercial.contratacionHabilitada, false);
  assert.equal(catalogoComercial.canalContacto, 'contacto@hostflow.com.ar');
  assert.deepEqual(planes.map(p => [p.nombre, p.propiedades, p.usuarios, p.mensualCentavos, p.anualCentavos]), [
    ['Inicial', 2, 1, 999, 10989], ['Profesional', 10, 3, 2999, 32989], ['Gestión', 50, 10, 7999, 87989],
  ]);
  assert.ok(Object.isFrozen(planes) && planes.every(Object.isFrozen));
});

test('mensual/anual precisos, un mes bonificado y 8,33 % en cada plan', () => {
  assert.deepEqual(planes.map(p => precioPlan(p, 'mensual')), ['US$9,99', 'US$29,99', 'US$79,99']);
  assert.deepEqual(planes.map(p => precioPlan(p, 'anual')), ['US$109,89', 'US$329,89', 'US$879,89']);
  for (const plan of planes) {
    assert.equal(plan.anualCentavos, plan.mensualCentavos * 11);
    assert.equal(descuentoAnualPuntosBase(plan), 833);
    assert.equal(presentarModalidad(plan, 'anual').precio, precioPlan(plan, 'anual'));
  }
  assert.equal(formatoUSD(123456), 'US$1.234,56');
  for (const importe of [1.5, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => formatoUSD(importe));
  assert.throws(() => precioPlan({...planes[0]}, 'mensual'));
  assert.throws(() => precioPlan(planes[0], 'semanal'));
});

test('solicitud refleja selección y periodicidad vigentes sin crear cuenta ni contratar', () => {
  const mensaje = prepararSolicitudComercial('profesional', '8', 'anual');
  assert.match(mensaje, /Profesional/);
  assert.match(mensaje, /Periodicidad: anual/);
  assert.match(mensaje, /Alojamientos: 8/);
  assert.match(mensaje, /no constituye una contratación ni crea una cuenta/);
  assert.match(prepararSolicitudComercial('gestion'), /a definir/);
  assert.equal(orientarModalidad('individual'), 'inicial');
  assert.equal(orientarModalidad('equipo'), 'profesional');
  assert.equal(orientarModalidad('desconocida'), null);
});

test('rechaza planes, periodicidades y cantidades fuera de contrato', () => {
  assert.throws(() => prepararSolicitudComercial('desconocido', '2'), TypeError);
  assert.throws(() => prepararSolicitudComercial('inicial', '2', 'semanal'), TypeError);
  for (const valor of ['0', '-1', '1.5', '1e3', '100000', '<script>']) {
    assert.throws(() => prepararSolicitudComercial('inicial', valor), TypeError);
  }
});

const datos = {
  nombre: 'Persona ficticia', correo: 'consulta@example.invalid', empresa: '', alojamientos: '2',
  plan: 'inicial', periodicidad: 'mensual', mensaje: 'Quiero organizar mis alojamientos.', consentimiento: true,
};

test('correo local con destinatario fijo y texto codificado, sin transporte ni confirmación ficticia', () => {
  const resultado = prepararCorreoComercial({...datos, nombre: 'Nombre & especial', mensaje: 'Consulta con &bcc=otro@example.invalid\nSegunda línea.'});
  const enlace = new URL(resultado.href);
  assert.equal(enlace.protocol, 'mailto:');
  assert.equal(enlace.pathname, 'contacto@hostflow.com.ar');
  assert.deepEqual([...enlace.searchParams.keys()], ['subject', 'body']);
  assert.equal(enlace.searchParams.get('body'), resultado.mensaje);
  assert.equal(enlace.searchParams.has('bcc'), false);
  assert.ok(Object.isFrozen(resultado));
  assert.doesNotMatch(resultado.mensaje, /enviado correctamente|consulta recibida/i);
});

test('requiere consentimiento, datos válidos y no permite inyección de cabeceras', () => {
  for (const cambio of [{consentimiento:false}, {correo:'x'}, {correo:'a@b.invalid\r\nBcc:x@y.invalid'}, {nombre:''}, {mensaje:'corto'}, {empresa:'x'.repeat(121)}]) {
    assert.throws(() => prepararCorreoComercial({...datos, ...cambio}), TypeError);
  }
  assert.throws(() => prepararCorreoComercial({...datos, plan:'desconocido'}), TypeError);
});

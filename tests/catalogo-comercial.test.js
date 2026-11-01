import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogoComercial,prepararSolicitudComercial,presentarModalidad,orientarModalidad} from '../src/services/catalogoComercial.js';

test('catálogo público no publica precios, límites ni contratación no aprobados',()=>{
  assert.equal(catalogoComercial.contratacionHabilitada,false);
  assert.equal(catalogoComercial.canalContacto,null);
  assert.equal(new Set(catalogoComercial.planes.map(p=>p.id)).size,catalogoComercial.planes.length);
  for(const p of catalogoComercial.planes){
    assert.equal(p.estado,'propuesta');
    for(const campo of ['precio','moneda','periodicidad'])assert.equal(p[campo],null);
    assert.deepEqual(p.limites,{alojamientos:null,usuarios:null});
    assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.caracteristicas));
    assert.equal(p.cta.tipo,'preparar-solicitud');
  }
});
test('solicitud refleja la selección actual, sin inventar contratación ni enviar datos',()=>{
  const primera=prepararSolicitudComercial('operacion','3'),segunda=prepararSolicitudComercial('equipo','8');
  assert.match(primera,/Tu operación/);assert.match(primera,/Alojamientos: 3/);
  assert.match(segunda,/Tu equipo/);assert.doesNotMatch(segunda,/Alojamientos: 3/);
  assert.match(segunda,/no constituye una contratación ni crea una cuenta/);
  assert.match(prepararSolicitudComercial('equipo'),/a definir/);
});
test('rechaza modalidades desconocidas y cantidades fuera de contrato',()=>{
  assert.throws(()=>prepararSolicitudComercial('no-aprobada','2'),TypeError);
  for(const valor of ['0','-1','1.5','1e3','100000','<script>'])assert.throws(()=>prepararSolicitudComercial('operacion',valor),TypeError);
});
test('comparación y orientación provienen del catálogo, sin precios ni límites inventados',()=>{
 for(const p of catalogoComercial.planes){const d=presentarModalidad(p);assert.equal(d.precio,'A consultar');assert.equal(d.alojamientos,'A definir');assert.equal(d.usuarios,'A definir');assert.equal(d.periodicidad,'A definir');assert.equal(d.disponibilidad,'Propuesta a confirmar');assert.equal(orientarModalidad(p.orientacion),p.id);}
 assert.equal(orientarModalidad('no-se'),null);
});

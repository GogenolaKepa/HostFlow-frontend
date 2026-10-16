import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validarAnalisisFlowIA,leerListaDetalle} from '../src/services/contratosOperativos.js';
import {recomendacionVisual} from './fixtures/visual-modulos.js';

test('FlowIA: una respuesta incompleta o una tarjeta inválida no equivale a análisis vacío',()=>{
 for(const datos of [null,{},[],{recomendaciones:{}},{recomendaciones:[null]},{recomendaciones:[{}]},
  {recomendaciones:[{...recomendacionVisual,titulo:{}}]}, {recomendaciones:[recomendacionVisual,recomendacionVisual]},
  {recomendaciones:[{...recomendacionVisual,fundamentoIA:[]}]}, {recomendaciones:[{...recomendacionVisual,destino:'reservas'}]}])assert.throws(()=>validarAnalisisFlowIA(datos));
 const vacio={recomendaciones:[]};assert.equal(validarAnalisisFlowIA(vacio),vacio);
 const correcto={recomendaciones:[recomendacionVisual]};assert.equal(validarAnalisisFlowIA(correcto),correcto);
});
test('Detalle de reserva: distingue listas vacías válidas de respuestas rotas',()=>{
 for(const campo of ['eventos','mensajes','incidencias','observaciones']){
  assert.deepEqual(leerListaDetalle({data:{[campo]:[]}},campo),[]);
  assert.deepEqual(leerListaDetalle({data:{[campo]:[{id:1}]}},campo),[{id:1}]);
  for(const respuesta of [null,{data:{}},{data:{[campo]:{}}},{data:{[campo]:[null]}}])assert.throws(()=>leerListaDetalle(respuesta,campo));
 }
});

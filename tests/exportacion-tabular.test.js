import {test} from 'node:test';import assert from 'node:assert/strict';
import {textoPlanilla,celdaCsv} from '../src/services/exportacionTabular.js';
import {csvAcuerdos} from '../src/services/resumenMonetario.js';
test('Exportación: nombres/textos no se convierten en fórmulas; números originales y separadores se conservan',()=>{
 for(const nombre of ['=1+1','+1+1','-1+1','@SUM(A1)','\t =1+1'])assert.equal(textoPlanilla(nombre),"'"+nombre);
 assert.equal(celdaCsv(-1),'-1');assert.equal(celdaCsv('Ficticia; "Norte"'),'"Ficticia; ""Norte"""');assert.equal(celdaCsv('A\nB'),'"A\nB"');
 const csv=csvAcuerdos({filtros:{fechaDesde:'2026-10-01',fechaHasta:'2026-10-31',canal:'=1+1'},porMoneda:[{moneda:'USD',importe:'20.50',cantidad:'1'}],sinMoneda:'0'});assert.ok(csv.includes("Canal;'=1+1"));assert.ok(csv.includes('USD;20.50;1'));
});

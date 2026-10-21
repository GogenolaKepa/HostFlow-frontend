import {test} from 'node:test';import assert from 'node:assert/strict';
import {resumenMonetarioValido,csvAcuerdos} from '../src/services/resumenMonetario.js';
import {formatearTotalMonetario} from '../src/services/importes.js';
const filtros={fechaDesde:'2026-10-01',fechaHasta:'2026-10-31'},datos=()=>({disponible:true,criterio:'IMPORTES_ACORDADOS_ORIGINALES_SIN_COBROS',filtros,porMoneda:[{moneda:'ARS',importe:'150000.00',cantidad:'1'},{moneda:'USD',importe:'100.25',cantidad:'1'}],sinMoneda:'3',totalReservas:'5'});
test('Totales por moneda: contrato consistente y nunca interpreta números sueltos como pesos',()=>{
 assert.equal(resumenMonetarioValido(datos(),filtros),true);
 for(const cambio of [{porMoneda:[...datos().porMoneda,datos().porMoneda[0]]},{porMoneda:[{moneda:'EUR',importe:'1.00',cantidad:'1'}]},{totalReservas:'4'},{criterio:'COBROS'},{filtros:{...filtros,fechaDesde:'2026-09-01'}}])assert.equal(resumenMonetarioValido({...datos(),...cambio},filtros),false);
 assert.equal(resumenMonetarioValido({disponible:false,motivo:'No activado'},filtros),true);
 assert.equal(resumenMonetarioValido(datos(),{...filtros,canal:'Booking'}),false);
 assert.equal(resumenMonetarioValido({...datos(),filtros:{...filtros,idPropiedad:7}},{...filtros,idPropiedad:'7'}),true);
});
test('Totales: precisión decimal de SUM SQL, CSV honesto por moneda y exclusión de legado',()=>{
 assert.equal(formatearTotalMonetario('19999999999999999.98','USD'),'USD 19.999.999.999.999.999,98');assert.equal(formatearTotalMonetario('150000.00','ARS'),'ARS 150.000,00');assert.equal(formatearTotalMonetario('1.00',null),'Total no comparable');
 const csv=csvAcuerdos(datos());assert.match(csv,/NO SON COBROS/);assert.match(csv,/ARS;150000.00;1/);assert.match(csv,/USD;100.25;1/);assert.match(csv,/Sin moneda acreditada;No sumado;3/);assert.doesNotMatch(csv,/250\.25|150100/);
});

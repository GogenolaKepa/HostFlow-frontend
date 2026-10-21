import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {convertir,fijarCheckin,alertaTarifa,totalesSeparados} from '../src/services/monedasCalculos.js';
import {formatearImporte,totalSinMoneda} from '../src/services/importes.js';
test('Monedas UI: conserva ARS/USD original y no atribuye moneda al historial',()=>{
 assert.equal(formatearImporte('100.25','USD'),'USD 100,25');assert.equal(formatearImporte('150000','ARS'),'ARS 150.000,00');
 assert.match(formatearImporte(0),/moneda no declarada/);assert.match(formatearImporte('100000',null),/moneda no declarada/);
 assert.equal(formatearImporte(null,'USD'),'Importe no informado');assert.match(totalSinMoneda(),/Sin total comparable/);
 assert.deepEqual(totalesSeparados([{moneda:'ARS',importe:'1'},{moneda:'USD',importe:'2'},{importe:'3'}]),{ARS:'1.00',USD:'2.00',sinMoneda:1});
});
test('Monedas UI: calculo decimal igual al backend, snapshot check-in y alertas sin mutacion',()=>{
 assert.equal(convertir('100','USD','ARS','1500.12345678'),'150012.35');assert.equal(convertir('1','ARS','USD','3'),'0.33');
 const c={fuente:'BCRA',tipo:'BCRA_TIPO_COTIZACION',valor:'1250',fecha:'2026-10-16'};
 const a=fijarCheckin({canal:'Manual',moneda:'USD',importe:'100',pagoEquivalenteARS:true,fechaIngreso:'2026-10-17',cotizacion:c,aceptarUltimaOficial:true,ahora:new Date('2026-10-17T15:00:00Z')});assert.equal(a.equivalenteARS,'125000.00');assert.equal(a.fechaEfectiva,'2026-10-16');
 const t={idPropiedad:5,moneda:'ARS',precio:'100000',versionRegistro:'1',referencia:{...c,valor:'1000'}};
 assert.equal(alertaTarifa(t,c,'2026-10-17').variacionPorcentaje,'-20.00');assert.equal(t.precio,'100000');
 // Dos repositorios desplegables por separado, con el mismo algoritmo puro revisado.
 const back=new URL('../../backend/src/domain/monedas.js',import.meta.url);
 if(fs.existsSync(back)){
  const normalizar=s=>s.replace(/module\.exports=|export\s+/,'').trim();
  assert.equal(normalizar(fs.readFileSync(back,'utf8')),normalizar(fs.readFileSync(new URL('../src/services/monedasCalculos.js',import.meta.url),'utf8')));
 }
});

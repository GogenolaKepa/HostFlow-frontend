import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {vistaBnaValida} from '../src/services/vistaBna.js';import {convertir,cotizacionValida,fijarCheckin} from '../src/services/monedasCalculos.js';
const require=createRequire(import.meta.url);const {normalizar}=require('../../backend/src/services/CotizacionBnaService.js');
const q={...normalizar(JSON.stringify({currency:'USD',origin:'BNA',name:'Banco Nación',buy:1495,sell:1545,updatedAt:'2026-10-20T12:00:00-03:00',lastScrapedAt:'2026-10-21T18:58:00-03:00',valueType:'money'}),new Date('2026-10-21T22:00:00Z')),comprobacionAntigua:false,valorDeFechaAnterior:true};
test('Contrato backend BNA atraviesa UI y conversión informativa, sin admitir guardado/check-in',()=>{
 assert.equal(vistaBnaValida(q),true);assert.equal(convertir('200','USD','ARS',q.valor),'309000.00');assert.equal(cotizacionValida(q),false);assert.throws(()=>fijarCheckin({canal:'Manual',moneda:'USD',importe:'200',pagoEquivalenteARS:true,fechaIngreso:'2026-10-21',cotizacion:q,ahora:new Date('2026-10-21T22:00:00Z')}));
});
test('La UI rechaza proveedor, divisa, tasa y contrato de persistencia falsos',()=>{
 for(const cambio of [{fuente:'BCRA'},{monedaBase:'EUR'},{persistible:true},{valor:'0'},{intermediario:'Oficial'},{lastScrapedAt:'invalida'},{fecha:'2026-10-21'},{categoria:'BILLETE'}])assert.equal(vistaBnaValida({...q,...cambio}),false);
});

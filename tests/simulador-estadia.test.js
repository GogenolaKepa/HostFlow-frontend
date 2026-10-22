import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolverTarifa,presupuestoEstadia} from '../src/services/simuladorEstadia.js';
import {fijarCheckin,fechaNegocio,cotizacionValida} from '../src/services/monedasCalculos.js';
import {normalizar} from '../../backend/src/services/CotizacionBnaService.js';
const hoy=fechaNegocio(),manual={fuente:'MANUAL',tipo:'MANUAL',valor:'1545.00000000',fecha:hoy};
const tarifa=(moneda='USD',precio='60')=>resolverTarifa({id:'6',moneda,precio,guardada:{idPropiedad:6,moneda:'USD',precio:'60.00'}});
test('Una noche USD/ARS, operación inversa y varias noches con centavos exactos',()=>{
 assert.equal(presupuestoEstadia(tarifa(),'1',manual).equivalente,'92700.00');
 assert.equal(presupuestoEstadia(tarifa(),'3',manual).total,'180.00');
 assert.equal(presupuestoEstadia(tarifa(),'3',manual).equivalente,'278100.00');
 assert.equal(presupuestoEstadia(tarifa('ARS','92700'),2,manual).equivalente,'120.00');
 const q={...manual,valor:'1.00500000'};
 assert.equal(presupuestoEstadia(tarifa('USD','0.01'),3,q).total,'0.03');
 assert.equal(presupuestoEstadia(tarifa('USD','0.01'),3,q).equivalente,'0.03');
 assert.equal(presupuestoEstadia(tarifa('USD','100.25'),3,manual).total,'300.75');
});
test('Tarifa guardada, borrador y cambio de propiedad no reinterpretan moneda histórica',()=>{
 assert.equal(tarifa().borrador,false);
 assert.equal(tarifa('USD','61').borrador,true);
 assert.equal(tarifa('ARS','60').borrador,true);
 assert.equal(resolverTarifa({id:'5',moneda:'',precio:'1'}).disponible,false);
 assert.equal(resolverTarifa({id:'',moneda:'USD',precio:'60'}).disponible,false);
 assert.equal(resolverTarifa({id:'7',moneda:'USD',precio:'60',guardada:{idPropiedad:6,moneda:'USD',precio:'60'}}).borrador,true);
 for(const precio of ['','0','-1','1.123','1e2'])assert.equal(tarifa('USD',precio).disponible,false);
});
test('Noches y rangos inválidos no fabrican un total cero; sin referencia conserva el original',()=>{
 for(const n of ['',0,-1,1.5,'1e2',366,1000])assert.equal(presupuestoEstadia(tarifa(),n,manual).disponible,false);
 assert.equal(presupuestoEstadia(tarifa(),365,manual).total,'21900.00');
 assert.equal(presupuestoEstadia(tarifa('USD','9999999999999999.99'),365,manual).disponible,false);
 assert.equal(presupuestoEstadia(tarifa(),2,null).total,'120.00');
 assert.equal(presupuestoEstadia(tarifa(),2,null).equivalente,null);
 assert.equal(presupuestoEstadia(tarifa(),2,{...manual,valor:'0'}).equivalente,null);
});
test('Cambiar o perder la referencia recalcula sin alterar la tarifa; BNA no habilita contratos',()=>{
 const ahora=new Date(),bna=normalizar(JSON.stringify({currency:'USD',origin:'BNA',valueType:'money',name:'Banco Nación',buy:1500,sell:1545,updatedAt:ahora.toISOString(),lastScrapedAt:ahora.toISOString()}),ahora);
 Object.assign(bna,{valorDeFechaAnterior:false,comprobacionAntigua:false});
 const original=tarifa(),antes=JSON.stringify(original);
 assert.equal(presupuestoEstadia(original,2,bna).equivalente,'185400.00');
 assert.equal(presupuestoEstadia(original,2,{...manual,fuente:'BCRA',tipo:'BCRA_TIPO_COTIZACION',valor:'1500.00000000'}).equivalente,'180000.00');
 assert.equal(presupuestoEstadia(original,2,null).equivalente,null);
 assert.equal(JSON.stringify(original),antes);
 assert.equal(cotizacionValida(bna),false);
 assert.throws(()=>fijarCheckin({canal:'Manual',moneda:'USD',importe:'120',pagoEquivalenteARS:true,fechaIngreso:hoy,cotizacion:bna}),/cotización válida/);
});

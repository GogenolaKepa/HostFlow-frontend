import {test} from 'node:test';
import assert from 'node:assert/strict';
import {escenarioDemo,crearEstadoDemo,reducirDemo,resumenDemo,filtrarReservasDemo,diasDelMes,mesAdyacente} from '../src/services/demoPublica.js';

test('escenario sintético íntegro: referencias propias, fechas y cantidades coherentes',()=>{
 const ps=new Set(escenarioDemo.propiedades.map(p=>p.id)),hs=new Set(escenarioDemo.huespedes.map(h=>h.id));
 for(const lista of Object.values(escenarioDemo))for(const item of lista)assert.ok(item.id.startsWith('demo-'));
 for(const r of escenarioDemo.reservas){assert.ok(ps.has(r.propiedad)&&hs.has(r.huesped));assert.ok(r.egreso>r.ingreso);assert.ok(r.personas<=escenarioDemo.propiedades.find(p=>p.id===r.propiedad).capacidad);}
});
test('ocupación cuenta noches únicas y egreso exclusivo; no agrega importes de monedas',()=>{
 assert.deepEqual(resumenDemo('2026-11'),{reservas:6,propiedades:3,noches:18,disponibles:90,ocupacion:20});
 assert.equal(resumenDemo('2026-12').noches,6);
 assert.equal(resumenDemo('2026-10').reservas,0);
 assert.equal(diasDelMes('2028-02'),29);assert.equal(mesAdyacente('2026-12',1),'2027-01');
});
test('filtros combinan período, estado, nombre y alojamiento sin tocar fixtures',()=>{
 assert.equal(filtrarReservasDemo({busqueda:'Lucía',estado:'Confirmada',propiedad:'demo-p1'}).length,1);
 assert.equal(filtrarReservasDemo({busqueda:'Lucía',estado:'Cancelada'}).length,0);
 assert.equal(filtrarReservasDemo({mes:'2026-12',busqueda:'Lucía'}).length,0);
 assert.equal(escenarioDemo.reservas.length,8);
});
test('acciones limitadas a memoria: idempotencia, instancias independientes y reinicio',()=>{
 const a=crearEstadoDemo(),b=crearEstadoDemo();
 let x=reducirDemo(a,{tipo:'limpieza',id:'demo-l2'});assert.equal(x.limpiezas[1].estado,'En progreso');
 x=reducirDemo(x,{tipo:'limpieza',id:'demo-l2'});x=reducirDemo(x,{tipo:'limpieza',id:'demo-l2'});assert.equal(x.limpiezas[1].estado,'Completada');
 x=reducirDemo(x,{tipo:'leer',id:'demo-a1'});assert.equal(x.avisos[0].leida,true);assert.equal(b.avisos[0].leida,false);
 assert.equal(escenarioDemo.limpiezas[1].estado,'Pendiente');assert.deepEqual(reducirDemo(x,{tipo:'reiniciar'}),a);
 assert.deepEqual(reducirDemo(a,{tipo:'limpieza',id:34}),a);
});

import assert from 'node:assert/strict';
import {before, after, test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {cacheViteAislada} from './helpers/cacheVite.js';
import {tarifaModificada} from '../src/services/borradorTarifa.js';

let vite, ImportesReserva;
const cache=cacheViteAislada();
before(async()=>{
  vite=await createServer({configFile:false,envDir:false,cacheDir:cache.ruta,plugins:[react()],server:{middlewareMode:true,ws:false,watch:null}});
  ImportesReserva=(await vite.ssrLoadModule('/src/components/reservas/ImportesReserva.jsx')).default;
});
after(async()=>{await vite?.close();cache.limpiar();});
const mostrar=(reserva,puedeVerImportes=true)=>renderToStaticMarkup(createElement(ImportesReserva,{reserva,puedeVerImportes}));

test('estimación legacy y acuerdo anidado conservan importes distintos y moneda original',()=>{
  const html=mostrar({montoEstimado:200,monedaAcordada:'ARS',acuerdoMonetario:{moneda:'USD',importe:'175.50'}});
  assert.match(html,/Estimación histórica: 200,00 — moneda no declarada/);
  assert.match(html,/Acuerdo contractual: USD 175,50/);
  assert.ok(!html.includes('ARS'));
});
test('sin acuerdo no se inventan moneda, contrato ni importe cero',()=>{
  assert.ok(!mostrar({montoEstimado:50}).includes('Acuerdo contractual'));
  assert.match(mostrar({}),/Importe no informado/);
  assert.match(mostrar({montoEstimado:0,acuerdoMonetario:{moneda:'ARS',importe:'0.00'}}),/ARS 0,00/);
});
test('la proyección sin importes y una cuenta sin permiso no filtran montos',()=>{
  assert.match(mostrar({acuerdoMonetario:{moneda:'USD'}}),/Acuerdo contractual: Importe no informado/);
  const html=mostrar({montoEstimado:987654,acuerdoMonetario:{moneda:'USD',importe:'200.00'}},false);
  assert.equal(html,'<span>Importes restringidos</span>');
});
test('selección y formatos decimales equivalentes no son ediciones; revertir limpia el borrador',()=>{
  const guardada={moneda:'USD',precio:'100.00'};
  for(const precio of ['100.00','100',100,'100.0'])assert.equal(tarifaModificada('USD',precio,guardada),false);
  assert.equal(tarifaModificada('','',null),false);
  for(const [moneda,precio]of [['ARS','100'],['USD','101'],['USD',''],['USD','incorrecto']])assert.equal(tarifaModificada(moneda,precio,guardada),true);
  assert.equal(tarifaModificada('USD','100.00',guardada),false);
  assert.equal(tarifaModificada('USD','100',null),true);
});

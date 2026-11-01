import {test} from 'node:test';import assert from 'node:assert/strict';
import {crearConexionComercial,prepararEntradaComercial} from '../src/services/conexionComercialPreparada.js';
test('entrada de invitación transforma ruta de email a contrato API y retira el token antes de React',()=>{
  let ruta;const entrada=prepararEntradaComercial('https://cuentas.example.invalid/cuenta/invitacion#token='+'a'.repeat(43),r=>ruta=r);
  assert.equal(entrada.tipo,'invitaciones');assert.equal(ruta,'/cuenta/invitacion');assert.equal(entrada.tokenInicial.length,43);
  assert.equal(prepararEntradaComercial('https://cuentas.example.invalid/',()=>assert.fail()),null);
});
test('capacidad debe provenir del contrato del servidor; JWT solo se envía a administración',async()=>{
  const llamadas=[];const c=crearConexionComercial({origen:'https://cuentas.example.invalid',obtenerToken:()=> 'jwt-ficticio',transportar:async(url,opts)=>{llamadas.push({url,opts});return{status:url.endsWith('capacidades')?200:202,json:async()=>({version:1,recuperacion:true,invitaciones:false})};}});
  assert.deepEqual(await c.capacidades(),{recuperacion:true,invitaciones:false});
  await c.cliente.solicitar('persona@example.invalid');await c.cliente.invitar('Prueba','invitado@example.invalid');
  assert.equal(llamadas[1].opts.headers.Authorization,undefined);assert.equal(llamadas[2].opts.headers.Authorization,'Bearer jwt-ficticio');
  assert.equal(llamadas[1].opts.redirect,'error');assert.equal(llamadas[1].opts.referrerPolicy,'no-referrer');
  const mal=crearConexionComercial({origen:'https://cuentas.example.invalid',transportar:async()=>({status:200,json:async()=>({habilitado:true})})});await assert.rejects(mal.capacidades());
});
test('no admite HTTP y propaga cancelación sin reenviar solicitudes',async()=>{
  assert.throws(()=>crearConexionComercial({origen:'http://cuentas.example.invalid',transportar:()=>{}}));let n=0;
  const c=crearConexionComercial({origen:'https://cuentas.example.invalid',timeoutMs:100,transportar:(_u,{signal})=>{n++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('fallo ficticio'))));}});
  await assert.rejects(c.cliente.solicitar('persona@example.invalid'),e=>e.codigo==='INCIERTO');assert.equal(n,1);
});
test('contacto requiere capacidad propia y lleva JWT solo a sus rutas autenticadas',async()=>{
  const llamadas=[],c=crearConexionComercial({origen:'https://cuentas.example.invalid',obtenerToken:()=> 'jwt-ficticio',transportar:async(url,opts)=>{
    llamadas.push(opts);return {status:url.endsWith('capacidades')?200:204,json:async()=>({version:1,recuperacion:true,invitaciones:true,contactos:true})};
  }});
  assert.equal((await c.capacidades()).contactos,true);
  await c.cliente.solicitarContacto('Contraseña ficticia');assert.equal(llamadas[1].headers.Authorization,'Bearer jwt-ficticio');
  await c.cliente.validar('contacto','a'.repeat(43));assert.equal(llamadas[2].headers.Authorization,'Bearer jwt-ficticio');
  await c.cliente.validar('recuperacion','a'.repeat(43));assert.equal(llamadas[3].headers.Authorization,undefined);
  let retirada;assert.equal(prepararEntradaComercial('https://cuentas.example.invalid/cuenta/contacto#token='+'a'.repeat(43),r=>retirada=r).tipo,'contacto');assert.equal(retirada,'/cuenta/contacto');
});

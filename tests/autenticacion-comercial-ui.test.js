import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emailValido,tokenValido,retirarTokenDelEnlace,crearClienteComercial,MENSAJE_NEUTRAL,validarPasswordNueva} from '../src/services/autenticacionComercial.js';
test('validaciones comparten política de contraseña y normalizan email sin almacenar token',()=>{
  assert.ok(emailValido(' usuario@example.invalid ')); assert.ok(!emailValido('sin-correo')); assert.ok(!tokenValido('corto'));
  const token='a'.repeat(43); let reemplazo;
  assert.equal(retirarTokenDelEnlace('https://cuentas.example.invalid/recuperacion#token='+token,r=>reemplazo=r),token);
  assert.equal(reemplazo,'/recuperacion');
  assert.equal(retirarTokenDelEnlace('https://cuentas.example.invalid/?token='+token,()=>{}),null);
  assert.equal(retirarTokenDelEnlace('https://cuentas.example.invalid/#token='+token+'&token='+token,()=>{}),null);
  assert.match(validarPasswordNueva('corta','corta'),/12/);
  assert.match(validarPasswordNueva('Una frase muy larga','Otra frase diferente'),/coinciden/);
});
test('cliente cerrado sin transporte, respuesta neutral y payloads sin rol/empresa',async()=>{
  assert.throws(()=>crearClienteComercial()); const llamadas=[];
  const c=crearClienteComercial(async r=>{llamadas.push(r);return{status:202,data:{mensaje:'no revelar'}};});
  assert.equal(await c.solicitar(' A@example.invalid '),MENSAJE_NEUTRAL);
  await c.invitar(' Persona ',' Alta@example.invalid ');
  assert.deepEqual(llamadas[1].body,{nombre:'Persona',email:'alta@example.invalid'});
  assert.equal(llamadas[0].body.email,'a@example.invalid');
});
test('cliente sanitiza errores crudos e incertidumbre sin reintentos',async()=>{
  let n=0; const c=crearClienteComercial(async()=>{n++;throw Error('secreto-no-exponer');});
  await assert.rejects(c.confirmar('recuperacion','a'.repeat(43),'solo-ficticio'),e=>e.codigo==='INCIERTO'&&!e.message.includes('secreto'));
  assert.equal(n,1);
  const invalido=crearClienteComercial(async()=>({status:400,data:{codigo:'ENLACE_INVALIDO',mensaje:'sensible'}}));
  await assert.rejects(invalido.validar('invitaciones','a'.repeat(43)),e=>e.codigo==='ENLACE_INVALIDO'&&!e.message.includes('sensible'));
});
test('producto incorpora las entradas preparadas sin importar laboratorios ni banderas Vite de activación',()=>{
  for(const p of ['../src/App.jsx','../src/pages/Login.jsx','../src/pages/Usuarios.jsx','../src/main.jsx']) assert.doesNotMatch(fs.readFileSync(new URL(p,import.meta.url),'utf8'),/manual\/autenticacion|VITE_AUTH_COMERCIAL/);
  assert.match(fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8'),/prepararEntradaComercial/);
  assert.match(fs.readFileSync(new URL('../src/pages/Usuarios.jsx',import.meta.url),'utf8'),/InvitacionesDelProducto/);
});
test('listado exige página declarada y no confunde un contrato incompleto con un resultado vacío',async()=>{
  const c=crearClienteComercial(async r=>{assert.equal(r.ruta,'/api/cuentas-comerciales/invitaciones?pagina=2');return {status:200,data:{invitaciones:[],pagina:2,hayMas:false}};});
  assert.deepEqual(await c.listar(undefined,2),{invitaciones:[],pagina:2,hayMas:false});
  const incompleto=crearClienteComercial(async()=>({status:200,data:{invitaciones:[]}}));
  await assert.rejects(incompleto.listar(),e=>e.codigo==='RESPUESTA_INVALIDA');
});

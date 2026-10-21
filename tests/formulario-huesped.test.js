import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {LIMITES_HUESPED,huespedVacio,formularioDesdeHuesped,payloadHuesped,guardadoHuespedValido,listaHuespedesValida} from '../src/services/formularioHuesped.js';
const base=()=>({...huespedVacio(),nombre:'Persona',apellido:'Ficticia',email:'persona@example.invalid'}),dto=()=>({...base(),idHuesped:100,telefono:'No registrado',dni:'No registrado',nacionalidad:'No registrada'});
test('Huésped: formulario explícito, límites y validaciones consistentes con backend',()=>{
 const require=createRequire(import.meta.url);if(existsSync(new URL('../../backend/src/security/validacionHuesped.js',import.meta.url)))assert.deepEqual(LIMITES_HUESPED,require('../../backend/src/security/validacionHuesped').LIMITES);
 assert.throws(()=>payloadHuesped(huespedVacio()));for(const datos of [{nombre:'   '},{email:'incorrecto'},{email:'a@b@example.invalid'},{nombre:'a'.repeat(101)}])assert.throws(()=>payloadHuesped({...base(),...datos}));
 assert.equal(payloadHuesped({...base(),nombre:' Persona '}).nombre,'Persona');assert.equal(payloadHuesped({...base(),email:''},{emailRequerido:false}).email,'');
});
test('Huésped: 200/201 incompletos, identidad cambiada y listado duplicado no acreditan guardado',()=>{
 const g=dto(),d=payloadHuesped(base());assert.equal(guardadoHuespedValido(g,d,null),true);assert.deepEqual(formularioDesdeHuesped(g),base());
 assert.equal(guardadoHuespedValido({...g,idHuesped:101},d,100),false);assert.equal(guardadoHuespedValido({idHuesped:100},d,null),false);assert.equal(guardadoHuespedValido({...g,nombre:'Otro'},d,null),false);
 assert.equal(listaHuespedesValida({huespedes:[g]}),true);assert.equal(listaHuespedesValida({huespedes:[g,g]}),false);assert.equal(listaHuespedesValida({}),false);
});

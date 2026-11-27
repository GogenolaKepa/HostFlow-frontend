import {test} from 'node:test';import assert from 'node:assert/strict';
import {filtrarHuespedes} from '../src/services/formularioHuesped.js';
import {avisoMonetarioOculto,ocultarAvisoMonetario} from '../src/services/avisosInterfaz.js';
import {ambitoPreferencias} from '../src/services/preferenciasCuenta.js';
const lista=[{idHuesped:41,nombre:'Ana María',apellido:'Pérez',email:'ana@example.invalid',dni:'30.111.222'},{idHuesped:52,nombre:'Bruno',apellido:'Díaz',email:'bruno@example.invalid',dni:'40123456'},{idHuesped:63,nombre:'Elena',apellido:'López',email:null,dni:null}];
test('Huéspedes: nombre y apellido con tildes, mayúsculas y espacios repetidos',()=>{
 for(const consulta of ['  ANA   PEREZ  ','pérez ana','MARIA'])assert.deepEqual(filtrarHuespedes(lista,consulta).map(g=>g.idHuesped),[41]);
 assert.deepEqual(filtrarHuespedes(lista,'  '),lista);assert.deepEqual(filtrarHuespedes(lista,'inexistente'),[]);
});
test('Huéspedes: email, documento con/sin puntos, ID y datos opcionales ausentes',()=>{
 for(const consulta of ['ANA@EXAMPLE.INVALID','30111222','30.111.222','41'])assert.deepEqual(filtrarHuespedes(lista,consulta).map(g=>g.idHuesped),[41]);
 assert.deepEqual(filtrarHuespedes(lista,'63').map(g=>g.idHuesped),[63]);assert.equal(lista[0].dni,'30.111.222');
});
test('Aviso: descarte recordado por cuenta, sin ocultarlo para otro usuario',()=>{
 const datos=new Map(),storage={getItem:k=>datos.get(k)??null,setItem:(k,v)=>datos.set(k,v)};
 const perfil={idUsuario:1,origenAutenticacion:'sql'},original=ambitoPreferencias(perfil);
 assert.equal(original,ambitoPreferencias({...perfil,idEmpresa:1}));
 assert.equal(original,ambitoPreferencias({...perfil,idEmpresa:null}));
 assert.equal(ambitoPreferencias({...perfil,idEmpresa:'2'}),null);
 assert.equal(avisoMonetarioOculto(original,storage),false);assert.equal(ocultarAvisoMonetario(original,storage),true);
 assert.equal(avisoMonetarioOculto(original,storage),true);
 for(const ambito of [ambitoPreferencias({...perfil,idUsuario:2}),ambitoPreferencias({...perfil,idEmpresa:2}),ambitoPreferencias({...perfil,origenAutenticacion:'mock'}),null])assert.equal(avisoMonetarioOculto(ambito,storage),false);
 assert.equal(datos.size,1);
});
test('Aviso: almacenamiento bloqueado o ausente no rompe render ni finge persistencia',()=>{
 const storage={getItem(){throw Error('bloqueado');},setItem(){throw Error('bloqueado');}};
 assert.equal(avisoMonetarioOculto('sql:1:1',storage),false);assert.equal(ocultarAvisoMonetario('sql:1:1',storage),false);
 assert.equal(avisoMonetarioOculto('sql:1:1'),false);
});

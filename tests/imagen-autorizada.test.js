import {test} from 'node:test';import assert from 'node:assert/strict';import {clasificarImagen} from '../src/services/imagenAutorizada.js';
const api='https://api.hostflow.com.ar/api',web='https://hostflow.com.ar';
test('solo uploads del origen API reciben transporte autenticado',()=>{
 assert.equal(clasificarImagen('https://api.hostflow.com.ar/uploads/propiedades/1/ficticia.png',api,web).privada,true);
 assert.deepEqual(clasificarImagen('http://api.hostflow.com.ar/uploads/propiedades/1/ficticia.png',api,web),{privada:true,url:'https://api.hostflow.com.ar/uploads/propiedades/1/ficticia.png'});
 assert.equal(clasificarImagen('https://cdn.example.invalid/ficticia.png',api,web).privada,false);
 for(const src of ['https://api.hostflow.com.ar/api/auth/me','https://api.hostflow.com.ar/uploads/propiedades/1/ficticia.png?token=ficticio','https://otro.example.invalid@api.hostflow.com.ar/uploads/propiedades/1/ficticia.png','javascript:alert(1)','http://otro.example.invalid/ficticia.png'])assert.equal(clasificarImagen(src,api,web),null);
});

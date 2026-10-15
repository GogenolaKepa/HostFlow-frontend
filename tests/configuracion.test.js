import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LIMITES_EMPRESA,validarConfiguracion,aplicarPredeterminados,respuestaConfiguracionValida,estadoConfiguracionValido} from '../src/services/configuracion.js';
const empresa=()=>({...Object.fromEntries(Object.keys(LIMITES_EMPRESA).map(c=>[c,''])),nombreComercial:'Alojamientos de prueba',versionRegistro:'0000000000000001'});

test('estado empresarial exige persistencia SQL y booleano del servidor; contrato incompleto cierra edición',()=>{
  for(const estado of [null,undefined,{}, {persistencia:'mock',soloLectura:false},{persistencia:'sql'}, {persistencia:'sql',soloLectura:'false'}])assert.equal(estadoConfiguracionValido(estado),false);
  for(const soloLectura of [true,false])assert.equal(estadoConfiguracionValido({persistencia:'sql',soloLectura}),true);
});
test('empresa: nombre obligatorio, correo, límites y controles; campos opcionales vacíos son válidos',()=>{
  assert.deepEqual(validarConfiguracion('empresa',empresa()),{});
  assert.ok(validarConfiguracion('empresa',{...empresa(),nombreComercial:' '}).nombreComercial);
  assert.ok(validarConfiguracion('empresa',{...empresa(),correoContacto:'incorrecto'}).correoContacto);
  for(const [campo,limite]of Object.entries(LIMITES_EMPRESA))assert.ok(validarConfiguracion('empresa',{...empresa(),[campo]:'a'.repeat(limite+1)})[campo]);
  assert.ok(validarConfiguracion('empresa',{...empresa(),telefono:'123\u0000'}).telefono);
  assert.deepEqual(validarConfiguracion('empresa',{...empresa(),informacionAdicional:'Primera línea\nSegunda línea'}),{});
});
test('preferencias: HH:mm estricto, medianoche válida y sin restricción inventada entre horarios',()=>{
  assert.deepEqual(validarConfiguracion('operativas',{horaIngreso:'00:00',horaEgreso:'23:59'}),{});
  for(const horaIngreso of ['24:00','12:60','8:00','10:00:00','',null])assert.ok(validarConfiguracion('operativas',{horaIngreso,horaEgreso:'10:00'}).horaIngreso);
});
test('respuesta incompleta no confirma guardado ni carga una configuración ficticia',()=>{
  assert.equal(respuestaConfiguracionValida('empresa',empresa()),true);
  assert.equal(respuestaConfiguracionValida('empresa',{nombreComercial:'Nombre',versionRegistro:'0000000000000001'}),false);
  assert.equal(respuestaConfiguracionValida('empresa',{...empresa(),versionRegistro:'1'}),false);
  assert.equal(respuestaConfiguracionValida('empresa',{...empresa(),correoContacto:'incompleto'}),false);
  assert.equal(respuestaConfiguracionValida('empresa',{...empresa(),ciudad:'x'.repeat(101)}),false);
  assert.equal(respuestaConfiguracionValida('empresa',{...empresa(),nombreComercial:''}),true);
  for(const value of [null,3,{}]) assert.ok(validarConfiguracion('empresa',{...empresa(),correoContacto:value}).correoContacto);
  assert.equal(respuestaConfiguracionValida('operativas',{horaIngreso:'15:00',horaEgreso:'10:00',zonaHoraria:'UTC',versionRegistro:'0000000000000001'}),false);
});
test('predeterminados afectan solo horas iniciales no editadas y conservan datos de la reserva',()=>{
  const form={horaIngreso:'18:00',horaEgreso:'10:00',fechaIngreso:'2027-01-02',idPropiedad:12};
  assert.deepEqual(aplicarPredeterminados(form,{horaIngreso:'15:30',horaEgreso:'09:30'},new Set(['horaIngreso'])),{...form,horaEgreso:'09:30'});
  assert.deepEqual(aplicarPredeterminados(form,{horaIngreso:'no válido',horaEgreso:'24:00'}),form);
  assert.equal(form.horaEgreso,'10:00');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmacionReservaValida, formularioReservaVacio, leerCatalogoReserva, payloadReserva, seleccionReservaValida } from '../src/services/formularioReserva.js';

const propiedades = [{ id: 5, nombre: 'Propiedad ficticia' }, { id: 845, nombre: 'Otra ficticia' }];
const huespedes = [{ id: 17, nombre: 'Prueba ficticia' }, { id: 701, nombre: 'Otra persona ficticia' }];
const formulario = () => ({ ...formularioReservaVacio(), idPropiedad: '5', idHuesped: '17',
  fechaIngreso: '2100-01-10', horaIngreso: '15:00', fechaEgreso: '2100-01-12', horaEgreso: '10:00', cantidadHuespedes: '1', montoEstimado: '0' });

test('Nueva reserva empieza sin identidades, fechas, horarios o importes inventados', () => {
  const a = formularioReservaVacio(); assert.ok(Object.values(a).every(v => v === ''));
  a.idPropiedad = '5'; assert.equal(formularioReservaVacio().idPropiedad, '');
});
test('Los contratos GET completos aceptan IDs arbitrarios y solo proyectan identidad/etiqueta', () => {
  assert.deepEqual(leerCatalogoReserva({data:{propiedades:[{idPropiedad:5,nombre:'Propiedad ficticia',precioBase:1}]}},'propiedades'),[propiedades[0]]);
  assert.deepEqual(leerCatalogoReserva({data:{huespedes:[{idHuesped:17,nombre:'Prueba',apellido:'ficticia',email:'ficticio@example.invalid'}]}},'huespedes'),[huespedes[0]]);
  assert.deepEqual(leerCatalogoReserva({data:{propiedades:[]}},'propiedades'),[]);
  const lista = Array.from({length:100}, (_,i)=>({idPropiedad:i+100,nombre:`Ficticia ${i}`}));
  assert.equal(leerCatalogoReserva({data:{propiedades:lista}},'propiedades').at(-1).id,199);
});
test('No transforma respuestas incompletas, IDs inválidos/duplicados ni un contrato paginado inesperado en catálogos ficticios', () => {
  for (const data of [null,{}, {propiedades:{}},{propiedades:[null]}, {propiedades:[{idPropiedad:0,nombre:'x'}]},
    {propiedades:[{idPropiedad:2147483648,nombre:'x'}]}, {propiedades:[{idPropiedad:5,nombre:''}]},
    {propiedades:[{idPropiedad:5,nombre:'x'},{idPropiedad:'5',nombre:'y'}]},
    {propiedades:[{idPropiedad:5,nombre:'x'}],paginacion:{pagina:1,total:100}}]) assert.throws(()=>leerCatalogoReserva({data},'propiedades'));
  assert.throws(()=>leerCatalogoReserva({data:{huespedes:[{idHuesped:17,nombre:'Prueba'}]}},'huespedes'));
});
test('POST usa IDs seleccionados y contrato cerrado; admite importe cero y decimal, sin canal/estado', () => {
  const original = formulario(); const datos = payloadReserva({...original,canal:'Booking',estado:'Cancelada'},propiedades,huespedes);
  assert.deepEqual(datos,{...original,idPropiedad:5,idHuesped:17,cantidadHuespedes:1,montoEstimado:0});
  assert.equal(payloadReserva({...original,idPropiedad:'845',idHuesped:'701',montoEstimado:'1.25'},propiedades,huespedes).montoEstimado,1.25);
  assert.equal(original.idPropiedad,'5');
});
test('Impide enviar identidades ausentes/obsoletas o campos numéricos vacíos/invalidos', () => {
  assert.equal(seleccionReservaValida('',propiedades),false); assert.equal(seleccionReservaValida('6',propiedades),false);
  for (const cambio of [{idPropiedad:''},{idHuesped:''},{idPropiedad:'1'},{idHuesped:'NaN'},{montoEstimado:''},
    {montoEstimado:'-1'},{montoEstimado:'Infinity'},{cantidadHuespedes:''},{cantidadHuespedes:'1.5'},{cantidadHuespedes:'0'},{fechaIngreso:''},{horaEgreso:''}])
    assert.throws(()=>payloadReserva({...formulario(),...cambio},propiedades,huespedes));
  assert.throws(()=>payloadReserva(formulario(),[],huespedes));
});


test('confirmación de edición acepta la huella renovada sin dejar de contrastar los campos guardados',()=>{
 const enviados={versionEdicion:'a'.repeat(64),fechaEgreso:'2100-01-13',montoEstimado:200};
 const actual={idReserva:32,...enviados,versionEdicion:'b'.repeat(64)};
 assert.equal(confirmacionReservaValida(actual,enviados,32),true);
 assert.equal(confirmacionReservaValida({...actual,fechaEgreso:'2100-01-12'},enviados,32),false);
 assert.equal(confirmacionReservaValida({...actual,montoEstimado:100},enviados,32),false);
 assert.equal(confirmacionReservaValida({...actual,idReserva:33},enviados,32),false);
});

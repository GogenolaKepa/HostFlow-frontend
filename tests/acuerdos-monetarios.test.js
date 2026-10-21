import {test} from 'node:test';import assert from 'node:assert/strict';
import {acuerdoVacio,acuerdoFormulario,acuerdoValido,formularioDesdeAcuerdo,altaAcuerdoConfirmada} from '../src/services/acuerdosMonetarios.js';
const base=()=>({idReserva:7,moneda:'USD',importe:'100.25',pagoEquivalenteARS:true,monedaPago:'ARS',reglaCambio:'CHECKIN',fuenteReferencia:'BCRA',tipoReferencia:'BCRA_TIPO_COTIZACION',estadoFijacion:'PENDIENTE',versionRegistro:'0000000000000001',idAutor:999,fechaAcuerdo:'2026-01-01T12:00:00Z',fijadoEn:null,valorAplicado:null,equivalenteARS:null});
test('Acuerdo: selección explícita, importe decimal separado del estimado y payload cerrado',()=>{
 assert.equal(acuerdoVacio().moneda,'');assert.equal(acuerdoVacio().importe,'');assert.throws(()=>acuerdoFormulario(acuerdoVacio()));
 const a=acuerdoFormulario({moneda:'USD',importe:'123.40',pagoEquivalenteARS:true,fuenteReferencia:'BCRA'});assert.equal(a.importe,'123.40');assert.equal(a.confirmar,true);assert.equal(a.fuenteReferencia,'BCRA');assert.equal(Object.hasOwn(a,'idEmpresa'),false);
 const sin=acuerdoFormulario({moneda:'ARS',importe:'0',pagoEquivalenteARS:false,fuenteReferencia:'BCRA'});assert.equal(sin.importe,'0.00');assert.equal(Object.hasOwn(sin,'fuenteReferencia'),false);
});
test('Alta: el éxito exige el contrato solicitado; respeta la proyección económica del Operador',()=>{
 const solicitado=acuerdoFormulario(formularioDesdeAcuerdo(base())),reserva={idReserva:7,acuerdoMonetario:base()};
 assert.equal(altaAcuerdoConfirmada(reserva,solicitado,true),true);
 for(const cambio of [{importe:'100.26'},{versionRegistro:null},{idReserva:8},{estadoFijacion:'FIJADA'}])assert.equal(altaAcuerdoConfirmada({...reserva,acuerdoMonetario:{...base(),...cambio}},solicitado,true),false);
 const publico={idReserva:7,moneda:'USD',monedaPago:'ARS',reglaCambio:'CHECKIN',estadoFijacion:'PENDIENTE'};
 assert.equal(altaAcuerdoConfirmada({...reserva,acuerdoMonetario:publico},solicitado,false),true);
 assert.equal(altaAcuerdoConfirmada({...reserva,acuerdoMonetario:publico},solicitado,true),false);
 assert.equal(altaAcuerdoConfirmada({...reserva,acuerdoMonetario:{moneda:'USD'}},solicitado,false),false);
});
test('Acuerdo: inválidos y conversión no autorizada no llegan al POST',()=>{
 for(const cambio of [{moneda:'EUR'},{moneda:'ARS'},{importe:'-1'},{importe:'1.001'},{importe:'NaN'},{fuenteReferencia:'BNA'}])assert.throws(()=>acuerdoFormulario({...formularioDesdeAcuerdo(base()),...cambio}));
});
test('Contrato monetario: 200 incompleto no acredita acuerdo ni snapshot; revisión/autor/fechas son obligatorios',()=>{
 assert.equal(acuerdoValido(base(),7),true);assert.equal(acuerdoValido(base(),8),false);
 for(const cambio of [{idAutor:null},{fechaAcuerdo:null},{importe:100.25},{versionRegistro:'x'},{tipoReferencia:'VENTA'},{estadoFijacion:'FIJADA'},{valorAplicado:'1000'}])assert.equal(acuerdoValido({...base(),...cambio},7),false);
});
test('Snapshot fijado: moneda original y fecha efectiva acreditadas, sin equivalencia futura ni campos parciales',()=>{
 const a={...base(),estadoFijacion:'FIJADA',fijadoEn:'2026-01-05T12:00:00Z',fechaCheckinFijada:'2026-01-05',fechaEfectiva:'2026-01-02',fuenteAplicada:'BCRA',tipoAplicado:'BCRA_TIPO_COTIZACION',valorAplicado:'1000.00000000',equivalenteARS:'100250.00',idUsuarioFijacion:999};
 assert.equal(acuerdoValido(a,7),true);assert.equal(acuerdoValido({...a,fechaEfectiva:'2026-01-06'},7),false);assert.equal(acuerdoValido({...a,equivalenteARS:null},7),false);assert.equal(acuerdoValido({...a,equivalenteARS:'100250.01'},7),false);assert.equal(acuerdoValido({...a,fuenteAplicada:'MANUAL'},7),false);
 assert.deepEqual(formularioDesdeAcuerdo(a),{moneda:'USD',importe:'100.25',pagoEquivalenteARS:true,fuenteReferencia:'BCRA'});
});

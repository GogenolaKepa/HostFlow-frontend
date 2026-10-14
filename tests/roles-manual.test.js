import {test} from "node:test";
import assert from "node:assert/strict";
import {comprobarSesion,contieneEconomia} from "./manual/roles-reales.js";

test("comprobacion manual usa solo GET seguros y no devuelve credenciales ni datos privados",async()=>{
  const llamadas=[];
  const fetcher=async(url,config)=>{
    const ruta=new URL(url).pathname.replace('/api','');llamadas.push({ruta,...config});
    const status=!config.headers.Authorization?401:["/usuarios","/roles"].includes(ruta)?403:200;
    return {status,json:async()=>ruta==='/auth/me'?{usuario:{rol:"Operador",origenAutenticacion:"sql",debeCambiarPassword:false,permisos:[],email:"privado",passwordHash:"privado",token:"privado"}}:{historico:[{mes:"2026-10",cantidadReservas:1}],reportes:{resumen:{reservasConIngreso:1}}}};
  };
  const result=await comprobarSesion({token:"token-de-prueba",hostname:"127.0.0.1",port:"5173",fetcher});
  assert.ok(result.every(r=>r.ok));
  assert.ok(llamadas.every(r=>r.method==='GET' && ['/auth/me','/usuarios','/roles','/dashboard/reportes','/dashboard/historico'].includes(r.ruta)));
  assert.equal(JSON.stringify(result).includes('privado'),false);
  assert.equal(JSON.stringify(result).includes('token-de-prueba'),false);
});

test("comprobacion manual detecta importes anidados y rechaza destino remoto o cambio obligatorio",async()=>{
  assert.equal(contieneEconomia({datos:[{otro:{ingresosEstimados:0}}]}),true);
  assert.equal(contieneEconomia({reservasConIngreso:1,fechaIngreso:'2026-10-14'}),false);
  await assert.rejects(comprobarSesion({token:'prueba',hostname:'remoto.invalid',port:'5173'}));
  let llamadas=0;
  await assert.rejects(comprobarSesion({token:'prueba',hostname:'localhost',port:'5173',fetcher:async()=>{
    llamadas++;return {status:200,json:async()=>({usuario:{rol:'Operador',origenAutenticacion:'sql',debeCambiarPassword:true,permisos:[]}})};
  }}));
  assert.equal(llamadas,1);
});

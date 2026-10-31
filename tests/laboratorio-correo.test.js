import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iniciarLaboratorioComercial} from './helpers/laboratorioComercial.js';
test('correo del laboratorio: vacío explícito, generación real ficticia y no reutiliza correo anterior',async()=>{
  const lab=await iniciarLaboratorioComercial();
  const pedir=email=>fetch(lab.base+'/api/cuentas-comerciales/recuperacion/solicitar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
  const correo=()=>fetch(lab.base+'/laboratorio/correo').then(r=>r.json());
  try{
    assert.equal((await correo()).estado,'sin-enlace');
    assert.equal((await pedir('2@example.invalid')).status,202);
    const enlace=(await correo()).enlace;assert.ok(enlace); // El endpoint espera al worker.
    lab.ctx.avanzar(900000);
    await assert.rejects(lab.ctx.cuentas.validarEnlace('recuperacion',new URLSearchParams(new URL(enlace).hash.slice(1)).get('token'),{ip:'127.0.0.1'}),{codigo:'ENLACE_INVALIDO'});
    assert.equal((await pedir('no-existe@example.invalid')).status,202);
    assert.equal((await correo()).estado,'sin-enlace');
  }finally{await lab.cerrar();}
});
test('fallos ficticios del worker y del proveedor son visibles solo en el laboratorio',async()=>{
  for(const tipo of ['worker','correo']){
    const lab=await iniciarLaboratorioComercial();
    try{
      if(tipo==='worker')lab.ctx.repository.fallarOutbox=true;else lab.ctx.fallarCorreo(true);
      const r=await fetch(lab.base+'/api/cuentas-comerciales/recuperacion/solicitar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'2@example.invalid'})});
      assert.equal(r.status,202);assert.ok(!(await r.text()).includes('fallo'));
      const mail=await (await fetch(lab.base+'/laboratorio/correo')).json();assert.deepEqual(mail,{estado:'fallo-procesamiento'});
    }finally{await lab.cerrar();}
  }
});

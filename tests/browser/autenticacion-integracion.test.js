import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {abrirNavegador} from '../helpers/navegadorComercial.js';
import {iniciarLaboratorioComercial} from '../helpers/laboratorioComercial.js';
const browserPath=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
test('integración comercial real en loopback: UI → HTTP → núcleo → correo ficticio',{skip:!fs.existsSync(browserPath),timeout:180000},async t=>{
  let lab,browser;
  const capturas=fileURLToPath(new URL('../../../revision/autenticacion-comercial-cierre-2026-10-31/capturas/',import.meta.url));
  fs.mkdirSync(capturas,{recursive:true});
  try{
    lab=await iniciarLaboratorioComercial();browser=await abrirNavegador(browserPath);const{evaluate,command,esperar}=browser;
    const errores=[],externos=[];browser.on('Runtime.exceptionThrown',()=>errores.push('excepcion'));await command('Runtime.enable');
    browser.on('Fetch.requestPaused',async p=>{if(p.request.url.startsWith(lab.base)||p.request.url.startsWith('data:'))await command('Fetch.continueRequest',{requestId:p.requestId});else{externos.push('bloqueado');await command('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});}});await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
    const click=async texto=>{await esperar(`!!Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(texto)})`);await evaluate(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(texto)}).click()`);};
    const fill=async(id,value)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const guardar=async nombre=>{const m=await command('Page.getLayoutMetrics');const{data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:m.cssContentSize.width,height:m.cssContentSize.height,scale:1}});fs.writeFileSync(path.join(capturas,nombre+'.png'),Buffer.from(data,'base64'));};
    const nueva='Una frase ficticia para recuperar 2026';
    await command('Page.navigate',{url:lab.base});await esperar("!!document.getElementById('ac-email')");
    await t.test('abrir sin correo explica el estado en lugar de fallar silenciosamente',async()=>{
      await click('Abrir último enlace ficticio');await esperar("document.body.innerText.includes('No hay un enlace ficticio disponible')");
      assert.equal(lab.ctx.correos.length,0);assert.ok(await evaluate("!!document.getElementById('ac-email')"));
    });
    await t.test('recuperación de extremo a extremo invalida sesión previa y permite nuevo login',async()=>{
      await fill('ac-email','2@example.invalid');await click('Solicitar enlace seguro');await esperar("document.body.innerText.includes('Revisá tu correo')");await lab.esperarTrabajo();assert.equal(lab.ctx.correos.filter(m=>m.enlace).length,1);
      await click('Abrir último enlace ficticio');await esperar("!!document.getElementById('ac-password')");
      for(const ancho of[1920,1366,820,390,320]){
        await command('Emulation.setDeviceMetricsOverride',{width:ancho,height:1000,deviceScaleFactor:1,mobile:false});assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));await guardar('nueva-password-'+ancho);
      }
      await fill('ac-password',nueva);await fill('ac-confirmacion',nueva);await click('Actualizar contraseña');await esperar("document.body.innerText.includes('Tu contraseña fue actualizada')");assert.equal(lab.ctx.repository.filas.get(2).versionSesion,2);
      await click('Volver al inicio de sesión');await esperar("!!document.getElementById('lab-email')");await fill('lab-email','2@example.invalid');await fill('lab-password',nueva);await click('Ingresar al entorno ficticio');await esperar("document.body.innerText.includes('Sesión ficticia iniciada')");
      assert.equal(await lab.ctx.auth.obtenerUsuarioSesion(2,{origen:'sql',versionSesion:1}),null);
      await click('Abrir último enlace ficticio');await esperar("document.body.innerText.includes('Este enlace ya no está disponible')");
    });
    await t.test('Admin invita, proveedor ficticio entrega, aceptación crea Operador y login funciona',async()=>{
      await click('Rol: Operador');await esperar("document.body.innerText.includes('Rol: Administrador')");
      await click('Equipo');await esperar("!!document.getElementById('ac-nombre')");await fill('ac-nombre','Operador laboratorio');await fill('ac-inv-email','nuevo@example.invalid');await click('Enviar invitación');await esperar("document.body.innerText.includes('Revocar invitación')");
      for(const ancho of[1920,1366,820,390,320]){await command('Emulation.setDeviceMetricsOverride',{width:ancho,height:1000,deviceScaleFactor:1,mobile:false});assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));await guardar('equipo-'+ancho);}
      await click('Abrir último enlace ficticio');await esperar("document.body.innerText.includes('Tu equipo te está esperando')");
      await fill('ac-password',nueva);await fill('ac-confirmacion',nueva);await click('Aceptar invitación');await esperar("document.body.innerText.includes('Ya sos parte del equipo')");
      const u=await lab.ctx.repository.buscarUsuario('nuevo@example.invalid');assert.equal(u.rol,'Operador');assert.equal(lab.ctx.repository.filas.size,3);
      await click('Abrir último enlace ficticio');await esperar("document.body.innerText.includes('Este enlace ya no está disponible')");
      await click('Volver al inicio');await fill('lab-email','nuevo@example.invalid');await fill('lab-password',nueva);await click('Ingresar al entorno ficticio');await esperar("document.body.innerText.includes('Sesión ficticia iniciada')");
      await click('Equipo');await esperar("document.body.innerText.includes('Acceso restringido')");
    });
    await t.test('revocación confirmada, enlace revocado y permiso de Operador preservado',async()=>{
      await click('Rol: Operador');await esperar("document.body.innerText.includes('Rol: Administrador')");
      await click('Equipo');await esperar("!!document.getElementById('ac-nombre')");await fill('ac-nombre','Otra persona ficticia');await fill('ac-inv-email','revocar@example.invalid');await click('Enviar invitación');await esperar("document.body.innerText.includes('Revocar invitación')");
      await click('Revocar invitación');await click('Confirmar revocación');await esperar("document.body.innerText.includes('Revocada')");
      await click('Abrir último enlace ficticio');await esperar("document.body.innerText.includes('Este enlace ya no está disponible')");
      await click('Equipo');await click('Rol: Administrador');await esperar("document.body.innerText.includes('Acceso restringido')");
    });
    await t.test('correo desconocido neutral y ausencia de persistencia de tokens o conexiones externas',async()=>{
      await click('Recuperación');await fill('ac-email','desconocido@example.invalid');await click('Solicitar enlace seguro');await esperar("document.body.innerText.includes('Revisá tu correo')");
      await lab.esperarTrabajo();assert.equal(await lab.ctx.repository.buscarUsuario('desconocido@example.invalid'),null);
      await click('Abrir último enlace ficticio');await esperar("document.body.innerText.includes('No hay un enlace ficticio disponible')");
      assert.equal(await evaluate('localStorage.length+sessionStorage.length'),0);assert.equal(await evaluate('location.hash'),'');
      assert.deepEqual(errores,[]);assert.deepEqual(externos,[]);
    });
  }finally{await browser?.cerrar();await lab?.cerrar();}
});

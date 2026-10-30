import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function probarSesionPremium({t,evaluate,send,fill,esperar,login,inicioVisible,requests,configurar,fase}) {
  const out=path.resolve('../revision/cierre-premium-2026-10-29');fs.mkdirSync(out,{recursive:true});
  const captura=async nombre=>{const {data}=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,nombre+'.png'),Buffer.from(data,'base64'));};
  const sinPrivado=async()=>{
    assert.equal(await evaluate("Boolean(document.querySelector('.sidebar, .main, #login-email'))"),false);
    assert.equal(await evaluate("document.querySelector('.sesion-preparando').getAttribute('aria-busy')"),'true');
    assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true);
  };
  const recargar=async()=>{
    await evaluate("document.body.dataset.anterior='1'");await send('Page.reload');
    await esperar("Boolean(document.body)&&!document.body.dataset.anterior&&Boolean(document.querySelector('.sesion-preparando'))");
  };
  await t.test('Sesión: login erróneo conserva error; login válido espera verificación sin contenido privado',async()=>{
    fase('sesion login');await fill('#login-email','nadie@example.invalid');await fill('#login-password','clave-ficticia');
    await evaluate("document.querySelector('.login-card').requestSubmit()");await esperar("Boolean(document.querySelector('.login-card [role=alert]'))");
    configurar({demora:1500});await login();await esperar("Boolean(document.querySelector('.sesion-preparando'))");await sinPrivado();await captura('sesion-escritorio');await esperar(inicioVisible);
  });
  for(const width of [1280,390,320])await t.test(`Sesión: restauración lenta F5 ${width}, sin login ni dashboard prematuros`,async()=>{
    fase('sesion F5 '+width);await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});
    configurar({demora:1500});const antes=requests.length;await recargar();await sinPrivado();
    assert.equal(requests.slice(antes).some(r=>r.ruta.startsWith('/dashboard')),false);
    await captura('sesion-'+width);await esperar(inicioVisible);
  });
  await t.test('Sesión: movimiento reducido estático; validación rápida no introduce demora visual',async()=>{
    fase('sesion movimiento');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    configurar({demora:1500});await recargar();await sinPrivado();
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.sesion-preparando-actividad span')).animationName"),'none');await captura('sesion-reduced');await esperar(inicioVisible);
    configurar();await evaluate("document.body.dataset.anterior='1'");await send('Page.reload');
    await esperar(`Boolean(document.body)&&!document.body.dataset.anterior&&(${inicioVisible})`);
    assert.equal(await evaluate("Boolean(document.querySelector('.sesion-preparando'))"),false);
    await send('Emulation.setEmulatedMedia',{features:[]});
  });
  await t.test('Sesión: fallo temporal muestra error real, conserva token y permite reintentar',async()=>{
    fase('sesion fallo');configurar({demora:800,fallo:true});await recargar();await sinPrivado();
    await esperar("document.querySelector('[role=alert]')?.textContent.includes('verificar la sesión')");
    assert.equal(await evaluate("Boolean(localStorage.getItem('token'))"),true);assert.equal(await evaluate("Boolean(document.querySelector('.sidebar, .main'))"),false);await captura('sesion-error');
    configurar();await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Reintentar').click()");await esperar(inicioVisible);
  });
  await t.test('Sesión: 401 expirada/inválida termina en login vacío sin contenido privado',async()=>{
    fase('sesion expirada');configurar({demora:800,caduca:true});await recargar();await sinPrivado();
    await esperar("Boolean(document.querySelector('#login-email'))");
    assert.equal(await evaluate("localStorage.getItem('token')"),null);
    assert.equal(await evaluate("Boolean(document.querySelector('.sidebar, .main, .sesion-preparando'))"),false);
    assert.equal(await evaluate("document.querySelector('#login-email').value + document.querySelector('#login-password').value"),'');
    configurar();
  });
  fs.writeFileSync(path.join(out,'resultado-sesion.json'),JSON.stringify({casos:7,api:'simulada',datosPrivadosAntesDeAutenticar:false},null,2));
}

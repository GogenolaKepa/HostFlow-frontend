import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
export async function probarLoginPremium({t,evaluate,send,fill,esperar,login,inicioVisible,requests,excepciones,modoFoto,fase}) {
  const out=path.resolve('../revision/login-foto-flowia-2026-10-29');fs.mkdirSync(out,{recursive:true});
  const captura=async nombre=>{const {data}=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,nombre+'.png'),Buffer.from(data,'base64'));};
  const recargar=async()=>{await evaluate("document.body.dataset.loginAnterior='1'");await send('Network.clearBrowserCache');await send('Page.reload',{ignoreCache:true});await esperar("Boolean(document.body)&&!document.body.dataset.loginAnterior&&Boolean(document.querySelector('#login-email'))");};
  for(const width of [1280,390]) for(const modo of ['normal','error','lenta'])await t.test(`Login foto ${modo} ${width}`,async()=>{
    fase(`login ${modo} ${width}`);modoFoto(modo);await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});await recargar();await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");
    assert.equal(await evaluate("Boolean(document.querySelector('#login-email')) && !document.querySelector('.login-card button').disabled"),true);
    const rect=()=>evaluate("(()=>{const r=document.querySelector('.login-card').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()");const antes=await rect();
    await esperar("document.querySelector('.login-premium').dataset.fondo==='"+(modo==='normal'?'foto':'fallback')+"'");
    if(modo==='lenta'){await new Promise(r=>setTimeout(r,1200));assert.equal(await evaluate("document.querySelector('.login-premium').dataset.fondo"),'fallback');}
    assert.deepEqual(await rect(),antes,'Imagen no desplaza formulario');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    await new Promise(r=>setTimeout(r,500));await captura(modo+'-'+width+'-dark');
    if(modo==='normal'){await evaluate("globalThis.HostFlowAppearance.setPreference('claro')");await captura(modo+'-'+width+'-light');}
  });
  await t.test('Login funcional con imagen ausente, error y reintento; no requiere imagen para enviar',async()=>{
    fase('login funcional');modoFoto('error');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await recargar();
    await fill('#login-email','inexistente@example.invalid');await fill('#login-password','clave-ficticia-invalida');await evaluate("document.querySelector('.login-card').requestSubmit()");await esperar("Boolean(document.querySelector('.login-card [role=alert]'))");
    await login();await esperar(inicioVisible);assert.ok(requests.filter(r=>r.ruta==='/auth/login').length>=2);
  });
  assert.equal(excepciones.length,0);
  fs.writeFileSync(path.join(out,'resultado-login.json'),JSON.stringify({casos:7,foto:true,fallbackError:true,fallbackTimeout:true,loginSinFoto:true},null,2));
}

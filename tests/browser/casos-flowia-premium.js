import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function probarFlowIAPremium({t,evaluate,send,click,esperar,login,inicioVisible,fixture,requests,fase}) {
  const out=path.resolve('../revision/flowia-premium-2026-10-29');fs.mkdirSync(out,{recursive:true});
  const boton=texto=>evaluate(`[...document.querySelectorAll('.flowia-panel button')].find(b=>b.textContent.replace('✦','').trim()===${JSON.stringify(texto)}).click()`);
  const consultas=()=>requests.filter(r=>r.ruta==='/recomendaciones'&&r.method==='GET');
  const captura=async nombre=>{await new Promise(r=>setTimeout(r,220));const {data}=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,nombre+'.png'),Buffer.from(data,'base64'));};
  const recargar=async()=>{await evaluate('document.body.dataset.viejo="si"');await send('Page.reload');await esperar(`Boolean(document.body)&&!document.body.dataset.viejo&&(${inicioVisible})`);await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");};
  const abrir=async()=>{await click('.sidebar-flowia');await esperar("Boolean(document.querySelector('.flowia-panel[open]'))");};
  const cerrar=async()=>{await click('.flowia-close');await esperar("!document.querySelector('.flowia-panel')");};
  fixture({rol:'Administrador',datosVisuales:true,monedasActivas:false,demoraFlowIA:0,falloFlowIA:false,modoFlowIA:'normal'});
  await login();await esperar(inicioVisible);await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");
  await t.test('FlowIA: abrir/actualizar locales; consentimiento, cancelación, Escape y confirmación única',async()=>{
    fase('FlowIA consentimiento');await abrir();await esperar("Boolean(document.querySelector('.flowia-card'))");assert.equal(consultas().at(-1).params.ia,'false');
    assert.equal(await evaluate("document.querySelector('.flowia-panel-header').textContent.includes('Google Gemini') || document.querySelector('.flowia-summary').textContent.includes('Google Gemini')"),false);
    await captura('analisis-escritorio');await boton('Actualizar análisis');await esperar("!document.querySelector('.flowia-refresh').disabled");assert.equal(consultas().at(-1).params.ia,'false');
    let n=consultas().length;await boton('Potenciar FlowIA');assert.equal(consultas().length,n);
    assert.match(await evaluate("document.querySelector('.flowia-consent').textContent"),/Google Gemini/);
    assert.equal(await evaluate("(document.querySelector('.flowia-consent').textContent.match(/Google Gemini/g)||[]).length"),1);
    assert.equal(await evaluate("document.querySelector('.flowia-consent > p').textContent.includes('Google Gemini')"),false);
    assert.equal(await evaluate("document.querySelector('.flowia-privacy').open"),false);
    assert.equal(await evaluate("document.activeElement.textContent"),'Cancelar');await captura('consentimiento-escritorio');
    await click('.flowia-privacy summary');
    assert.equal(await evaluate("document.querySelector('.flowia-privacy').open && document.querySelector('.flowia-privacy').innerText.includes('Google Gemini')"),true);
    await captura('privacidad-escritorio');
    await boton('Cancelar');assert.equal(consultas().length,n);assert.equal(await evaluate("document.activeElement.classList.contains('flowia-enhance-button')"),true);
    await boton('Potenciar FlowIA');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await esperar("!document.querySelector('.flowia-consent')");assert.equal(await evaluate("Boolean(document.querySelector('.flowia-panel[open]'))"),true);assert.equal(consultas().length,n);
    fixture({demoraFlowIA:350});await boton('Potenciar FlowIA');await boton('Confirmar y potenciar');await esperar("document.querySelector('.flowia-mode').textContent.includes('IA activa')");
    assert.equal(consultas().length,n+1);assert.equal(consultas().at(-1).params.ia,'true');
    await boton('Actualizar análisis');await esperar("!document.querySelector('.flowia-refresh').disabled");assert.equal(consultas().at(-1).params.ia,'false');await cerrar();
  });
  await t.test('FlowIA: cargas lentas, error, reintento local y datos conservados en errores de actualización',async()=>{
    fase('FlowIA estados');fixture({demoraFlowIA:1800,falloFlowIA:true});await recargar();await abrir();await esperar("Boolean(document.querySelector('.hf-skeleton--flowia'))");await captura('carga-escritorio');
    await esperar("Boolean(document.querySelector('.flowia-state--error'))");let n=consultas().length;await new Promise(r=>setTimeout(r,250));assert.equal(consultas().length,n);await captura('error-escritorio');
    fixture({demoraFlowIA:0,falloFlowIA:false});await boton('Reintentar');await esperar("Boolean(document.querySelector('.flowia-card'))");assert.equal(consultas().at(-1).params.ia,'false');
    fixture({falloFlowIA:true});await boton('Actualizar análisis');await esperar("Boolean(document.querySelector('.flowia-inline-warning'))");assert.equal(await evaluate("Boolean(document.querySelector('.flowia-card'))"),true);assert.equal(consultas().at(-1).params.ia,'false');await cerrar();fixture({falloFlowIA:false});
  });
  await t.test('FlowIA: error externo no reenvía; actualización posterior vuelve al análisis local',async()=>{
    fase('FlowIA error externo');fixture({falloFlowIA:false,demoraFlowIA:0});await recargar();await abrir();await esperar("Boolean(document.querySelector('.flowia-card'))");
    fixture({falloFlowIA:true});const n=consultas().length;await boton('Potenciar FlowIA');assert.equal(consultas().length,n);await boton('Confirmar y potenciar');
    await esperar("Boolean(document.querySelector('.flowia-inline-warning'))");assert.equal(consultas().length,n+1);assert.equal(consultas().at(-1).params.ia,'true');
    await new Promise(r=>setTimeout(r,250));assert.equal(consultas().length,n+1);
    fixture({falloFlowIA:false});await boton('Actualizar análisis');await esperar("!document.querySelector('.flowia-refresh').disabled");assert.equal(consultas().at(-1).params.ia,'false');
    await boton('Potenciar FlowIA');await cerrar();await abrir();assert.equal(await evaluate("Boolean(document.querySelector('.flowia-consent'))"),false);await cerrar();
  });
  for(const width of [390,320])await t.test(`FlowIA: móvil ${width}, consentimiento legible y foco contenido`,async()=>{
    fase('FlowIA movil '+width);fixture({datosVisuales:true,demoraFlowIA:0});await recargar();await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await abrir();await esperar("Boolean(document.querySelector('.flowia-card'))");
    assert.equal(await evaluate("document.querySelector('.flowia-panel').scrollWidth<=innerWidth"),true);await captura('analisis-'+width);await boton('Potenciar FlowIA');await captura('consentimiento-'+width);
    assert.equal(await evaluate("document.querySelector('.flowia-panel').scrollWidth<=innerWidth"),true);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await evaluate("document.querySelector('.flowia-panel').contains(document.activeElement)"),true);
    await boton('Cancelar');await cerrar();await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  });
  await t.test('FlowIA: vacío y Operador mantienen análisis local y herramientas; F5 no invoca IA',async()=>{
    fase('FlowIA vacio permisos');fixture({rol:'Operador',datosVisuales:false});await recargar();await abrir();await esperar("Boolean(document.querySelector('.flowia-state--empty'))");assert.equal(consultas().at(-1).params.ia,'false');assert.equal(await evaluate("document.querySelector('.flowia-enhance-button').disabled"),true);await captura('vacio');await cerrar();
    fixture({datosVisuales:true});await recargar();await abrir();await esperar("Boolean(document.querySelector('.flowia-card'))");assert.equal(consultas().at(-1).params.ia,'false');await cerrar();
    fixture({sinFlowIA:true});let n=consultas().length;await recargar();assert.equal(await evaluate("Boolean(document.querySelector('.sidebar-flowia'))"),false);assert.equal(consultas().length,n);
  });
  assert.ok(consultas().every(r=>['false','true'].includes(r.params.ia)));assert.equal(consultas().filter(r=>r.params.ia==='true').length,2);
  fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify({consultas:consultas().map(r=>({method:r.method,ia:r.params.ia})),externasConfirmadas:2},null,2));
}

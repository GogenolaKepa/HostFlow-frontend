import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';import react from '@vitejs/plugin-react';
import {abrirNavegador} from '../helpers/navegadorComercial.js';import {puertoAislado} from '../helpers/puertoAislado.js';import {cacheViteAislada} from '../helpers/cacheVite.js';
const ejecutable=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
test('navegador ficticio: incertidumbre bloquea submit, enlace inválido y revocación accesible',{skip:!fs.existsSync(ejecutable),timeout:60000},async()=>{
  const frontend=fileURLToPath(new URL('../..',import.meta.url)),cache=cacheViteAislada();let vite,b;
  const capturas=path.join(frontend,'../revision/authcom-cierre-integracion-2026-10-31/capturas');fs.mkdirSync(capturas,{recursive:true});
  try{
    vite=await createServer({root:path.join(frontend,'tests/manual/autenticacion'),configFile:false,envDir:false,publicDir:false,cacheDir:cache.ruta,plugins:[react()],server:{host:'127.0.0.1',port:await puertoAislado(),strictPort:true,ws:false,watch:null,fs:{allow:[frontend]}}});await vite.listen();
    const base='http://127.0.0.1:'+vite.httpServer.address().port;b=await abrirNavegador(ejecutable);const {command,evaluate,esperar}=b;
    b.on('Fetch.requestPaused',async p=>{const permitida=p.request.url.startsWith(base+'/')||p.request.url.startsWith('data:');await command(permitida?'Fetch.continueRequest':'Fetch.failRequest',{requestId:p.requestId,...(permitida?{}:{errorReason:'BlockedByClient'})});});
    await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
    const click=texto=>evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(texto)}).click()`);
    const fill=(id,v)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const abrir=async()=>{await command('Page.navigate',{url:base+'/preparada.html'});await esperar("!!document.getElementById('ac-email')");};
    await abrir();await evaluate('window.ensayoPreparado.fallarConfirmar=true');await click('Invitación ficticia');await esperar("!!document.getElementById('ac-password')");
    for(const id of ['ac-password','ac-confirmacion'])await fill(id,'Frase ficticia de laboratorio 124');
    await click('Aceptar invitación');await esperar("document.body.innerText.includes('No pudimos confirmar el resultado')");
    await evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
    assert.equal(await evaluate("window.ensayoPreparado.llamadas.filter(x=>x.ruta.endsWith('/confirmar')).length"),1);
    assert.ok(await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Aceptar invitación').disabled"));
    await command('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});await evaluate("document.documentElement.dataset.theme='dark'");
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    fs.writeFileSync(path.join(capturas,'incierto-movil.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    await abrir();await evaluate('window.ensayoPreparado.enlaceInvalido=true');await click('Invitación ficticia');await esperar("document.body.innerText.includes('Este enlace ya no está disponible')");assert.equal(await evaluate("!!document.getElementById('ac-password')"),false);
    await abrir();await command('Emulation.setDeviceMetricsOverride',{width:1440,height:950,deviceScaleFactor:1,mobile:false});await click('Gestión Administrador');await esperar("document.body.innerText.includes('Persona ficticia')");
    await click('Revocar invitación');await esperar("!!document.querySelector('[role=dialog]')");assert.equal(await evaluate('document.activeElement.textContent'),'Conservar invitación');
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    await esperar("!document.querySelector('[role=dialog]')");assert.equal(await evaluate('window.ensayoPreparado.revocada'),false);
    await click('Revocar invitación');await click('Confirmar revocación');await esperar("document.body.innerText.includes('Revocada')");
    assert.equal(await evaluate("window.ensayoPreparado.llamadas.filter(x=>x.ruta.endsWith('/revocar')).length"),1);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    fs.writeFileSync(path.join(capturas,'gestion-escritorio.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  }finally{await b?.cerrar();await vite?.close();cache.limpiar();}
});

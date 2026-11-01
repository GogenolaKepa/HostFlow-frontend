import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';import react from '@vitejs/plugin-react';
import {abrirNavegador} from '../helpers/navegadorComercial.js';import {puertoAislado} from '../helpers/puertoAislado.js';import {cacheViteAislada} from '../helpers/cacheVite.js';
const ejecutable=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
test('entrada preparada: capacidades reales del contrato, invitación y permisos en navegador ficticio',{skip:!fs.existsSync(ejecutable),timeout:60000},async()=>{
  const frontend=fileURLToPath(new URL('../..',import.meta.url)),cache=cacheViteAislada();let vite,b;
  const capturas=path.join(frontend,'../revision/authcom-nocturno-2026-10-31/capturas');fs.mkdirSync(capturas,{recursive:true});
  try{
    vite=await createServer({root:path.join(frontend,'tests/manual/autenticacion'),configFile:false,envDir:false,publicDir:false,cacheDir:cache.ruta,plugins:[react()],server:{host:'127.0.0.1',port:await puertoAislado(),strictPort:true,ws:false,watch:null,fs:{allow:[frontend]}}});await vite.listen();
    const base='http://127.0.0.1:'+vite.httpServer.address().port;b=await abrirNavegador(ejecutable);
    const {command,evaluate,esperar}=b;
    b.on('Fetch.requestPaused',async p=>{await command(p.request.url.startsWith(base)||p.request.url.startsWith('data:')?'Fetch.continueRequest':'Fetch.failRequest',{requestId:p.requestId,...(p.request.url.startsWith(base)||p.request.url.startsWith('data:')?{}:{errorReason:'BlockedByClient'})});});
    await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
    const click=texto=>evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(texto)}).click()`);
    const fill=(id,v)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await command('Page.navigate',{url:base+'/preparada.html'});await esperar("!!document.getElementById('ac-email')");
    await fill('ac-email','prueba@example.invalid');await click('Solicitar enlace seguro');await esperar("document.body.innerText.includes('Revisá tu correo')");
    assert.equal(await evaluate("window.ensayoPreparado.llamadas.filter(x=>x.ruta.endsWith('/solicitar')).length"),1);
    await click('Disponibilidad');await esperar("document.body.innerText.includes('Este acceso aún no está disponible')");
    assert.equal(await evaluate("!!document.getElementById('ac-email')"),false);
    await click('Disponibilidad');await esperar("!!document.getElementById('ac-email')");
    await evaluate('window.ensayoPreparado.fallarValidar=true');await click('Invitación ficticia');await esperar("document.body.innerText.includes('No pudimos verificar el enlace')");
    await evaluate('window.ensayoPreparado.fallarValidar=false');await click('Reintentar verificación');await esperar("!!document.getElementById('ac-password')");
    await fill('ac-password','Frase exclusivamente ficticia 123');await fill('ac-confirmacion','Frase exclusivamente ficticia 123');await click('Aceptar invitación');await esperar("document.body.innerText.includes('Ya sos parte del equipo')");
    assert.equal(await evaluate("window.ensayoPreparado.llamadas.filter(x=>x.ruta.endsWith('/confirmar')).length"),1);
    assert.equal(await evaluate("window.ensayoPreparado.llamadas.some(x=>x.autorizacion)"),false);
    await command('Emulation.setDeviceMetricsOverride',{width:1440,height:950,deviceScaleFactor:1,mobile:false});
    fs.writeFileSync(path.join(capturas,'escritorio.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    await click('Gestión Operador');await esperar("document.body.innerText.includes('Acceso restringido')");
    await command('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
    await evaluate("document.documentElement.dataset.theme='dark'");
    await click('Invitación ficticia');await esperar("!!document.getElementById('ac-password')");
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    fs.writeFileSync(path.join(capturas,'movil.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  }finally{await b?.cerrar();await vite?.close();cache.limpiar();}
});

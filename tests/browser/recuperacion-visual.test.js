import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {abrirNavegador} from '../helpers/navegadorComercial.js';
import {puertoAislado} from '../helpers/puertoAislado.js';
import {cacheViteAislada} from '../helpers/cacheVite.js';
const browser=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe';

test('presentación de recuperación: responsive, estados y contratos simulados sin red externa',{timeout:120000},async()=>{
 assert.ok(fs.existsSync(browser),'Navegador local requerido, no omitir la verificación');
 const frontend=fileURLToPath(new URL('../..',import.meta.url)),cache=cacheViteAislada(),antes=process.env.HF_VISUAL_FASE==='antes';
 const out=path.resolve(frontend,'../capturas',`${antes?'antes':'despues'}-${Date.now()}`);fs.mkdirSync(out,{recursive:true});
 const base='http://127.0.0.1:'+await puertoAislado();let vite,b;const externos=[],noGET=[],checks=[],excepciones=[];
 try{
  vite=await createServer({root:frontend,configFile:false,envDir:false,cacheDir:cache.ruta,plugins:[react()],optimizeDeps:{include:['react','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime']},server:{host:'127.0.0.1',port:Number(new URL(base).port),strictPort:true,ws:false,watch:null}});
  await vite.listen();b=await abrirNavegador(browser);const {command,evaluate}=b;
  b.on('Runtime.exceptionThrown',p=>excepciones.push(p.exceptionDetails?.exception?.description?.slice(0,400)||p.exceptionDetails?.text));await command('Runtime.enable');
  b.on('Fetch.requestPaused',async p=>{const local=p.request.url.startsWith(base+'/')||p.request.url.startsWith('data:');if(!local)externos.push('bloqueado');if(p.request.method!=='GET')noGET.push(p.request.method);try{await command(local&&p.request.method==='GET'?'Fetch.continueRequest':'Fetch.failRequest',{requestId:p.requestId,...(local&&p.request.method==='GET'?{}:{errorReason:'BlockedByClient'})});}catch{}});
  await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
  const wait=expr=>b.esperar(`(()=>{try{return ${expr};}catch{return false;}})()`);
  const screen=(w,h=960)=>command('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<700});
  const nav=async(pantalla='solicitar',estado='lista')=>{await command('Page.navigate',{url:`${base}/tests/manual/autenticacion/recuperacion-visual.html?pantalla=${pantalla}&estado=${estado}`});await wait('!!document.querySelector(".ac-experiencia")');await wait('document.querySelector(".ac-experiencia").dataset.fondo!=="cargando"');};
  const fill=(id,value)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const clickSubmit=()=>evaluate('document.querySelector("form").requestSubmit()');
  const capture=async name=>fs.writeFileSync(path.join(out,name+'.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'),{flag:'wx'});
  const noOverflow=async()=>assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
  for(const width of [1440,390,320]){
   await screen(width,width<700?844:960);await nav();if(!antes)await noOverflow();await capture('solicitar-'+width);
   await nav('confirmar');await wait('!!document.getElementById("ac-password")');if(!antes)await noOverflow();await capture('nueva-password-'+width);
  }
  if(antes){fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify({fase:'antes',capturas:6,externos,noGET}));console.log('CAPTURAS_ANTES='+out);return;}
  await screen(390,844);await nav();
  const contraste=await evaluate(`(()=>{
   const rgb=s=>s.match(/[\\d.]+/g).slice(0,3).map(Number),lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05),panel=rgb(getComputedStyle(document.querySelector('.ac-panel')).backgroundColor);
   return ['input','.ac-primario','.ac-volver','small','.ac-alcance'].map(selector=>{const el=document.querySelector(selector),c=getComputedStyle(el),bg=selector==='input'||selector==='.ac-primario'?rgb(c.backgroundColor):panel;return {selector,ratio:ratio(rgb(c.color),bg),altura:el.getBoundingClientRect().height};});
  })()`);
  for(const item of contraste)assert.ok(item.ratio>=4.5,`Contraste insuficiente en ${item.selector}: ${item.ratio}`);
  for(const selector of ['input','.ac-primario','.ac-volver'])assert.ok(contraste.find(r=>r.selector===selector).altura>=44);
  assert.ok(await evaluate('Array.from(document.querySelectorAll("input")).every(e=>!!document.querySelector(`label[for="${e.id}"]`))'));
  const ax=await command('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='textbox'&&n.name?.value==='Correo electrónico'));
  checks.push({accesibilidad:'contraste AA de texto, controles44px y etiqueta accesible',contraste});
  assert.ok(await evaluate('document.body.innerText.includes("Administrador") && document.body.innerText.includes("Operador")'));
  assert.equal(await evaluate('document.body.innerText.includes("Si sos Administrador")'),false);
  await clickSubmit();await wait('!!document.querySelector("[role=alert]")');assert.equal(await evaluate('window.__recuperacionVisual.llamadas.length'),0);
  await fill('ac-email','persona@example.invalid');await clickSubmit();await wait('document.body.innerText.includes("Revisá tu correo")');
  assert.equal(await evaluate('window.__recuperacionVisual.llamadas.join()'),'solicitar');
  assert.equal(await evaluate('document.activeElement.tagName'),'H2');await capture('solicitud-aceptada');checks.push('solicitud neutral y foco');
  for(const state of ['cargando','error','incierto']){
   await nav('solicitar',state);await fill('ac-email','persona@example.invalid');await clickSubmit();await wait(state==='cargando'?'document.querySelector("button.ac-primario").disabled':'!!document.querySelector("[role=alert]")');
   if(state==='incierto'){await clickSubmit();assert.equal(await evaluate('window.__recuperacionVisual.llamadas.length'),1);assert.equal(await evaluate('document.querySelector("button.ac-primario").disabled'),true);}
   await capture('solicitud-'+state);await noOverflow();
  }checks.push('carga, error e incertidumbre sin duplicado');
  for(const state of ['validando','vencido','invalido','error-enlace']){await nav('confirmar',state);await wait(state==='validando'?'!!document.querySelector("[role=status]")':state==='error-enlace'?'document.body.innerText.includes("No pudimos verificar")':'document.body.innerText.includes("Este enlace ya no está disponible")');await noOverflow();await capture('enlace-'+state);}
  await nav('confirmar');await wait('!!document.getElementById("ac-password")');await fill('ac-password','Una frase ficticia de prueba 2026');await fill('ac-confirmacion','diferente');await clickSubmit();await wait('!!document.querySelector("[role=alert]")');assert.equal(await evaluate('window.__recuperacionVisual.llamadas.filter(x=>x==="confirmar").length'),0);
  await fill('ac-confirmacion','Una frase ficticia de prueba 2026');await clickSubmit();await wait('document.body.innerText.includes("Tu contraseña fue actualizada")');assert.equal(await evaluate('window.__recuperacionVisual.llamadas.join()'),'validar,confirmar');assert.equal(await evaluate('document.activeElement.tagName'),'H2');await capture('password-actualizada');checks.push('validación intacta, confirmación simulada y foco');
  await nav('confirmar','incierto');await wait('!!document.getElementById("ac-password")');for(const id of ['ac-password','ac-confirmacion'])await fill(id,'Una frase ficticia de prueba 2026');await clickSubmit();await wait('!!document.querySelector("[role=alert]")');await clickSubmit();assert.equal(await evaluate('window.__recuperacionVisual.llamadas.filter(x=>x==="confirmar").length'),1);await capture('password-incierta');
  await nav();await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate('document.activeElement.classList.contains("ac-volver")'),true);
  assert.ok(await evaluate('parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=2'));
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await evaluate('document.activeElement.id'),'ac-email');checks.push('teclado y foco visible');
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await nav('confirmar','validando');assert.equal(await evaluate('getComputedStyle(document.querySelector(".ac-linea")).animationName'),'none');
  await nav('entrada','cargando');await capture('capacidades-cargando');await nav('entrada','lista');await wait('document.body.innerText.includes("Recuperación no disponible")');await capture('capacidades-no-disponibles');
  await nav('invitacion');await wait('!!document.getElementById("ac-password")');assert.equal(await evaluate('!!document.querySelector(".ac-recuperacion")'),false);checks.push('invitaciones mantienen el marco original');
  await screen(320,640);await nav();assert.ok(await evaluate('document.documentElement.scrollHeight>innerHeight'));
  await command('Input.dispatchMouseEvent',{type:'mouseWheel',x:8,y:450,deltaX:0,deltaY:320});await wait('scrollY>0');
  await evaluate('window.scrollTo(0,0)');await command('Input.dispatchKeyEvent',{type:'keyDown',key:'PageDown',code:'PageDown',windowsVirtualKeyCode:34});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'PageDown',code:'PageDown',windowsVirtualKeyCode:34});await wait('scrollY>0');checks.push('scroll real con rueda y Av Pág');
  assert.deepEqual(externos,[]);assert.deepEqual(noGET,[]);
  fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify({fase:'despues',checks,externos,noGET,datos:'exclusivamente ficticios',screenshots:fs.readdirSync(out).filter(f=>f.endsWith('.png')).length},null,2));console.log('CAPTURAS_DESPUES='+out);
 }catch(error){fs.writeFileSync(path.join(out,'fallo-local.json'),JSON.stringify({mensaje:error.message,excepciones,externos,noGET,dom:b?await b.evaluate('document.body.innerText.slice(0,700)'):null},null,2));throw error;}
 finally{await b?.cerrar();await vite?.close();cache.limpiar();}
});

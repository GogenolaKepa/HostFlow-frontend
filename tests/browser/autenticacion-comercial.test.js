import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {abrirNavegador} from '../helpers/navegadorComercial.js';
import {cacheViteAislada} from '../helpers/cacheVite.js';
import {puertoAislado} from '../helpers/puertoAislado.js';

const browserPath=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
test('cuentas premium: navegador aislado, contratos ficticios y responsive',{skip:!fs.existsSync(browserPath),timeout:180000},async t=>{
  const frontend=fileURLToPath(new URL('../..',import.meta.url)),cache=cacheViteAislada();
  const capturas=path.resolve(frontend,'../revision/autenticacion-comercial-fases3-5-2026-10-30/capturas');fs.mkdirSync(capturas,{recursive:true});
  let vite,browser;let invitaciones=[],rol='Administrador',valido=true,ultimoTipo='recuperacion',llamadas=[],demora=0,fallo=false,falloValidar=false;
  const token='a'.repeat(43);
  const plugin={name:'api-ficticia-cuentas',configureServer(server){server.middlewares.use(async(req,res,next)=>{
    if(!req.url.startsWith('/api/')&&!req.url.startsWith('/laboratorio/'))return next();
    const partes=[];for await(const b of req)partes.push(b);const body=partes.length?JSON.parse(Buffer.concat(partes).toString()):{};
    llamadas.push({url:req.url,method:req.method,body});if(demora)await new Promise(r=>setTimeout(r,demora));
    let status=204,data;
    if(req.url==='/laboratorio/rol')rol=body.rol;
    else if(req.url==='/laboratorio/correo'){status=200;data={enlace:`https://cuentas.example.invalid/#token=${token}`,tipo:ultimoTipo};}
    else if(req.url.endsWith('/recuperacion/solicitar')){status=202;data={mensaje:'neutral'};ultimoTipo='recuperacion';}
    else if(req.url.endsWith('/validar')||req.url.endsWith('/confirmar')){if(!valido||body.token!==token){status=400;data={codigo:'ENLACE_INVALIDO'};}}
    else if(rol!=='Administrador'){status=403;data={mensaje:'denegado'};}
    else if(req.method==='GET'){const pagina=Number(new URL(req.url,'http://localhost').searchParams.get('pagina')||1);status=200;data={invitaciones:invitaciones.slice((pagina-1)*50,pagina*50),pagina,hayMas:invitaciones.length>pagina*50};}
    else if(req.url.endsWith('/revocar')){invitaciones=invitaciones.map(i=>({...i,estado:'Revocada'}));}
    else{status=202;data={mensaje:'neutral'};ultimoTipo='invitaciones';if(!invitaciones.length)invitaciones=[{id:'11111111-1111-4111-8111-111111111111',nombre:body.nombre,email:body.email,estado:'Pendiente',expiraEn:new Date(Date.now()+86400000).toISOString()}];}
    if(fallo&&req.url.endsWith('/confirmar')){status=503;data={};}
    if(falloValidar&&req.url.endsWith('/validar')){status=503;data={};}
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.statusCode=status;res.end(status===204?'':JSON.stringify(data));
  });}};
  try{
    vite=await createServer({root:path.join(frontend,'tests/manual/autenticacion'),configFile:false,envDir:false,publicDir:false,cacheDir:cache.ruta,plugins:[react(),plugin],server:{host:'127.0.0.1',port:await puertoAislado(),strictPort:true,ws:false,watch:null,fs:{allow:[frontend]}}});await vite.listen();
    const base=`http://127.0.0.1:${vite.httpServer.address().port}`;
    browser=await abrirNavegador(browserPath);const {command,evaluate,esperar}=browser;
    const externos=[];browser.on('Fetch.requestPaused',async p=>{if(p.request.url.startsWith(base)||p.request.url.startsWith('data:'))await command('Fetch.continueRequest',{requestId:p.requestId});else{externos.push('bloqueado');await command('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});}});
    await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
    const click=async texto=>{assert.ok(await evaluate(`!!Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(texto)})`));await evaluate(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(texto)}).click()`);};
    const fill=async(id,value)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const texto=()=>evaluate('document.body.innerText');
    await command('Page.navigate',{url:base});await esperar("!!document.getElementById('ac-email')");
    await t.test('correo inválido no envía; respuesta neutral y doble envío bloqueado',async()=>{
      await fill('ac-email','incorrecto');await click('Solicitar enlace seguro');assert.match(await texto(),/correo electrónico válido/);assert.equal(llamadas.filter(r=>r.url.endsWith('/solicitar')).length,0);
      demora=200;await fill('ac-email','existente@example.invalid');await click('Solicitar enlace seguro');await evaluate("document.querySelector('form').requestSubmit()");await esperar("document.body.innerText.includes('Revisá tu correo')");assert.equal(llamadas.filter(r=>r.url.endsWith('/solicitar')).length,1);demora=0;
    });
    await t.test('pantallas legibles en cinco anchos y ambos temas, sin overflow',async()=>{
      await click('Recuperación');
      for(const ancho of [1920,1366,820,390,320])for(const tema of ['dark','light']){
        await command('Emulation.setDeviceMetricsOverride',{width:ancho,height:950,deviceScaleFactor:1,mobile:false});await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(tema)}`);
        assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
        const {data}=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(capturas,`recuperacion-${ancho}-${tema}.png`),Buffer.from(data,'base64'));
      }
      await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      assert.equal(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"),true);
      await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.ok(await evaluate('document.activeElement!==document.body'));
    });
    await t.test('enlace validado, contraseñas coincidentes, error incierto sin repetir',async()=>{
      await click('Abrir último enlace ficticio');await esperar("!!document.getElementById('ac-password')");assert.equal(await evaluate('location.hash'),'');
      await fill('ac-password','Una frase ficticia segura');await fill('ac-confirmacion','otra frase');await click('Actualizar contraseña');assert.match(await texto(),/no coinciden/);
      fallo=true;await fill('ac-confirmacion','Una frase ficticia segura');await click('Actualizar contraseña');await esperar("document.body.innerText.includes('No pudimos confirmar')");assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(e=>e.textContent==='Actualizar contraseña').disabled"),true);fallo=false;
    });
    await t.test('confirmación exitosa muestra retorno al login sin iniciar sesión automáticamente',async()=>{
      await click('Recuperación');await click('Abrir último enlace ficticio');await esperar("!!document.getElementById('ac-password')");
      await fill('ac-password','Una frase ficticia diferente');await fill('ac-confirmacion','Una frase ficticia diferente');await click('Actualizar contraseña');await esperar("document.body.innerText.includes('Tu contraseña fue actualizada')");
      await click('Volver al inicio de sesión');await esperar("document.body.innerText.includes('Iniciar sesión · entorno ficticio')");
    });
    await t.test('falla de verificación no declara enlace vencido y permite reintentar solo lectura',async()=>{
      falloValidar=true;await click('Recuperación');await click('Abrir último enlace ficticio');await esperar("document.body.innerText.includes('No pudimos verificar el enlace')");
      assert.ok(!(await texto()).includes('Este enlace ya no está disponible'));
      const antes=llamadas.filter(r=>r.url.endsWith('/confirmar')).length;falloValidar=false;await click('Reintentar verificación');await esperar("!!document.getElementById('ac-password')");assert.equal(llamadas.filter(r=>r.url.endsWith('/confirmar')).length,antes);
    });
    await t.test('invitar Operador, listado, confirmar revocación y rol sin acceso',async()=>{
      await click('Equipo');await esperar("!!document.getElementById('ac-nombre')");await fill('ac-nombre','Persona ficticia');await fill('ac-inv-email','operador@example.invalid');await click('Enviar invitación');await esperar("document.body.innerText.includes('Revocar invitación')");
      await click('Revocar invitación');await esperar("!!document.querySelector('[role=dialog]')");assert.equal(await evaluate('document.activeElement.textContent'),'Conservar invitación');await click('Conservar invitación');assert.equal(await evaluate("!!document.querySelector('[role=dialog]')"),false);
      await click('Revocar invitación');await click('Confirmar revocación');await esperar("document.body.innerText.includes('Revocada')");
      await click('Rol: Administrador');await esperar("document.body.innerText.includes('Acceso restringido')");
    });
    await t.test('enlace no disponible sin filtrar causa ni almacenar credenciales',async()=>{
      valido=false;await click('Abrir último enlace ficticio');await esperar("document.body.innerText.includes('Este enlace ya no está disponible')");
      assert.equal(await evaluate('localStorage.length+sessionStorage.length'),0);assert.equal(await evaluate('location.hash'),'');assert.deepEqual(externos,[]);
    });
    await t.test('paginación no presenta filas de la página anterior mientras carga la siguiente',async()=>{
      invitaciones=Array.from({length:51},(_,n)=>({id:'11111111-1111-4111-8111-'+String(n).padStart(12,'0'),nombre:`Persona ${n}`,email:`persona${n}@example.invalid`,estado:'Pendiente',expiraEn:new Date(Date.now()+86400000).toISOString()}));
      await click('Rol: Operador');await click('Equipo');await esperar("document.body.innerText.includes('persona0@example.invalid')");
      demora=250;await click('Siguiente');await esperar("document.body.innerText.includes('Cargando invitaciones')");assert.ok(!(await texto()).includes('persona0@example.invalid'));
      await esperar("document.body.innerText.includes('persona50@example.invalid')");assert.match(await texto(),/Página 2/);assert.ok(!(await texto()).includes('persona0@example.invalid'));demora=0;
      await click('Anterior');await esperar("document.body.innerText.includes('persona0@example.invalid')");
    });
  }finally{await browser?.cerrar();await vite?.close();cache.limpiar();}
});

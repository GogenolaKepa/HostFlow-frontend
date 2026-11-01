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
const ejecutable=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe';

test('landing real: responsive, consulta local, rutas públicas y sesión; sin Azure ni correo',{skip:!fs.existsSync(ejecutable),timeout:100000},async t=>{
  const frontend=fileURLToPath(new URL('../..',import.meta.url)),cache=cacheViteAislada();let vite,b;
  const capturas=path.join(frontend,'../revision/activacion-landing-authcom-2026-11-01/capturas');fs.mkdirSync(capturas,{recursive:true});
  const llamadas=[],externos=[],errores=[];let foto=true,demoraSesion=0;
  const usuario={idUsuario:9001,nombre:'Persona ficticia',email:'laboratorio@example.invalid',rol:'Administrador',permisos:['dashboard.ver'],origenAutenticacion:'sql',gestionCuentasDisponible:true,debeCambiarPassword:false,versionRegistro:'0000000000000001'};
  try{
    vite=await createServer({root:frontend,configFile:false,envDir:false,cacheDir:cache.ruta,plugins:[react()],define:{'import.meta.env.VITE_API_URL':JSON.stringify('/api')},server:{host:'127.0.0.1',port:await puertoAislado(),strictPort:true,ws:false,watch:null}});await vite.listen();
    const base='http://127.0.0.1:'+vite.httpServer.address().port;b=await abrirNavegador(ejecutable);
    const {command,evaluate,esperar}=b;
    b.on('Runtime.exceptionThrown',p=>errores.push(p.exceptionDetails?.text||'excepción'));await command('Runtime.enable');
    b.on('Fetch.requestPaused',async p=>{
      try{
        const u=new URL(p.request.url),local=u.origin===base;
        if(!local&&!p.request.url.startsWith('data:')){externos.push(u.origin);await command('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});return;}
        if(local&&u.pathname.startsWith('/api/')){
          llamadas.push({ruta:u.pathname,metodo:p.request.method});let status=200,data={};
          if(u.pathname==='/api/auth/me'){if(demoraSesion)await new Promise(r=>setTimeout(r,demoraSesion));data={usuario,expiraEn:Math.floor(Date.now()/1000)+3600};}
          else if(u.pathname==='/api/auth/login')data={token:'token-solo-laboratorio',usuario};
          else if(u.pathname==='/api/dashboard/resumen')data={resumen:{propiedadesActivas:0,reservasActivas:0,huespedesRegistrados:0,ocupacionMensual:0,alertasPendientes:0},proximasReservas:[],alertas:[]};
          else if(u.pathname==='/api/monedas/estado')data={habilitado:false};
          else{status=404;data={mensaje:'Ruta no preparada en laboratorio.'};}
          await command('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(data)).toString('base64')});return;
        }
        if(!foto&&p.resourceType==='Image'&&/hero.*\.webp/.test(u.pathname)){await command('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});return;}
        await command('Fetch.continueRequest',{requestId:p.requestId});
      }catch{/* El perfil puede estar cerrándose. */}
    });
    await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
    let revision=0;
    const navegar=async ruta=>{await evaluate("if(document.body)document.body.dataset.documentoAnterior='1'");const u=new URL(ruta,base);u.searchParams.set('_prueba',String(++revision));await command('Page.navigate',{url:u.href});await esperar("!!document.body&&!document.body.dataset.documentoAnterior");};
    const fill=(id,valor)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const captura=async nombre=>fs.writeFileSync(path.join(capturas,nombre+'.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    for(const width of [1440,768,390,320])await t.test('diseño y contenido público '+width,async()=>{
      await command('Emulation.setDeviceMetricsOverride',{width,height:width===768?1024:950,deviceScaleFactor:1,mobile:width<760});await navegar('/');await esperar("!!document.getElementById('hf-hero-title')");
      await esperar("document.querySelector('.hf-hero-picture img').complete");
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
      assert.equal(await evaluate("!!document.querySelector('.sidebar,#login-email')"),false);
      assert.equal(await evaluate("document.querySelectorAll('main h1').length"),1);
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.hf-brand-symbol')).backgroundColor"),'rgba(0, 0, 0, 0)');
      assert.equal(await evaluate("getComputedStyle(document.getElementById('hf-alojamientos')).backgroundColor"),'rgb(14, 29, 26)');
      assert.ok(await evaluate("document.body.innerText.includes('Datos ficticios') && document.body.innerText.includes('A consultar') && document.body.textContent.includes('simuladores')"));
      assert.ok(await evaluate("[...document.querySelectorAll('.hf-landing a[href^=\"#\"]')].every(a=>!!document.querySelector(a.getAttribute('href')))"));
      if(width<760){await evaluate("document.querySelector('.hf-menu-toggle').click()");assert.equal(await evaluate("document.querySelector('.hf-menu-toggle').getAttribute('aria-expanded')"),'true');await evaluate("document.querySelector('#hf-public-nav a[href=\"#planes\"]').click()");assert.equal(await evaluate("document.querySelector('.hf-menu-toggle').getAttribute('aria-expanded')"),'false');await evaluate('scrollTo(0,0)');}
      await captura('landing-'+width);
      if([1440,390].includes(width))fs.writeFileSync(path.join(capturas,'hero-'+width+'.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
    });
    await t.test('consulta local sin POST, selección y aviso de portapapeles',async()=>{
      assert.equal(llamadas.length,0);
      await evaluate("document.querySelectorAll('.hf-plan a')[1].click()");assert.equal(await evaluate("document.getElementById('hf-plan').value"),'equipo');
      await fill('hf-alojamientos','4');await evaluate("document.querySelector('.hf-contact form').requestSubmit()");await esperar("!!document.getElementById('hf-solicitud')");
      assert.match(await evaluate("document.getElementById('hf-solicitud').value"),/Tu equipo/);
      assert.match(await evaluate("document.getElementById('hf-solicitud').value"),/Alojamientos: 4/);
      await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('simulado')}}});[...document.querySelectorAll('button')].find(x=>x.textContent==='Copiar consulta').click()");
      await esperar("document.querySelector('.hf-contact [role=status]').textContent.includes('Seleccioná')");
      await evaluate("document.getElementById('hf-plan').value='operacion';document.getElementById('hf-plan').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.equal(await evaluate("!!document.getElementById('hf-solicitud')"),false);
      assert.equal(llamadas.length,0);
      assert.equal(await evaluate('localStorage.length'),0);
    });
    await t.test('imagen ausente, teclado y movimiento reducido',async()=>{
      foto=false;await command('Network.setCacheDisabled',{cacheDisabled:true});await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await navegar('/');await esperar("!!document.getElementById('hf-hero-title')");
      assert.ok(await evaluate("getComputedStyle(document.querySelector('.hf-public-hero')).backgroundImage.includes('gradient')"));
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.hf-button')).transitionDuration"),'0s');
      await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      assert.equal(await evaluate("document.activeElement.getAttribute('href')"),'#contenido-publico');
      await captura('fallback-movil');foto=true;
    });
    await t.test('login y enlaces comerciales conservados, ruta privada sin datos',async()=>{
      await navegar('/reservas');await esperar("!!document.getElementById('login-email')");assert.equal(await evaluate("!!document.querySelector('.sidebar')"),false);
      await evaluate("document.querySelector('.login-volver-publico').click()");await esperar("!!document.getElementById('hf-hero-title')");
      await navegar('/cuenta/invitacion#token='+'A'.repeat(43));await esperar("document.body.innerText.includes('Este acceso aún no está disponible')");
      assert.equal(await evaluate('location.hash'),'');
      await evaluate("document.querySelector('.login-card button').click()");await esperar("!!document.getElementById('login-email')");assert.equal(await evaluate('location.pathname'),'/login');
      await fill('login-email',usuario.email);await fill('login-password','Solo un fixture ficticio 123');await evaluate("document.querySelector('.login-card').requestSubmit()");await esperar("!!document.querySelector('.sidebar')");
      assert.equal(llamadas.filter(x=>x.metodo==='POST').length,1);assert.equal(llamadas.find(x=>x.metodo==='POST').ruta,'/api/auth/login');
    });
    await t.test('sesión vigente entra al panel desde raíz, sin mostrar landing durante validación',async()=>{
      demoraSesion=350;await navegar('/');await esperar("!!document.querySelector('.sesion-preparando')");assert.equal(await evaluate("!!document.querySelector('.hf-landing,.sidebar')"),false);await esperar("!!document.querySelector('.sidebar')");assert.equal(await evaluate("!!document.querySelector('.hf-landing')"),false);
    });
    assert.deepEqual(externos,[]);assert.deepEqual(errores,[]);
    fs.writeFileSync(path.join(capturas,'resultado.json'),JSON.stringify({navegador:ejecutable,anchos:[1440,768,390,320],api:'interceptada',azure:false,externos,errores,pruebas:9},null,2));
  }finally{
    if(b)fs.writeFileSync(path.join(capturas,'diagnostico.json'),JSON.stringify({errores,externos,llamadas},null,2));
    await b?.cerrar();await vite?.close();cache.limpiar();
  }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {abrirNavegador} from '../helpers/navegadorComercial.js';
const frontend=fileURLToPath(new URL('../..',import.meta.url));
const ejecutable=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
test('build Pages: rutas directas, API separada apagada, sesión conservada y enlaces sin filtración',{skip:!fs.existsSync(ejecutable),timeout:90000},async t=>{
  const dist=path.join(frontend,'dist');assert.ok(fs.existsSync(path.join(dist,'index.html')),'Construir primero con --mode cloudflare.');
  const b=await abrirNavegador(ejecutable),peticiones=[],bloqueadas=[],fallos=[],canceladas=new Set();
  let sesionFicticiaHabilitada=false;
  const sesionFicticia={token:'JWT-SOLO-FICTICIO-LOGIN',expiraEn:Math.floor(Date.now()/1000)+3600,usuario:{idUsuario:707,nombre:'Operador ficticio',email:'ficticio@example.invalid',rol:'Operador',permisos:[],debeCambiarPassword:false,gestionCuentasDisponible:false,origenAutenticacion:'mock'}};
  const {command,evaluate,esperar}=b;
  const origen='https://hostflow.com.ar',api='https://api.hostflow.com.ar';
  const capturas=path.join(frontend,'../revision/login-real-preparacion-2026-11-04/CAPTURAS');fs.mkdirSync(capturas,{recursive:true});
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
  async function responder(p,status,contenido,headers={}){
    await command('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:status,responseHeaders:Object.entries(headers).map(([name,value])=>({name,value})),body:Buffer.from(contenido).toString('base64')});
  }
  b.on('Network.loadingFailed',p=>{if(p.canceled||p.errorText==='net::ERR_ABORTED')canceladas.add(p.requestId);});
  b.on('Fetch.requestPaused',p=>{(async()=>{
    const u=new URL(p.request.url);
    if(u.origin===origen){
      const relativo=decodeURIComponent(u.pathname).replace(/^\/+/,''),destino=path.resolve(dist,relativo);
      if(!destino.startsWith(path.resolve(dist)+path.sep)&&destino!==path.resolve(dist))return responder(p,404,'');
      let archivo=destino;if(!fs.existsSync(archivo)||!fs.statSync(archivo).isFile())archivo=path.extname(u.pathname)?null:path.join(dist,'index.html');
      return responder(p,archivo?200:404,archivo?fs.readFileSync(archivo):'',{'Content-Type':archivo?(mime[path.extname(archivo)]||'application/octet-stream'):'text/plain','Referrer-Policy':'no-referrer','Cache-Control':'no-store'});
    }
    if(u.origin===api){
      peticiones.push({ruta:u.pathname,metodo:p.request.method,query:u.search});
      const h={'Content-Type':'application/json','Access-Control-Allow-Origin':origen,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type','Cache-Control':'no-store'};
      if(p.request.method==='OPTIONS')return responder(p,204,'',h);
      if(sesionFicticiaHabilitada&&['/api/auth/login','/api/auth/me'].includes(u.pathname))return responder(p,200,JSON.stringify(sesionFicticia),h);
      if(u.pathname.endsWith('/capacidades'))return responder(p,200,JSON.stringify({version:1,recuperacion:true,invitaciones:true}),h);
      if(u.pathname.endsWith('/validar'))return responder(p,400,JSON.stringify({codigo:'ENLACE_INVALIDO'}),h);
      return responder(p,503,JSON.stringify({codigo:'SERVICIO_NO_DISPONIBLE'}),h);
    }
    bloqueadas.push(u.origin);await command('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});
  })().catch(()=>fallos.push({id:p.networkId,ruta:new URL(p.request.url).pathname}));});
  try{
    await command('Network.enable');await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});await command('Page.enable');await command('Runtime.enable');
    await command('Emulation.setDeviceMetricsOverride',{width:1440,height:950,deviceScaleFactor:1,mobile:false});
    const navegar=ruta=>command('Page.navigate',{url:origen+ruta});
    const llenar=(id,v)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await navegar('/login');await esperar("!!document.getElementById('login-email')");
    await llenar('login-email','ficticio@example.invalid');await llenar('login-password','SOLO FICTICIO 2026');
    await evaluate("document.querySelector('.login-card button[type=submit]').click()");await esperar("document.body.innerText.includes('puede estar apagado') || document.body.innerText.includes('Puede estar apagado')");
    assert.equal(peticiones.filter(p=>p.ruta==='/api/auth/login'&&p.metodo==='POST').length,1);
    assert.ok(await evaluate("!document.querySelector('.login-card button[type=submit]').disabled"));
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    fs.writeFileSync(path.join(capturas,'login-backend-apagado.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    await evaluate("localStorage.setItem('token','JWT-SOLO-FICTICIO')");await navegar('/login');await esperar("document.body?.innerText?.includes('No se eliminó tu sesión guardada')");
    assert.equal(await evaluate("localStorage.getItem('token')"),'JWT-SOLO-FICTICIO');
    const antes=peticiones.filter(p=>p.ruta==='/api/auth/me'&&p.metodo==='GET').length;
    await evaluate("Array.from(document.querySelectorAll('button')).find(e=>e.innerText==='Reintentar').click()");
    for(let n=0;n<100&&peticiones.filter(p=>p.ruta==='/api/auth/me'&&p.metodo==='GET').length===antes;n++)await new Promise(r=>setTimeout(r,20));
    // Esperar la respuesta, no una demora artificial del producto.
    await esperar("document.body.innerText.includes('No se eliminó tu sesión guardada')");
    assert.equal(peticiones.filter(p=>p.ruta==='/api/auth/me'&&p.metodo==='GET').length,antes+1);
    await t.test('landing y demo siguen accesibles con sesión guardada y API apagada',async()=>{
      await navegar('/');await esperar("!!document.querySelector('.hf-landing')");
      assert.equal(await evaluate("localStorage.getItem('token')"),'JWT-SOLO-FICTICIO');
      assert.equal(await evaluate("!!document.querySelector('.sidebar')"),false);
      const consultas=peticiones.filter(p=>p.ruta==='/api/auth/me'&&p.metodo==='GET').length;
      await new Promise(r=>setTimeout(r,200));
      assert.equal(peticiones.filter(p=>p.ruta==='/api/auth/me'&&p.metodo==='GET').length,consultas);
      fs.writeFileSync(path.join(capturas,'landing-api-apagada-sesion-conservada.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png'})).data,'base64'));
      await navegar('/demo');await esperar("!!document.querySelector('.demo-app')");
      assert.equal(await evaluate("localStorage.getItem('token')"),'JWT-SOLO-FICTICIO');
      assert.equal(peticiones.filter(p=>p.ruta==='/api/auth/me'&&p.metodo==='GET').length,consultas);
    });
    await evaluate('localStorage.clear()');
    await command('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
    await navegar('/cuenta/solicitar');await esperar("!!document.getElementById('ac-email')");
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    fs.writeFileSync(path.join(capturas,'recuperacion-movil.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    for(const tipo of ['invitacion','recuperacion']){
       await navegar('/cuenta/'+tipo+'#token='+'a'.repeat(43));await esperar("document.body?.innerText?.includes('Este enlace ya no está disponible')");assert.equal(await evaluate('location.hash'),'');
    }
    await navegar('/demo');await esperar("document.body?.innerText?.includes('Demo') || document.body?.innerText?.includes('demostración')");
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    await navegar('/');await esperar("!!document.querySelector('main')");
    sesionFicticiaHabilitada=true;await navegar('/login');await esperar("!!document.getElementById('login-email')");
    await llenar('login-email','ficticio@example.invalid');await llenar('login-password','SOLO FICTICIO 2026');
    await evaluate("document.querySelector('.login-card button[type=submit]').click()");
    await esperar("document.body?.innerText?.includes('Cerrar sesión')");
    assert.equal(await evaluate("localStorage.getItem('token')"),sesionFicticia.token);
    assert.equal(peticiones.filter(p=>p.ruta==='/api/auth/login'&&p.metodo==='POST').length,2);
    assert.ok(peticiones.every(p=>!p.query.includes('token')));assert.deepEqual(bloqueadas,[]);assert.deepEqual(fallos.filter(f=>!canceladas.has(f.id)).map(f=>f.ruta),[]);
  }finally{await b.cerrar();}
});

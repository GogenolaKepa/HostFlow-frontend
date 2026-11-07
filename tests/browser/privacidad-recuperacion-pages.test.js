import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {abrirNavegador} from '../helpers/navegadorComercial.js';

const frontend=fileURLToPath(new URL('../..',import.meta.url));
const ejecutable=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe';

test('build sensible bloquea analítica inyectada, retira token y conserva recuperación/login', {skip:!fs.existsSync(ejecutable),timeout:60000}, async()=>{
  const dist=path.join(frontend,'dist');
  const reglas=fs.readFileSync(path.join(dist,'_headers'),'utf8');
  const politica=reglas.split('/cuenta/*')[1].split(/\n(?=\S)/)[0].match(/Content-Security-Policy:\s*(.+)/)[1];
  const navegador=await abrirNavegador(ejecutable);
  const {command,evaluate}=navegador;
  const solicitudes=[],terceros=[],excepciones=[],bloqueos=[];
  const origen='https://hostflow.com.ar',api='https://api.hostflow.com.ar';
  const token='A'.repeat(43);
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json'};
  const esperar=async expresion=>{
    for(let i=0;i<100;i++){
      try{if(await evaluate(expresion))return;}catch{/* Documento navegando. */}
      await new Promise(resolve=>setTimeout(resolve,60));
    }
    throw Error('Estado esperado no alcanzado.');
  };
  async function responder(p,status,contenido,cabeceras){
    await command('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:status,responseHeaders:Object.entries(cabeceras).map(([name,value])=>({name,value})),body:Buffer.from(contenido).toString('base64')});
  }
  navegador.on('Fetch.requestPaused',p=>{(async()=>{
    const u=new URL(p.request.url);
    solicitudes.push({ruta:u.pathname,query:u.search,body:p.request.postData,metodo:p.request.method,referrer:p.request.headers.Referer,tipo:p.resourceType});
    if(u.origin===origen){
      const destino=path.resolve(dist,'.'+decodeURIComponent(u.pathname));
      assert.ok(destino===path.resolve(dist)||destino.startsWith(path.resolve(dist)+path.sep));
      const archivo=fs.existsSync(destino)&&fs.statSync(destino).isFile()?destino:path.extname(u.pathname)?null:path.join(dist,'index.html');
      if(!archivo)return responder(p,404,'',{'Content-Type':'text/plain'});
      const sensible=u.pathname.startsWith('/cuenta/');
      let contenido=fs.readFileSync(archivo);
      if(path.extname(archivo)==='.html'){
        // Reproducir la inserción detectada en el HTML público. Este proveedor es ficticio.
        contenido=contenido.toString().replace('</body>','<script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script></body>');
      }
      return responder(p,200,contenido,{'Content-Type':mime[path.extname(archivo)]||'application/octet-stream','Referrer-Policy':'no-referrer','Cache-Control':'no-store',...(sensible?{'Content-Security-Policy':politica}:{})});
    }
    if(u.origin===api){
      const cabeceras={'Content-Type':'application/json','Access-Control-Allow-Origin':origen,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type'};
      if(p.request.method==='OPTIONS')return responder(p,204,'',cabeceras);
      if(u.pathname.endsWith('/capacidades'))return responder(p,200,JSON.stringify({version:1,recuperacion:true,invitaciones:true}),cabeceras);
      if(u.pathname.endsWith('/validar')||u.pathname.endsWith('/confirmar'))return responder(p,204,'',cabeceras);
      if(['/api/auth/login','/api/auth/me'].includes(u.pathname))return responder(p,200,JSON.stringify({token:'JWT-SOLO-FICTICIO',expiraEn:Math.floor(Date.now()/1000)+3600,usuario:{idUsuario:707,nombre:'Operador ficticio',email:'operador@example.invalid',rol:'Operador',permisos:['dashboard.ver'],debeCambiarPassword:false,origenAutenticacion:'sql',gestionCuentasDisponible:true,versionRegistro:'0000000000000001'}}),cabeceras);
      if(u.pathname==='/api/dashboard/resumen')return responder(p,200,JSON.stringify({resumen:{propiedadesActivas:0,reservasActivas:0,huespedesRegistrados:0,ocupacionMensual:0,alertasPendientes:0},proximasReservas:[],alertas:[]}),cabeceras);
      return responder(p,200,JSON.stringify({}),cabeceras);
    }
    terceros.push(u.origin);
    return responder(p,200,'window.__analiticaLeyoFragmento=location.hash;',{'Content-Type':'text/javascript'});
  })().catch(()=>excepciones.push('Respuesta del entorno simulado no acreditada.'));});
  try{
    navegador.on('Runtime.exceptionThrown',()=>excepciones.push('Excepción de la aplicación.'));
    navegador.on('Network.loadingFailed',p=>{if(p.blockedReason==='csp')bloqueos.push('csp');});
    await command('Runtime.enable');await command('Network.enable');
    await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
    await command('Page.navigate',{url:origen+'/cuenta/recuperacion#token='+token});
    await esperar("!!document.getElementById('ac-password')");
    assert.equal(await evaluate('location.hash'),'');
    assert.equal(await evaluate('window.__analiticaLeyoFragmento'),undefined);
    assert.ok(bloqueos.length>0,'La CSP bloqueó el script externo.');
    assert.deepEqual(terceros,[]);
    assert.ok(solicitudes.every(s=>!s.query.includes('token')&&!s.referrer?.includes(token)));
    assert.ok(await evaluate(`![...Object.values(localStorage),...Object.values(sessionStorage)].some(v=>v.includes(${JSON.stringify(token)}))`));
    const llenar=(id,valor)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await llenar('ac-password','Frase exclusivamente ficticia 2026');await llenar('ac-confirmacion','Frase exclusivamente ficticia 2026');
    await evaluate("document.querySelector('.ac-experiencia form').requestSubmit()");
    await esperar("document.querySelector('.ac-resultado h2')?.textContent==='Tu contraseña fue actualizada'");
    assert.equal(solicitudes.filter(s=>s.ruta.endsWith('/confirmar')&&s.metodo==='POST').length,1);
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Volver al inicio de sesión').click()");
    await esperar("!!document.getElementById('login-email')");
    await llenar('login-email','operador@example.invalid');await llenar('login-password','Frase exclusivamente ficticia 2026');
    await evaluate("document.querySelector('.login-card').requestSubmit()");
    await esperar("!!document.querySelector('.sidebar')");
    assert.deepEqual(terceros,[]);assert.deepEqual(excepciones,[]);
    // Los demás enlaces sensibles siguen retirando tokens, sin scripts externos.
    for(const ruta of ['/cuenta/invitacion','/cuenta/contacto']){
      await command('Page.navigate',{url:origen+ruta+'#token='+token});
      await esperar("location.hash==='' && !!document.querySelector('.ac-experiencia')");
      assert.equal(await evaluate('window.__analiticaLeyoFragmento'),undefined);
    }
    // Un documento ordinario puede tener analítica; entrar a cuentas debe pedir
    // un DOCUMENTO nuevo con CSP, no mantener ese script mediante history SPA.
    await evaluate('localStorage.clear();sessionStorage.clear()');
    await command('Page.navigate',{url:origen+'/login'});
    await esperar("!!document.getElementById('login-email') && window.__analiticaLeyoFragmento===''");
    const antes=solicitudes.filter(s=>s.tipo==='Document'&&s.ruta==='/cuenta/solicitar').length;
    const tercerosAntes=terceros.length;
    await evaluate("[...document.querySelectorAll('.login-ayuda button')].find(b=>b.textContent.includes('Olvidaste')).click()");
    await esperar("!!document.getElementById('ac-email')");
    assert.equal(solicitudes.filter(s=>s.tipo==='Document'&&s.ruta==='/cuenta/solicitar').length,antes+1);
    assert.equal(await evaluate('window.__analiticaLeyoFragmento'),undefined);
    assert.equal(terceros.length,tercerosAntes);
    await command('Page.reload');await esperar("!!document.getElementById('ac-email')");
    assert.equal(await evaluate('window.__analiticaLeyoFragmento'),undefined);
    assert.equal(terceros.length,tercerosAntes);
    assert.deepEqual(excepciones,[]);
  }finally{await navegador.cerrar();}
});

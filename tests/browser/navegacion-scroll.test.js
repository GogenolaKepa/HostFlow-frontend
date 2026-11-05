import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {abrirNavegador} from '../helpers/navegadorComercial.js';
const root=fileURLToPath(new URL('../..',import.meta.url));
const out=path.resolve(root,'../revision/navegacion-scroll-2026-11-05/evidencia');
const browser=process.env.HOSTFLOW_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const permisos=['dashboard.ver','dashboard.economia','propiedades.ver','reservas.ver','huespedes.ver','calendario.ver','limpiezas.ver','reportes.ver','alertas.ver','usuarios.ver','configuracion.ver','configuracion.modificar','flowia.ver','notificaciones.ver','notificaciones.preferencias'];
test('navegación y scroll: build Pages, API completamente simulada',{skip:!fs.existsSync(browser),timeout:120000},async t=>{
  const b=await abrirNavegador(browser),{command,evaluate}=b;
  const esperar=async expression=>{for(let i=0;i<100;i++){try{if(await evaluate(expression))return;}catch{/* Cambio de documento/contexto durante navegación. */}await new Promise(r=>setTimeout(r,60));}throw Error('No se alcanzó: '+expression);};
  const requests=[],exceptions=[],blocked=[];let modo='normal',demora=0,rolPermisos=permisos,obligatorio=false;
  fs.mkdirSync(out,{recursive:true});
  const origin='https://hostflow.test',api='https://api.hostflow.com.ar';
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
  const fake=()=>({token:'JWT-SOLO-FICTICIO',expiraEn:Math.floor(Date.now()/1000)+3600,usuario:{idUsuario:707,nombre:'Administración ficticia',email:'ficticio@example.invalid',rol:'Administrador',permisos:rolPermisos,debeCambiarPassword:obligatorio,gestionCuentasDisponible:true,origenAutenticacion:'sql',versionRegistro:'0000000000000001'}});
  const data=r=>{
    if(r==='/auth/me'||r==='/auth/login')return fake();
    if(r==='/dashboard/resumen')return {resumen:{propiedadesActivas:12,reservasActivas:7,huespedesRegistrados:8,ocupacionMensual:40,alertasPendientes:0},proximasReservas:[],alertas:[]};
    if(r==='/dashboard/historico')return {historico:[{mes:'2026-11',inicioMes:'2026-11-01',ocupacionMensual:40,nochesOcupadas:10,nochesDisponibles:25}]};
    if(r==='/monedas/estado')return {activado:false,escritura:false,persistencia:'pendiente',fuentes:[]};
    if(r==='/configuracion/empresa')return {empresa:{nombreComercial:'Empresa ficticia',razonSocial:'',correoContacto:'',telefono:'',pais:'',provincia:'',ciudad:'',direccion:'',informacionAdicional:'',versionRegistro:'0000000000000001'},estado:{persistencia:'sql',soloLectura:false}};
    if(r==='/propiedades')return {propiedades:[]};
    if(r==='/reservas')return {reservas:[]};
    if(r==='/huespedes')return {huespedes:[]};
    if(r==='/usuarios')return {usuarios:[],total:0};
    if(r==='/roles')return {roles:[]};
    if(r==='/notificaciones/avisos')return {avisos:[],paginacion:{total:0,totalSinFiltros:0,paginas:1,pagina:1,limite:20},origen:'alertas_persistidas',lecturaPersonal:false};
    if(r==='/limpiezas')return {limpiezas:[]};
    if(r==='/limpiezas/resumen')return {resumen:{total:0,pendientes:0,enProgreso:0,completadas:0,urgentes:0}};
    if(r==='/calendario')return {anio:2026,mes:11,diasMes:30,propiedades:[],resumen:{reservas:0}};
    if(r==='/alertas')return {alertas:[]};
    if(r==='/alertas/resumen')return {resumen:{total:0,nuevas:0,criticas:0,altas:0}};
    if(r==='/dashboard/reportes/opciones')return {opciones:{propiedades:[],canales:[],estados:[]}};
    if(r==='/dashboard/reportes')return {reportes:{periodo:{fechaDesde:'2026-11-01',fechaHasta:'2026-11-30',tipo:'mensual'},filtros:{},resumen:{totalReservasPeriodo:0,nochesOcupadas:0,nochesDisponibles:0,ocupacionPromedio:0},historico:[],porCanal:[],porEstado:[],porPropiedad:[]}};
    if(r.endsWith('/capacidades'))return {version:1,recuperacion:true,invitaciones:true};
    if(r.endsWith('/validar'))return {codigo:'ENLACE_INVALIDO'};
    return {};
  };
  async function respond(p,status,body,headers={}){await command('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:status,responseHeaders:Object.entries(headers).map(([name,value])=>({name,value})),body:Buffer.from(body).toString('base64')});}
  b.on('Runtime.exceptionThrown',p=>exceptions.push(p.exceptionDetails.text));
  b.on('Fetch.requestPaused',p=>{(async()=>{
    const u=new URL(p.request.url);
    if(u.origin===origin){
      const dist=path.resolve(root,'dist'),target=path.resolve(dist,decodeURIComponent(u.pathname).replace(/^\/+/,''));
      if(target!==dist&&!target.startsWith(dist+path.sep))return respond(p,404,'');
      const file=fs.existsSync(target)&&fs.statSync(target).isFile()?target:path.extname(u.pathname)?null:path.join(dist,'index.html');
      return respond(p,file?200:404,file?fs.readFileSync(file):'',{'Content-Type':file?(mime[path.extname(file)]||'text/plain'):'text/plain','Cache-Control':'no-store'});
    }
    if(u.origin===api){
      const r=u.pathname.replace(/^\/api/,'');requests.push({ruta:r,method:p.request.method,query:u.search});
      const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type','Cache-Control':'no-store'};
      if(p.request.method==='OPTIONS')return respond(p,204,'',headers);
      if(r==='/auth/me'&&demora)await new Promise(resolve=>setTimeout(resolve,demora));
      const status=r==='/auth/me'?(modo==='apagado'?503:modo==='expirado'?401:200):r.endsWith('/validar')?400:200;
      return respond(p,status,JSON.stringify(data(r)),headers);
    }
    blocked.push(u.origin);return command('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});
  })().catch(e=>exceptions.push(e.message));});
  const documentoNuevo=async accion=>{await evaluate('window.__documentoAnterior=true');await accion();await esperar("!window.__documentoAnterior && document.readyState==='complete'");};
  const navegar=r=>documentoNuevo(()=>command('Page.navigate',{url:origin+r}));
  const recargar=()=>documentoNuevo(()=>command('Page.reload'));
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const captura=async name=>fs.writeFileSync(path.join(out,name+'.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png'})).data,'base64'));
  try{
    await command('Network.enable');await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});await command('Page.enable');await command('Runtime.enable');
    await command('Emulation.setDeviceMetricsOverride',{width:1440,height:800,deviceScaleFactor:1,mobile:false});
    await navegar('/login');await esperar("!!document.querySelector('#login-email')");
    await evaluate("localStorage.setItem('token','JWT-SOLO-FICTICIO')");await navegar('/login');await esperar("!!document.querySelector('.dashboard-greeting') || !!document.querySelector('.dashboard-metric-card')");
    const diagnostico=await evaluate(`(()=>{const m=document.querySelector('.main'),d=document.querySelector('.dashboard');return {url:location.pathname,title:document.title,main:{height:m.clientHeight,scrollHeight:m.scrollHeight,overflow:getComputedStyle(m).overflow,minHeight:getComputedStyle(m).minHeight,style:m.getAttribute('style')},dashboard:{height:d.clientHeight,scrollHeight:d.scrollHeight,display:getComputedStyle(d).display,rows:getComputedStyle(d).gridTemplateRows},modales:[...document.querySelectorAll('dialog,[aria-modal="true"],.mobile-nav-drawer')].map(e=>({tag:e.tagName,clase:e.className,open:e.open,display:getComputedStyle(e).display,rect:e.getBoundingClientRect().height}))}})()`);
    fs.writeFileSync(path.join(out,process.env.HF_BASELINE?'antes.json':'despues.json'),JSON.stringify(diagnostico,null,2));
    await captura(process.env.HF_BASELINE?'antes-escritorio':'despues-escritorio');
    if(process.env.HF_BASELINE){console.log(JSON.stringify(diagnostico));return;}
    const inicio="!!document.querySelector('.dashboard-metric-card')";
    const ruta=async p=>esperar(`location.pathname===${JSON.stringify(p)}`);
    const nav=async (label,p)=>{await evaluate(`[...document.querySelectorAll('.sidebar button')].find(e=>e.textContent.trim()===${JSON.stringify(label)}).click()`);await ruta(p);};
    const scroll=()=>evaluate("document.querySelector('.main').scrollTop");
    const reiniciarScroll=()=>evaluate("document.querySelector('.main').scrollTo({top:0,behavior:'instant'})");
    const rueda=async()=>{const rect=await evaluate("(()=>{const r=document.querySelector('.main').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");await command('Input.dispatchMouseEvent',{type:'mouseWheel',...rect,deltaX:0,deltaY:450});};
    const tecla=async(key,code)=>{await command('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code});await command('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code});};
    await t.test('login restaurado termina en Inicio y actualiza título; main queda dentro de la cuadrícula',async()=>{
      await ruta('/inicio');assert.equal(await evaluate('document.title'),'Inicio | HostFlow');
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.dashboard')).display"),'grid');
      assert.ok(await evaluate("document.querySelector('.main').clientHeight<=innerHeight && document.querySelector('.main').scrollHeight>document.querySelector('.main').clientHeight"));
    });
    await t.test('rueda del mouse y Av Pág desplazan realmente el contenido',async()=>{
      await rueda();await esperar("document.querySelector('.main').scrollTop>0");assert.ok(await scroll()>0);
      await reiniciarScroll();await evaluate("document.querySelector('.main').focus()");await tecla('PageDown',34);await esperar("document.querySelector('.main').scrollTop>0");await captura('scroll-teclado-escritorio');
    });
    await t.test('dialog cerrado no bloquea scroll; modal abierto lo bloquea y al cerrar se recupera',async()=>{
      await reiniciarScroll();await evaluate("(()=>{const d=document.createElement('dialog');d.id='dialog-ficticio';d.setAttribute('aria-modal','true');d.textContent='Modal ficticio';document.body.append(d)})()");
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.main')).overflowY"),'auto');
      await rueda();await esperar("document.querySelector('.main').scrollTop>0");
      await evaluate("document.querySelector('#dialog-ficticio').showModal()");assert.equal(await evaluate("getComputedStyle(document.querySelector('.main')).overflowY"),'hidden');
      const pos=await scroll();await rueda();await new Promise(r=>setTimeout(r,100));assert.equal(await scroll(),pos);
      await evaluate("document.querySelector('#dialog-ficticio').close();document.querySelector('#dialog-ficticio').remove()");await reiniciarScroll();await rueda();await esperar("document.querySelector('.main').scrollTop>0");
    });
    await t.test('navegación entre secciones actualiza dirección y título sin recargar el documento',async()=>{
      await evaluate("window.marcaNavegacionFicticia='misma-app'");
      for(const [label,p,title] of [['Propiedades','/propiedades','Propiedades'],['Reservas','/reservas','Reservas'],['Huéspedes','/huespedes','Huéspedes'],['Calendario','/calendario','Calendario'],['Limpiezas','/limpiezas','Limpiezas'],['Reportes','/reportes','Reportes'],['Alertas','/alertas','Alertas']]){
        await nav(label,p);await esperar(`document.title===${JSON.stringify(title+' | HostFlow')}`);assert.equal(await evaluate('window.marcaNavegacionFicticia'),'misma-app');
      }
    });
    await t.test('Atrás, Adelante y F5 conservan sección, título y validación de sesión',async()=>{
      await evaluate('history.back()');await ruta('/reportes');assert.equal(await evaluate('document.title'),'Reportes | HostFlow');
      await evaluate('history.forward()');await ruta('/alertas');
      demora=500;const n=requests.length;await recargar();await esperar("!!document.querySelector('.sesion-preparando')");
      assert.equal(await evaluate("!!document.querySelector('.sidebar')"),false);
      await esperar("!!document.querySelector('.sidebar') && document.title==='Alertas | HostFlow'");await ruta('/alertas');demora=0;
      assert.equal(requests.slice(n).filter(r=>r.ruta==='/auth/me'&&r.method==='GET').length,1);
    });
    await t.test('Configuración conserva su apartado en URL, recarga e historial',async()=>{
      await nav('Configuración','/configuracion');await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent.includes('Monedas')).click()");await ruta('/configuracion/monedas');
      await recargar();await esperar("document.querySelector('.settings-nav .is-active')?.textContent.includes('Monedas') && document.title==='Monedas y cotizaciones | HostFlow'");
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent.includes('Preferencias generales')).click()");await ruta('/configuracion/generales');
      await evaluate('history.back()');await ruta('/configuracion/monedas');await esperar("document.querySelector('.settings-nav .is-active')?.textContent.includes('Monedas')");
    });
    await t.test('Atrás protege borradores: cancelar conserva formulario/URL; confirmar cambia ambos',async()=>{
      await nav('Inicio','/inicio');await nav('Configuración','/configuracion');
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent.includes('Datos de empresa')).click()");await ruta('/configuracion/empresa');
      await esperar("!!document.querySelector('input[name=nombreComercial]:not(:disabled)')");
      await evaluate("(()=>{const el=document.querySelector('input[name=nombreComercial]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'Cambio solo ficticio');el.dispatchEvent(new Event('input',{bubbles:true}))})()");
      await evaluate('history.back()');await esperar("!!document.querySelector('dialog[open]')");await ruta('/configuracion/empresa');
      await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Seguir editando').click()");await esperar("!document.querySelector('dialog[open]')");
      assert.equal(await evaluate("document.querySelector('input[name=nombreComercial]').value"),'Cambio solo ficticio');await ruta('/configuracion/empresa');
      await evaluate('history.back()');await esperar("!!document.querySelector('dialog[open]')");await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Descartar y continuar').click()");await ruta('/configuracion');await esperar("document.querySelector('.settings-nav .is-active')?.textContent.includes('Apariencia')");
      assert.ok(requests.every(r=>['GET','OPTIONS'].includes(r.method)),'No se envió ninguna escritura ni siquiera al mock.');
    });
    await t.test('tablet y móvil: altura contenida, rueda/teclado, menú y recarga en Reservas',async()=>{
      for(const width of [1024,390]){
        await command('Emulation.setDeviceMetricsOverride',{width,height:700,deviceScaleFactor:1,mobile:width<700});await navegar('/inicio');await esperar(inicio);
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.dashboard')).display"),'grid');
        assert.ok(await evaluate("document.querySelector('.main').getBoundingClientRect().bottom<=innerHeight+1"));
        assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
        await rueda();await esperar("document.querySelector('.main').scrollTop>0");await reiniciarScroll();await evaluate("document.querySelector('.main').focus()");await tecla('PageDown',34);await esperar("document.querySelector('.main').scrollTop>0");await captura('scroll-'+width);
        if(width<700){await click('.mobile-menu-toggle');await esperar("!!document.querySelector('.mobile-nav-drawer')");assert.equal(await evaluate("getComputedStyle(document.querySelector('.main')).overflowY"),'hidden');await evaluate("[...document.querySelectorAll('.mobile-nav-drawer button')].find(b=>b.textContent.trim()==='Reservas').click()");await ruta('/reservas');assert.equal(await evaluate("!!document.querySelector('.mobile-nav-drawer')"),false);}
        else await nav('Reservas','/reservas');
        await recargar();await esperar("document.title==='Reservas | HostFlow' && !!document.querySelector('.sidebar')");await ruta('/reservas');await captura('reservas-'+width);
      }
      await command('Emulation.setDeviceMetricsOverride',{width:1440,height:800,deviceScaleFactor:1,mobile:false});
    });
    await t.test('tema oscuro, sidebar contraída y acceso a Mi cuenta conservan navegación y scroll',async()=>{
      await evaluate("localStorage.setItem('hostflow.apariencia.v1','oscuro')");await navegar('/inicio');await esperar(inicio);
      await click('.sidebar-collapse-toggle');await esperar("!!document.querySelector('.dashboard--sidebar-collapsed')");
      await esperar("Math.abs(document.querySelector('.sidebar').getBoundingClientRect().width-78)<1");
      assert.equal(await evaluate("document.querySelector('.main').getBoundingClientRect().left"),78,'El contenido no debe sumar otro margen a la sidebar contraída.');
      await rueda();await esperar("document.querySelector('.main').scrollTop>0");await captura('dashboard-oscuro-contraido');
      await click('.sidebar-collapse-toggle');await esperar("!document.querySelector('.dashboard--sidebar-collapsed') && Math.abs(document.querySelector('.sidebar').getBoundingClientRect().width-240)<1");await captura('dashboard-oscuro-expandido');
      for(const [label,p] of [['Notificaciones','/notificaciones'],['Usuarios','/usuarios']]){await nav(label,p);await esperar(`document.title===${JSON.stringify(label+' | HostFlow')}`);}
      await click('.sidebar-user');await ruta('/mi-cuenta');await esperar("document.title==='Mi cuenta | HostFlow'");await recargar();await esperar("document.title==='Mi cuenta | HostFlow' && !!document.querySelector('.main')");
      await command('Emulation.setDeviceMetricsOverride',{width:390,height:700,deviceScaleFactor:1,mobile:true});await navegar('/inicio');await esperar(inicio);await rueda();await esperar("document.querySelector('.main').scrollTop>0");await captura('dashboard-oscuro-movil');
      await command('Emulation.setDeviceMetricsOverride',{width:1440,height:800,deviceScaleFactor:1,mobile:false});
    });
    await t.test('enlace privado sin sesión pide login y no solicita datos privados',async()=>{
      await evaluate('localStorage.removeItem("token")');const n=requests.length;await navegar('/reservas');await esperar("!!document.querySelector('#login-email')");
      assert.equal(await evaluate("!!document.querySelector('.sidebar')"),false);assert.equal(await evaluate('document.title'),'Acceso a tu cuenta | HostFlow');
      assert.equal(requests.slice(n).some(r=>r.ruta.startsWith('/reservas')),false);
    });
    await t.test('permisos: acceso directo a Usuarios/Notificaciones no monta pantallas no autorizadas',async()=>{
      rolPermisos=[];await evaluate("localStorage.setItem('token','JWT-SOLO-FICTICIO')");
      for(const p of ['/usuarios','/notificaciones']){const n=requests.length;await navegar(p);await esperar("!!document.querySelector('.sidebar') && document.title==='Inicio | HostFlow'");await ruta('/inicio');assert.equal(requests.slice(n).some(r=>r.ruta.startsWith(p)),false);}
      await navegar('/configuracion/monedas');await esperar("!!document.querySelector('.settings-nav')");await ruta('/configuracion');assert.equal(await evaluate("document.querySelector('.settings-nav .is-active').textContent.trim()"),'Apariencia');rolPermisos=permisos;
    });
    await t.test('cambio obligatorio de contraseña conserva la protección y usa Mi cuenta',async()=>{
      obligatorio=true;await navegar('/reservas');await esperar("document.title==='Mi cuenta | HostFlow'");await ruta('/mi-cuenta');assert.equal(await evaluate("!!document.querySelector('.sidebar')"),false);obligatorio=false;
    });
    await t.test('API apagada bloquea sección privada, conserva JWT y reintenta en su destino',async()=>{
      modo='apagado';await navegar('/reservas');await esperar("document.body.innerText.includes('No se eliminó tu sesión guardada')");
      assert.equal(await evaluate("!!document.querySelector('.main')"),false);assert.equal(await evaluate("localStorage.getItem('token')"),'JWT-SOLO-FICTICIO');assert.equal(await evaluate('document.title'),'Servicio no disponible | HostFlow');
      modo='normal';await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Reintentar').click()");await esperar("document.title==='Reservas | HostFlow' && !!document.querySelector('.main')");await ruta('/reservas');
      modo='expirado';await recargar();await esperar("!!document.querySelector('#login-email')");assert.equal(await evaluate("localStorage.getItem('token')"),null);assert.equal(await evaluate("!!document.querySelector('.sidebar')"),false);modo='normal';
    });
    await t.test('landing, demo, recuperación e invitación siguen accesibles con API apagada',async()=>{
      modo='apagado';await evaluate("localStorage.setItem('token','JWT-SOLO-FICTICIO')");await navegar('/');await esperar("!!document.querySelector('.hf-landing')");assert.equal(await evaluate('location.pathname'),'/');
      const n=requests.length;await navegar('/demo');await esperar("!!document.querySelector('.demo-app')");assert.equal(requests.slice(n).some(r=>r.ruta==='/auth/me'),false);
      await navegar('/cuenta/solicitar');await esperar("!!document.querySelector('#ac-email')");
      for(const tipo of ['invitacion','recuperacion']){await navegar('/cuenta/'+tipo+'#token='+'a'.repeat(43));await esperar("document.body.innerText.includes('Este enlace ya no está disponible')");assert.equal(await evaluate('location.hash'),'');assert.equal(await evaluate("!!document.querySelector('.sidebar')"),false);}
    });
    fs.writeFileSync(path.join(out,'resultado.json'),JSON.stringify({api:'completamente simulada',origen:origin,peticiones:requests,excepciones:exceptions,origenesBloqueados:blocked},null,2));
    assert.deepEqual(exceptions,[]);assert.deepEqual(blocked,[]);
  }finally{await b.cerrar();}
});

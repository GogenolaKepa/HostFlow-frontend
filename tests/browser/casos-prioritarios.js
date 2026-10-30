import assert from 'node:assert/strict';

// Solo se usa dentro del navegador aislado: todas las respuestas API están
// interceptadas antes de la primera navegación, nunca conecta con el backend.
export async function probarPrioridades({ t, evaluate, send, click, fill, esperar, login, inicioVisible, capturar, requests, modulosCliente, denegarDescargas, fixture, fase }) {
  const pantalla = label => evaluate(`[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);
  const seccion = label => evaluate(`[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent.includes(${JSON.stringify(label)})).click()`);
  const viewport = (width, height=740) => send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:width<701});
  const cerrar = () => click('.guest-dialog .security-close');
  const abrir = () => evaluate("(() => {const b=[...document.querySelectorAll('.huespedes-desktop-list button')].filter(b=>b.textContent.trim()==='Ver huésped').at(-1);b.focus({preventScroll:true});b.click();})()");
  const recargar = async () => {
    await evaluate('globalThis.__recargaFlowIA=false');await send('Page.reload');
    await esperar(`globalThis.__recargaFlowIA===undefined && (${inicioVisible})`);
  };
  const posicion = () => evaluate("(() => {const m=document.querySelector('.main'),r=m.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,scroll:m.scrollTop,leftScroll:m.scrollLeft};})()");
  const areas = () => evaluate("(() => {const d=document.querySelector('.flowia-panel'),p=d?.getBoundingClientRect(),movil=innerWidth<=700,b=d&&getComputedStyle(d,'::backdrop');return {sinBarra:!document.querySelector('.assistant-rail, .flowia-fab'),modal:!d||d.matches(':modal'),viewport:!p||(p.top===0&&p.bottom<=innerHeight+1&&p.right===innerWidth),ancho:!p||(movil?p.width===innerWidth:p.width>=420&&p.width<=480),blur:!b||b.backdropFilter==='blur(5px)',documento:document.documentElement.scrollWidth<=innerWidth+1};})()");
  const abrirFlowIA = async (teclado=false) => {
    const movil = await evaluate('innerWidth<701');
    if(movil) await click('.mobile-menu-toggle');
    await evaluate(`(() => {const b=document.querySelector('${movil?'.mobile-flowia':'.sidebar-flowia'}');b.focus({preventScroll:true});${teclado?'':'b.click();'}})()`);
    if(teclado){
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    }
    await esperar("Boolean(document.querySelector('dialog.flowia-panel[open]'))");
    await evaluate("Promise.all(document.querySelector('.flowia-panel').getAnimations().map(a=>a.finished.catch(()=>{})))");
  };
  const cerrarFlowIA = async () => {await click('.flowia-close');await esperar("!document.querySelector('.flowia-panel')");};
  const escape = async () => {
    await send('Input.dispatchKeyEvent', {type:'rawKeyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
    await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
  };

  await t.test('Huéspedes: modal inmediato, foco, scroll e importes según permiso',async()=>{
    fase('modal de huéspedes');fixture({rol:'Administrador',datosVisuales:true,listaLarga:true,demoraDetalle:500});
    await viewport(1280,800);await login();await esperar(inicioVisible);await pantalla('Huéspedes');
    await esperar("document.querySelectorAll('.huespedes-desktop-list tbody tr').length===24");
    await evaluate("document.querySelector('.main').focus()");
    await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'PageDown',code:'PageDown',windowsVirtualKeyCode:34,nativeVirtualKeyCode:34});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'PageDown',code:'PageDown',windowsVirtualKeyCode:34,nativeVirtualKeyCode:34});
    await esperar("document.querySelector('.main').scrollTop>0");
    await evaluate("document.querySelector('.main').scrollTo({top:document.querySelector('.main').scrollHeight,behavior:'instant'})");
    const posicion=await evaluate("document.querySelector('.main').scrollTop");assert.ok(posicion>0);
    const previas=requests.length;await abrir();
    await esperar("document.querySelector('dialog[open]')?.textContent.includes('Cargando ficha')");
    assert.equal(await evaluate("document.body.style.overflow"),'hidden');
    await esperar("document.querySelectorAll('.guest-reservation').length===12");
    assert.equal(await evaluate("document.querySelector('.guest-dialog').contains(document.activeElement)"),true);
    assert.equal(await evaluate("document.querySelector('.guest-dialog').textContent.includes('Documento ficticio')"),true);
    assert.equal(await evaluate("document.querySelector('.guest-dialog').textContent.includes('Importe estimado')"),true);
    assert.equal(await evaluate("document.querySelector('.guest-dialog').textContent.includes('moneda no declarada')"),true,'El historial sin moneda acreditada no se presenta como ARS.');
    await esperar("!document.querySelector('.assistant-rail, .flowia-panel')");
    assert.ok(requests.slice(previas).every(r=>['GET','OPTIONS'].includes(r.method)&&/^\/huespedes\/\d+$/.test(r.ruta)));
    await capturar('huesped-modal-cargado');
    await escape();await esperar("!document.querySelector('dialog[open]')");
    assert.equal(await evaluate("document.activeElement.textContent.trim()"),'Ver huésped');
    assert.equal(await evaluate("document.querySelector('.main').scrollTop"),posicion);
    assert.equal(await evaluate("document.querySelectorAll('.huespedes-desktop-list tbody tr').length"),24);
    fixture({demoraDetalle:0});await abrir();await esperar("document.querySelectorAll('.guest-reservation').length===12");
    await capturar('huesped-modal-claro');await click('.guest-reservation button');
    await esperar("Boolean(document.querySelector('.reservations-page')) || Boolean([...document.querySelectorAll('.main h2')].find(h=>h.textContent.includes('reservas')))");
    assert.equal(await evaluate("sessionStorage.getItem('hostflowReservaObjetivo')"),'1');
    fixture({rol:'Operador'});await recargar();await pantalla('Huéspedes');await esperar("document.querySelectorAll('.huespedes-desktop-list tbody tr').length===24");
    await abrir();await esperar("document.querySelectorAll('.guest-reservation').length===12");
    assert.equal(await evaluate("document.querySelector('.guest-dialog').textContent.includes('Importe estimado')"),false,'No muestra economía incluso si el doble API la incluye.');await cerrar();
  });

  await t.test('Huéspedes: error/reintento, inexistente, historial vacío, cancelación y edición',async()=>{
    fase('estados del modal');
    fixture({modoDetalle:'error'});await abrir();await esperar("document.querySelector('.guest-dialog [role=alert]')?.textContent.includes('No pudimos')");
    fixture({modoDetalle:'normal'});await click('.guest-dialog [role=alert] button');await esperar("document.querySelectorAll('.guest-reservation').length===12");await cerrar();
    fixture({modoDetalle:'inexistente'});await abrir();await esperar("document.querySelector('.guest-dialog')?.textContent.includes('ya no existe')");await cerrar();
    fixture({modoDetalle:'vacio'});await abrir();await esperar("document.querySelector('.guest-dialog')?.textContent.includes('todavía no posee reservas')");await cerrar();
    fixture({demoraDetalle:600});await abrir();await esperar("document.querySelector('.guest-dialog')?.textContent.includes('Cargando ficha')");await cerrar();
    await new Promise(r=>setTimeout(r,700));assert.equal(await evaluate("Boolean(document.querySelector('.guest-dialog'))"),false);
    fixture({demoraDetalle:0});await evaluate("[...document.querySelectorAll('.huespedes-desktop-list button')].find(b=>b.textContent.trim()==='Editar').click()");
    await fill('input[name=nombre]','Borrador conservado');await abrir();await esperar("document.querySelector('.guest-dialog')?.textContent.includes('todavía no posee reservas')");await cerrar();
    assert.equal(await evaluate("document.querySelector('input[name=nombre]').value"),'Borrador conservado');
    await evaluate("[...document.querySelectorAll('.form-actions button')].find(b=>b.textContent.trim()==='Cancelar').click()");await esperar("Boolean(document.querySelector('dialog[open]'))");await evaluate("[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.includes('Descartar')).click()");await esperar("!document.querySelector('dialog[open]')");fixture({modoDetalle:'normal',listaLarga:false});
  });

  await t.test('FlowIA: drawer modal sin cambiar geometría en todos los módulos y tres temas',async()=>{
    fase('layout global FlowIA');fixture({rol:'Administrador'});await recargar();
    for(const modo of ['claro','oscuro','automatico']) {
      await click('.sidebar-settings');await esperar("Boolean(document.querySelector('.theme-options'))");await click(`input[name=apariencia][value=${modo}]`);
      for(const label of ['Inicio','Propiedades','Reservas','Huéspedes','Calendario','Limpiezas','Reportes','Alertas','Usuarios']) {
        fase(`FlowIA ${modo} ${label}`);await pantalla(label);await esperar("!document.querySelector('.main .security-loading')");
        const previa=await posicion();await abrirFlowIA();
        assert.ok(Object.values(await areas()).every(Boolean),`${modo}/${label}: diálogo superpuesto y difuminado.`);
        assert.deepEqual(await posicion(),previa,`${modo}/${label}: geometría y scroll intactos.`);
        assert.equal(await evaluate("document.activeElement.classList.contains('flowia-close')"),true,await evaluate("document.activeElement.tagName+':'+document.activeElement.className"));
        if(label==='Inicio') {
          assert.equal(await evaluate("getComputedStyle(document.querySelector('.flowia-brand-icon')).color"),'rgb(255, 255, 255)','Icono legible sobre el encabezado de marca en todos los temas.');
          await capturar(`flowia-lateral-${modo}`);
        }
        await escape();await esperar("!document.querySelector('.flowia-panel')");
      }
    }
    await click('.sidebar-user');await abrirFlowIA();assert.ok(Object.values(await areas()).every(Boolean));await cerrarFlowIA();
    await click('.sidebar-settings');await esperar("Boolean(document.querySelector('.settings-nav'))");await seccion('Datos de empresa');await esperar("Boolean(document.querySelector('#config-nombreComercial'))");
    for(const width of [1280,820,390,320]) {
      await viewport(width);await abrirFlowIA();await esperar("Boolean(document.querySelector('.flowia-panel'))");
      assert.ok(Object.values(await areas()).every(Boolean),`Áreas a ${width}px.`);await capturar(`flowia-lateral-${width}`);await cerrarFlowIA();
    }
    await viewport(390,400);await abrirFlowIA();assert.ok(Object.values(await areas()).every(Boolean));
    assert.equal(await evaluate("document.querySelector('.flowia-panel-body').scrollHeight>document.querySelector('.flowia-panel-body').clientHeight"),true);
    await escape();
    await esperar("!document.querySelector('.flowia-panel')");await esperar("document.activeElement.classList.contains('mobile-menu-toggle')");
    assert.equal(await evaluate("document.activeElement.classList.contains('mobile-menu-toggle')"),true);
    await viewport(1280,800);await click('.sidebar-collapse-toggle');await abrirFlowIA();assert.ok(Object.values(await areas()).every(Boolean));await capturar('flowia-lateral-colapsada');await cerrarFlowIA();await click('.sidebar-collapse-toggle');
  });

  await t.test('FlowIA: ancho, scroll, caché, modales y foco en ambos roles',async()=>{
    fase('FlowIA integrada');fixture({rol:'Administrador',datosVisuales:true,listaLarga:true});await viewport(1280,800);await recargar();
    await pantalla('Huéspedes');await esperar("document.querySelectorAll('.huespedes-desktop-list tbody tr').length===24");
    await evaluate("document.querySelector('.main').scrollTo({top:180,behavior:'instant'})");
    const previo=await evaluate("({ancho:document.querySelector('.main').clientWidth,scroll:document.querySelector('.main').scrollTop,alto:document.querySelector('.main').getBoundingClientRect().bottom})");
    assert.equal(previo.alto,800,'Sin reserva permanente de altura al pie.');
    const consultas=()=>requests.filter(r=>r.ruta==='/recomendaciones'&&r.method==='GET').length;
    const cerrada=consultas();await new Promise(r=>setTimeout(r,100));assert.equal(consultas(),cerrada,'Cerrar/navegar no consulta FlowIA.');
    await abrirFlowIA(true);await esperar("Boolean(document.querySelector('.flowia-card'))");
    assert.equal(await evaluate("document.querySelector('.main').clientWidth"),previo.ancho,'El drawer no comprime el contenido.');
    assert.equal(await evaluate("document.querySelector('.main').scrollTop"),previo.scroll);
    assert.equal(await evaluate("document.querySelector('.sidebar-flowia').getAttribute('aria-expanded')"),'true');
    const cargada=consultas();await escape();await esperar("!document.querySelector('.flowia-panel')");
    assert.equal(await evaluate("document.activeElement.classList.contains('sidebar-flowia')"),true);
    assert.equal(await evaluate("document.querySelector('.main').clientWidth"),previo.ancho);
    assert.equal(await evaluate("document.querySelector('.main').scrollTop"),previo.scroll);
    await abrirFlowIA();assert.equal(consultas(),cargada,'Reabrir conserva el último análisis.');
    // Apertura programática intencional: simula un modal de negocio asíncrono;
    // un usuario real no puede pulsar estos controles a través del fondo inerte.
    await abrir();await esperar("Boolean(document.querySelector('.guest-dialog[open]'))");
    await esperar("!document.querySelector('.flowia-panel')");
    assert.equal(await evaluate("document.querySelector('.guest-dialog').contains(document.activeElement)"),true);await cerrar();
    await pantalla('Reportes');await esperar("Boolean(document.querySelector('.reportes-generate-button'))");
    await abrirFlowIA();await click('.reportes-generate-button');
    await esperar("Boolean(document.querySelector('.reportes-export-overlay')) && !document.querySelector('.flowia-panel')");
    await click('.reportes-export-cancel');
    fixture({rol:'Operador',listaLarga:false});await recargar();
    assert.equal(await evaluate("document.querySelectorAll('.sidebar-flowia').length"),1);
    assert.equal(await evaluate("document.querySelector('.sidebar-nav').textContent.includes('Usuarios')"),false);
    await abrirFlowIA();await esperar("Boolean(document.querySelector('.flowia-card'))");
    await click('.flowia-card-action');await esperar("!document.querySelector('.flowia-panel')");
    await esperar("Boolean(document.querySelector('.limpiezas-page'))");
    fixture({rol:'Administrador'});await recargar();
  });

  await t.test('FlowIA: error/reintento, actualización, diálogo compacto y cambios de tamaño',async()=>{
    fase('FlowIA teclado y estados');fixture({falloFlowIA:true,demoraFlowIA:350});await viewport(1280,800);await recargar();
    await abrirFlowIA();await esperar("Boolean(document.querySelector('.hf-skeleton--flowia'))");
    await esperar("Boolean(document.querySelector('.flowia-state--error'))");
    const intentos=requests.filter(r=>r.ruta==='/recomendaciones'&&r.method==='GET').length;
    await new Promise(r=>setTimeout(r,450));assert.equal(requests.filter(r=>r.ruta==='/recomendaciones'&&r.method==='GET').length,intentos,'Sin reintento automático en bucle.');
    fixture({falloFlowIA:false,demoraFlowIA:0});await click('.flowia-state--error button');await esperar("Boolean(document.querySelector('.flowia-card'))");
    const antes=requests.filter(r=>r.ruta==='/recomendaciones'&&r.method==='GET').length;
    await click('.flowia-refresh');await esperar("!document.querySelector('.flowia-refresh').disabled");
    assert.equal(requests.filter(r=>r.ruta==='/recomendaciones'&&r.method==='GET').length,antes+1);
    for(const width of [820,390,320,1280]){
      await viewport(width);await esperar("Boolean(document.querySelector('dialog.flowia-panel[open]'))");
      assert.ok(Object.values(await areas()).every(Boolean),`Panel completo a ${width}px.`);
      assert.equal(await evaluate("document.querySelector('.flowia-panel').contains(document.activeElement)"),true);
      {
        assert.equal(await evaluate("document.body.style.overflow"),'hidden');
        for(let n=0;n<9;n++){
          await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9,modifiers:n%2?8:0});
          await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
          assert.equal(await evaluate("document.querySelector('.flowia-panel').contains(document.activeElement)"),true);
        }
      }
    }
    await cerrarFlowIA();await esperar("!document.querySelector('.flowia-panel')");
    assert.equal(await evaluate("document.body.style.overflow"),'');
    await viewport(390,740);await abrirFlowIA();await escape();await esperar("!document.querySelector('.flowia-panel')");
    await esperar("document.activeElement.classList.contains('mobile-menu-toggle')");
    assert.equal(await evaluate("document.activeElement.classList.contains('mobile-menu-toggle')"),true);
    await viewport(1280,800);
  });

  await t.test('FlowIA: backdrop sin clic accidental, salida, foco y movimiento reducido',async()=>{
    fase('FlowIA backdrop y movimiento reducido');await viewport(1280,800);
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    await abrirFlowIA();
    const antes=await posicion();
    await evaluate("document.querySelector('.main').focus()");
    assert.equal(await evaluate("document.querySelector('.flowia-panel').contains(document.activeElement)"),true,'El fondo modal no acepta foco.');
    const raton=(type,x,y)=>send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
    const zona=await evaluate("(() => {const r=document.querySelector('.flowia-panel-body').getBoundingClientRect();return {x:r.right-16,y:r.bottom-16};})()");
    await raton('mousePressed',zona.x,zona.y);await raton('mouseMoved',100,100);await raton('mouseReleased',100,100);
    assert.equal(await evaluate("Boolean(document.querySelector('dialog.flowia-panel[open]'))"),true,'Arrastrar desde dentro hacia fuera no cierra el diálogo.');
    const peticiones=requests.length;
    const salida=await evaluate("(() => {const r=document.querySelector('.sidebar-logout').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()");
    t.diagnostic(JSON.stringify({salida,entorno:await evaluate("({alto:innerHeight,reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,preferencia:document.documentElement.dataset.reduceMotion})")}));
    await raton('mousePressed',salida.x,salida.y);await raton('mouseReleased',salida.x,salida.y);
    await esperar("Boolean(document.querySelector('.flowia-panel--closing'))");
    assert.equal(await evaluate("document.querySelector('.flowia-panel').matches(':modal')"),true,'El fondo permanece bloqueado durante la animación.');
    await esperar("!document.querySelector('.flowia-panel')");await esperar("document.activeElement.classList.contains('sidebar-flowia')");
    assert.deepEqual(await posicion(),antes);
    assert.equal(await evaluate("Boolean(document.querySelector('.dashboard'))"),true,'El clic fuera no alcanza Cerrar sesión.');
    assert.equal(requests.length,peticiones);
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    try{
      await abrirFlowIA(true);
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.flowia-panel')).animationName"),'none');
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.flowia-panel'),'::backdrop').animationName"),'none');
      await cerrarFlowIA();
    }finally{await send('Emulation.setEmulatedMedia',{features:[]});}
  });

  await t.test('FlowIA: navegar a Propiedades conserva las confirmaciones de borradores',async()=>{
    fase('FlowIA y borradores');fixture({rol:'Administrador',destinoFlowIA:{seccion:'propiedades'}});await recargar();
    await click('.sidebar-settings');await seccion('Datos de empresa');await esperar("document.querySelector('#config-nombreComercial')?.disabled===false");
    await fill('#config-nombreComercial','Borrador ficticio desde FlowIA');
    const puts=requests.filter(r=>r.method==='PUT').length;
    await abrirFlowIA();await esperar("Boolean(document.querySelector('.flowia-card-action'))");await click('.flowia-card-action');
    await esperar("document.querySelector('.security-dialog[open]')?.textContent.includes('Cambios sin guardar') && !document.querySelector('.flowia-panel')");
    await evaluate("[...document.querySelectorAll('.security-dialog button')].find(b=>b.textContent==='Seguir editando').click()");
    assert.equal(await evaluate("document.querySelector('#config-nombreComercial').value"),'Borrador ficticio desde FlowIA');
    await abrirFlowIA();await click('.flowia-card-action');
    await esperar("document.querySelector('.security-dialog[open]')?.textContent.includes('Cambios sin guardar')");
    await evaluate("[...document.querySelectorAll('.security-dialog button')].find(b=>b.textContent==='Descartar y continuar').click()");
    await esperar("Boolean(document.querySelector('.properties-page')) || Boolean(document.querySelector('.propiedades-page'))");
    assert.equal(requests.filter(r=>r.method==='PUT').length,puts,'Navegar/descartar no guarda datos empresariales.');
    fixture({destinoFlowIA:null});await recargar();
  });

  await t.test('PDF diferido: no carga al entrar y genera un archivo válido solo al exportar',async()=>{
    fase('PDF diferido');
    assert.equal(modulosCliente.some(p=>/jspdf|autotable/i.test(p)),false,'Navegar módulos no debe descargar las bibliotecas PDF.');
    await pantalla('Reportes');await esperar("Boolean(document.querySelector('.reportes-generate-button'))");
    await denegarDescargas();
    await evaluate("globalThis.__pdfPrueba=null;globalThis.__crearBlobOriginal=URL.createObjectURL;URL.createObjectURL=function(blob){if(blob.type==='application/pdf')blob.slice(0,4).text().then(cabecera=>globalThis.__pdfPrueba={cabecera,bytes:blob.size});return globalThis.__crearBlobOriginal.call(URL,blob);};");
    try {
      await click('.reportes-generate-button');await esperar("Boolean(document.querySelector('.reportes-export-confirm'))");
      await click('.reportes-export-confirm');await esperar("globalThis.__pdfPrueba?.cabecera==='%PDF'");
      assert.ok(await evaluate("globalThis.__pdfPrueba.bytes>1000"));
      await esperar("!document.querySelector('.reportes-export-overlay')");
      assert.equal(modulosCliente.some(p=>/jspdf/i.test(p)),true);
    } finally {await evaluate("URL.createObjectURL=globalThis.__crearBlobOriginal;delete globalThis.__crearBlobOriginal;delete globalThis.__pdfPrueba;");}
  });

  await t.test('Configuración: solo lectura explícita sin PUT y contrato incompleto cerrado',async()=>{
    fase('configuración solo lectura');fixture({soloLectura:true});await click('.sidebar-settings');await seccion('Apariencia');await seccion('Datos de empresa');
    await esperar("document.querySelector('.settings-persistence')?.textContent.includes('Solo lectura temporal')");
    const puts=requests.filter(r=>r.method==='PUT').length;
    assert.equal(await evaluate("document.querySelector('#config-nombreComercial').disabled"),true);
    assert.equal(await evaluate("Boolean(document.querySelector('.settings-form-actions button[type=submit]'))"),false);
    assert.equal(await evaluate("Boolean(document.querySelector('.settings-activation'))"),false);
    for(const width of [1280,820,390,320]) {await viewport(width);assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),true);await capturar(`configuracion-solo-lectura-${width}`);}
    await seccion('Preferencias operativas');await esperar("Boolean(document.querySelector('#config-horaIngreso'))");
    assert.equal(await evaluate("document.querySelector('#config-horaIngreso').disabled"),true);assert.equal(requests.filter(r=>r.method==='PUT').length,puts);
    fixture({estadoAusente:true});await seccion('Datos de empresa');await esperar("document.querySelector('.settings-persistence')?.textContent.includes('Guardado no disponible')");
    assert.equal(await evaluate("document.querySelector('#config-nombreComercial').disabled"),true);
    fixture({estadoAusente:false,soloLectura:false});await seccion('Preferencias operativas');await esperar("document.querySelector('#config-horaIngreso')?.disabled===false");
    fixture({soloLectura:true});await fill('#config-horaIngreso','18:00');await evaluate("document.querySelector('.settings-editor form').requestSubmit()");await esperar("Boolean(document.querySelector('dialog[open]'))");
    await esperar("!document.querySelector('.assistant-rail, .flowia-panel')");
    await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Confirmar guardado').click()");
    await esperar("document.querySelector('.settings-persistence')?.textContent.includes('Solo lectura temporal')");
    assert.equal(await evaluate("Boolean(document.querySelector('.settings-form-actions button[type=submit]'))"),false);
    await evaluate("[...document.querySelectorAll('.settings-form-actions button')].find(b=>b.textContent==='Descartar').click()");await esperar("Boolean(document.querySelector('dialog[open]'))");
    await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Descartar cambios').click()");
    await viewport(1280,800);fixture({rol:'Operador'});await recargar();await click('.sidebar-settings');
    assert.equal(await evaluate("document.querySelectorAll('.settings-nav button').length"),3);fixture({soloLectura:false});
  });

  await t.test('Huéspedes: móvil/tablet, temas, scroll interno y foco contenido',async()=>{
    fase('huéspedes responsive');
    for(const [width,modo] of [[320,'claro'],[390,'oscuro'],[820,'automatico']]) {
      await viewport(width);await click(`input[name=apariencia][value=${modo}]`);
      if(width<701){await click('.mobile-menu-toggle');await evaluate("[...document.querySelectorAll('.mobile-nav-list button')].find(b=>b.textContent.trim()==='Huéspedes').click()");}else await pantalla('Huéspedes');
      await esperar("Boolean(document.querySelector('.huespedes-page'))");
      await evaluate(`(() => {const scope=document.querySelector(${JSON.stringify(width<701?'.huespedes-mobile-list':'.huespedes-desktop-list')});const b=[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()==='Ver huésped');b.focus();b.click();})()`);
      await esperar("document.querySelectorAll('.guest-reservation').length===12");
      for(let i=0;i<16;i++){
        await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
        assert.equal(await evaluate("document.querySelector('.guest-dialog').contains(document.activeElement)"),true,`Tab ${i}: foco dentro del diálogo.`);
      }
      assert.equal(await evaluate("(() => {const d=document.querySelector('.guest-dialog').getBoundingClientRect();return d.left>=0&&d.right<=innerWidth+1&&d.bottom<=innerHeight+1&&document.querySelector('.guest-dialog').scrollWidth<=innerWidth;})()"),true);
      assert.equal(await evaluate("document.querySelector('.guest-dialog-body').scrollHeight>document.querySelector('.guest-dialog-body').clientHeight"),true);
      await capturar(`huesped-modal-${modo}-${width}`);await cerrar();
      if(width<701){await click('.mobile-menu-toggle');await click('.mobile-nav-settings');}else await click('.sidebar-settings');
    }
  });
}

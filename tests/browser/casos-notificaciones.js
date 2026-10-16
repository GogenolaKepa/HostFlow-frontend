import assert from 'node:assert/strict';

// Usa exclusivamente el CDP y la API ficticia del contenedor aislado.
export async function probarNotificaciones({t,evaluate,send,click,esperar,inicioVisible,capturar,requests,fixture,fase}) {
  const viewport=(width=1280,height=800)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<701});
  const recargar=async()=>{await evaluate('globalThis.__notificacionesRecarga=true');await send('Page.reload');await esperar(`globalThis.__notificacionesRecarga===undefined && (${inicioVisible})`);};
  const boton=(scope,label)=>evaluate(`[...document.querySelectorAll(${JSON.stringify(scope+' button')})].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);
  const navegar=async label=>{
    const movil=await evaluate('innerWidth<701');
    if(movil)await click('.mobile-menu-toggle');
    await boton(movil?'.mobile-nav-list':'.sidebar-nav',label);
  };
  const preferencias=async()=>{await viewport();await click('.sidebar-settings');await boton('.settings-nav','Notificaciones');};
  const select=(selector,valor)=>evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(valor)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const loaded=()=>esperar("document.querySelector('.notifications-page')?.getAttribute('aria-busy')==='false'");
  const confirmar=async label=>{await esperar("Boolean(document.querySelector('dialog[open]'))");await boton('dialog',label);};
  const guardar=async()=>{await boton('.notification-settings','Guardar preferencias');await confirmar('Confirmar guardado');};

  await t.test('Notificaciones: ambos roles, lectura pura, paginación, filtros y fecha real opcional',async()=>{
    fase('notificaciones lectura');fixture({modoAvisos:'datos',rol:'Administrador'});await viewport();await recargar();
    for(const rol of ['Administrador','Operador']){
      fixture({rol});await recargar();const antes=requests.length;await navegar('Notificaciones');await loaded();
      assert.equal(await evaluate("document.querySelectorAll('.notification-card').length"),20);
      assert.equal(await evaluate("document.querySelectorAll('.notification-card time').length"),19);
      assert.equal(await evaluate("document.querySelector('.notifications-page').textContent.includes('999999')"),false);
      assert.equal(await evaluate("document.querySelector('.notifications-page').textContent.includes('leída')"),false);
      assert.ok(requests.slice(antes).every(r=>r.ruta==='/notificaciones/avisos'&&['GET','OPTIONS'].includes(r.method)));
      await boton('.notifications-pagination','Siguiente');await loaded();await esperar("document.querySelector('.notification-card h2')?.textContent==='Aviso ficticio 21'");
      await select('.notifications-toolbar select','reservas');await loaded();await esperar("document.querySelector('.notifications-pagination').textContent.includes('Página 1')");
      assert.equal(await evaluate("[...document.querySelectorAll('.notification-meta')].every(e=>e.textContent.includes('Reservas'))"),true);
      await select('.notifications-toolbar label:nth-child(2) select','Alta');await loaded();
      assert.equal(await evaluate("document.querySelectorAll('.notification-card').length"),7);
      assert.ok(requests.slice(antes).every(r=>r.ruta==='/notificaciones/avisos'&&['GET','OPTIONS'].includes(r.method)),'No consulta GET mutantes, no escribe ni marca lecturas.');
    }
  });
  await t.test('Notificaciones: vacío, carga lenta, error/reintento y respuesta incompleta',async()=>{
    fase('estados notificaciones');fixture({modoAvisos:'vacio'});await recargar();await navegar('Notificaciones');await loaded();
    assert.equal(await evaluate("document.querySelector('.notifications-state').textContent.includes('No hay avisos')"),true);
    fixture({modoAvisos:'error'});await boton('.notifications-heading','Actualizar avisos');await esperar("Boolean(document.querySelector('.notifications-page [role=alert]'))");
    fixture({modoAvisos:'datos',demoraAvisos:500});await boton('.notifications-state','Reintentar');
    await esperar("document.querySelector('.notifications-heading button')?.disabled===true");
    assert.equal(await evaluate("[...document.querySelectorAll('.notifications-toolbar select')].every(e=>!e.disabled)"),true,'Los filtros conservan acceso por teclado durante una consulta.');await loaded();
    fixture({modoAvisos:'incompleto',demoraAvisos:0});await boton('.notifications-heading','Actualizar avisos');await esperar("Boolean(document.querySelector('.notifications-page [role=alert]'))");
    fixture({modoAvisos:'datos'});await boton('.notifications-state','Reintentar');await loaded();
  });
  await t.test('Notificaciones: temas, tablet/móvil, sidebar colapsada, teclado y FlowIA conservado',async()=>{
    fase('responsive notificaciones');
    for(const [width,modo]of [[1280,'claro'],[820,'automatico'],[390,'oscuro'],[320,'oscuro']]){
      await viewport(width);await evaluate(`globalThis.HostFlowAppearance.setPreference(${JSON.stringify(modo)})`);
      assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),true);
      assert.equal(await evaluate("document.querySelector('.notifications-page').scrollWidth<=document.querySelector('.main').clientWidth"),true);
      assert.equal(await evaluate("[...document.querySelectorAll('.notifications-page button,.notifications-page select')].every(e=>e.getBoundingClientRect().width>0)"),true);
      if(modo==='oscuro')assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.notification-card')).backgroundColor"),'rgb(255, 255, 255)');
      await capturar(`notificaciones-${modo}-${width}`);
      await navegar('Inicio');await esperar(inicioVisible);await navegar('Notificaciones');await loaded();
    }
    await viewport();await click('.sidebar-collapse-toggle');
    await evaluate("[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.getAttribute('title')==='Notificaciones'||b.textContent.trim()==='Notificaciones').focus()");
    assert.equal(await evaluate("Boolean(document.activeElement.getAttribute('aria-label')||document.activeElement.textContent.trim())"),true);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await loaded();
    await click('.sidebar-collapse-toggle');
    const ancho=await evaluate("document.querySelector('.main').getBoundingClientRect().width");
    await click('.sidebar-flowia');await esperar("Boolean(document.querySelector('dialog.flowia-panel[open]'))");
    assert.equal(await evaluate("document.querySelector('.main').getBoundingClientRect().width"),ancho);
    await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await esperar("!document.querySelector('.flowia-panel')");
    assert.equal(await evaluate("document.activeElement.classList.contains('sidebar-flowia')"),true);
  });
  await t.test('Preferencias: apagadas informan sin simular persistencia ni ofrecer guardado',async()=>{
    fase('preferencias desactivadas');fixture({modoPreferencias:'pendiente'});await preferencias();
    await esperar("document.querySelector('.notification-settings')?.textContent.includes('todavía no activadas')");
    assert.equal(await evaluate("document.querySelectorAll('.notification-settings input').length"),0);
    assert.equal(await evaluate("[...document.querySelectorAll('.notification-settings button')].some(e=>e.textContent.includes('Guardar'))"),false);
    assert.equal(await evaluate("[...document.querySelectorAll('.notification-settings button')].some(e=>e.textContent.includes('Reintentar'))"),false);
    await boton('.notification-settings','Ir al centro de notificaciones');await loaded();
  });
  await t.test('Preferencias: guardado confirmado, sin duplicados, borrador protegido y conflicto conservado',async()=>{
    fase('preferencias persistidas ficticias');fixture({modoPreferencias:'editable'});await preferencias();await esperar("document.querySelectorAll('.notification-preferences input').length===8");
    await click('.notification-preferences input');await navegar('Inicio');await esperar("Boolean(document.querySelector('dialog[open]'))");await boton('dialog','Seguir editando');
    assert.equal(await evaluate("document.querySelector('.notification-preferences input').checked"),true);
    fixture({demoraPreferencias:500});const antes=requests.filter(r=>r.method==='PUT'&&r.ruta==='/notificaciones/preferencias').length;
    await guardar();await esperar("[...document.querySelectorAll('dialog button')].some(b=>b.textContent.includes('Guardando')&&b.disabled)");
    await esperar("document.querySelector('.notification-settings').textContent.includes('Preferencias guardadas.')");
    assert.equal(requests.filter(r=>r.method==='PUT'&&r.ruta==='/notificaciones/preferencias').length,antes+1);
    fixture({demoraPreferencias:0,conflictoPreferencias:true});await click('.notification-preferences input');await guardar();
    await esperar("document.querySelector('.notification-settings [role=alert]')?.textContent.includes('Otra sesión')");
    assert.equal(await evaluate("document.querySelector('.notification-preferences input').checked"),false);
    assert.equal(await evaluate("[...document.querySelectorAll('.notification-settings button')].find(b=>b.textContent==='Guardar preferencias').disabled"),true);
    fixture({conflictoPreferencias:false});await boton('.notification-settings','Recargar preferencias');await confirmar('Descartar y recargar');await esperar("document.querySelector('.notification-preferences input')?.checked===true");
  });
  await t.test('Preferencias: cuentas aisladas, solo lectura, errores y sin permisos',async()=>{
    fase('preferencias aislamiento');fixture({rol:'Administrador'});await recargar();await preferencias();await esperar("document.querySelectorAll('.notification-preferences input').length===8");
    assert.equal(await evaluate("document.querySelector('.notification-preferences input').checked"),false,'No hereda la preferencia del Operador.');
    fixture({modoPreferencias:'lectura'});await boton('.notification-settings','Recargar preferencias');await esperar("document.querySelector('.notification-settings').textContent.includes('modo de solo lectura')");
    assert.equal(await evaluate("document.querySelector('.notification-preferences').disabled"),true);
    fixture({modoPreferencias:'error'});await boton('.notification-settings','Recargar preferencias');await esperar("Boolean(document.querySelector('.notification-settings [role=alert]'))");
    fixture({sinNotificaciones:true});await recargar();
    assert.equal(await evaluate("document.querySelector('.sidebar-nav').textContent.includes('Notificaciones')"),false);
    await click('.sidebar-settings');assert.equal(await evaluate("document.querySelector('.settings-nav').textContent.includes('Notificaciones')"),false);
    fixture({sinNotificaciones:false,modoPreferencias:'pendiente'});await recargar();
  });
  await t.test('Preferencias: cierre de escritura entre consulta y confirmación conserva el borrador',async()=>{
    fase('preferencias cambio de activación');fixture({modoPreferencias:'editable'});await preferencias();await esperar("document.querySelectorAll('.notification-preferences input').length===8");
    const inicial=await evaluate("document.querySelector('.notification-preferences input').checked");await click('.notification-preferences input');
    fixture({modoPreferencias:'lectura'});await guardar();await esperar("Boolean(document.querySelector('.notification-settings [role=alert]'))");
    assert.equal(await evaluate("document.querySelector('.notification-preferences input').checked"),!inicial);
    assert.equal(await evaluate("document.querySelector('.notification-preferences').disabled"),true);
    assert.equal(await evaluate("[...document.querySelectorAll('.notification-settings button')].some(b=>b.textContent==='Guardar preferencias')"),false);
    await boton('.notification-settings','Recargar preferencias');await confirmar('Descartar y recargar');
    await esperar("document.querySelector('.notification-preferences input')?.checked==="+inicial);
    fixture({modoPreferencias:'pendiente'});
  });
  await t.test('Generales: movimiento real por navegador, persistencia, sistema y ambos roles',async()=>{
    fase('accesibilidad navegador');await click('.sidebar-settings');await boton('.settings-nav','Preferencias generales');
    const antes=requests.length;await select('#preferencia-movimiento','reducido');await esperar("document.documentElement.dataset.reduceMotion==='true'");
    assert.equal(await evaluate("localStorage.getItem('hostflow.accesibilidad.movimiento')"),'reducido');
    await recargar();assert.equal(await evaluate("document.documentElement.dataset.reduceMotion"),'true');
    fixture({rol:'Operador'});await recargar();await click('.sidebar-settings');await boton('.settings-nav','Preferencias generales');
    assert.equal(await evaluate("document.querySelector('#preferencia-movimiento').value"),'reducido');
    await select('#preferencia-movimiento','sistema');await esperar("document.documentElement.dataset.reduceMotion==='false'");
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"),true);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.sidebar-settings')).transitionDuration"),'0s');
    assert.ok(requests.slice(antes).every(r=>['GET','OPTIONS'].includes(r.method)),'La preferencia del navegador no escribe SQL.');
    await send('Emulation.setEmulatedMedia',{features:[]});await evaluate("globalThis.HostFlowAppearance.setPreference('claro')");
    await capturar('preferencias-generales');
  });
  await t.test('Preferencias: una respuesta 200 sin persistencia no confirma guardado ni pierde el borrador',async()=>{
    fase('confirmacion estricta de preferencias');fixture({modoPreferencias:'sin-confirmacion'});await preferencias();await esperar("document.querySelectorAll('.notification-preferences input').length===8");
    const inicial=await evaluate("document.querySelector('.notification-preferences input').checked");await click('.notification-preferences input');await guardar();
    await esperar("document.querySelector('.notification-settings [role=alert]')?.textContent.includes('No pudimos confirmar')");
    assert.equal(await evaluate("document.querySelector('.notification-settings').textContent.includes('Preferencias guardadas.')"),false);
    assert.equal(await evaluate("document.querySelector('.notification-preferences input').checked"),!inicial);
    assert.equal(await evaluate("[...document.querySelectorAll('.notification-settings button')].find(b=>b.textContent==='Guardar preferencias').disabled"),true);
    fixture({modoPreferencias:'editable'});await boton('.notification-settings','Recargar preferencias');await confirmar('Descartar y recargar');await esperar("document.querySelector('.notification-preferences input')?.checked==="+inicial);
  });
  await t.test('Preferencias: lectura en ambos roles, tres temas y responsive sin emitir PUT',async()=>{
    fase('lectura de preferencias segura');const antes=requests.length;
    for(const rol of ['Administrador','Operador']){
      fixture({rol,modoPreferencias:'lectura'});await viewport();await recargar();await preferencias();await esperar("document.querySelectorAll('.notification-preferences input').length===8");
      for(const [width,tema]of [[1280,'claro'],[820,'automatico'],[320,'oscuro']]){
        await viewport(width);await evaluate(`globalThis.HostFlowAppearance.setPreference(${JSON.stringify(tema)})`);
        assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),true);
        assert.equal(await evaluate("document.querySelector('.notification-preferences').disabled"),true);
        assert.equal(await evaluate("[...document.querySelectorAll('.notification-settings button')].some(b=>b.textContent==='Guardar preferencias')"),false);
      }
    }
    assert.equal(requests.slice(antes).some(r=>r.method==='PUT'),false);
    await viewport();await evaluate("globalThis.HostFlowAppearance.setPreference('claro')");fixture({modoPreferencias:'pendiente'});
  });
  await t.test('Notificaciones: singular, Crítica real, UTC/Buenos Aires y gestión con advertencia',async()=>{
    fase('clasificación y gestión');fixture({modoAvisos:'uno'});await navegar('Notificaciones');await loaded();
    assert.equal(await evaluate("document.querySelector('.notifications-toolbar [role=status]').textContent"),'1 aviso disponible');
    assert.equal(await evaluate("document.querySelector('.notification-priority').textContent"),'Crítica');
    assert.ok((await evaluate("document.querySelector('.notification-card time').textContent")).includes('02:10'));
    await capturar('consolidacion-notificacion-critica');
    const antes=requests.length;await click('.notification-action');await esperar("document.querySelector('dialog[open]')?.textContent.includes('sincronizaciones habituales')");
    await capturar('consolidacion-advertencia-gestion');
    assert.ok(requests.slice(antes).every(r=>r.ruta!=='/alertas'));await boton('dialog','Cancelar');await loaded();
    assert.ok(requests.slice(antes).every(r=>r.ruta!=='/alertas'),'Cancelar no entra al GET mutante.');
    fixture({modoAvisos:'prioridades'});await boton('.notifications-heading','Actualizar avisos');await loaded();
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.notification-priority')].map(e=>e.textContent)"),['Crítica','Alta','Media','Informativa','Sin clasificar']);
  });
  await t.test('Notificaciones: vacío filtrado y cambios rápidos no generan consultas redundantes',async()=>{
    fase('filtros consolidados');await select('.notifications-toolbar select','alertas');await loaded();await select('.notifications-toolbar label:nth-child(2) select','Critica');await loaded();
    assert.equal(await evaluate("document.querySelector('.notifications-state h2').textContent"),'Sin resultados para estos filtros');
    assert.equal(await evaluate("document.querySelector('.notifications-toolbar [role=status]').textContent"),'Ningún aviso disponible');
    const antes=requests.length;await select('.notifications-toolbar select','reservas');await select('.notifications-toolbar label:nth-child(2) select','Informativa');await loaded();
    assert.equal(requests.slice(antes).filter(r=>r.ruta==='/notificaciones/avisos'&&r.method==='GET').length,1);
    fixture({modoAvisos:'datos'});
  });
  await t.test('Preferencias: esquema pendiente y permiso insuficiente son estados no reintentables',async()=>{
    fase('estados explícitos de preferencias');fixture({modoPreferencias:'modelo'});await preferencias();await esperar("document.querySelector('.notification-settings')?.textContent.includes('Persistencia SQL pendiente')");
    assert.equal(await evaluate("[...document.querySelectorAll('.notification-settings button')].some(b=>b.textContent.includes('Reintentar'))"),false);
    fixture({modoPreferencias:'prohibida'});await navegar('Notificaciones');await loaded();await preferencias();await esperar("document.querySelector('.notification-settings')?.textContent.includes('Acceso no autorizado')");
    assert.equal(await evaluate("document.querySelectorAll('.notification-settings input').length"),0);fixture({modoPreferencias:'pendiente'});
  });
  await t.test('Notificaciones: cancelar una consulta lenta impide que sobrescriba el último filtro',async()=>{
    fase('respuesta tardía de avisos');fixture({modoAvisos:'datos',demoraAvisos:800});const previas=requests.filter(r=>r.ruta==='/notificaciones/avisos'&&r.method==='GET').length;
    await navegar('Notificaciones');
    for(let n=0;n<50&&requests.filter(r=>r.ruta==='/notificaciones/avisos'&&r.method==='GET').length===previas;n++)await new Promise(r=>setTimeout(r,20));
    assert.ok(requests.filter(r=>r.ruta==='/notificaciones/avisos'&&r.method==='GET').length>previas);
    fixture({demoraAvisos:0});await select('.notifications-toolbar select','alertas');await loaded();
    await new Promise(r=>setTimeout(r,900));
    assert.equal(await evaluate("[...document.querySelectorAll('.notification-meta')].every(e=>e.textContent.includes('Alertas operativas'))"),true);
    assert.equal(await evaluate("document.querySelector('.notifications-toolbar [role=status]').textContent"),'21 avisos disponibles');
  });
  await t.test('Gestión: diálogo opaco tematizado, responsive, foco contenido y Escape sin sincronizar',async()=>{
    fase('confirmación de gestión accesible');const antes=requests.length;
    for(const [width,tema]of [[1280,'claro'],[820,'automatico'],[390,'oscuro'],[320,'oscuro']]){
      await viewport(width);await evaluate(`globalThis.HostFlowAppearance.setPreference(${JSON.stringify(tema)})`);
      await evaluate("document.querySelector('.notification-action').focus();document.querySelector('.notification-action').click()");await esperar("Boolean(document.querySelector('.notifications-page dialog[open]'))");
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.notifications-page dialog')).backgroundColor===getComputedStyle(document.querySelector('.notification-card')).backgroundColor"),true,'El diálogo tiene la superficie elevada opaca del tema.');
      assert.equal(await evaluate("(() => {const r=document.querySelector('dialog[open]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})()"),true);
      for(let n=0;n<5;n++){await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"),true);}
      await capturar(`consolidacion-dialogo-${tema}-${width}`);
      await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await esperar("!document.querySelector('dialog[open]')");
      assert.equal(await evaluate("document.activeElement.classList.contains('notification-action')"),true);
    }
    assert.equal(requests.slice(antes).some(r=>r.ruta==='/alertas'),false);await viewport();await evaluate("globalThis.HostFlowAppearance.setPreference('claro')");
  });
}

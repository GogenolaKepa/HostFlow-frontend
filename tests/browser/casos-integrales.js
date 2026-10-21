import assert from 'node:assert/strict';

// Comparte el único navegador con API totalmente interceptada. No usa backend.
export async function probarRegresionIntegral({t,evaluate,send,click,esperar,inicioVisible,requests,fixture,fase,capturar}) {
  const viewport = width => send('Emulation.setDeviceMetricsOverride',{width,height:820,deviceScaleFactor:1,mobile:width<701});
  const pantalla = nombre => evaluate(`[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.trim()===${JSON.stringify(nombre)}).click()`);
  const abrirReserva = id => evaluate(`document.querySelector('#reserva-${id} .detail-button').click()`);
  await t.test('FlowIA: respuesta incompleta recuperable y último análisis intacto al fallar actualización',async()=>{
    fase('regresión FlowIA incompleta');fixture({rol:'Administrador',datosVisuales:true,modoFlowIA:'incompleto',falloFlowIA:false});
    await viewport(1280);await evaluate('globalThis.__recargaIntegralMonedas=true');await send('Page.reload');await esperar(`globalThis.__recargaIntegralMonedas===undefined && (${inicioVisible})`);
    await click('.sidebar-flowia');await esperar("Boolean(document.querySelector('.flowia-state--error'))");
    assert.equal(await evaluate("Boolean(document.querySelector('.flowia-state--empty'))"),false);
    fixture({modoFlowIA:'normal'});await click('.flowia-state--error button');await esperar("document.querySelectorAll('.flowia-card').length===1");
    fixture({modoFlowIA:'incompleto'});await click('.flowia-refresh');await esperar("Boolean(document.querySelector('.flowia-inline-warning'))");
    assert.equal(await evaluate("document.querySelectorAll('.flowia-card').length"),1);
    for(const [width,tema]of [[1280,'claro'],[820,'automatico'],[390,'oscuro']]){
      await viewport(width);await evaluate(`globalThis.HostFlowAppearance.setPreference(${JSON.stringify(tema)})`);
      assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true);
      assert.equal(await evaluate("document.querySelector('.flowia-panel').contains(document.activeElement)"),true);
      await capturar(`integral-flowia-error-${width}`);
    }
    await click('.flowia-close');await esperar("!document.querySelector('.flowia-panel')");fixture({modoFlowIA:'normal'});await viewport(1280);
  });
  await t.test('Reserva: cerrar una consulta lenta y abrir otra no mezcla los historiales',async()=>{
    fase('regresión detalle de reservas');fixture({dosReservas:true,demoraReservaAnterior:800});
    await pantalla('Reservas');await esperar("document.querySelectorAll('.table-actions .detail-button').length===2");
    const antes=requests.length;await abrirReserva(1);await esperar("document.querySelector('.reservation-detail-modal')?.textContent.includes('Cargando historial')");
    await click('.reservation-detail-close');await abrirReserva(2);
    await esperar("document.querySelector('.reservation-timeline')?.textContent.includes('Evento ficticio reserva 2')");
    await new Promise(resolve=>setTimeout(resolve,950));
    assert.equal(await evaluate("document.querySelector('.reservation-detail-kicker').textContent.trim()"),'RESERVA #2');
    assert.equal(await evaluate("document.querySelector('.reservation-timeline').textContent.includes('Evento ficticio reserva 1')"),false);
    assert.ok(requests.slice(antes).every(r=>r.method==='GET'||r.method==='OPTIONS'));
    await click('.reservation-detail-close');fixture({demoraReservaAnterior:0});
  });
  await t.test('Reserva: contrato roto de cada sección muestra error sin colapsar el modal',async()=>{
    fase('contrato incompleto de detalle');fixture({detalleReservaIncompleto:true});await abrirReserva(2);
    await esperar("document.querySelector('.reservation-detail-modal')?.textContent.includes('No se pudo cargar el historial')");
    const contenido=await evaluate("document.querySelector('.reservation-detail-modal').textContent");
    assert.ok(contenido.includes('No se pudieron cargar los mensajes'));
    assert.ok(contenido.includes('No se pudieron cargar las incidencias'));
    assert.ok(contenido.includes('No se pudieron cargar las observaciones'));
    await click('.reservation-detail-close');fixture({detalleReservaIncompleto:false,dosReservas:false});
    await pantalla('Inicio');await esperar(inicioVisible);await evaluate("globalThis.HostFlowAppearance.setPreference('claro')");
  });
  await t.test('FlowIA: el cierre móvil restaura foco aunque un frame se ejecute antes del commit de React',async()=>{
    fase('foco después del commit de cierre');await viewport(390);await click('.mobile-menu-toggle');
    await evaluate("document.querySelector('.mobile-flowia').focus();document.querySelector('.mobile-flowia').click()");
    await esperar("Boolean(document.querySelector('dialog.flowia-panel[open]'))");
    try {
      await evaluate("(() => {globalThis.__flowiaFrameOriginal=requestAnimationFrame;globalThis.__flowiaMovimientoOriginal=document.documentElement.dataset.reduceMotion;document.documentElement.dataset.reduceMotion='true';window.requestAnimationFrame=fn=>{fn(performance.now());return 0;};document.querySelector('.flowia-close').click();})()");
      await esperar("!document.querySelector('.flowia-panel')");
      await esperar("document.activeElement.classList.contains('mobile-menu-toggle')");
    } finally {
      await evaluate("(() => {if(globalThis.__flowiaFrameOriginal)window.requestAnimationFrame=globalThis.__flowiaFrameOriginal;const previo=globalThis.__flowiaMovimientoOriginal;if(previo===undefined)delete document.documentElement.dataset.reduceMotion;else document.documentElement.dataset.reduceMotion=previo;delete globalThis.__flowiaFrameOriginal;delete globalThis.__flowiaMovimientoOriginal;})()");
    }
    await viewport(1280);
  });
}

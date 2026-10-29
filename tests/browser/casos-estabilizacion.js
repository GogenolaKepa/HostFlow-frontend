import assert from 'node:assert/strict';
import {reservaVisual} from '../fixtures/visual-modulos.js';

export async function probarEstabilizacion({t,evaluate,send,fill,click,esperar,login,inicioVisible,fixture,requests,fase}) {
  const boton=(texto,raiz='body')=>evaluate(`[...document.querySelectorAll(${JSON.stringify(raiz+' button')})].find(e=>e.textContent.trim()===${JSON.stringify(texto)}).click()`);
  const seleccionar=(id,valor)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(id)});e.value=${JSON.stringify(valor)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const recargar=async()=>{await evaluate('globalThis.__estabilizacion=true');await send('Page.reload');await esperar(`globalThis.__estabilizacion===undefined && (${inicioVisible})`);};
  const preparar=async(rol='Administrador',escritura=false)=>{
    fixture({rol,datosVisuales:true,jornadaMonetaria:false,monedasActivas:true,monedasEscritura:escritura,falloFlowIA:false,modoFlowIA:'normal',demoraFlowIA:0,
      configMonedas:null,tarifasMonedas:[{idPropiedad:1,moneda:'USD',precio:'100.00',versionRegistro:'0000000000000001'}],reservasEstabilizacion:null});
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    if(await evaluate("Boolean(document.querySelector('#login-email'))")){await login();await esperar(inicioVisible);}else await recargar();
  };
  const monedas=async()=>{await click('.sidebar-settings');await boton('Monedas y cotizaciones','.settings-nav');await esperar("Boolean(document.querySelector('#monedas-propiedad option[value=\"1\"]'))");await seleccionar('#monedas-propiedad','1');await esperar("document.querySelector('#monedas-precio').value==='100.00'");};
  const intentarSalir=async()=>{await boton('Apariencia','.settings-nav');};
  const cambios=()=>esperar("Boolean(document.querySelector('.settings-guard dialog[open]'))");
  const cerrarSesion=async()=>{await click('.sidebar-logout');await esperar("Boolean(document.querySelector('#login-email'))");};

  await t.test('Reservas: contrato anidado y estimación separados en escritorio, móvil y F5; permiso respetado',async()=>{
    fase('estabilizacion importes');await preparar();
    const reservas=[{...reservaVisual,montoEstimado:200,acuerdoMonetario:{moneda:'USD',importe:'175.50'}},{...reservaVisual,idReserva:2,montoEstimado:80}];
    fixture({reservasEstabilizacion:reservas});
    const revisar=async()=>{
      await boton('Reservas','.sidebar-nav');await esperar("document.querySelectorAll('.reserva-importes').length===4");
      for(const [width,selector]of [[1280,'.reservas-desktop-list'],[390,'.reservas-mobile-list']]){
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
        const textos=await evaluate(`[...document.querySelectorAll('${selector} .reserva-importes')].map(e=>e.textContent)`);
        const contractual=textos.find(t=>t.includes('Acuerdo contractual'));
        const legacy=textos.find(t=>!t.includes('Acuerdo contractual'));
        assert.match(contractual,/Estimación histórica: 200,00 — moneda no declarada/);
        assert.match(contractual,/Acuerdo contractual: USD 175,50/);
        assert.match(legacy,/80,00 — moneda no declarada/);
        assert.equal(await evaluate(`document.querySelector('${selector}').getClientRects().length>0`),true);
        if(width<500)assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);
      }
      await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    };
    await revisar();await recargar();await revisar();await cerrarSesion();
    fixture({rol:'Operador'});await login();await esperar(inicioVisible);await boton('Reservas','.sidebar-nav');
    await esperar("document.querySelector('.reservas-desktop-list')?.textContent.includes('Importes restringidos')");
    assert.equal(await evaluate("document.querySelector('.reservas-desktop-list').textContent.includes('175,50')"),false);
    await cerrarSesion();
  });

  await t.test('FlowIA: abrir/actualizar/F5 locales, Gemini explícito una vez; error sin reenvío y reintento local',async()=>{
    fase('estabilizacion FlowIA');await preparar();const desde=requests.length;
    const consultas=()=>requests.slice(desde).filter(r=>r.ruta==='/recomendaciones'&&r.method==='GET');
    await click('.sidebar-flowia');await esperar("Boolean(document.querySelector('.flowia-card'))");
    assert.deepEqual(consultas().map(r=>r.params.ia),['false']);
    await boton('Actualizar análisis','.flowia-panel');await esperar("!document.querySelector('.flowia-panel-statusbar button').disabled");
    assert.deepEqual(consultas().map(r=>r.params.ia),['false','false']);
    fixture({demoraFlowIA:250});await boton('Consultar con Gemini','.flowia-panel');await boton('Consultar con Gemini','.flowia-panel');
    await esperar("document.querySelector('.flowia-mode').textContent.includes('IA activa')");
    assert.equal(consultas().filter(r=>r.params.ia==='true').length,1);
    fixture({falloFlowIA:true});await boton('Consultar con Gemini','.flowia-panel');await esperar("document.querySelector('.flowia-panel').textContent.includes('Análisis ficticio no disponible')");
    await click('.flowia-close');await esperar("!document.querySelector('.flowia-panel')");await click('.sidebar-flowia');await esperar("Boolean(document.querySelector('.flowia-panel'))");
    assert.equal(consultas().filter(r=>r.params.ia==='true').length,2);
    fixture({falloFlowIA:false,demoraFlowIA:0});await boton('Actualizar análisis','.flowia-panel');await esperar("document.querySelector('.flowia-mode').textContent.includes('Análisis HostFlow')");
    assert.equal(consultas().at(-1).params.ia,'false');
    await click('.flowia-close');await recargar();await click('.sidebar-flowia');await esperar("Boolean(document.querySelector('.flowia-card'))");
    assert.equal(consultas().at(-1).params.ia,'false');assert.equal(consultas().filter(r=>r.params.ia==='true').length,2);
    await click('.flowia-close');await cerrarSesion();
  });

  await t.test('Monedas: seleccionar tarifa no ensucia; editar, revertir y cambiar propiedad conservan protección',async()=>{
    fase('estabilizacion borrador tarifa');await preparar();await monedas();const desde=requests.length;
    await intentarSalir();await esperar("Boolean(document.querySelector('.theme-options'))");assert.equal(await evaluate("Boolean(document.querySelector('dialog[open]'))"),false);
    await monedas();await fill('#monedas-precio','125');await intentarSalir();await cambios();await boton('Seguir editando','dialog');
    assert.equal(await evaluate("document.querySelector('#monedas-precio').value"),'125');
    await seleccionar('#monedas-propiedad','');await esperar("document.querySelector('dialog')?.textContent.includes('Cambiar de propiedad')");
    await boton('Seguir editando tarifa','dialog');assert.equal(await evaluate("document.querySelector('#monedas-propiedad').value"),'1');
    await fill('#monedas-precio','100');await intentarSalir();await esperar("Boolean(document.querySelector('.theme-options'))");
    await monedas();await fill('#monedas-precio','125');await seleccionar('#monedas-propiedad','');await boton('Descartar tarifa y cambiar','dialog');
    await intentarSalir();await esperar("Boolean(document.querySelector('.theme-options'))");
    assert.equal(requests.slice(desde).filter(r=>!['GET','OPTIONS'].includes(r.method)).length,0);
    await cerrarSesion();
  });

  await t.test('Monedas: guardar cotización no borra la protección de la tarifa pendiente y viceversa (API ficticia)',async()=>{
    fase('estabilizacion borradores independientes');await preparar('Administrador',true);await monedas();
    await fill('#monedas-precio','125');await fill('#monedas-valor','1200');await boton('Confirmar vista previa manual');await boton('Confirmar','dialog');
    await boton('Guardar cotización');await boton('Confirmar','dialog');await esperar("document.querySelector('.monedas-panel').textContent.includes('Cotización guardada con autor')");
    await intentarSalir();await cambios();await boton('Seguir editando','dialog');assert.equal(await evaluate("document.querySelector('#monedas-precio').value"),'125');
    await boton('Revisar y guardar tarifa');await boton('Confirmar','dialog');await esperar("document.querySelector('.monedas-panel').textContent.includes('Tarifa declarada guardada')");
    await intentarSalir();await esperar("Boolean(document.querySelector('.theme-options'))");
    await boton('Monedas y cotizaciones','.settings-nav');await esperar("Boolean(document.querySelector('#monedas-propiedad option[value=\"1\"]'))");await seleccionar('#monedas-propiedad','1');await esperar("document.querySelector('#monedas-precio').value==='125.00'");
    await fill('#monedas-valor','1300');await fill('#monedas-precio','140');await boton('Revisar y guardar tarifa');await boton('Confirmar','dialog');
    await esperar("document.querySelector('.monedas-panel').textContent.includes('Tarifa declarada guardada')");await intentarSalir();await cambios();await boton('Seguir editando','dialog');
    assert.equal(await evaluate("document.querySelector('#monedas-valor').value"),'1300');
    await intentarSalir();await boton('Descartar y continuar','dialog');await esperar("Boolean(document.querySelector('.theme-options'))");await cerrarSesion();
  });
  fixture({reservasEstabilizacion:null,monedasActivas:false,monedasEscritura:false,demoraFlowIA:0});
}

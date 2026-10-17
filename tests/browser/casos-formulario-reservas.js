import assert from 'node:assert/strict';

// Todo el trafico pasa por el interceptor ficticio del contenedor antes de navegar.
export async function probarFormularioReservas({t,evaluate,send,fill,esperar,inicioVisible,fixture,fase,requests,altasReservas,cambiosReservas}) {
  const boton = (texto, raiz='.main') => evaluate(`[...document.querySelectorAll(${JSON.stringify(raiz+' button')})].find(b=>b.textContent.trim()===${JSON.stringify(texto)}).click()`);
  const seleccionar = (campo, valor) => evaluate(`(()=>{const e=document.querySelector('select[name=${campo}]');e.value=${JSON.stringify(valor)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const recargar = async () => { await evaluate('globalThis.__formularioAnterior=true'); await send('Page.reload'); await esperar(`globalThis.__formularioAnterior===undefined && (${inicioVisible})`); };
  const navegar = async () => { await boton('Reservas','.sidebar-nav'); await esperar("Boolean(document.querySelector('.reservas-page'))"); };
  const abrir = async () => { await boton('Nueva reserva'); await esperar("Boolean(document.querySelector('#reserva-idPropiedad'))"); };
  const listo = () => esperar("Boolean(document.querySelector('#reserva-idPropiedad option[value=\"5\"]') && document.querySelector('#reserva-idHuesped option[value=\"17\"]'))");
  const enviar = () => evaluate("document.querySelector('input[name=fechaIngreso]').form.requestSubmit()");
  const completar = async () => {
    await listo(); await seleccionar('idPropiedad','5'); await seleccionar('idHuesped','17');
    await fill('input[name=fechaIngreso]','2100-01-10'); await fill('input[name=fechaEgreso]','2100-01-12');
    await fill('input[name=cantidadHuespedes]','1'); await fill('input[name=montoEstimado]','0');
    await esperar("document.querySelector('.settings-defaults-status').textContent.includes('Horarios iniciales')");
  };
  for (const rol of ['Administrador','Operador']) {
    await t.test(`catálogos reales ${rol}: IDs 5/17, borrador, POST cerrado, edición y cancelación`,async()=>{
      fase(`formulario ${rol}: alta`); fixture({rol,datosVisuales:true,formularioRealPrueba:true,falloAltaReserva:false,modoPropiedadesReserva:'normal',modoHuespedesReserva:'normal'});
      await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
      await recargar(); await navegar(); const inicio=requests.length;
      await abrir(); await listo();
      assert.equal(await evaluate("document.querySelector('#reserva-idPropiedad').value"),'');
      assert.equal(await evaluate("document.querySelector('#reserva-idHuesped').value"),'');
      for(const campo of ['fechaIngreso','fechaEgreso','cantidadHuespedes','montoEstimado']) assert.equal(await evaluate(`document.querySelector('input[name=${campo}]').value`),'');
      assert.equal(await evaluate("document.querySelector('#reserva-idPropiedad').options.length"),67,'Se usa la lista completa, incluyendo el registro final');
      assert.deepEqual(requests.slice(inicio).filter(r=>!['GET','OPTIONS'].includes(r.method)),[],'Abrir solo consulta');
      await completar(); await boton('Cerrar formulario'); await abrir(); await listo();
      assert.equal(await evaluate("document.querySelector('#reserva-idPropiedad').value"),'5');
      assert.equal(await evaluate("document.querySelector('#reserva-idHuesped').value"),'17');
      const previas=altasReservas.length;
      await evaluate("document.querySelector('input[name=fechaIngreso]').form.requestSubmit();document.querySelector('input[name=fechaIngreso]')?.form.requestSubmit()");
      await esperar("!document.querySelector('#reserva-idPropiedad')");
      assert.equal(altasReservas.length,previas+1);
      const body=altasReservas.at(-1).body;
      assert.equal(body.idPropiedad,5);assert.equal(body.idHuesped,17);assert.equal(body.montoEstimado,0);
      assert.equal('canal' in body,false);assert.equal('estado' in body,false);
      await recargar();await navegar();await esperar("Boolean(document.querySelector('.reservas-page .edit-button'))");
      assert.equal(await evaluate("document.querySelector('.reservas-page').textContent.includes('HF-PILOTO-FICTICIO')"),true);
      fase(`formulario ${rol}: edición`);await boton('Editar');
      assert.equal(await evaluate("document.querySelector('input[name=fechaEgreso]').value"),'2100-01-12');
      assert.equal(await evaluate("document.querySelector('input[name=montoEstimado]').value"),'0');
      assert.equal(await evaluate("Boolean(document.querySelector('select[name=idPropiedad]'))"),false,'Edición conserva la identidad y muestra los datos reales');
      assert.equal(await evaluate("document.querySelector('select[name=estado]').disabled"),rol==='Operador');
      await fill('input[name=fechaEgreso]','2100-01-13'); await enviar();
      await esperar("document.querySelector('.success-message')?.textContent.includes('modificada')");
      assert.equal(cambiosReservas.at(-1).ruta,'/reservas/9005');
      assert.equal(cambiosReservas.at(-1).body.fechaEgreso,'2100-01-13');
      assert.equal('idPropiedad' in cambiosReservas.at(-1).body,false);
      assert.equal('estado' in cambiosReservas.at(-1).body,rol==='Administrador');
      assert.equal('montoEstimado' in cambiosReservas.at(-1).body,rol==='Administrador');
      await recargar();await navegar();await esperar("Boolean(document.querySelector('.reservas-page .edit-button'))");
      fase(`formulario ${rol}: cancelación`);
      if(rol==='Administrador') {
        await boton('Cancelar','.reservas-page .table-actions');
        await esperar("document.querySelector('.success-message')?.textContent.includes('cancelada')");
        assert.equal(cambiosReservas.at(-1).ruta,'/reservas/9005/cancelar');
        await recargar();await navegar();await esperar("document.querySelector('.reservas-page').textContent.includes('Cancelada')");
      } else assert.equal(await evaluate("Boolean(document.querySelector('.reservas-page .cancel-button'))"),false,'Operador no tiene reservas.cancelar');
      const fin=altasReservas.length;await abrir();await listo();
      assert.equal(await evaluate("document.querySelector('#reserva-idPropiedad').value"),'');
      assert.equal(await evaluate("document.querySelector('input[name=fechaIngreso]').value"),'');
      assert.equal(altasReservas.length,fin);await boton('Cerrar formulario');
    });
  }
  for (const tipo of ['propiedades','huespedes']) for (const modo of ['vacio','error','prohibido','incompleto']) {
    await t.test(`catálogo ${tipo} ${modo}: sin fallback ni POST; recuperación explícita`,async()=>{
      fase(`catálogo ${tipo} ${modo}`); fixture({rol:'Administrador',formularioRealPrueba:true,modoPropiedadesReserva:tipo==='propiedades'?modo:'normal',modoHuespedesReserva:tipo==='huespedes'?modo:'normal'});
      await recargar();await navegar();const desde=requests.length;await abrir();
      const campo=tipo==='propiedades'?'idPropiedad':'idHuesped';
      await esperar(`document.querySelector('#reserva-${campo}-estado')?.textContent.includes(${JSON.stringify(modo==='vacio'?'No hay':'No se pudieron')})`);
      assert.equal(await evaluate(`document.querySelector('#reserva-${campo}').disabled`),true);
      assert.equal(await evaluate("document.querySelector('.form-card button[type=submit]').disabled"),true);
      assert.equal(await evaluate(`document.querySelector('#reserva-${campo}').options.length`),1);
      assert.deepEqual(requests.slice(desde).filter(r=>!['GET','OPTIONS'].includes(r.method)),[]);
      fixture({modoPropiedadesReserva:'normal',modoHuespedesReserva:'normal'});
      if(modo==='vacio'){await boton('Cerrar formulario');await abrir();}else await boton(`Reintentar carga de ${tipo==='propiedades'?'propiedades':'huéspedes'}`);
      await listo();assert.equal(await evaluate(`document.querySelector('#reserva-${campo}').value`),'');await boton('Cerrar formulario');
    });
  }
  await t.test('catálogos lentos/cierre: abort, carga bloqueada y sin escrituras',async()=>{
    fase('catálogos lentos');fixture({formularioRealPrueba:true,demoraCatalogosReserva:400,modoPropiedadesReserva:'normal',modoHuespedesReserva:'normal'});
    await recargar();await navegar();const desde=requests.length;await abrir();
    assert.equal(await evaluate("document.querySelector('#reserva-idPropiedad').disabled"),true);
    await boton('Cerrar formulario');await evaluate('new Promise(r=>setTimeout(r,500))');
    assert.equal(await evaluate("Boolean(document.querySelector('#reserva-idPropiedad'))"),false);
    fixture({demoraCatalogosReserva:0});await abrir();await listo();await completar();
    assert.deepEqual(requests.slice(desde).filter(r=>!['GET','OPTIONS'].includes(r.method)),[]);
    await boton('Cerrar formulario');
  });
  for(const rol of ['Administrador','Operador']) await t.test(`alta incierta ${rol}: móvil oscuro, selección conservada y sin reenvío`,async()=>{
    fase(`alta incierta ${rol}`);fixture({rol,formularioRealPrueba:true,falloAltaReserva:true});
    await recargar();await navegar();await abrir();await completar();
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:640,deviceScaleFactor:1,mobile:true});
    await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    const antes=altasReservas.length;await enviar();await esperar("document.querySelector('.reservas-page .error')?.textContent.includes('Recargá')");
    assert.equal(await evaluate("document.querySelector('#reserva-idPropiedad').value"),'5');
    assert.equal(await evaluate("document.querySelector('#reserva-idHuesped').value"),'17');
    assert.equal(await evaluate("Boolean(document.querySelector('.success-message'))"),false);
    await evaluate('new Promise(r=>setTimeout(r,250))');assert.equal(altasReservas.length,antes+1);
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await recargar();await navegar();assert.equal(altasReservas.length,antes+1);
    fixture({falloAltaReserva:false});
  });
  for(const rol of ['Administrador','Operador']) await t.test(`edición/cancelación ${rol}: conflicto e incertidumbre sin reenvío ni éxito previo`,async()=>{
    fase(`incertidumbre ${rol}`);fixture({rol,formularioRealPrueba:true,falloEdicionReserva:'',falloCancelacionReserva:false});
    await recargar();await navegar();await abrir();await completar();await enviar();await esperar("!document.querySelector('#reserva-idPropiedad')");
    for(const modo of ['conflicto','incierto']) {
      fixture({falloEdicionReserva:modo});await boton('Editar');await fill('input[name=fechaEgreso]','2100-01-13');const antes=cambiosReservas.length;
      await enviar();await esperar("document.querySelector('.reservas-page .error')?.textContent.includes('Recargá')");
      assert.equal(await evaluate("Boolean(document.querySelector('.success-message'))"),false);
      assert.equal(await evaluate("document.querySelector('input[name=fechaEgreso]').value"),'2100-01-13');
      await evaluate('new Promise(r=>setTimeout(r,200))');assert.equal(cambiosReservas.length,antes+1);await boton('Cancelar edición');
    }
    fixture({falloEdicionReserva:'',falloCancelacionReserva:true});const antes=cambiosReservas.length;
    if(rol==='Administrador') {
      await boton('Cancelar','.reservas-page .table-actions');await esperar("document.querySelector('.reservas-page .error')?.textContent.includes('Recargá')");
      assert.equal(await evaluate("Boolean(document.querySelector('.success-message'))"),false);
      await evaluate('new Promise(r=>setTimeout(r,200))');assert.equal(cambiosReservas.length,antes+1);
    } else assert.equal(await evaluate("Boolean(document.querySelector('.reservas-page .cancel-button'))"),false);
    await recargar();await navegar();assert.equal(cambiosReservas.length,antes+(rol==='Administrador'?1:0),'F5 no repite PUT/PATCH');
    fixture({falloCancelacionReserva:false});
  });
  fixture({formularioRealPrueba:false,demoraCatalogosReserva:0});
}

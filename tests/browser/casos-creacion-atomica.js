import assert from 'node:assert/strict';

// API ficticia interceptada por el contenedor antes de navegar; nunca usa Azure.
export async function probarCreacionAtomica({t, evaluate, send, fill, esperar, inicioVisible, fixture, fase, altasReservas}) {
  const boton = texto => evaluate(`[...document.querySelectorAll('.main button')].find(b=>b.textContent.trim()===${JSON.stringify(texto)}).click()`);
  const abrir = async () => {
    await boton('Nueva reserva'); await esperar("Boolean(document.querySelector('input[name=horaIngreso]'))");
    await fill('input[name=fechaIngreso]', '2100-01-10'); await fill('input[name=fechaEgreso]', '2100-01-12');
    await esperar("!document.querySelector('.settings-defaults-status')?.textContent.includes('Consultando')");
    await esperar("Boolean(document.querySelector('select[name=idPropiedad] option[value=\"1\"]') && document.querySelector('select[name=idHuesped] option[value=\"1\"]'))");
    await evaluate("for(const name of ['idPropiedad','idHuesped']) {const el=document.querySelector(`select[name=${name}]`);el.value='1';el.dispatchEvent(new Event('change',{bubbles:true}));}");
    await fill('input[name=cantidadHuespedes]','1'); await fill('input[name=montoEstimado]','0');
  };
  const enviar = () => evaluate("document.querySelector('input[name=horaIngreso]').form.requestSubmit()");
  for(const rol of ['Administrador','Operador']) {
    await t.test(`alta manual ${rol}: payload permitido e incertidumbre sin éxito o reenvío`, async () => {
      fase('alta manual ' + rol); fixture({rol,datosVisuales:true,falloAltaReserva:false});
      await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
      await evaluate('globalThis.__alta2d=true'); await send('Page.reload');
      await esperar(`globalThis.__alta2d===undefined && (${inicioVisible})`);
      await evaluate("[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.trim()==='Reservas').click()");
      await esperar("Boolean(document.querySelector('.reservas-page'))");
      await abrir(); const antes=altasReservas.length;
      await enviar(); await esperar("!document.querySelector('input[name=horaIngreso]')");
      assert.equal(altasReservas.length,antes+1);
      assert.equal(altasReservas.at(-1).rol,rol);
      assert.deepEqual(Object.keys(altasReservas.at(-1).body).sort(),['idPropiedad','idHuesped','fechaIngreso','horaIngreso','fechaEgreso','horaEgreso','cantidadHuespedes','montoEstimado'].sort());
      assert.equal(await evaluate("document.querySelector('.reservas-page .success-message')?.textContent.includes('registrada correctamente')"),true);

      fixture({falloAltaReserva:true}); await abrir(); const previas=altasReservas.length;
      await enviar(); await esperar("document.querySelector('.reservas-page .error')?.textContent.includes('Recargá')");
      assert.equal(await evaluate("Boolean(document.querySelector('.reservas-page .success-message'))"),false);
      assert.equal(await evaluate("Boolean(document.querySelector('input[name=horaIngreso]'))"),true,'El formulario no anuncia guardado ni se descarta ante incertidumbre');
      // Varias vueltas de evento/render para detectar un reenvío automático, sin pulsar guardar otra vez.
      await evaluate("new Promise(r=>setTimeout(r,300))");
      assert.equal(altasReservas.length,previas+1);
      await evaluate('globalThis.__alta2d=true'); await send('Page.reload');
      await esperar(`globalThis.__alta2d===undefined && (${inicioVisible})`);
      assert.equal(altasReservas.length,previas+1,'Recargar tampoco reenvía la solicitud incierta');
      fixture({falloAltaReserva:false});
    });
  }
}

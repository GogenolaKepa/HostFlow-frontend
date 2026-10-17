import assert from 'node:assert/strict';

// API interceptada por el contenedor ANTES de navegar. Nunca usa backend/Azure.
export async function probarOperacionesExplicitas({ t, evaluate, send, click, esperar, inicioVisible, requests, fixture, fase }) {
  const boton = (scope, texto) => evaluate(`[...document.querySelectorAll(${JSON.stringify(scope + ' button')})].find(b=>b.textContent.trim()===${JSON.stringify(texto)}).click()`);
  const navegar = async texto => {
    const movil = await evaluate('innerWidth < 701');
    if (movil) await click('.mobile-menu-toggle');
    await boton(movil ? '.mobile-nav-list' : '.sidebar-nav', texto);
  };
  const escrituras = desde => requests.slice(desde).filter(r => !['GET','HEAD','OPTIONS'].includes(r.method));
  const confirmar = () => boton('dialog[open]', 'Confirmar operación');
  await t.test('navegar y recargar operación, Calendario y FlowIA no envían comandos, ambos roles', async () => {
    for (const rol of ['Administrador','Operador']) {
      fase('lecturas explícitas ' + rol); fixture({ rol, datosVisuales: true });
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 820, deviceScaleFactor: 1, mobile: false });
      await evaluate('globalThis.__recargaOperacion = true'); await send('Page.reload');
      await esperar(`globalThis.__recargaOperacion === undefined && (${inicioVisible})`);
      const desde = requests.length;
      await navegar('Reservas'); await esperar("Boolean(document.querySelector('.reservas-page'))");
      assert.equal(await evaluate("[...document.querySelectorAll('.reservas-header-actions button')].some(b=>b.textContent==='Finalizar vencidas')"), rol === 'Administrador');
      await navegar('Limpiezas'); await esperar("Boolean(document.querySelector('.limpiezas-header'))");
      await boton('.limpiezas-header', 'Recargar datos');
      await navegar('Alertas'); await esperar("Boolean(document.querySelector('.alertas-page'))");
      await boton('.alertas-page-header', 'Recargar datos');
      await navegar('Calendario'); await esperar("Boolean(document.querySelector('.calendar-page, .calendario-page'))");
      await click('.sidebar-flowia'); await esperar("Boolean(document.querySelector('.flowia-card'))");
      await click('.flowia-close'); await esperar("!document.querySelector('.flowia-panel')");
      assert.deepEqual(escrituras(desde), []);
    }
  });
  await t.test('sincronizar requiere confirmación, cancelar no escribe y doble clic envía un comando', async () => {
    fase('confirmaciones explícitas');
    await navegar('Limpiezas'); await esperar("Boolean(document.querySelector('.limpiezas-header'))");
    const desde = requests.length;
    await boton('.limpiezas-header', 'Sincronizar'); await esperar("Boolean(document.querySelector('dialog[open]'))");
    assert.equal(escrituras(desde).length, 0);
    await boton('dialog[open]', 'Cancelar'); assert.equal(escrituras(desde).length, 0);
    await boton('.limpiezas-header', 'Sincronizar'); await esperar("Boolean(document.querySelector('dialog[open]'))");
    await evaluate("(() => {const b=[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Confirmar operación');b.click();b.click();})()");
    await esperar("!document.querySelector('dialog[open]')");
    assert.equal(escrituras(desde).filter(r=>r.ruta==='/limpiezas/sincronizar').length, 1);
    await navegar('Alertas'); await esperar("Boolean(document.querySelector('.alertas-page'))");
    const antes = requests.length;
    await boton('.alertas-page-header', 'Sincronizar alertas'); await esperar("Boolean(document.querySelector('dialog[open]'))");
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await esperar("!document.querySelector('dialog[open]')"); assert.equal(escrituras(antes).length, 0);
    await boton('.alertas-page-header', 'Sincronizar alertas'); await esperar("Boolean(document.querySelector('dialog[open]'))"); await confirmar();
    await esperar("!document.querySelector('dialog[open]')"); assert.equal(escrituras(antes).length, 1);
  });
  await t.test('Administrador finaliza solo tras confirmar; diálogo usable en móvil y tema oscuro', async () => {
    fase('finalización confirmada'); fixture({ rol: 'Administrador' });
    await evaluate('globalThis.__recargaOperacion = true'); await send('Page.reload');
    await esperar(`globalThis.__recargaOperacion === undefined && (${inicioVisible})`);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");
    await navegar('Reservas'); await esperar("Boolean(document.querySelector('.reservas-page'))");
    const desde = requests.length;
    await boton('.reservas-header-actions', 'Finalizar vencidas'); await esperar("Boolean(document.querySelector('dialog[open]'))");
    assert.equal(escrituras(desde).length, 0);
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
    assert.equal(await evaluate("document.querySelector('dialog').contains(document.activeElement)"), true);
    await confirmar(); await esperar("!document.querySelector('dialog[open]')");
    assert.equal(escrituras(desde).filter(r=>r.ruta==='/reservas/finalizar-vencidas').length, 1);
    await evaluate("globalThis.HostFlowAppearance.setPreference('claro')");
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 820, deviceScaleFactor: 1, mobile: false });
  });
  await t.test('resultado incierto no muestra éxito ni reintenta el comando automáticamente', async () => {
    fase('fallo de comando explícito'); fixture({ falloMantenimiento: true });
    await navegar('Limpiezas'); await esperar("Boolean(document.querySelector('.limpiezas-header'))");
    const desde = requests.length;
    await boton('.limpiezas-header', 'Sincronizar'); await esperar("Boolean(document.querySelector('dialog[open]'))");
    await confirmar(); await esperar("!document.querySelector('dialog[open]')");
    await esperar("document.querySelector('.limpiezas-message--error')?.textContent.includes('Recargá')");
    assert.equal(await evaluate("Boolean(document.querySelector('.limpiezas-message--success'))"), false);
    await boton('.limpiezas-header', 'Recargar datos');
    assert.equal(escrituras(desde).length, 1, 'Recargar no repite un POST de resultado incierto');
    fixture({ falloMantenimiento: false });
  });
}

/* Aplica exclusivamente el marco visual. Las rutas iniciales no acreditan una sesión. */
(function () {
  const html = document.documentElement;
  const viewport = document.querySelector('meta[name="viewport"]');
  const color = document.querySelector('meta[name="theme-color"]');
  const viewportOriginal = viewport.content;
  const colorOriginal = color.content;
  const movil = matchMedia('screen and (max-width: 700px), screen and (pointer: coarse)');
  const ventanaInstalada = matchMedia('(display-mode: standalone)');
  let contenedor;
  let cuadro = 0;

  function modoInicial() {
    const ruta = location.pathname.replace(/\/+$/, '');
    if (['/clientes/login', '/clientes/verificar'].includes(ruta)) return 'clientes';
    if (!ruta || /^\/(?:login|acceso|demo|clientes|cuenta)(?:\/|$)/.test(ruta)) return 'publico';
    return 'espacio';
  }

  function actualizar() {
    const instalada = ventanaInstalada.matches || navigator.standalone === true;
    if (!movil.matches && !instalada) {
      delete html.dataset.hfChrome;
      delete html.dataset.hfStandalone;
      if (viewport.content !== viewportOriginal) viewport.content = viewportOriginal;
      if (color.content !== colorOriginal) color.content = colorOriginal;
      return;
    }

    const panel = contenedor?.querySelector('[data-hf-workspace]');
    const pantalla = contenedor?.firstElementChild;
    let modo = modoInicial();
    if (panel) modo = 'espacio';
    else if (pantalla && !pantalla.classList.contains('hf-arranque')) {
      modo = contenedor.querySelector('.hf-cliente:not(.hf-entrada-publica)') ? 'clientes' : 'publico';
    }
    if (html.dataset.hfChrome !== modo) html.dataset.hfChrome = modo;
    html.toggleAttribute('data-hf-standalone', instalada);

    const buscador = panel?.hasAttribute('data-vista-con-buscador');
    const encuadre = viewportOriginal + ', viewport-fit=cover'
      + (buscador ? ', interactive-widget=resizes-content' : '');
    if (viewport.content !== encuadre) viewport.content = encuadre;

    const fondo = getComputedStyle(html).getPropertyValue('--hf-browser-background').trim();
    if (color.content !== (fondo || colorOriginal)) color.content = fondo || colorOriginal;
  }

  function conectar(raiz) {
    contenedor = raiz;
    const observador = new MutationObserver(() => {
      if (!html.hasAttribute('data-hf-chrome') || cuadro) return;
      cuadro = requestAnimationFrame(() => {
        cuadro = 0;
        actualizar();
      });
    });
    observador.observe(raiz, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-vista-con-buscador', 'data-hf-workspace'],
    });
    actualizar();
  }

  actualizar();
  // El build agrupa el CSS en un enlace render-blocking al final de <head>.
  document.addEventListener('load', ({ target }) => {
    if (target.tagName === 'LINK' && target.rel === 'stylesheet') actualizar();
  }, true);
  for (const consulta of [movil, ventanaInstalada]) {
    if (consulta.addEventListener) consulta.addEventListener('change', actualizar);
    else consulta.addListener(actualizar);
  }
  globalThis.HostFlowAppearance.subscribe(actualizar);
  globalThis.HostFlowMobileChrome = Object.freeze({ conectar });
})();

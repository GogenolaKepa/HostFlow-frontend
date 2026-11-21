// Se inicia después de retirar los tokens de recuperación de la URL.
export function iniciarEncuadreMovil(contenedor) {
  const html = document.documentElement;
  const viewport = document.querySelector('meta[name="viewport"]');
  const color = document.querySelector('meta[name="theme-color"]');
  const viewportOriginal = viewport.content;
  const colorOriginal = color.content;
  const movil = window.matchMedia("screen and (max-width: 700px)");
  let cuadro = 0;

  function actualizar() {
    cuadro = 0;
    const panel = contenedor.querySelector("[data-hf-workspace]");
    const modo = panel ? "espacio" : "publico";
    if (html.dataset.hfChrome !== modo) html.dataset.hfChrome = modo;

    const buscador = panel?.hasAttribute("data-vista-con-buscador");
    const encuadre = viewportOriginal + ", viewport-fit=cover"
      + (buscador ? ", interactive-widget=resizes-content" : "");
    if (viewport.content !== encuadre) viewport.content = encuadre;

    const fondo = getComputedStyle(html).getPropertyValue("--hf-browser-background").trim();
    const colorActivo = fondo || colorOriginal;
    if (color.content !== colorActivo) color.content = colorActivo;
  }

  const observador = new MutationObserver(() => {
    if (!cuadro) cuadro = requestAnimationFrame(actualizar);
  });

  function cambiarPantalla() {
    if (movil.matches) {
      observador.observe(contenedor, {
        childList: true, subtree: true, attributes: true, attributeFilter: ["data-vista-con-buscador"],
      });
      observador.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
      actualizar();
    } else {
      observador.disconnect();
      cancelAnimationFrame(cuadro);
      cuadro = 0;
      delete html.dataset.hfChrome;
      viewport.content = viewportOriginal;
      color.content = colorOriginal;
    }
  }

  cambiarPantalla();
  movil.addEventListener("change", cambiarPantalla);
}

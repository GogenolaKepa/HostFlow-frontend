// Metadatos por documento. No lee sesión ni parámetros privados de la URL.
(() => {
  const ruta=window.location.pathname.replace(/\/$/,'')||'/';
  const demo=ruta==='/demo',publica=ruta==='/'||demo;
  const titulo=demo?'Demo interactiva | HostFlow':publica?'HostFlow | Gestión de alojamientos temporarios':'Acceso a tu cuenta | HostFlow';
  document.title=titulo;
  const meta=(selector,atributo,valor)=>{const n=document.querySelector(selector);if(n)n.setAttribute(atributo,valor);};
  meta('meta[name="robots"]','content',publica?'index,follow':'noindex,nofollow');
  const canonical='https://hostflow.com.ar'+(demo?'/demo':publica?'':ruta);
  meta('link[rel="canonical"]','href',canonical);
  meta('meta[property="og:url"]','content',canonical);
  meta('meta[property="og:title"]','content',titulo);
  if(demo)meta('meta[name="description"]','content','Explorá HostFlow con datos ficticios, sin una cuenta y sin acceder a información operativa real.');
})();

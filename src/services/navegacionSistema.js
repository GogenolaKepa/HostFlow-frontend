import {puedeGestionarUsuarios} from './cuentas.js';

const titulos = {
  inicio: 'Inicio', propiedades: 'Propiedades', reservas: 'Reservas', huespedes: 'Huéspedes',
  calendario: 'Calendario', limpiezas: 'Limpiezas', reportes: 'Reportes', alertas: 'Alertas',
  notificaciones: 'Notificaciones', usuarios: 'Usuarios', configuracion: 'Configuración', 'mi-cuenta': 'Mi cuenta',
};
const apartados = {
  apariencia: 'Apariencia', generales: 'Preferencias generales', operativas: 'Preferencias operativas',
  empresa: 'Datos de empresa', monedas: 'Monedas y cotizaciones', notificaciones: 'Notificaciones',
  integraciones: 'Integraciones', seguridad: 'Seguridad y acceso',
};
const marca = 'hostflowNavegacion';

export function resolverRutaSistema(pathname, usuario) {
  const [seccionSolicitada, apartadoSolicitado, extra] = pathname.replace(/^\/+|\/+$/g, '').split('/');
  let seccion = Object.hasOwn(titulos, seccionSolicitada) && !extra ? seccionSolicitada : 'inicio';
  if (apartadoSolicitado && seccion !== 'configuracion') seccion = 'inicio';
  if (seccion === 'usuarios' && !puedeGestionarUsuarios(usuario)) seccion = 'inicio';
  if (seccion === 'notificaciones' && !usuario?.permisos?.includes('notificaciones.ver')) seccion = 'inicio';
  let apartado = seccion === 'configuracion' && Object.hasOwn(apartados, apartadoSolicitado) ? apartadoSolicitado : 'apariencia';
  const permisos = usuario?.permisos || [];
  if ((['empresa', 'operativas', 'monedas'].includes(apartado) && !permisos.includes('configuracion.ver')) ||
      (apartado === 'notificaciones' && !permisos.includes('notificaciones.preferencias')) ||
      (['integraciones', 'seguridad'].includes(apartado) && !permisos.includes('usuarios.ver'))) apartado = 'apariencia';
  return {
    seccion, apartado,
    url: `/${seccion}${seccion === 'configuracion' && apartado !== 'apariencia' ? '/' + apartado : ''}`,
    titulo: `${seccion === 'configuracion' && apartado !== 'apariencia' ? apartados[apartado] : titulos[seccion]} | HostFlow`,
  };
}

// Solo navegación de la interfaz autenticada. Nunca valida ni restaura una sesión.
// Cada entrada conserva su posición para poder deshacer Atrás/Adelante sin
// descartar un borrador ni dejar la URL mostrando otra pantalla.
export function crearNavegacionSistema({ventana, usuario, protector, alCambiar}) {
  const {history, location} = ventana;
  let indice = Number.isSafeInteger(history.state?.[marca]) ? history.state[marca] : 0;
  let actual, restaurar = null, aprobada = null, activo = true;
  const reemplazar = (ruta, n) => history.replaceState({...history.state, [marca]: n}, '', ruta.url);
  const aplicar = (ruta, n) => {
    indice = n; actual = ruta;
    reemplazar(ruta, n);
    alCambiar(ruta);
  };
  aplicar(resolverRutaSistema(location.pathname, usuario), indice);
  const alVolver = () => {
    if (!activo) return;
    const destino = resolverRutaSistema(location.pathname, usuario);
    const n = history.state?.[marca];
    if (restaurar) {
      const pendiente = restaurar; restaurar = null;
      if (n !== indice || destino.url !== actual.url) { reemplazar(actual, indice); return; }
      protector.solicitar(() => {
        if (!activo) return;
        aprobada = pendiente;
        history.go(pendiente.indice - indice);
      });
      return;
    }
    if (aprobada && n === aprobada.indice && destino.url === aprobada.url) {
      aprobada = null; aplicar(destino, n); return;
    }
    aprobada = null;
    const estado = protector.estado();
    if (estado.tieneCambios || estado.ocupado || estado.pendiente) {
      if (!Number.isSafeInteger(n) || n === indice) { reemplazar(actual, indice); return; }
      restaurar = {indice: n, url: destino.url};
      history.go(indice - n);
      return;
    }
    aplicar(destino, Number.isSafeInteger(n) ? n : indice);
  };
  ventana.addEventListener('popstate', alVolver);
  return {
    navegar(seccion, apartado = 'apariencia') {
      const ruta = resolverRutaSistema(`/${seccion}${seccion === 'configuracion' ? '/' + apartado : ''}`, usuario);
      if (ruta.url === actual.url) return;
      // Los llamadores ya pasaron por el protector de borradores.
      restaurar = null; aprobada = null;
      history.pushState({...history.state, [marca]: indice + 1}, '', ruta.url);
      aplicar(ruta, indice + 1);
    },
    cerrar() { activo = false; ventana.removeEventListener('popstate', alVolver); },
  };
}

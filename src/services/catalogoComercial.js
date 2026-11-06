// Catálogo comercial de presentación. No cobra ni activa suscripciones. Importes enteros en centavos de USD.
export const planes = Object.freeze([
  Object.freeze({ id: 'inicial', nombre: 'Inicial', propiedades: 2, usuarios: 1, mensualCentavos: 999, anualCentavos: 10989,
    enfoque: 'Tu operación cotidiana',
    descripcion: 'Para organizar una cartera pequeña con una persona a cargo del sistema.' }),
  Object.freeze({ id: 'profesional', nombre: 'Profesional', propiedades: 10, usuarios: 3, mensualCentavos: 2999, anualCentavos: 32989,
    enfoque: 'Tu equipo, coordinado',
    descripcion: 'Para acompañar una cartera en crecimiento y coordinar el trabajo del equipo.' }),
  Object.freeze({ id: 'gestion', nombre: 'Gestión', propiedades: 50, usuarios: 10, mensualCentavos: 7999, anualCentavos: 87989,
    enfoque: 'Una cartera de mayor alcance',
    descripcion: 'Para gestionar más alojamientos y personas dentro de una misma empresa.' }),
]);

export function formatoUSD(centavos) {
  if (!Number.isSafeInteger(centavos) || centavos < 0) throw Error('IMPORTE_INVALIDO');
  const enteros = String(Math.floor(centavos / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'US$' + enteros + ',' + String(centavos % 100).padStart(2, '0');
}

export function precioPlan(plan, ciclo) {
  if (!planes.includes(plan) || !['mensual', 'anual'].includes(ciclo)) throw Error('PLAN_INVALIDO');
  return formatoUSD(ciclo === 'anual' ? plan.anualCentavos : plan.mensualCentavos);
}

export function descuentoAnualPuntosBase(plan) {
  if (!planes.includes(plan)) throw Error('PLAN_INVALIDO');
  const doceMeses = plan.mensualCentavos * 12;
  const ahorro = doceMeses - plan.anualCentavos;
  // Redondeo de la proporción a dos decimales porcentuales, usando enteros.
  return Math.floor((ahorro * 10000 + Math.floor(doceMeses / 2)) / doceMeses);
}

export const catalogoComercial = Object.freeze({
  version: 2,
  canalContacto: 'contacto@hostflow.com.ar',
  contratacionHabilitada: false,
  planes,
});

export function presentarModalidad(plan, ciclo = 'mensual') {
  return Object.freeze({
    precio: precioPlan(plan, ciclo),
    periodicidad: ciclo,
    disponibilidad: 'Incorporación asistida',
    alojamientos: String(plan.propiedades),
    usuarios: String(plan.usuarios),
  });
}

export function orientarModalidad(forma) {
  return forma === 'individual' ? 'inicial' : forma === 'equipo' ? 'profesional' : null;
}

export function prepararSolicitudComercial(planId, alojamientos = '', ciclo = 'mensual') {
  const plan = planes.find(p => p.id === planId);
  if (!plan || !['mensual', 'anual'].includes(ciclo)) throw new TypeError('Elegí un plan y una periodicidad disponibles.');
  const cantidad = String(alojamientos).trim();
  if (cantidad && !/^[1-9]\d{0,4}$/.test(cantidad)) throw new TypeError('Ingresá una cantidad de alojamientos entre 1 y 99999.');
  return 'Hola, quiero conocer HostFlow y coordinar una demostración.\nPlan de interés: ' + plan.nombre +
    '.\nPeriodicidad: ' + ciclo + '.\nAlojamientos: ' + (cantidad || 'a definir') +
    '.\nEsta consulta no constituye una contratación ni crea una cuenta.';
}

export function prepararCorreoComercial(datos) {
  const texto = (valor, min, max) => typeof valor === 'string' && valor.trim().length >= min && valor.trim().length <= max;
  if (!texto(datos.nombre, 2, 100) || !texto(datos.correo, 3, 254) || !texto(datos.empresa, 0, 120) ||
      !texto(datos.mensaje, 10, 2000) || datos.consentimiento !== true) {
    throw new TypeError('Completá los datos y autorizá su uso para responder la consulta.');
  }
  if (/[\r\n]/.test(datos.correo) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) throw new TypeError('Ingresá un correo válido.');
  const solicitud = prepararSolicitudComercial(datos.plan, datos.alojamientos, datos.periodicidad);
  const mensaje = solicitud + '\n\nNombre: ' + datos.nombre.trim() + '\nCorreo: ' + datos.correo.trim() +
    '\nEmpresa / equipo: ' + (datos.empresa.trim() || 'Sin indicar') + '\n\n' + datos.mensaje.trim();
  return Object.freeze({
    mensaje,
    href: 'mailto:contacto@hostflow.com.ar?subject=' + encodeURIComponent('Consulta sobre HostFlow') + '&body=' + encodeURIComponent(mensaje),
  });
}

export const herramientas = Object.freeze([
  'Propiedades y huéspedes organizados',
  'Reservas e historial de cada estadía',
  'Calendario y seguimiento de limpiezas',
  'Dashboard, reportes y alertas',
  'Acceso con roles Administrador y Operador',
]);

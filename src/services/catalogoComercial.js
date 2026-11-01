// Catálogo de presentación. No aplica límites, cobra ni aprovisiona empresas.
// Publicar precios o un canal comercial requiere datos aprobados, no valores de ejemplo.
const modalidad=(id,nombre,descripcion,caracteristicas,destacado=false)=>Object.freeze({
  id,nombre,descripcion,estado:'propuesta',precio:null,moneda:null,periodicidad:null,
  limites:Object.freeze({alojamientos:null,usuarios:null}),
  caracteristicas:Object.freeze(caracteristicas),destacado,
  orientacion:destacado?'equipo':'individual',
  cta:Object.freeze({tipo:'preparar-solicitud',texto:'Consultar esta modalidad'}),
});

export function presentarModalidad(plan){
 return Object.freeze({
  precio:plan.precio===null||plan.moneda===null?'A consultar':`${plan.moneda} ${new Intl.NumberFormat('es-AR').format(plan.precio)}`,
  periodicidad:plan.periodicidad||'A definir',
  disponibilidad:plan.estado==='propuesta'?'Propuesta a confirmar':plan.estado,
  alojamientos:plan.limites.alojamientos===null?'A definir':String(plan.limites.alojamientos),
  usuarios:plan.limites.usuarios===null?'A definir':String(plan.limites.usuarios),
 });
}
export function orientarModalidad(formaTrabajo){
 if(!['individual','equipo'].includes(formaTrabajo))return null;
 return catalogoComercial.planes.find(p=>p.orientacion===formaTrabajo)?.id||null;
}
export const catalogoComercial=Object.freeze({
  version:1,canalContacto:null,contratacionHabilitada:false,
  planes:Object.freeze([
    modalidad('operacion','Tu operación','Para centralizar tus alojamientos y organizar el día a día.',[
      'Propiedades, huéspedes y reservas','Calendario y tareas de limpieza','Dashboard, reportes y alertas',
    ]),
    modalidad('equipo','Tu equipo','Para coordinar la gestión y trabajar con responsabilidades claras.',[
      'Visión centralizada de la operación','Acceso con roles Administrador y Operador','Gestión controlada de usuarios y notificaciones',
    ],true),
  ]),
});

export function prepararSolicitudComercial(planId,alojamientos=''){
  const plan=catalogoComercial.planes.find(p=>p.id===planId);
  if(!plan)throw new TypeError('Elegí una modalidad disponible.');
  const cantidad=String(alojamientos).trim();
  if(cantidad&&!/^[1-9]\d{0,4}$/.test(cantidad))throw new TypeError('Ingresá una cantidad de alojamientos entre 1 y 99999.');
  return `Hola, quiero conocer HostFlow y coordinar una demostración.\nModalidad de interés: ${plan.nombre}.\nAlojamientos: ${cantidad||'a definir'}.\nMe gustaría recibir una propuesta con alcance, límites y precio.\nEsta consulta no constituye una contratación ni crea una cuenta.`;
}

export const TIPOS_NOTIFICACION = Object.freeze({
  RESERVA_NUEVA: ['Reservas nuevas', 'Cuando se confirme una nueva reserva.'],
  RESERVA_CANCELADA: ['Cancelaciones', 'Cuando una reserva sea cancelada.'],
  RESERVA_MODIFICADA: ['Cambios importantes', 'Cuando cambien datos relevantes de una reserva.'],
  LIMPIEZA_PENDIENTE: ['Limpiezas pendientes', 'Cuando una limpieza requiera atención.'],
  LIMPIEZA_PROXIMA: ['Limpiezas próximas', 'Cuando se acerque el momento de una limpieza.'],
  CONFLICTO_DISPONIBILIDAD: ['Conflictos de disponibilidad', 'Cuando sea necesario revisar una superposición.'],
  ALERTA_CRITICA: ['Alertas críticas', 'Cuando una situación operativa sea prioritaria.'],
  SISTEMA_INFORMATIVO: ['Información del sistema', 'Para futuros avisos informativos internos.'],
});
export const PRIORIDADES_AVISO = Object.freeze({Critica:'Crítica',Alta:'Alta',Media:'Media',Informativa:'Informativa',NoDefinida:'Sin clasificar'});
export const cantidadAvisos = total => total===0?'Ningún aviso disponible':total===1?'1 aviso disponible':`${total} avisos disponibles`;
export function estadoErrorNotificaciones(error){
  const codigo=error?.response?.data?.codigo,status=error?.response?.status;
  if(codigo==='NOTIFICACIONES_NO_ACTIVADAS')return {tipo:'desactivada',titulo:'Preferencias personales todavía no activadas',descripcion:'La función está desactivada por configuración del servidor. No se simula ningún guardado.',reintentar:false};
  if(codigo==='NOTIFICACIONES_MODELO_PENDIENTE')return {tipo:'modelo',titulo:'Persistencia SQL pendiente de preparación',descripcion:'La estructura o la vinculación del servidor no está preparada. Requiere revisión administrativa.',reintentar:false};
  if(status===401)return {tipo:'sesion',titulo:'La sesión venció',descripcion:'Volvé a iniciar sesión para continuar.',reintentar:false};
  if(status===403)return {tipo:'permiso',titulo:'Acceso no autorizado',descripcion:codigo==='PASSWORD_CHANGE_REQUIRED'?'Completá el cambio obligatorio de contraseña.':'Tu cuenta no tiene permiso para esta consulta.',reintentar:false};
  if(error?.codigo==='CONTRATO_INCOMPLETO')return {tipo:'contrato',titulo:'Respuesta incompleta',descripcion:'El servidor no devolvió información válida. No se confirmó ninguna operación.',reintentar:true};
  return {tipo:'conexion',titulo:'No pudimos consultar los avisos o preferencias',descripcion:'Comprobá la conexión y reintentá. No se modificó ninguna alerta.',reintentar:true};
}
export function preferenciasValidas(data) {
  const lista=data?.preferencias;
  return data?.estado?.persistencia==='sql'&&typeof data.estado.soloLectura==='boolean'&&Array.isArray(lista)&&lista.length===8
    &&lista.every(p=>p&&typeof p==='object')&&new Set(lista.map(p=>p.tipo)).size===8&&lista.every(p=>Object.hasOwn(TIPOS_NOTIFICACION,p.tipo)&&typeof p.habilitada==='boolean'
      &&typeof p.persistida==='boolean'&&(p.persistida?/^[a-f0-9]{16}$/i.test(p.versionRegistro):p.versionRegistro===null));
}
export function guardadoPreferenciasValido(data,solicitadas) {
  if(!preferenciasValidas(data)||data.estado.soloLectura||!Array.isArray(solicitadas)||solicitadas.length!==8)return false;
  const opciones=new Map(solicitadas.map(p=>[p.tipo,p.habilitada]));
  return opciones.size===8&&data.preferencias.every(p=>p.persistida&&opciones.get(p.tipo)===p.habilitada);
}
export function avisosValidos(data){
  const tipos=['CHECKIN_PROXIMO','CONFLICTO_RESERVAS','INCIDENCIA_ABIERTA','SINCRONIZACION_ERROR'];
  return data?.origen==='alertas_persistidas'&&data.lecturaPersonal===false&&Array.isArray(data.avisos)&&data.avisos.length<=50
    &&Number.isSafeInteger(data.paginacion?.total)&&data.paginacion.total>=0&&Number.isSafeInteger(data.paginacion.paginas)&&data.paginacion.paginas>=1
    &&Number.isSafeInteger(data.paginacion.totalSinFiltros)&&data.paginacion.totalSinFiltros>=data.paginacion.total&&data.avisos.length<=data.paginacion.total
    &&data.avisos.every(a=>a&&typeof a==='object')&&new Set(data.avisos.map(a=>a.idAviso)).size===data.avisos.length
    &&data.avisos.every(a=>Number.isSafeInteger(a.idAviso)&&a.idAviso>0&&tipos.includes(a.tipo)&&['reservas','alertas'].includes(a.categoria)
      &&Object.hasOwn(PRIORIDADES_AVISO,a.prioridad)&&typeof a.titulo==='string'&&Boolean(a.titulo.trim())&&typeof a.descripcion==='string'
      &&(a.fecha===null||typeof a.fecha==='string'&&Number.isFinite(new Date(a.fecha).getTime()))&&a.destino?.seccion==='alertas');
}

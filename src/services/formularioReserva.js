const ID_MAXIMO = 2147483647;
const idValido = valor => /^[1-9]\d{0,9}$/.test(String(valor)) && Number(valor) <= ID_MAXIMO;
export function confirmacionReservaValida(reserva,datos,id){
 if(!reserva||!Number.isInteger(reserva.idReserva)||!idValido(reserva.idReserva)||(id&&reserva.idReserva!==Number(id)))return false;
 return Object.entries(datos).filter(([k])=>!['acuerdoMonetario','versionEdicion'].includes(k)).every(([k,v])=>['idPropiedad','idHuesped','cantidadHuespedes','montoEstimado'].includes(k)?Number(reserva[k])===Number(v):reserva[k]===v);
}

export function formularioReservaVacio() {
  return { idPropiedad: '', idHuesped: '', fechaIngreso: '', horaIngreso: '',
    fechaEgreso: '', horaEgreso: '', cantidadHuespedes: '', montoEstimado: '' };
}

// Los GET actuales devuelven listas completas, sin filtros ni paginacion.
// Proyectar solo identidad/etiqueta; no conservar datos de contacto en el catalogo.
export function leerCatalogoReserva(respuesta, tipo) {
  const campoId = { propiedades: 'idPropiedad', huespedes: 'idHuesped' }[tipo];
  const datos = respuesta?.data, lista = datos?.[tipo];
  if (!campoId || !Array.isArray(lista) || datos.paginacion != null) throw Error('Catálogo incompleto.');
  const ids = new Set();
  return lista.map(item => {
    if (!item || !idValido(item[campoId]) || ids.has(Number(item[campoId])) ||
      typeof item.nombre !== 'string' || !item.nombre.trim() ||
      (tipo === 'huespedes' && (typeof item.apellido !== 'string' || !item.apellido.trim()))) throw Error('Catálogo inválido.');
    const id = Number(item[campoId]); ids.add(id);
    return { id, nombre: tipo === 'huespedes' ? `${item.nombre} ${item.apellido}` : item.nombre };
  });
}

export function seleccionReservaValida(valor, catalogo) {
  return idValido(valor) && catalogo.some(item => item.id === Number(valor));
}

export function payloadReserva(formulario, propiedades, huespedes) {
  if (!seleccionReservaValida(formulario.idPropiedad, propiedades) ||
    !seleccionReservaValida(formulario.idHuesped, huespedes)) throw Error('Seleccioná una propiedad y un huésped disponibles.');
  if (['fechaIngreso','horaIngreso','fechaEgreso','horaEgreso','cantidadHuespedes','montoEstimado']
    .some(campo => String(formulario[campo] ?? '').trim() === '')) throw Error('Completá los datos obligatorios de la reserva.');
  const cantidad = Number(formulario.cantidadHuespedes), monto = Number(formulario.montoEstimado);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > ID_MAXIMO || !Number.isFinite(monto) || monto < 0) throw Error('Revisá la cantidad de huéspedes y el importe.');
  return { idPropiedad: Number(formulario.idPropiedad), idHuesped: Number(formulario.idHuesped),
    fechaIngreso: formulario.fechaIngreso, horaIngreso: formulario.horaIngreso,
    fechaEgreso: formulario.fechaEgreso, horaEgreso: formulario.horaEgreso,
    cantidadHuespedes: cantidad, montoEstimado: monto };
}

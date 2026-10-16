// Contratos de lectura: una respuesta incompleta debe poder reintentarse;
// no equivale a una operación sin recomendaciones o sin historial.
const objeto = valor => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
export function validarAnalisisFlowIA(datos) {
  if (!objeto(datos) || !Array.isArray(datos.recomendaciones)) throw new Error('Análisis incompleto.');
  const ids = new Set();
  for (const item of datos.recomendaciones) {
    if (!objeto(item) || !['string','number'].includes(typeof item.id) || !String(item.id) || ids.has(String(item.id))) throw new Error('Recomendación inválida.');
    ids.add(String(item.id));
    for (const campo of ['titulo','descripcion','accion']) {
      if (typeof item[campo] !== 'string' || !item[campo].trim()) throw new Error('Recomendación incompleta.');
    }
    if (!['Alta','Media','Baja'].includes(item.prioridad)) throw new Error('Prioridad inválida.');
    if (item.fundamentoIA != null && typeof item.fundamentoIA !== 'string') throw new Error('Explicación inválida.');
    if (item.destino != null && (!objeto(item.destino) || typeof item.destino.seccion !== 'string')) throw new Error('Destino inválido.');
  }
  return datos;
}
export function leerListaDetalle(respuesta, campo) {
  const lista = respuesta?.data?.[campo];
  if (!Array.isArray(lista) || lista.some(item => !objeto(item))) throw new Error('Detalle incompleto.');
  return lista;
}

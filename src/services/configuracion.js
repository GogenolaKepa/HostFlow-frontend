export const LIMITES_EMPRESA = Object.freeze({ nombreComercial: 120, razonSocial: 180, correoContacto: 254,
  telefono: 40, pais: 80, provincia: 100, ciudad: 100, direccion: 240, informacionAdicional: 1000 });

// La UI cierra la edición ante contratos incompletos; la autorización real sigue
// en el backend y nunca se deriva de localStorage o una bandera VITE.
export function estadoConfiguracionValido(estado) {
  return estado?.persistencia === 'sql' && typeof estado.soloLectura === 'boolean';
}

export function validarConfiguracion(tipo, datos) {
  const errores = {};
  if (tipo === 'empresa') {
    for(const [campo,limite] of Object.entries(LIMITES_EMPRESA)) {
      const valor = datos[campo];
      const tieneControl = typeof valor === 'string' && [...valor].some(c=>{
        const n=c.charCodeAt(0);return (n<32||n===127) && !(campo==='informacionAdicional'&&[9,10,13].includes(n));
      });
      if(typeof valor !== 'string' || tieneControl || valor.trim().length > limite) errores[campo] = `Revisá este campo (máximo ${limite} caracteres).`;
    }
    if(typeof datos.nombreComercial === 'string' && !datos.nombreComercial.trim()) errores.nombreComercial = 'Ingresá el nombre comercial.';
    if(typeof datos.correoContacto === 'string' && datos.correoContacto.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correoContacto.trim())) errores.correoContacto = 'Ingresá un correo de contacto válido.';
  } else {
    for(const campo of ['horaIngreso','horaEgreso']) if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(datos[campo] || '')) errores[campo] = 'Ingresá un horario válido (HH:mm).';
  }
  return errores;
}

// Una respuesta tardía nunca debe pisar horarios que la persona ya modificó.
export function aplicarPredeterminados(formulario, predeterminados, modificados = new Set()) {
  const siguiente = { ...formulario };
  for(const campo of ['horaIngreso','horaEgreso']) {
    if(!modificados.has(campo) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(predeterminados?.[campo] || '')) siguiente[campo] = predeterminados[campo];
  }
  return siguiente;
}

export function mensajeConfiguracion(error) {
  if(error.codigo === 'CONFIGURACION_CONFIRMACION_PENDIENTE') return 'No recibimos una confirmación válida del guardado. Recargá los datos para comprobar el estado antes de volver a guardar.';
  return error.response?.data?.mensaje || 'No se pudo completar la operación. Comprobá la conexión y reintentá.';
}

export function respuestaConfiguracionValida(tipo, datos) {
  if(!datos || typeof datos.versionRegistro !== 'string' || !/^[a-f0-9]{16}$/i.test(datos.versionRegistro)) return false;
  if(tipo === 'empresa') {
    if(!Object.keys(LIMITES_EMPRESA).every(campo=>typeof datos[campo] === 'string')) return false;
    const errores = validarConfiguracion(tipo,datos);
    // La vinculación inicial es deliberadamente vacía; no equivale a un guardado válido.
    if(datos.nombreComercial === '') delete errores.nombreComercial;
    return Object.keys(errores).length === 0;
  }
  return Object.keys(validarConfiguracion('operativas',datos)).length === 0 && datos.zonaHoraria === 'America/Argentina/Buenos_Aires';
}

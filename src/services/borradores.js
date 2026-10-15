// Solo memoria: no conserva campos, contraseñas ni datos en almacenamiento.
export function crearProtectorBorradores(alCambiar = () => {}) {
  const formularios = new Map();
  let salida = null;
  const estado = () => ({
    pendiente: salida !== null,
    ocupado: [...formularios.values()].some(form => form.ocupado),
    tieneCambios: [...formularios.values()].some(form => form.modificado),
  });
  const avisar = () => alCambiar(estado());
  return {
    estado,
    registrar() {
      const id = Symbol('borrador');
      formularios.set(id, { modificado: false, ocupado: false });
      return {
        actualizar(modificado, ocupado) { formularios.set(id, { modificado, ocupado }); avisar(); },
        liberar() { formularios.delete(id); avisar(); },
      };
    },
    solicitar(continuar) {
      const actual = estado();
      if (actual.ocupado || actual.pendiente) return false;
      if (!actual.tieneCambios) { continuar(); return true; }
      salida = continuar;
      avisar();
      return false;
    },
    cancelar() { salida = null; avisar(); },
    confirmar() {
      if (!salida || estado().ocupado) return false;
      const continuar = salida;
      salida = null;
      avisar();
      continuar();
      return true;
    },
  };
}

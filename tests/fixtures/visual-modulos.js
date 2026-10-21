// Datos exclusivamente ficticios para capturas/regresion; nunca se envian a SQL.
export const reservaVisual = { idReserva: 1, idPropiedad: 1, idHuesped: 1,
  huesped: "Visitante ficticio", propiedad: "Alojamiento ficticio", canal: "Manual", estado: "Confirmada",
  fechaIngreso: "2026-10-14", fechaEgreso: "2026-10-17", horaIngreso: "15:00", horaEgreso: "11:00",
  cantidadHuespedes: 2, cantidadNoches: 3, montoEstimado: 0, accionesDisponibles: ["VER", "EDITAR"] };
export const propiedadVisual = { idPropiedad: 1, nombre: "Alojamiento ficticio", tipo: "Departamento",
  tipoPropiedad: "Departamento", ciudad: "Ciudad de prueba", direccion: "Dirección ficticia", capacidad: 2,
  capacidadMaxima: 2, precioBase: 0, dormitorios: 1, banos: 1, estado: "Activa", situacion: "Disponible", imagenPrincipal: null, servicios: [], comodidades: [] };
export const huespedVisual = { idHuesped: 1, nombre: "Visitante", apellido: "ficticio", email: "visitante@example.invalid",
  telefono: "—", dni:"No registrado", nacionalidad:"No registrada", origenRegistro: "Manual", cantidadReservas: 1, situacion: "Reserva próxima", reservasActivas: [reservaVisual], historialReservas: [], proximaReserva: reservaVisual };
export const limpiezaVisual = { idTareaLimpieza: 1, idPropiedad: 1, propiedad: "Alojamiento ficticio", idReservaSalida: 1,
  huespedReservaSalida: "Visitante ficticio", canalReservaSalida: "Manual", fechaInicio: "2026-10-17", horaInicio: "11:00",
  fechaLimite: "2026-10-17", horaLimite: "15:00", minutosDisponibles: 240, estado: "Pendiente", prioridad: "Alta" };
export const alertaVisual = { idAlerta: 1, tipo: "CHECKIN_PROXIMO", categoria: "Reserva", severidad: "Alta", estado: "Nueva",
  titulo: "Check-in ficticio", mensaje: "Aviso ficticio para revisar la apariencia.", propiedad: "Alojamiento ficticio",
  idReserva: 1, origen: "Sistema", fechaAlerta: "2026-10-14T12:00:00.000Z", datos: {} };
export const calendarioVisual = { anio: 2026, mes: 10, diasMes: 31,
  periodo: { anio: 2026, mes: 10, cantidadDias: 31, fechaDesde: "2026-10-01", fechaHasta: "2026-10-31" },
  propiedades: [{ ...propiedadVisual,
  resumen: { diasDisponibles: 7, diasConConflicto: 6 }, dias: Array.from({ length: 31 }, (_, index) => ({
    dia: index + 1, fecha: `2026-10-${String(index + 1).padStart(2,"0")}`, estado: ["Disponible","Reservada","Ocupada","No disponible","Conflicto"][index % 5],
    reservas: index % 5 === 0 ? [] : [{ ...reservaVisual, bloqueaDisponibilidad: true }],
  })) }], resumen: { cantidadPropiedades: 1, cantidadReservas: 1, cantidadConflictos: 6, conflictosEntreReservas: 6, conflictosPorEstadoPropiedad: 0 } };
export const reportesVisuales = { periodo: { fechaDesde: "2026-10-01", fechaHasta: "2026-10-31", tipo: "mensual" }, filtros: {},
  resumen: { totalReservasPeriodo: 1, totalReservasOperativas: 1, reservasConIngreso: 1, nochesOcupadas: 3, nochesDisponibles: 31, ocupacionPromedio: 10 },
  historico: [{ mes: "2026-10", inicioMes: "2026-10-01", cantidadReservas: 1, nochesOcupadas: 3, nochesDisponibles: 31, ocupacionMensual: 10 }],
  porCanal: [{ canal: "Manual", cantidad: 1, porcentaje: 100 }], porEstado: [{ estado: "Confirmada", cantidad: 1, porcentaje: 100 }],
  porPropiedad: [{ idPropiedad: 1, propiedad: "Alojamiento ficticio", reservas: 1, nochesReservadas: 3 }] };
export const recomendacionVisual = { id: "limpieza-ficticia", tipo: "limpieza_prioritaria", prioridad: "Alta", titulo: "Limpieza ficticia",
  descripcion: "Recomendación ficticia para revisar FlowIA.", accion: "Revisar limpieza", origen: "HostFlow",
  destino: { seccion: "limpiezas", idTareaLimpieza: 1 }, evidencia: { estado: "Pendiente", prioridadLimpieza: "Alta", minutosDisponibles: 240 } };

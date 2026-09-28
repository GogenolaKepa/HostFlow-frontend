import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

const ESTADOS = [
  "Todos",
  "Pendiente",
  "En progreso",
  "Completada",
  "Cancelada",
];

function formatearFecha(fecha) {
  if (!fecha) return "-";

  const [anio, mes, dia] = String(fecha)
    .slice(0, 10)
    .split("-");

  if (!anio || !mes || !dia) return fecha;

  return `${dia}/${mes}/${anio}`;
}

function formatearFechaHora(fecha, hora) {
  if (!fecha) return "-";

  return `${formatearFecha(fecha)} · ${hora || "00:00"} hs`;
}

function formatearVentana(minutos) {
  if (minutos === null || minutos === undefined) {
    return "Sin próxima reserva";
  }

  const total = Math.max(0, Number(minutos) || 0);

  if (total === 0) return "Sin margen";

  const dias = Math.floor(total / 1440);
  const horas = Math.floor((total % 1440) / 60);
  const minutosRestantes = total % 60;

  if (dias > 0) {
    return `${dias} d ${horas > 0 ? `${horas} h` : ""}`.trim();
  }

  if (horas > 0) {
    return `${horas} h ${
      minutosRestantes > 0 ? `${minutosRestantes} min` : ""
    }`.trim();
  }

  return `${minutosRestantes} min`;
}

function claseTexto(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function Limpiezas({ onVerReserva }) {
  const [limpiezas, setLimpiezas] = useState([]);
  const [resumen, setResumen] = useState({
    total: 0,
    pendientes: 0,
    enProgreso: 0,
    completadas: 0,
    canceladas: 0,
    urgentes: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [tareaActualizando, setTareaActualizando] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroPropiedad, setFiltroPropiedad] = useState("Todas");

  const cargarDatos = async ({ mostrarCarga = true } = {}) => {
    try {
      if (mostrarCarga) setCargando(true);
      setError("");

      const [respuestaLimpiezas, respuestaResumen] = await Promise.all([
        api.get("/limpiezas"),
        api.get("/limpiezas/resumen"),
      ]);

      setLimpiezas(respuestaLimpiezas.data.limpiezas || []);
      setResumen(
        respuestaResumen.data.resumen || {
          total: 0,
          pendientes: 0,
          enProgreso: 0,
          completadas: 0,
          canceladas: 0,
          urgentes: 0,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.mensaje ||
          "No se pudieron cargar las tareas de limpieza."
      );
    } finally {
      if (mostrarCarga) setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const propiedades = useMemo(() => {
    const nombres = new Set(
      limpiezas.map((tarea) => tarea.propiedad).filter(Boolean)
    );

    return [...nombres].sort((a, b) => a.localeCompare(b, "es"));
  }, [limpiezas]);

  const limpiezasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const prioridadOrden = {
      Urgente: 0,
      Alta: 1,
      Normal: 2,
    };

    const estadoOrden = {
      "En progreso": 0,
      Pendiente: 1,
      Completada: 2,
      Cancelada: 3,
    };

    return limpiezas
      .filter((tarea) => {
        if (filtroEstado !== "Todos" && tarea.estado !== filtroEstado) {
          return false;
        }

        if (
          filtroPropiedad !== "Todas" &&
          tarea.propiedad !== filtroPropiedad
        ) {
          return false;
        }

        if (!texto) return true;

        const contenido = [
          tarea.propiedad,
          tarea.estado,
          tarea.prioridad,
          tarea.canalReservaSalida,
          tarea.huespedReservaSalida,
          tarea.canalReservaSiguiente,
          tarea.huespedReservaSiguiente,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return contenido.includes(texto);
      })
      .sort((a, b) => {
        const porEstado =
          (estadoOrden[a.estado] ?? 9) - (estadoOrden[b.estado] ?? 9);

        if (porEstado !== 0) return porEstado;

        const porPrioridad =
          (prioridadOrden[a.prioridad] ?? 9) -
          (prioridadOrden[b.prioridad] ?? 9);

        if (porPrioridad !== 0) return porPrioridad;

        return String(a.fechaInicio || "").localeCompare(
          String(b.fechaInicio || "")
        );
      });
  }, [limpiezas, busqueda, filtroEstado, filtroPropiedad]);

  const sincronizar = async () => {
    try {
      setSincronizando(true);
      setError("");
      setMensaje("");

      const response = await api.post("/limpiezas/sincronizar");

      await cargarDatos({ mostrarCarga: false });

      const resultado = response.data.resultado || {};

      setMensaje(
        `Limpiezas sincronizadas. ${Number(
          resultado.creadas || 0
        )} creada(s), ${Number(resultado.actualizadas || 0)} actualizada(s).`
      );
    } catch (err) {
      setError(
        err.response?.data?.mensaje ||
          "No se pudieron sincronizar las tareas de limpieza."
      );
    } finally {
      setSincronizando(false);
    }
  };

  const cambiarEstado = async (tarea, nuevoEstado) => {
    try {
      setTareaActualizando(tarea.idTareaLimpieza);
      setError("");
      setMensaje("");

      await api.patch(`/limpiezas/${tarea.idTareaLimpieza}/estado`, {
        estado: nuevoEstado,
      });

      await cargarDatos({ mostrarCarga: false });

      setMensaje(
        `La tarea de ${tarea.propiedad} pasó a "${nuevoEstado}".`
      );
    } catch (err) {
      setError(
        err.response?.data?.mensaje ||
          "No se pudo actualizar el estado de la tarea."
      );
    } finally {
      setTareaActualizando(null);
    }
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("Todos");
    setFiltroPropiedad("Todas");
  };

  if (cargando) {
    return (
      <div className="limpiezas-page">
        <div className="limpiezas-loading">
          Cargando tareas de limpieza...
        </div>
      </div>
    );
  }

  return (
    <div className="limpiezas-page">
      <section className="limpiezas-header">
        <div>
          <span className="limpiezas-eyebrow">
            OPERACIÓN · POST CHECK-OUT
          </span>
          <h1>Limpiezas</h1>
          <p>
            Organización automática entre el check-out de una reserva y el
            próximo check-in de la propiedad.
          </p>
        </div>

        <button
          type="button"
          className="limpiezas-sync-button"
          onClick={sincronizar}
          disabled={sincronizando}
        >
          {sincronizando ? "Sincronizando..." : "Sincronizar"}
        </button>
      </section>

      {error && (
        <div className="limpiezas-message limpiezas-message--error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="limpiezas-message limpiezas-message--success">
          {mensaje}
        </div>
      )}

      <section className="limpiezas-summary-grid">
        <article className="limpiezas-summary-card">
          <span>Total</span>
          <strong>{resumen.total}</strong>
          <small>tareas generadas</small>
        </article>

        <article className="limpiezas-summary-card">
          <span>Pendientes</span>
          <strong>{resumen.pendientes}</strong>
          <small>por iniciar</small>
        </article>

        <article className="limpiezas-summary-card">
          <span>En progreso</span>
          <strong>{resumen.enProgreso}</strong>
          <small>en ejecución</small>
        </article>

        <article className="limpiezas-summary-card">
          <span>Completadas</span>
          <strong>{resumen.completadas}</strong>
          <small>finalizadas</small>
        </article>

        <article className="limpiezas-summary-card limpiezas-summary-card--urgent">
          <span>Urgentes</span>
          <strong>{resumen.urgentes}</strong>
          <small>hasta 3 h de margen</small>
        </article>
      </section>

      <section className="limpiezas-toolbar">
        <div className="limpiezas-search">
          <label htmlFor="limpiezas-busqueda">Buscar</label>
          <input
            id="limpiezas-busqueda"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Propiedad, huésped o canal..."
          />
        </div>

        <div className="limpiezas-filter">
          <label htmlFor="limpiezas-estado">Estado</label>
          <select
            id="limpiezas-estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>

        <div className="limpiezas-filter">
          <label htmlFor="limpiezas-propiedad">Propiedad</label>
          <select
            id="limpiezas-propiedad"
            value={filtroPropiedad}
            onChange={(e) => setFiltroPropiedad(e.target.value)}
          >
            <option value="Todas">Todas</option>
            {propiedades.map((propiedad) => (
              <option key={propiedad} value={propiedad}>
                {propiedad}
              </option>
            ))}
          </select>
        </div>

        <div className="limpiezas-toolbar-actions">
          <span>
            {limpiezasFiltradas.length} resultado
            {limpiezasFiltradas.length === 1 ? "" : "s"}
          </span>
          <button type="button" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      </section>

      {limpiezasFiltradas.length === 0 ? (
        <section className="limpiezas-empty">
          <strong>No hay tareas para mostrar</strong>
          <span>Probá cambiando los filtros o sincronizando nuevamente.</span>
        </section>
      ) : (
        <>
          <section className="limpiezas-table-card">
            <table className="limpiezas-table">
              <thead>
                <tr>
                  <th>Propiedad</th>
                  <th>Check-out</th>
                  <th>Próximo check-in</th>
                  <th>Ventana</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>

              <tbody>
                {limpiezasFiltradas.map((tarea) => {
                  const actualizando =
                    tareaActualizando === tarea.idTareaLimpieza;

                  return (
                    <tr key={tarea.idTareaLimpieza}>
                      <td>
                        <div className="limpiezas-property-cell">
                          <strong>{tarea.propiedad}</strong>
                          <span>Tarea #{tarea.idTareaLimpieza}</span>
                        </div>
                      </td>

                      <td>
                        <div className="limpiezas-stay-cell">
                          <strong>
                            {formatearFechaHora(
                              tarea.fechaInicio,
                              tarea.horaInicio
                            )}
                          </strong>
                          <span>
                            {tarea.huespedReservaSalida} ·{" "}
                            {tarea.canalReservaSalida}
                          </span>
                          {onVerReserva && (
                            <button
                              type="button"
                              onClick={() =>
                                onVerReserva(tarea.idReservaSalida)
                              }
                            >
                              Ver reserva
                            </button>
                          )}
                        </div>
                      </td>

                      <td>
                        {tarea.idReservaSiguiente ? (
                          <div className="limpiezas-stay-cell">
                            <strong>
                              {formatearFechaHora(
                                tarea.fechaLimite,
                                tarea.horaLimite
                              )}
                            </strong>
                            <span>
                              {tarea.huespedReservaSiguiente} ·{" "}
                              {tarea.canalReservaSiguiente}
                            </span>
                            {onVerReserva && (
                              <button
                                type="button"
                                onClick={() =>
                                  onVerReserva(tarea.idReservaSiguiente)
                                }
                              >
                                Ver próxima
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="limpiezas-no-next">
                            Sin próxima reserva
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="limpiezas-window">
                          <strong>
                            {formatearVentana(tarea.minutosDisponibles)}
                          </strong>
                          <span>
                            {tarea.fechaLimite
                              ? "entre salida e ingreso"
                              : "sin fecha límite"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`limpiezas-priority limpiezas-priority--${claseTexto(
                            tarea.prioridad || "Normal"
                          )}`}
                        >
                          {tarea.prioridad || "-"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`limpiezas-status limpiezas-status--${claseTexto(
                            tarea.estado
                          )}`}
                        >
                          {tarea.estado}
                        </span>
                      </td>

                      <td>
                        <div className="limpiezas-actions">
                          {tarea.estado === "Pendiente" && (
                            <button
                              type="button"
                              className="limpiezas-action-button limpiezas-action-button--primary"
                              onClick={() =>
                                cambiarEstado(tarea, "En progreso")
                              }
                              disabled={actualizando}
                            >
                              {actualizando ? "Actualizando..." : "Iniciar"}
                            </button>
                          )}

                          {tarea.estado === "En progreso" && (
                            <button
                              type="button"
                              className="limpiezas-action-button limpiezas-action-button--success"
                              onClick={() =>
                                cambiarEstado(tarea, "Completada")
                              }
                              disabled={actualizando}
                            >
                              {actualizando
                                ? "Actualizando..."
                                : "Completar"}
                            </button>
                          )}

                          {tarea.estado === "Completada" && (
                            <span className="limpiezas-action-done">
                              Finalizada
                            </span>
                          )}

                          {tarea.estado === "Cancelada" && (
                            <span className="limpiezas-action-cancelled">
                              Sin acción
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="limpiezas-mobile-list">
            {limpiezasFiltradas.map((tarea) => {
              const actualizando =
                tareaActualizando === tarea.idTareaLimpieza;

              return (
                <article
                  className="limpiezas-mobile-card"
                  key={`mobile-${tarea.idTareaLimpieza}`}
                >
                  <div className="limpiezas-mobile-card-top">
                    <div>
                      <span className="limpiezas-mobile-card-label">
                        Propiedad
                      </span>
                      <strong>{tarea.propiedad}</strong>
                    </div>

                    <span
                      className={`limpiezas-priority limpiezas-priority--${claseTexto(
                        tarea.prioridad || "Normal"
                      )}`}
                    >
                      {tarea.prioridad || "-"}
                    </span>
                  </div>

                  <div className="limpiezas-mobile-state-row">
                    <span
                      className={`limpiezas-status limpiezas-status--${claseTexto(
                        tarea.estado
                      )}`}
                    >
                      {tarea.estado}
                    </span>
                    <strong>
                      {formatearVentana(tarea.minutosDisponibles)}
                    </strong>
                  </div>

                  <div className="limpiezas-mobile-timeline">
                    <div>
                      <span>Check-out</span>
                      <strong>
                        {formatearFechaHora(
                          tarea.fechaInicio,
                          tarea.horaInicio
                        )}
                      </strong>
                      <small>
                        {tarea.huespedReservaSalida} ·{" "}
                        {tarea.canalReservaSalida}
                      </small>
                    </div>

                    <span className="limpiezas-mobile-arrow">→</span>

                    <div>
                      <span>Límite</span>
                      <strong>
                        {tarea.fechaLimite
                          ? formatearFechaHora(
                              tarea.fechaLimite,
                              tarea.horaLimite
                            )
                          : "Sin límite"}
                      </strong>
                      <small>
                        {tarea.idReservaSiguiente
                          ? `${tarea.huespedReservaSiguiente} · ${tarea.canalReservaSiguiente}`
                          : "Sin próxima reserva"}
                      </small>
                    </div>
                  </div>

                  <div className="limpiezas-mobile-links">
                    {onVerReserva && (
                      <button
                        type="button"
                        onClick={() => onVerReserva(tarea.idReservaSalida)}
                      >
                        Ver reserva de salida
                      </button>
                    )}

                    {onVerReserva && tarea.idReservaSiguiente && (
                      <button
                        type="button"
                        onClick={() =>
                          onVerReserva(tarea.idReservaSiguiente)
                        }
                      >
                        Ver próxima reserva
                      </button>
                    )}
                  </div>

                  <div className="limpiezas-mobile-actions">
                    {tarea.estado === "Pendiente" && (
                      <button
                        type="button"
                        className="limpiezas-action-button limpiezas-action-button--primary"
                        onClick={() => cambiarEstado(tarea, "En progreso")}
                        disabled={actualizando}
                      >
                        {actualizando
                          ? "Actualizando..."
                          : "Iniciar limpieza"}
                      </button>
                    )}

                    {tarea.estado === "En progreso" && (
                      <button
                        type="button"
                        className="limpiezas-action-button limpiezas-action-button--success"
                        onClick={() => cambiarEstado(tarea, "Completada")}
                        disabled={actualizando}
                      >
                        {actualizando
                          ? "Actualizando..."
                          : "Marcar completada"}
                      </button>
                    )}

                    {tarea.estado === "Completada" && (
                      <span className="limpiezas-action-done">
                        Limpieza completada
                      </span>
                    )}

                    {tarea.estado === "Cancelada" && (
                      <span className="limpiezas-action-cancelled">
                        Tarea cancelada automáticamente
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

export default Limpiezas;

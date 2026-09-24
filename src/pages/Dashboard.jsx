import { useEffect, useState } from "react";
import api from "../services/api";
import Reservas from "./Reservas";
import Propiedades from "./Propiedades";
import Huespedes from "./Huespedes";
import Calendario from "./Calendario";
import Alertas from "./Alertas";
import Reportes from "./Reportes";

function Dashboard({ usuario, onLogout }) {
  const [datos, setDatos] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("inicio");

  const [
    historicoMensual,
    setHistoricoMensual,
  ] = useState([]);

  const [
    cargandoHistorico,
    setCargandoHistorico,
  ] = useState(false);

  const [
    errorHistorico,
    setErrorHistorico,
  ] = useState("");

  const [
    modalMetrica,
    setModalMetrica,
  ] = useState(null);

  useEffect(() => {
    if (
      seccionActiva !==
      "inicio"
    ) {
      return undefined;
    }

    obtenerDashboard();
    obtenerHistorico();

    const intervalo =
      window.setInterval(
        obtenerDashboard,
        30000
      );

    const manejarVisibilidad =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          obtenerDashboard();
          obtenerHistorico();
        }
      };

    document.addEventListener(
      "visibilitychange",
      manejarVisibilidad
    );

    return () => {
      window.clearInterval(
        intervalo
      );

      document.removeEventListener(
        "visibilitychange",
        manejarVisibilidad
      );
    };
  }, [seccionActiva]);

  const obtenerDashboard = async () => {
    const response = await api.get("/dashboard/resumen");
    setDatos(response.data);
  };

  // =========================================================
  // HISTÓRICO DE MÉTRICAS
  // =========================================================

  const obtenerHistorico =
    async () => {
      try {
        setCargandoHistorico(
          true
        );

        setErrorHistorico("");

        const response =
          await api.get(
            "/dashboard/historico?meses=6"
          );

        setHistoricoMensual(
          response.data
            .historico || []
        );
      } catch (error) {
        setErrorHistorico(
          error.response?.data
            ?.mensaje ||
            "No se pudo cargar el histórico mensual."
        );
      } finally {
        setCargandoHistorico(
          false
        );
      }
    };

  const abrirModalMetrica =
    async (
      metrica
    ) => {
      setModalMetrica(
        metrica
      );

      /*
       * Cada vez que se abre un histórico lo
       * refrescamos para que contemple reservas
       * creadas o modificadas recientemente.
       */
      await obtenerHistorico();
    };

  const cerrarModalMetrica =
    () => {
      setModalMetrica(
        null
      );

      setErrorHistorico("");
    };

  const formatearMes =
    (
      fecha
    ) => {
      if (!fecha) {
        return "-";
      }

      const valor =
        new Date(
          `${String(fecha).slice(
            0,
            10
          )}T00:00:00`
        );

      if (
        Number.isNaN(
          valor.getTime()
        )
      ) {
        return "-";
      }

      const texto =
        new Intl.DateTimeFormat(
          "es-AR",
          {
            month:
              "long",
            year:
              "numeric",
          }
        ).format(
          valor
        );

      return (
        texto.charAt(0)
          .toUpperCase() +
        texto.slice(1)
      );
    };

  const formatearMontoDashboard =
    (
      monto
    ) =>
      Number(
        monto || 0
      ).toLocaleString(
        "es-AR",
        {
          style:
            "currency",
          currency:
            "ARS",
          maximumFractionDigits:
            0,
        }
      );

  // =========================================================
  // NAVEGACIÓN
  // =========================================================

  const cambiarSeccion = (seccion) => {
    // Si el usuario navega normalmente desde el menú,
    // cualquier selección puntual de una reserva deja de tener efecto.
    window.sessionStorage.removeItem(
      "hostflowReservaObjetivo"
    );

    setSeccionActiva(seccion);
  };

  // =========================================================
  // IR A UNA RESERVA DESDE OTRO MÓDULO
  // =========================================================
  //
  // Este método se reutiliza desde:
  //
  // - Huéspedes
  // - Calendario
  //
  // Reservas ya sabe leer hostflowReservaObjetivo y
  // posicionarse sobre la reserva correspondiente.
  //
  // =========================================================

  const verReserva = (
    idReserva
  ) => {
    window.sessionStorage.setItem(
      "hostflowReservaObjetivo",
      String(idReserva)
    );

    setSeccionActiva("reservas");
  };

  useEffect(() => {
    if (!modalMetrica) {
      return undefined;
    }

    const overflowAnterior =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    const manejarEscape =
      (e) => {
        if (
          e.key ===
          "Escape"
        ) {
          cerrarModalMetrica();
        }
      };

    window.addEventListener(
      "keydown",
      manejarEscape
    );

    return () => {
      document.body.style
        .overflow =
        overflowAnterior;

      window.removeEventListener(
        "keydown",
        manejarEscape
      );
    };
  }, [modalMetrica]);

  if (!datos) {
    return (
      <h2 className="loading">
        Cargando dashboard...
      </h2>
    );
  }

  const {
    resumen,
    proximasReservas,
    alertas,
  } = datos;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>HostFlow</h2>

        <nav>
          <p
            className={
              seccionActiva === "inicio"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion("inicio")
            }
          >
            Inicio
          </p>

          <p
            className={
              seccionActiva === "propiedades"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion(
                "propiedades"
              )
            }
          >
            Propiedades
          </p>

          <p
            className={
              seccionActiva === "reservas"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion("reservas")
            }
          >
            Reservas
          </p>

          <p
            className={
              seccionActiva === "huespedes"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion("huespedes")
            }
          >
            Huéspedes
          </p>

          <p
            className={
              seccionActiva === "calendario"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion(
                "calendario"
              )
            }
          >
            Calendario
          </p>

          <p
            className={
              seccionActiva === "reportes"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion("reportes")
            }
          >
            Reportes
          </p>

          <p
            className={
              seccionActiva === "alertas"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion("alertas")
            }
          >
            Alertas
          </p>
        </nav>

        <button onClick={onLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="main">
        {seccionActiva ===
        "propiedades" ? (
          <Propiedades />
        ) : seccionActiva ===
          "reservas" ? (
          <Reservas />
        ) : seccionActiva ===
          "huespedes" ? (
          <Huespedes
            onVerReserva={
              verReserva
            }
          />
        ) : seccionActiva ===
          "calendario" ? (
          <Calendario
            onVerReserva={
              verReserva
            }
          />
        ) : seccionActiva ===
          "reportes" ? (
          <Reportes />
        ) : seccionActiva ===
          "alertas" ? (
          <Alertas
            onVerReserva={
              verReserva
            }
            onVerPropiedades={() =>
              setSeccionActiva(
                "propiedades"
              )
            }
          />
        ) : (
          <>
            <header>
              <div>
                <h1>
                  ¡Hola,{" "}
                  {usuario.nombre}!
                </h1>

                <p>
                  Resumen general de la
                  operación
                </p>
              </div>

              <span>
                {usuario.rol}
              </span>
            </header>

            <section className="cards">
              <div className="card">
                <p>
                  Propiedades activas
                </p>

                <h2>
                  {
                    resumen.propiedadesActivas
                  }
                </h2>
              </div>

              <div className="card">
                <p>
                  Reservas activas
                </p>

                <h2>
                  {
                    resumen.reservasActivas
                  }
                </h2>
              </div>

              <div className="card">
                <p>
                  Huéspedes registrados
                </p>

                <h2>
                  {
                    resumen.huespedesRegistrados
                  }
                </h2>
              </div>

              <button
                type="button"
                className="card dashboard-metric-card"
                onClick={() =>
                  abrirModalMetrica(
                    "ingresos"
                  )
                }
              >
                <div className="dashboard-metric-card-top">
                  <p>
                    Ingresos del mes
                  </p>

                  <span>
                    Ver histórico
                  </span>
                </div>

                <h2>
                  $
                  {resumen.ingresosMes.toLocaleString(
                    "es-AR"
                  )}
                </h2>
              </button>
            </section>

            <section className="content">
              <div
                className="panel dashboard-occupancy-panel dashboard-occupancy-panel--clickable"
                role="button"
                tabIndex="0"
                onClick={() =>
                  abrirModalMetrica(
                    "ocupacion"
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" ||
                    e.key === " "
                  ) {
                    e.preventDefault();

                    abrirModalMetrica(
                      "ocupacion"
                    );
                  }
                }}
              >
                <div className="dashboard-occupancy-heading">
                  <div>
                    <h3>
                      Ocupación mensual
                    </h3>

                    <p>
                      Porcentaje de noches ocupadas sobre noches disponibles.
                    </p>
                  </div>

                  <span className="dashboard-occupancy-history-label">
                    Ver histórico
                  </span>
                </div>

                <div className="dashboard-occupancy-body">
                  <div className="circle">
                    {
                      resumen.ocupacionMensual
                    }
                    %
                  </div>

                  <div className="dashboard-occupancy-preview">
                    {historicoMensual.length >
                    0 ? (
                      historicoMensual
                        .slice(
                          0,
                          4
                        )
                        .map(
                          (
                            mes
                          ) => (
                            <div
                              key={
                                mes.mes
                              }
                            >
                              <span>
                                {formatearMes(
                                  mes.inicioMes
                                )}
                              </span>

                              <strong>
                                {
                                  mes.ocupacionMensual
                                }
                                %
                              </strong>
                            </div>
                          )
                        )
                    ) : (
                      <div className="dashboard-occupancy-preview-empty">
                        Cargando histórico...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="panel dashboard-alerts-panel">
                <div className="dashboard-alerts-heading">
                  <div>
                    <h3>Alertas</h3>

                    <p>
                      Situaciones operativas que requieren atención.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="dashboard-alerts-open"
                    onClick={() =>
                      cambiarSeccion(
                        "alertas"
                      )
                    }
                  >
                    Ver todas
                  </button>
                </div>

                {alertas.length ===
                0 ? (
                  <div className="dashboard-alerts-empty">
                    <strong>
                      Sin alertas pendientes
                    </strong>

                    <span>
                      No hay situaciones operativas activas en este momento.
                    </span>
                  </div>
                ) : (
                  <div className="dashboard-alerts-list">
                    {alertas.map(
                      (
                        alerta
                      ) => (
                        <button
                          type="button"
                          className={`dashboard-alert-item dashboard-alert-item--${String(
                            alerta.severidad
                          ).toLowerCase()}`}
                          key={
                            alerta.idAlerta
                          }
                          onClick={() => {
                            if (
                              alerta.idReserva
                            ) {
                              verReserva(
                                alerta.idReserva
                              );

                              return;
                            }

                            cambiarSeccion(
                              "alertas"
                            );
                          }}
                        >
                          <span className="dashboard-alert-item-icon">
                            {alerta.severidad ===
                            "Critica"
                              ? "!"
                              : alerta.categoria ===
                                "Sincronizacion"
                              ? "↻"
                              : alerta.categoria ===
                                "Incidencia"
                              ? "!"
                              : "◷"}
                          </span>

                          <span className="dashboard-alert-item-content">
                            <span className="dashboard-alert-item-top">
                              <strong>
                                {
                                  alerta.titulo
                                }
                              </strong>

                              <small>
                                {alerta.severidad ===
                                "Critica"
                                  ? "Crítica"
                                  : alerta.severidad}
                              </small>
                            </span>

                            <span>
                              {
                                alerta.mensaje
                              }
                            </span>
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="panel dashboard-upcoming-panel">
              <h3>
                Próximas reservas
              </h3>

              <table className="dashboard-upcoming-table">
                <colgroup>
                  <col className="col-huesped" />
                  <col className="col-propiedad" />
                  <col className="col-canal" />
                  <col className="col-ingreso" />
                  <col className="col-egreso" />
                  <col className="col-estado" />
                  <col className="col-accion" />
                </colgroup>

                <thead>
                  <tr>
                    <th>
                      Huésped
                    </th>

                    <th>
                      Propiedad
                    </th>

                    <th>
                      Canal
                    </th>

                    <th>
                      Ingreso
                    </th>

                    <th>
                      Egreso
                    </th>

                    <th>
                      Estado
                    </th>

                    <th>
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {proximasReservas.map(
                    (reserva) => (
                      <tr
                        key={
                          reserva.idReserva
                        }
                      >
                        <td>
                          {
                            reserva.huesped
                          }
                        </td>

                        <td>
                          {
                            reserva.propiedad
                          }
                        </td>

                        <td>
                          {
                            reserva.canal
                          }
                        </td>

                        <td>
                          {
                            reserva.fechaIngreso
                          }
                        </td>

                        <td>
                          {
                            reserva.fechaEgreso
                          }
                        </td>

                        <td>
                          {
                            reserva.estado
                          }
                        </td>

                        <td>
                          <button
                            type="button"
                            className="dashboard-reservation-action"
                            onClick={() =>
                              verReserva(
                                reserva.idReserva
                              )
                            }
                          >
                            Ver reserva
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>

      {modalMetrica && (
        <div
          className="dashboard-metric-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              cerrarModalMetrica();
            }
          }}
        >
          <article
            className="dashboard-metric-modal"
            role="dialog"
            aria-modal="true"
          >
            <header className="dashboard-metric-modal-header">
              <div>
                <span>
                  HISTÓRICO · ÚLTIMOS 6 MESES
                </span>

                <h3>
                  {modalMetrica ===
                  "ingresos"
                    ? "Ingresos mensuales"
                    : "Ocupación mensual"}
                </h3>

                <p>
                  {modalMetrica ===
                  "ingresos"
                    ? "Importes estimados de reservas confirmadas y finalizadas según mes de check-in."
                    : "Noches ocupadas únicas sobre noches disponibles de las propiedades activas."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cerrarModalMetrica
                }
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <div className="dashboard-metric-modal-content">
              {cargandoHistorico ? (
                <div className="dashboard-metric-modal-state">
                  Cargando histórico...
                </div>
              ) : errorHistorico ? (
                <div className="dashboard-metric-modal-state dashboard-metric-modal-state--error">
                  {errorHistorico}
                </div>
              ) : (
                <div className="dashboard-metric-history">
                  {historicoMensual.map(
                    (
                      mes
                    ) => {
                      const maxIngreso =
                        Math.max(
                          ...historicoMensual.map(
                            (
                              item
                            ) =>
                              Number(
                                item.ingresosMes ||
                                0
                              )
                          ),
                          1
                        );

                      const porcentajeBarra =
                        modalMetrica ===
                        "ingresos"
                          ? Math.round(
                              (
                                Number(
                                  mes.ingresosMes ||
                                  0
                                ) /
                                maxIngreso
                              ) * 100
                            )
                          : Number(
                              mes.ocupacionMensual ||
                              0
                            );

                      return (
                        <article
                          className="dashboard-metric-history-row"
                          key={
                            mes.mes
                          }
                        >
                          <div className="dashboard-metric-history-top">
                            <strong>
                              {formatearMes(
                                mes.inicioMes
                              )}
                            </strong>

                            <span>
                              {modalMetrica ===
                              "ingresos"
                                ? formatearMontoDashboard(
                                    mes.ingresosMes
                                  )
                                : `${mes.ocupacionMensual}%`}
                            </span>
                          </div>

                          <div className="dashboard-metric-history-bar">
                            <span
                              style={{
                                width:
                                  `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      porcentajeBarra
                                    )
                                  )}%`,
                              }}
                            />
                          </div>

                          <div className="dashboard-metric-history-meta">
                            {modalMetrica ===
                            "ingresos" ? (
                              <>
                                <span>
                                  {
                                    mes.cantidadReservas
                                  }{" "}
                                  reserva
                                  {Number(
                                    mes.cantidadReservas
                                  ) === 1
                                    ? ""
                                    : "s"}
                                </span>

                                <span>
                                  Check-in dentro del mes
                                </span>
                              </>
                            ) : (
                              <>
                                <span>
                                  {
                                    mes.nochesOcupadas
                                  }{" "}
                                  noches ocupadas
                                </span>

                                <span>
                                  {
                                    mes.nochesDisponibles
                                  }{" "}
                                  noches disponibles
                                </span>
                              </>
                            )}
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            <footer className="dashboard-metric-modal-footer">
              <span>
                Estos datos se calculan directamente desde las reservas registradas en HostFlow.
              </span>

              <button
                type="button"
                className="primary-button"
                onClick={
                  cerrarModalMetrica
                }
              >
                Cerrar
              </button>
            </footer>
          </article>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

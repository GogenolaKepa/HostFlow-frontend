import { useEffect, useState } from "react";
import api from "../services/api";
import Reservas from "./Reservas";
import Propiedades from "./Propiedades";
import Huespedes from "./Huespedes";
import Calendario from "./Calendario";
import Alertas from "./Alertas";
import Reportes from "./Reportes";

const ITEMS_NAVEGACION = [
  {
    id: "inicio",
    label: "Inicio",
    icono: "inicio",
  },
  {
    id: "propiedades",
    label: "Propiedades",
    icono: "propiedades",
  },
  {
    id: "reservas",
    label: "Reservas",
    icono: "reservas",
  },
  {
    id: "huespedes",
    label: "Huéspedes",
    icono: "huespedes",
  },
  {
    id: "calendario",
    label: "Calendario",
    icono: "calendario",
  },
  {
    id: "reportes",
    label: "Reportes",
    icono: "reportes",
  },
  {
    id: "alertas",
    label: "Alertas",
    icono: "alertas",
  },
];

function IconoNavegacion({
  nombre,
}) {
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (nombre === "inicio") {
    return (
      <svg {...props}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M9.5 21v-7h5v7" />
      </svg>
    );
  }

  if (nombre === "propiedades") {
    return (
      <svg {...props}>
        <rect
          x="4"
          y="3"
          width="16"
          height="18"
          rx="2"
        />
        <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" />
      </svg>
    );
  }

  if (nombre === "reservas") {
    return (
      <svg {...props}>
        <path d="M7 3h10" />
        <path d="M8 2v4M16 2v4" />
        <rect
          x="4"
          y="5"
          width="16"
          height="16"
          rx="2"
        />
        <path d="M4 9h16" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    );
  }

  if (nombre === "huespedes") {
    return (
      <svg {...props}>
        <circle
          cx="9"
          cy="8"
          r="3"
        />
        <path d="M3.5 20c.4-4 2.3-6 5.5-6s5.1 2 5.5 6" />
        <path d="M16 5.5a3 3 0 0 1 0 5.5" />
        <path d="M17 14c2.2.6 3.3 2.5 3.5 5" />
      </svg>
    );
  }

  if (nombre === "calendario") {
    return (
      <svg {...props}>
        <rect
          x="3"
          y="5"
          width="18"
          height="16"
          rx="2"
        />
        <path d="M7 3v4M17 3v4M3 10h18" />
        <path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2" />
      </svg>
    );
  }

  if (nombre === "reportes") {
    return (
      <svg {...props}>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </svg>
    );
  }

  if (nombre === "alertas") {
    return (
      <svg {...props}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    );
  }

  if (nombre === "salir") {
    return (
      <svg {...props}>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
      </svg>
    );
  }

  return null;
}

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

  const [
    sidebarColapsada,
    setSidebarColapsada,
  ] = useState(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return false;
    }

    const preferenciaGuardada =
      window.localStorage.getItem(
        "hostflowSidebarColapsada"
      );

    if (
      preferenciaGuardada !==
      null
    ) {
      return (
        preferenciaGuardada ===
        "true"
      );
    }

    /*
     * En tablet la dejamos contraída por defecto
     * para conservar espacio útil.
     * En escritorio queda expandida.
     */
    return (
      window.innerWidth <=
        1100 &&
      window.innerWidth >
        700
    );
  });

  const [
    menuMovilAbierto,
    setMenuMovilAbierto,
  ] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(
      "hostflowSidebarColapsada",
      String(
        sidebarColapsada
      )
    );
  }, [
    sidebarColapsada,
  ]);

  useEffect(() => {
    const manejarResize =
      () => {
        if (
          window.innerWidth >
          700
        ) {
          setMenuMovilAbierto(
            false
          );
        }
      };

    window.addEventListener(
      "resize",
      manejarResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        manejarResize
      );
    };
  }, []);

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

  const formatearFechaCortaDashboard =
    (
      fecha
    ) => {
      if (!fecha) {
        return "-";
      }

      const valor =
        String(
          fecha
        ).slice(
          0,
          10
        );

      const [
        anio,
        mes,
        dia,
      ] =
        valor.split(
          "-"
        );

      if (
        !anio ||
        !mes ||
        !dia
      ) {
        return valor;
      }

      return `${dia}/${mes}/${anio.slice(
        -2
      )}`;
    };

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

    setMenuMovilAbierto(
      false
    );
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

    setMenuMovilAbierto(
      false
    );
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
    <div
      className={`dashboard ${
        sidebarColapsada
          ? "dashboard--sidebar-collapsed"
          : ""
      }`}
    >
      <div className="mobile-appbar">
        <button
          type="button"
          className="mobile-appbar-brand"
          onClick={() =>
            cambiarSeccion(
              "inicio"
            )
          }
          aria-label="Ir al inicio"
        >
          HostFlow
        </button>

        <button
          type="button"
          className={`mobile-menu-toggle ${
            menuMovilAbierto
              ? "is-open"
              : ""
          }`}
          onClick={() =>
            setMenuMovilAbierto(
              (valor) =>
                !valor
            )
          }
          aria-label={
            menuMovilAbierto
              ? "Cerrar menú"
              : "Abrir menú"
          }
          aria-expanded={
            menuMovilAbierto
          }
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuMovilAbierto && (
        <>
          <button
            type="button"
            className="mobile-nav-backdrop"
            onClick={() =>
              setMenuMovilAbierto(
                false
              )
            }
            aria-label="Cerrar menú"
          />

          <aside className="mobile-nav-drawer">
            <nav className="mobile-nav-list">
              {ITEMS_NAVEGACION.map(
                (item) => (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    className={`mobile-nav-item ${
                      seccionActiva ===
                      item.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      cambiarSeccion(
                        item.id
                      )
                    }
                  >
                    <span className="mobile-nav-icon">
                      <IconoNavegacion
                        nombre={
                          item.icono
                        }
                      />
                    </span>

                    <span>
                      {
                        item.label
                      }
                    </span>
                  </button>
                )
              )}
            </nav>

            <div className="mobile-nav-footer">
              <div className="mobile-nav-user">
                <span className="mobile-nav-avatar">
                  {String(
                    usuario.nombre ||
                      "H"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </span>

                <div>
                  <strong>
                    {
                      usuario.nombre
                    }
                  </strong>

                  <span>
                    {
                      usuario.rol
                    }
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="mobile-nav-logout"
                onClick={onLogout}
              >
                <IconoNavegacion
                  nombre="salir"
                />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </>
      )}

      <aside
        className={`sidebar ${
          sidebarColapsada
            ? "sidebar--collapsed"
            : ""
        }`}
      >
        <div className="sidebar-top">
          <button
            type="button"
            className="sidebar-brand"
            onClick={() =>
              cambiarSeccion(
                "inicio"
              )
            }
            title="HostFlow"
          >
            <span className="sidebar-brand-mark">
              H
            </span>

            <span className="sidebar-brand-name">
              HostFlow
            </span>
          </button>

          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={() =>
              setSidebarColapsada(
                (valor) =>
                  !valor
              )
            }
            aria-label={
              sidebarColapsada
                ? "Expandir barra lateral"
                : "Contraer barra lateral"
            }
            title={
              sidebarColapsada
                ? "Expandir barra lateral"
                : "Contraer barra lateral"
            }
          >
            {sidebarColapsada
              ? "›"
              : "‹"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {ITEMS_NAVEGACION.map(
            (item) => (
              <button
                key={
                  item.id
                }
                type="button"
                className={`sidebar-nav-item ${
                  seccionActiva ===
                  item.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  cambiarSeccion(
                    item.id
                  )
                }
                title={
                  sidebarColapsada
                    ? item.label
                    : undefined
                }
              >
                <span className="sidebar-nav-icon">
                  <IconoNavegacion
                    nombre={
                      item.icono
                    }
                  />
                </span>

                <span className="sidebar-nav-label">
                  {
                    item.label
                  }
                </span>
              </button>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">
              {String(
                usuario.nombre ||
                  "H"
              )
                .charAt(0)
                .toUpperCase()}
            </span>

            <div className="sidebar-user-copy">
              <strong>
                {usuario.nombre}
              </strong>

              <span>
                {usuario.rol}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={onLogout}
            title={
              sidebarColapsada
                ? "Cerrar sesión"
                : undefined
            }
          >
            <IconoNavegacion
              nombre="salir"
            />

            <span className="sidebar-nav-label">
              Cerrar sesión
            </span>
          </button>
        </div>
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
              <div className="dashboard-upcoming-heading">
                <div>
                  <h3>
                    Próximas reservas
                  </h3>

                  <p>
                    Check-ins confirmados y pendientes más cercanos.
                  </p>
                </div>
              </div>

              <div className="dashboard-upcoming-desktop">
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
              </div>

              <div className="dashboard-upcoming-mobile">
                {proximasReservas.length >
                0 ? (
                  proximasReservas.map(
                    (
                      reserva
                    ) => (
                      <article
                        className="dashboard-upcoming-mobile-card"
                        key={`mobile-${reserva.idReserva}`}
                      >
                        <div className="dashboard-upcoming-mobile-top">
                          <div className="dashboard-upcoming-mobile-guest">
                            <span className="dashboard-upcoming-mobile-avatar">
                              {String(
                                reserva.huesped ||
                                  "H"
                              )
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </span>

                            <div>
                              <strong>
                                {
                                  reserva.huesped
                                }
                              </strong>

                              <span>
                                {
                                  reserva.propiedad
                                }
                              </span>
                            </div>
                          </div>

                          <span
                            className={`dashboard-upcoming-mobile-status dashboard-upcoming-mobile-status--${String(
                              reserva.estado ||
                                ""
                            )
                              .toLowerCase()
                              .normalize(
                                "NFD"
                              )
                              .replace(
                                /[\u0300-\u036f]/g,
                                ""
                              )
                              .replace(
                                /\s+/g,
                                "-"
                              )}`}
                          >
                            {
                              reserva.estado
                            }
                          </span>
                        </div>

                        <div className="dashboard-upcoming-mobile-stay">
                          <div>
                            <span>
                              Ingreso
                            </span>

                            <strong>
                              {formatearFechaCortaDashboard(
                                reserva.fechaIngreso
                              )}
                            </strong>
                          </div>

                          <span className="dashboard-upcoming-mobile-arrow">
                            →
                          </span>

                          <div>
                            <span>
                              Egreso
                            </span>

                            <strong>
                              {formatearFechaCortaDashboard(
                                reserva.fechaEgreso
                              )}
                            </strong>
                          </div>
                        </div>

                        <div className="dashboard-upcoming-mobile-bottom">
                          <span className="dashboard-upcoming-mobile-channel">
                            {
                              reserva.canal
                            }
                          </span>

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
                        </div>
                      </article>
                    )
                  )
                ) : (
                  <div className="dashboard-upcoming-mobile-empty">
                    <strong>
                      Sin próximas reservas
                    </strong>

                    <span>
                      No hay check-ins próximos para mostrar.
                    </span>
                  </div>
                )}
              </div>
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

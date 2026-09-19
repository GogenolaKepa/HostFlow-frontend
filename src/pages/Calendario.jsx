import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createPortal } from "react-dom";
import axios from "axios";

const API_CALENDARIO =
  "http://localhost:4000/api/calendario";

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIAS_SEMANA = [
  "LUN",
  "MAR",
  "MIÉ",
  "JUE",
  "VIE",
  "SÁB",
  "DOM",
];

function Calendario({
  onVerReserva,
}) {
  const hoy =
    useMemo(
      () => new Date(),
      []
    );

  const [
    anio,
    setAnio,
  ] =
    useState(
      hoy.getFullYear()
    );

  const [
    mes,
    setMes,
  ] =
    useState(
      hoy.getMonth() + 1
    );

  const [
    idPropiedad,
    setIdPropiedad,
  ] =
    useState("");

  const [
    calendario,
    setCalendario,
  ] =
    useState(null);

  const [
    propiedadesFiltro,
    setPropiedadesFiltro,
  ] =
    useState([]);

  const [
    cargando,
    setCargando,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    celdaSeleccionada,
    setCeldaSeleccionada,
  ] =
    useState(null);

  // =========================================================
  // MODAL DE DETALLE DEL DÍA
  // =========================================================

  useEffect(() => {
    if (!celdaSeleccionada) {
      return undefined;
    }

    const overflowAnterior =
      document.body.style.overflow;

    const manejarTecla =
      (evento) => {
        if (
          evento.key ===
          "Escape"
        ) {
          setCeldaSeleccionada(
            null
          );
        }
      };

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      manejarTecla
    );

    return () => {
      document.body.style.overflow =
        overflowAnterior;

      window.removeEventListener(
        "keydown",
        manejarTecla
      );
    };
  }, [
    celdaSeleccionada,
  ]);

  // =========================================================
  // CARGAR CALENDARIO
  // =========================================================

  useEffect(() => {
    const cargarCalendario =
      async () => {
        try {
          setCargando(true);
          setError("");
          setCeldaSeleccionada(
            null
          );

          const params = {
            anio,
            mes,
          };

          if (idPropiedad) {
            params.idPropiedad =
              idPropiedad;
          }

          const peticiones = [
            axios.get(
              API_CALENDARIO,
              {
                params,
              }
            ),
          ];

          /*
           * Si estamos filtrando una propiedad,
           * pedimos también la vista general del mes
           * para conservar todas las opciones del selector.
           */
          if (idPropiedad) {
            peticiones.push(
              axios.get(
                API_CALENDARIO,
                {
                  params: {
                    anio,
                    mes,
                  },
                }
              )
            );
          }

          const respuestas =
            await Promise.all(
              peticiones
            );

          const respuestaCalendario =
            respuestas[0].data;

          setCalendario(
            respuestaCalendario
          );

          const respuestaOpciones =
            idPropiedad
              ? respuestas[1].data
              : respuestaCalendario;

          setPropiedadesFiltro(
            respuestaOpciones
              .propiedades || []
          );
        } catch (err) {
          console.error(
            "Error al cargar calendario:",
            err
          );

          setCalendario(null);

          setError(
            err.response?.data
              ?.mensaje ||
              "No se pudo cargar el calendario."
          );
        } finally {
          setCargando(false);
        }
      };

    cargarCalendario();
  }, [
    anio,
    mes,
    idPropiedad,
  ]);

  // =========================================================
  // NAVEGACIÓN ENTRE MESES
  // =========================================================

  const cambiarMes =
    (desplazamiento) => {
      const nuevaFecha =
        new Date(
          anio,
          mes - 1 +
            desplazamiento,
          1
        );

      setAnio(
        nuevaFecha
          .getFullYear()
      );

      setMes(
        nuevaFecha
          .getMonth() + 1
      );
    };

  const irAHoy =
    () => {
      const ahora =
        new Date();

      setAnio(
        ahora.getFullYear()
      );

      setMes(
        ahora.getMonth() + 1
      );
    };

  // =========================================================
  // HELPERS
  // =========================================================

  const formatearMoneda =
    (valor) => {
      if (
        valor === null ||
        valor === undefined
      ) {
        return "-";
      }

      return new Intl
        .NumberFormat(
          "es-AR",
          {
            style:
              "currency",

            currency:
              "ARS",

            maximumFractionDigits:
              0,
          }
        )
        .format(
          Number(valor)
        );
    };

  const formatearFecha =
    (fecha) => {
      if (!fecha) {
        return "-";
      }

      const [
        y,
        m,
        d,
      ] =
        fecha
          .split("-")
          .map(Number);

      return new Intl
        .DateTimeFormat(
          "es-AR",
          {
            day:
              "2-digit",

            month:
              "2-digit",

            year:
              "numeric",
          }
        )
        .format(
          new Date(
            y,
            m - 1,
            d
          )
        );
    };

  const obtenerDiaSemana =
    (dia) => {
      const fecha =
        new Date(
          anio,
          mes - 1,
          dia
        );

      return new Intl
        .DateTimeFormat(
          "es-AR",
          {
            weekday:
              "short",
          }
        )
        .format(fecha)
        .replace(".", "");
    };

  const normalizarClase =
    (texto) =>
      String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .replace(
          /\s+/g,
          "-"
        );

  const esHoy =
    (fecha) => {
      const ahora =
        new Date();

      const fechaHoy =
        [
          ahora
            .getFullYear(),
          String(
            ahora
              .getMonth() +
              1
          ).padStart(
            2,
            "0"
          ),
          String(
            ahora.getDate()
          ).padStart(
            2,
            "0"
          ),
        ].join("-");

      return (
        fecha ===
        fechaHoy
      );
    };

  const obtenerTextoCelda =
    (dia) => {
      if (
        dia.estado ===
        "Disponible"
      ) {
        return "Libre";
      }

      if (
        dia.estado ===
        "No disponible"
      ) {
        return "No disp.";
      }

      if (
        dia.estado ===
        "Conflicto"
      ) {
        return "Conflicto";
      }

      const reserva =
        dia.reservas?.find(
          (item) =>
            item
              .bloqueaDisponibilidad
        ) ||
        dia.reservas?.[0];

      if (!reserva) {
        return dia.estado;
      }

      return (
        reserva.huesped
          ?.split(" ")[0] ||
        dia.estado
      );
    };

  // =========================================================
  // DATOS DERIVADOS
  // =========================================================

  const diasCabecera =
    useMemo(
      () => {
        const cantidadDias =
          calendario
            ?.periodo
            ?.cantidadDias ||
          0;

        return Array.from(
          {
            length:
              cantidadDias,
          },
          (
            _,
            indice
          ) =>
            indice + 1
        );
      },
      [calendario]
    );

  const propiedadSeleccionada =
    idPropiedad
      ? calendario
          ?.propiedades
          ?.[0] ||
        null
      : null;

  const diasCalendarioClasico =
    useMemo(
      () => {
        if (
          !propiedadSeleccionada ||
          !calendario
            ?.periodo
            ?.cantidadDias
        ) {
          return [];
        }

        const primerDia =
          new Date(
            anio,
            mes - 1,
            1
          );

        /*
         * JavaScript usa:
         * 0 = domingo
         * 1 = lunes
         *
         * La vista clásica de HostFlow
         * comienza el lunes.
         */
        const desplazamiento =
          (
            primerDia.getDay() +
            6
          ) %
          7;

        const cantidadDias =
          calendario
            .periodo
            .cantidadDias;

        const cantidadCeldas =
          Math.ceil(
            (
              desplazamiento +
              cantidadDias
            ) /
              7
          ) *
          7;

        return Array.from(
          {
            length:
              cantidadCeldas,
          },
          (
            _,
            indice
          ) => {
            const numeroDia =
              indice -
              desplazamiento +
              1;

            if (
              numeroDia < 1 ||
              numeroDia >
                cantidadDias
            ) {
              return null;
            }

            return (
              propiedadSeleccionada
                .dias
                ?.find(
                  (dia) =>
                    Number(
                      dia.dia
                    ) ===
                    numeroDia
                ) ||
              null
            );
          }
        );
      },
      [
        anio,
        mes,
        calendario,
        propiedadSeleccionada,
      ]
    );

  const tituloMes =
    `${
      NOMBRES_MESES[
        mes - 1
      ]
    } ${anio}`;

  // =========================================================
  // RENDER
  // =========================================================

  if (cargando) {
    return (
      <section className="calendar-page">
        <div className="calendar-loading-card">
          Cargando calendario...
        </div>
      </section>
    );
  }

  return (
    <section className="calendar-page">
      <div className="calendar-header">
        <div>
          <span className="calendar-eyebrow">
            Disponibilidad
          </span>

          <h1>
            Calendario
          </h1>

          <p>
            Visualizá reservas,
            disponibilidad y
            conflictos de todas tus
            propiedades.
          </p>
        </div>

        <button
          type="button"
          className="calendar-today-button"
          onClick={irAHoy}
        >
          Ir a hoy
        </button>
      </div>

      <div className="calendar-toolbar">
        <div className="calendar-month-navigation">
          <button
            type="button"
            className="calendar-nav-button"
            onClick={() =>
              cambiarMes(-1)
            }
            aria-label="Mes anterior"
          >
            ‹
          </button>

          <div className="calendar-current-month">
            {tituloMes}
          </div>

          <button
            type="button"
            className="calendar-nav-button"
            onClick={() =>
              cambiarMes(1)
            }
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>

        <div className="calendar-filter">
          <label
            htmlFor="calendar-property-filter"
          >
            Propiedad
          </label>

          <select
            id="calendar-property-filter"
            value={idPropiedad}
            onChange={(e) =>
              setIdPropiedad(
                e.target.value
              )
            }
          >
            <option value="">
              Todas las propiedades
            </option>

            {propiedadesFiltro.map(
              (propiedad) => (
                <option
                  key={
                    propiedad
                      .idPropiedad
                  }
                  value={
                    propiedad
                      .idPropiedad
                  }
                >
                  {
                    propiedad
                      .nombre
                  }
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {error && (
        <div className="calendar-message calendar-message--error">
          {error}
        </div>
      )}

      {calendario && (
        <>
          {!idPropiedad && (
            <div className="calendar-summary-grid">
              <article className="calendar-summary-card">
                <span>
                  Propiedades
                </span>

                <strong>
                  {
                    calendario
                      .resumen
                      .cantidadPropiedades
                  }
                </strong>
              </article>

              <article className="calendar-summary-card">
                <span>
                  Reservas del período
                </span>

                <strong>
                  {
                    calendario
                      .resumen
                      .cantidadReservas
                  }
                </strong>
              </article>

              <article className="calendar-summary-card">
                <span>
                  Conflictos
                </span>

                <strong>
                  {
                    calendario
                      .resumen
                      .cantidadConflictos
                  }
                </strong>
              </article>

              <article className="calendar-summary-card">
                <span>
                  Mes
                </span>

                <strong className="calendar-summary-month">
                  {tituloMes}
                </strong>
              </article>
            </div>
          )}

          <div className="calendar-legend">
            {[
              "Disponible",
              "Reservada",
              "Ocupada",
              "No disponible",
              "Conflicto",
            ].map(
              (estado) => (
                <div
                  key={estado}
                  className="calendar-legend-item"
                >
                  <span
                    className={`calendar-legend-dot calendar-legend-dot--${normalizarClase(
                      estado
                    )}`}
                  />

                  {estado}
                </div>
              )
            )}
          </div>

          {calendario
            .propiedades
            .length === 0 ? (
            <div className="calendar-empty-state">
              No hay propiedades para
              mostrar.
            </div>
          ) : idPropiedad &&
            propiedadSeleccionada ? (
            <div className="calendar-month-view-card">
              <div className="calendar-month-property-header">
                <div>
                  <span className="calendar-eyebrow">
                    Vista mensual
                  </span>

                  <h2>
                    {
                      propiedadSeleccionada
                        .nombre
                    }
                  </h2>

                  <p>
                    {
                      propiedadSeleccionada
                        .tipo
                    }
                    {" · "}
                    {
                      propiedadSeleccionada
                        .ciudad
                    }
                    {" · "}
                    {
                      propiedadSeleccionada
                        .estado
                    }
                  </p>
                </div>

                <div className="calendar-month-property-stats">
                  <div>
                    <span>
                      Reservas
                    </span>

                    <strong>
                      {
                        propiedadSeleccionada
                          .resumen
                          ?.cantidadReservas ||
                        0
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Disponibles
                    </span>

                    <strong>
                      {
                        propiedadSeleccionada
                          .resumen
                          ?.diasDisponibles ||
                        0
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Días en conflicto
                    </span>

                    <strong>
                      {
                        propiedadSeleccionada
                          .resumen
                          ?.diasConConflicto ||
                        0
                      }
                    </strong>
                  </div>
                </div>
              </div>

              <div className="calendar-month-weekdays">
                {DIAS_SEMANA.map(
                  (diaSemana) => (
                    <div
                      key={
                        diaSemana
                      }
                    >
                      {diaSemana}
                    </div>
                  )
                )}
              </div>

              <div className="calendar-month-grid">
                {diasCalendarioClasico.map(
                  (
                    dia,
                    indice
                  ) => {
                    if (!dia) {
                      return (
                        <div
                          key={`vacio-${indice}`}
                          className="calendar-month-day calendar-month-day--empty"
                        />
                      );
                    }

                    const claseEstado =
                      normalizarClase(
                        dia.estado
                      );

                    const reservasBloqueantes =
                      (
                        dia.reservas ||
                        []
                      ).filter(
                        (reserva) =>
                          reserva
                            .bloqueaDisponibilidad
                      );

                    const reservasNoBloqueantes =
                      (
                        dia.reservas ||
                        []
                      ).filter(
                        (reserva) =>
                          !reserva
                            .bloqueaDisponibilidad
                      );

                    const seleccionada =
                      celdaSeleccionada
                        ?.propiedad
                        ?.idPropiedad ===
                        propiedadSeleccionada
                          .idPropiedad &&
                      celdaSeleccionada
                        ?.dia
                        ?.fecha ===
                        dia.fecha;

                    return (
                      <button
                        type="button"
                        key={
                          dia.fecha
                        }
                        className={`calendar-month-day calendar-month-day--${claseEstado} ${
                          esHoy(
                            dia.fecha
                          )
                            ? "calendar-month-day--today"
                            : ""
                        } ${
                          seleccionada
                            ? "calendar-month-day--selected"
                            : ""
                        }`}
                        onClick={() =>
                          setCeldaSeleccionada({
                            propiedad:
                              propiedadSeleccionada,
                            dia,
                          })
                        }
                        title={`${propiedadSeleccionada.nombre} · ${dia.fecha} · ${dia.estado}`}
                      >
                        <div className="calendar-month-day-header">
                          <span className="calendar-month-day-number">
                            {
                              dia.dia
                            }
                          </span>

                          <span
                            className={`calendar-month-day-state calendar-month-day-state--${claseEstado}`}
                          >
                            {
                              dia.estado
                            }
                          </span>
                        </div>

                        <div className="calendar-month-day-body">
                          {reservasBloqueantes
                            .slice(
                              0,
                              2
                            )
                            .map(
                              (
                                reserva
                              ) => (
                                <div
                                  key={
                                    reserva
                                      .idReserva
                                  }
                                  className={`calendar-month-reservation ${
                                    dia
                                      .tieneConflicto
                                      ? "calendar-month-reservation--conflict"
                                      : ""
                                  }`}
                                >
                                  <strong>
                                    {
                                      reserva
                                        .huesped
                                    }
                                  </strong>

                                  <span>
                                    {
                                      reserva
                                        .canal
                                    }
                                  </span>
                                </div>
                              )
                            )}

                          {reservasBloqueantes
                            .length >
                            2 && (
                            <span className="calendar-month-more">
                              +
                              {
                                reservasBloqueantes
                                  .length -
                                2
                              }{" "}
                              reserva(s)
                            </span>
                          )}

                          {reservasBloqueantes
                            .length ===
                            0 &&
                            reservasNoBloqueantes
                              .length >
                              0 && (
                              <div className="calendar-month-history">
                                <span />

                                {
                                  reservasNoBloqueantes
                                    .length
                                }{" "}
                                reserva(s)
                                cancelada(s) /
                                no show
                              </div>
                            )}

                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          ) : (
            <div className="calendar-board-card">
              <div className="calendar-board-scroll">
                <div
                  className="calendar-board"
                  style={{
                    "--calendar-days":
                      calendario
                        .periodo
                        .cantidadDias,
                  }}
                >
                  <div className="calendar-board-header">
                    <div className="calendar-property-heading">
                      Propiedad
                    </div>

                    {diasCabecera.map(
                      (dia) => {
                        const fecha =
                          `${anio}-${String(
                            mes
                          ).padStart(
                            2,
                            "0"
                          )}-${String(
                            dia
                          ).padStart(
                            2,
                            "0"
                          )}`;

                        return (
                          <div
                            key={dia}
                            className={`calendar-day-heading ${
                              esHoy(
                                fecha
                              )
                                ? "calendar-day-heading--today"
                                : ""
                            }`}
                          >
                            <span>
                              {
                                obtenerDiaSemana(
                                  dia
                                )
                              }
                            </span>

                            <strong>
                              {dia}
                            </strong>
                          </div>
                        );
                      }
                    )}
                  </div>

                  {calendario
                    .propiedades
                    .map(
                      (
                        propiedad
                      ) => (
                        <div
                          key={
                            propiedad
                              .idPropiedad
                          }
                          className="calendar-property-row"
                        >
                          <div className="calendar-property-info">
                            <strong>
                              {
                                propiedad
                                  .nombre
                              }
                            </strong>

                            <span>
                              {
                                propiedad
                                  .tipo
                              }
                              {" · "}
                              {
                                propiedad
                                  .ciudad
                              }
                            </span>

                            <small
                              className={`calendar-property-state calendar-property-state--${normalizarClase(
                                propiedad
                                  .estado
                              )}`}
                            >
                              {
                                propiedad
                                  .estado
                              }
                            </small>
                          </div>

                          {propiedad
                            .dias
                            .map(
                              (
                                dia
                              ) => {
                                const claseEstado =
                                  normalizarClase(
                                    dia.estado
                                  );

                                const reservasBloqueantes =
                                  (
                                    dia.reservas ||
                                    []
                                  ).filter(
                                    (reserva) =>
                                      reserva
                                        .bloqueaDisponibilidad
                                  );

                                const reservasNoBloqueantes =
                                  (
                                    dia.reservas ||
                                    []
                                  ).filter(
                                    (reserva) =>
                                      !reserva
                                        .bloqueaDisponibilidad
                                  );

                                const seleccionada =
                                  celdaSeleccionada
                                    ?.propiedad
                                    ?.idPropiedad ===
                                    propiedad
                                      .idPropiedad &&
                                  celdaSeleccionada
                                    ?.dia
                                    ?.fecha ===
                                    dia.fecha;

                                return (
                                  <button
                                    type="button"
                                    key={
                                      dia.fecha
                                    }
                                    className={`calendar-cell calendar-cell--${claseEstado} ${
                                      esHoy(
                                        dia.fecha
                                      )
                                        ? "calendar-cell--today"
                                        : ""
                                    } ${
                                      seleccionada
                                        ? "calendar-cell--selected"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      setCeldaSeleccionada({
                                        propiedad,
                                        dia,
                                      })
                                    }
                                    title={`${propiedad.nombre} · ${dia.fecha} · ${dia.estado}`}
                                  >
                                    <span className="calendar-cell-status">
                                      {
                                        obtenerTextoCelda(
                                          dia
                                        )
                                      }
                                    </span>

                                    {reservasBloqueantes
                                      .length >
                                      1 && (
                                      <span className="calendar-cell-count">
                                        {
                                          reservasBloqueantes
                                            .length
                                        }
                                      </span>
                                    )}

                                    {reservasBloqueantes
                                      .length ===
                                      0 &&
                                      reservasNoBloqueantes
                                        .length >
                                        0 && (
                                        <span
                                          className="calendar-cell-history-indicator"
                                          title={`${reservasNoBloqueantes.length} reserva(s) cancelada(s) o no show`}
                                        />
                                      )}
                                  </button>
                                );
                              }
                            )}
                        </div>
                      )
                    )}
                </div>
              </div>
            </div>
          )}

          {celdaSeleccionada &&
            createPortal(
              <div
                className="calendar-day-modal-backdrop"
                onMouseDown={(evento) => {
                  if (
                    evento.target ===
                    evento.currentTarget
                  ) {
                    setCeldaSeleccionada(
                      null
                    );
                  }
                }}
              >
                <div
                  className="calendar-day-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="calendar-day-modal-title"
                  onMouseDown={(evento) =>
                    evento.stopPropagation()
                  }
                >
                  <div className="calendar-day-modal-header">
                    <div>
                      <span className="calendar-eyebrow">
                        Detalle del día
                      </span>

                      <h2 id="calendar-day-modal-title">
                        {
                          celdaSeleccionada
                            .propiedad
                            .nombre
                        }
                      </h2>

                      <div className="calendar-day-modal-meta">
                        <span>
                          {formatearFecha(
                            celdaSeleccionada
                              .dia
                              .fecha
                          )}
                        </span>

                        <span
                          className={`calendar-day-modal-status calendar-day-modal-status--${normalizarClase(
                            celdaSeleccionada
                              .dia
                              .estado
                          )}`}
                        >
                          {
                            celdaSeleccionada
                              .dia
                              .estado
                          }
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="calendar-day-modal-close"
                      onClick={() =>
                        setCeldaSeleccionada(
                          null
                        )
                      }
                      aria-label="Cerrar detalle"
                    >
                      ×
                    </button>
                  </div>

                  <div className="calendar-day-modal-body">
                    {celdaSeleccionada
                      .dia
                      .reservas
                      .length === 0 ? (
                      <div className="calendar-detail-empty">
                        <strong>
                          No hay reservas para este día.
                        </strong>

                        <span>
                          La propiedad se encuentra{" "}
                          {celdaSeleccionada
                            .dia
                            .estado
                            .toLowerCase()}
                          .
                        </span>
                      </div>
                    ) : (
                      <div className="calendar-reservations-list calendar-reservations-list--modal">
                        {celdaSeleccionada
                          .dia
                          .reservas
                          .map(
                            (
                              reserva
                            ) => (
                              <article
                                key={
                                  reserva
                                    .idReserva
                                }
                                className={`calendar-reservation-card ${
                                  celdaSeleccionada
                                    .dia
                                    .tieneConflicto
                                    ? "calendar-reservation-card--conflict"
                                    : ""
                                } ${
                                  !reserva
                                    .bloqueaDisponibilidad
                                    ? "calendar-reservation-card--inactive"
                                    : ""
                                }`}
                              >
                                <div className="calendar-reservation-main">
                                  <div>
                                    <strong>
                                      {
                                        reserva
                                          .huesped
                                      }
                                    </strong>

                                    <span>
                                      Reserva #
                                      {
                                        reserva
                                          .idReserva
                                      }
                                    </span>
                                  </div>

                                  <span className="calendar-channel-badge">
                                    {
                                      reserva
                                        .canal
                                    }
                                  </span>
                                </div>

                                {!reserva
                                  .bloqueaDisponibilidad && (
                                  <div className="calendar-nonblocking-note">
                                    No bloquea disponibilidad
                                  </div>
                                )}

                                <div className="calendar-reservation-data">
                                  <div>
                                    <span>
                                      Estadía
                                    </span>

                                    <strong>
                                      {formatearFecha(
                                        reserva
                                          .fechaIngreso
                                      )}
                                      {" → "}
                                      {formatearFecha(
                                        reserva
                                          .fechaEgreso
                                      )}
                                    </strong>
                                  </div>

                                  <div>
                                    <span>
                                      Estado
                                    </span>

                                    <strong>
                                      {
                                        reserva
                                          .estado
                                      }
                                    </strong>
                                  </div>

                                  <div>
                                    <span>
                                      Huéspedes
                                    </span>

                                    <strong>
                                      {
                                        reserva
                                          .cantidadHuespedes
                                      }
                                    </strong>
                                  </div>

                                  <div>
                                    <span>
                                      Monto
                                    </span>

                                    <strong>
                                      {formatearMoneda(
                                        reserva
                                          .montoEstimado
                                      )}
                                    </strong>
                                  </div>
                                </div>

                                {celdaSeleccionada
                                  .dia
                                  .tieneConflicto &&
                                  reserva
                                    .bloqueaDisponibilidad && (
                                  <div className="calendar-conflict-warning">
                                    Esta reserva participa del conflicto de disponibilidad de este día.
                                  </div>
                                )}

                                {onVerReserva && (
                                  <button
                                    type="button"
                                    className="calendar-view-reservation"
                                    onClick={() => {
                                      setCeldaSeleccionada(
                                        null
                                      );

                                      onVerReserva(
                                        reserva
                                          .idReserva
                                      );
                                    }}
                                  >
                                    Ver reserva
                                  </button>
                                )}
                              </article>
                            )
                          )}
                      </div>
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )}


        </>
      )}
    </section>
  );
}

export default Calendario;

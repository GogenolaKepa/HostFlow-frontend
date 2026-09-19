import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

                            <small>
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

          {celdaSeleccionada && (
            <div className="calendar-detail-card">
              <div className="calendar-detail-header">
                <div>
                  <span className="calendar-eyebrow">
                    Detalle del día
                  </span>

                  <h2>
                    {
                      celdaSeleccionada
                        .propiedad
                        .nombre
                    }
                  </h2>

                  <p>
                    {formatearFecha(
                      celdaSeleccionada
                        .dia
                        .fecha
                    )}
                    {" · "}
                    {
                      celdaSeleccionada
                        .dia
                        .estado
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="calendar-detail-close"
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

              {celdaSeleccionada
                .dia
                .reservas
                .length === 0 ? (
                <div className="calendar-detail-empty">
                  No hay reservas
                  registradas para este
                  día.
                </div>
              ) : (
                <div className="calendar-reservations-list">
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
                            reserva
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

                          {reserva
                            .tieneConflicto && (
                            <div className="calendar-conflict-warning">
                              Esta reserva
                              participa de un
                              conflicto de
                              disponibilidad.
                            </div>
                          )}

                          {onVerReserva && (
                            <button
                              type="button"
                              className="calendar-view-reservation"
                              onClick={() =>
                                onVerReserva(
                                  reserva
                                    .idReserva
                                )
                              }
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
          )}
        </>
      )}
    </section>
  );
}

export default Calendario;

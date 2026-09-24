import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

function Alertas({
  onVerReserva,
  onVerPropiedades,
}) {
  const [
    alertas,
    setAlertas,
  ] = useState([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    sincronizando,
    setSincronizando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    filtroEstado,
    setFiltroEstado,
  ] = useState("Todas");

  const [
    filtroCategoria,
    setFiltroCategoria,
  ] = useState("Todas");

  const [
    filtroSeveridad,
    setFiltroSeveridad,
  ] = useState("Todas");

  const [
    alertaProcesando,
    setAlertaProcesando,
  ] = useState(null);

  useEffect(() => {
    obtenerAlertas();
  }, []);

  // =========================================================
  // CARGA
  // =========================================================

  const obtenerAlertas =
    async () => {
      try {
        setCargando(true);
        setError("");

        const response =
          await api.get(
            "/alertas"
          );

        setAlertas(
          response.data
            .alertas || []
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudieron obtener las alertas."
        );
      } finally {
        setCargando(false);
      }
    };

  const sincronizarAlertas =
    async () => {
      try {
        setSincronizando(true);
        setError("");
        setMensaje("");

        await api.post(
          "/alertas/sincronizar"
        );

        await obtenerAlertas();

        setMensaje(
          "Alertas operativas actualizadas."
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudieron actualizar las alertas."
        );
      } finally {
        setSincronizando(false);
      }
    };

  // =========================================================
  // ACCIONES
  // =========================================================

  const marcarLeida =
    async (
      alerta
    ) => {
      if (
        alerta.estado !==
        "Nueva"
      ) {
        return;
      }

      try {
        setAlertaProcesando(
          alerta.idAlerta
        );

        setError("");
        setMensaje("");

        const response =
          await api.patch(
            `/alertas/${alerta.idAlerta}/leida`
          );

        setAlertas(
          (
            anteriores
          ) =>
            anteriores.map(
              (item) =>
                item.idAlerta ===
                alerta.idAlerta
                  ? response.data
                      .alerta
                  : item
            )
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudo marcar la alerta como leída."
        );
      } finally {
        setAlertaProcesando(
          null
        );
      }
    };

  // =========================================================
  // HELPERS
  // =========================================================

  const formatearFechaHora =
    (
      fecha
    ) => {
      if (!fecha) {
        return "-";
      }

      return new Date(
        fecha
      ).toLocaleString(
        "es-AR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };

  const obtenerIcono =
    (
      categoria
    ) => {
      if (
        categoria ===
        "Reserva"
      ) {
        return "◷";
      }

      if (
        categoria ===
        "Propiedad"
      ) {
        return "⌂";
      }

      if (
        categoria ===
        "Incidencia"
      ) {
        return "!";
      }

      if (
        categoria ===
        "Sincronizacion"
      ) {
        return "↻";
      }

      return "i";
    };

  const mostrarSeveridad =
    (
      severidad
    ) =>
      severidad ===
      "Critica"
        ? "Crítica"
        : severidad;

  const obtenerClaseSeveridad =
    (
      severidad
    ) =>
      `alertas-severity alertas-severity--${String(
        severidad
      ).toLowerCase()}`;

  const obtenerClaseEstado =
    (
      estado
    ) =>
      `alertas-status alertas-status--${String(
        estado
      )
        .toLowerCase()
        .replace(
          /\s+/g,
          "-"
        )}`;

  // =========================================================
  // FILTROS + RESUMEN
  // =========================================================

  const alertasFiltradas =
    useMemo(
      () =>
        alertas.filter(
          (
            alerta
          ) => {
            const coincideEstado =
              filtroEstado ===
                "Todas" ||
              alerta.estado ===
                filtroEstado;

            const coincideCategoria =
              filtroCategoria ===
                "Todas" ||
              alerta.categoria ===
                filtroCategoria;

            const coincideSeveridad =
              filtroSeveridad ===
                "Todas" ||
              alerta.severidad ===
                filtroSeveridad;

            return (
              coincideEstado &&
              coincideCategoria &&
              coincideSeveridad
            );
          }
        ),
      [
        alertas,
        filtroEstado,
        filtroCategoria,
        filtroSeveridad,
      ]
    );

  const resumen =
    useMemo(
      () => ({
        total:
          alertas.length,

        nuevas:
          alertas.filter(
            (
              alerta
            ) =>
              alerta.estado ===
              "Nueva"
          ).length,

        criticas:
          alertas.filter(
            (
              alerta
            ) =>
              alerta.estado !==
                "Resuelta" &&
              alerta.severidad ===
                "Critica"
          ).length,

        altas:
          alertas.filter(
            (
              alerta
            ) =>
              alerta.estado !==
                "Resuelta" &&
              alerta.severidad ===
                "Alta"
          ).length,
      }),
      [
        alertas,
      ]
    );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <section className="alertas-page">
      <div className="section-header alertas-page-header">
        <div>
          <h2>
            Centro de alertas
          </h2>

          <p>
            Seguimiento centralizado de situaciones que requieren atención.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button alertas-refresh-button"
          onClick={
            sincronizarAlertas
          }
          disabled={
            sincronizando
          }
        >
          {sincronizando
            ? "Actualizando..."
            : "↻ Actualizar alertas"}
        </button>
      </div>

      {mensaje && (
        <p className="success-message">
          {mensaje}
        </p>
      )}

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      <div className="alertas-summary-grid">
        <article className="alertas-summary-card">
          <span>
            Total
          </span>

          <strong>
            {resumen.total}
          </strong>

          <small>
            alertas registradas
          </small>
        </article>

        <article className="alertas-summary-card alertas-summary-card--new">
          <span>
            Nuevas
          </span>

          <strong>
            {resumen.nuevas}
          </strong>

          <small>
            requieren revisión
          </small>
        </article>

        <article className="alertas-summary-card alertas-summary-card--critical">
          <span>
            Críticas
          </span>

          <strong>
            {resumen.criticas}
          </strong>

          <small>
            activas
          </small>
        </article>

        <article className="alertas-summary-card alertas-summary-card--high">
          <span>
            Altas
          </span>

          <strong>
            {resumen.altas}
          </strong>

          <small>
            activas
          </small>
        </article>
      </div>

      <div className="alertas-toolbar">
        <div className="alertas-filter-group">
          <label>
            <span>
              Estado
            </span>

            <select
              value={
                filtroEstado
              }
              onChange={(e) =>
                setFiltroEstado(
                  e.target.value
                )
              }
            >
              <option value="Todas">
                Todas
              </option>
              <option value="Nueva">
                Nuevas
              </option>
              <option value="Leida">
                Leídas
              </option>
              <option value="Resuelta">
                Resueltas
              </option>
            </select>
          </label>

          <label>
            <span>
              Categoría
            </span>

            <select
              value={
                filtroCategoria
              }
              onChange={(e) =>
                setFiltroCategoria(
                  e.target.value
                )
              }
            >
              <option value="Todas">
                Todas
              </option>
              <option value="Reserva">
                Reservas
              </option>
              <option value="Propiedad">
                Propiedades
              </option>
              <option value="Incidencia">
                Incidencias
              </option>
              <option value="Sincronizacion">
                Sincronización
              </option>
              <option value="Sistema">
                Sistema
              </option>
            </select>
          </label>

          <label>
            <span>
              Severidad
            </span>

            <select
              value={
                filtroSeveridad
              }
              onChange={(e) =>
                setFiltroSeveridad(
                  e.target.value
                )
              }
            >
              <option value="Todas">
                Todas
              </option>
              <option value="Critica">
                Crítica
              </option>
              <option value="Alta">
                Alta
              </option>
              <option value="Media">
                Media
              </option>
              <option value="Informativa">
                Informativa
              </option>
            </select>
          </label>
        </div>

        <span className="alertas-results-count">
          {
            alertasFiltradas.length
          }{" "}
          resultado
          {alertasFiltradas.length ===
          1
            ? ""
            : "s"}
        </span>
      </div>

      {cargando ? (
        <div className="alertas-empty-state">
          Cargando alertas...
        </div>
      ) : alertasFiltradas.length ===
        0 ? (
        <div className="alertas-empty-state">
          <strong>
            No hay alertas para mostrar.
          </strong>

          <span>
            Probá cambiando los filtros o actualizá las alertas operativas.
          </span>
        </div>
      ) : (
        <div className="alertas-list">
          {alertasFiltradas.map(
            (
              alerta
            ) => {
              const procesando =
                alertaProcesando ===
                alerta.idAlerta;

              return (
                <article
                  key={
                    alerta.idAlerta
                  }
                  className={`alertas-item ${
                    alerta.estado ===
                    "Nueva"
                      ? "alertas-item--new"
                      : ""
                  } ${
                    alerta.estado ===
                    "Resuelta"
                      ? "alertas-item--resolved"
                      : ""
                  }`}
                  onClick={() =>
                    marcarLeida(
                      alerta
                    )
                  }
                >
                  <div
                    className={`alertas-item-icon alertas-item-icon--${String(
                      alerta.severidad
                    ).toLowerCase()}`}
                  >
                    {obtenerIcono(
                      alerta.categoria
                    )}
                  </div>

                  <div className="alertas-item-main">
                    <div className="alertas-item-top">
                      <div className="alertas-item-badges">
                        <span
                          className={
                            obtenerClaseSeveridad(
                              alerta.severidad
                            )
                          }
                        >
                          {mostrarSeveridad(
                            alerta.severidad
                          )}
                        </span>

                        <span className="alertas-category">
                          {
                            alerta.categoria ===
                            "Sincronizacion"
                              ? "Sincronización"
                              : alerta.categoria
                          }
                        </span>

                        <span
                          className={
                            obtenerClaseEstado(
                              alerta.estado
                            )
                          }
                        >
                          {alerta.estado ===
                          "Leida"
                            ? "Leída"
                            : alerta.estado}
                        </span>
                      </div>

                      <time>
                        {formatearFechaHora(
                          alerta.fechaAlerta
                        )}
                      </time>
                    </div>

                    <h3>
                      {alerta.titulo}
                    </h3>

                    <p>
                      {alerta.mensaje}
                    </p>

                    <div className="alertas-item-footer">
                      <div className="alertas-item-context">
                        {alerta.propiedad && (
                          <span>
                            ⌂{" "}
                            {
                              alerta.propiedad
                            }
                          </span>
                        )}

                        {alerta.idReserva && (
                          <span>
                            Reserva #
                            {
                              alerta.idReserva
                            }
                          </span>
                        )}

                        <span>
                          {
                            alerta.origen
                          }
                        </span>
                      </div>

                      <div
                        className="alertas-item-actions"
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                      >
                        {alerta.idReserva &&
                          typeof onVerReserva ===
                            "function" && (
                            <button
                              type="button"
                              className="alertas-action-link"
                              onClick={() =>
                                onVerReserva(
                                  alerta.idReserva
                                )
                              }
                            >
                              Ver reserva
                            </button>
                          )}

                        {!alerta.idReserva &&
                          alerta.idPropiedad &&
                          typeof onVerPropiedades ===
                            "function" && (
                            <button
                              type="button"
                              className="alertas-action-link"
                              onClick={
                                onVerPropiedades
                              }
                            >
                              Ver propiedades
                            </button>
                          )}

                        {alerta.estado ===
                          "Nueva" && (
                          <button
                            type="button"
                            className="alertas-action-secondary"
                            disabled={
                              procesando
                            }
                            onClick={() =>
                              marcarLeida(
                                alerta
                              )
                            }
                          >
                            Marcar leída
                          </button>
                        )}

                        {alerta.estado !==
                          "Resuelta" && (
                          <span className="alertas-auto-resolution">
                            Se resuelve automáticamente al corregir la causa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

export default Alertas;

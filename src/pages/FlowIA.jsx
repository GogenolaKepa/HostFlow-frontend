import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";


function formatearFechaHora(
  valor
) {
  if (!valor) {
    return "";
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(fecha);
}


function obtenerDetalleEvidencia(
  recomendacion
) {
  const evidencia =
    recomendacion
      ?.evidencia || {};

  if (
    evidencia.ocupacion !==
      undefined &&
    evidencia.reservasProximas !==
      undefined
  ) {
    const reservas =
      Number(
        evidencia.reservasProximas ||
        0
      );

    return (
      `${evidencia.ocupacion}% de ocupación · ` +
      `${reservas} reserva${
        reservas === 1
          ? ""
          : "s"
      } próxima${
        reservas === 1
          ? ""
          : "s"
      }`
    );
  }

  if (
    evidencia.minutosDisponibles !==
      undefined &&
    evidencia.minutosDisponibles !==
      null
  ) {
    const minutos =
      Number(
        evidencia.minutosDisponibles
      );

    if (minutos <= 0) {
      return "Sin margen operativo";
    }

    if (minutos < 60) {
      return `${minutos} min disponibles`;
    }

    const horas =
      Math.floor(
        minutos / 60
      );

    const resto =
      minutos % 60;

    return resto > 0
      ? `${horas} h ${resto} min disponibles`
      : `${horas} h disponibles`;
  }

  if (
    evidencia.reservaA &&
    evidencia.reservaB
  ) {
    return (
      `Reservas #${evidencia.reservaA.idReserva} y ` +
      `#${evidencia.reservaB.idReserva}`
    );
  }

  if (
    evidencia.ocupacionActual !==
      undefined &&
    evidencia.ocupacionAnterior !==
      undefined
  ) {
    return (
      `${evidencia.ocupacionAnterior}% → ` +
      `${evidencia.ocupacionActual}% de ocupación`
    );
  }

  return "";
}


function obtenerEtiquetaAccion(
  recomendacion
) {
  const destino =
    recomendacion
      ?.destino || {};

  if (
    destino.seccion ===
    "reservas"
  ) {
    return "Ver reserva";
  }

  if (
    destino.seccion ===
    "limpiezas"
  ) {
    return "Ver limpieza";
  }

  if (
    destino.seccion ===
    "propiedades"
  ) {
    return "Ver propiedades";
  }

  if (
    destino.seccion ===
    "reportes"
  ) {
    return "Ver reportes";
  }

  if (
    destino.seccion ===
    "alertas"
  ) {
    return "Ver alertas";
  }

  return "Ir al módulo";
}


function FlowIA({
  onCambiarSeccion,
  onVerReserva,
  onVerLimpieza,
}) {
  const [
    abierta,
    setAbierta,
  ] = useState(false);

  const [
    datos,
    setDatos,
  ] = useState(null);

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  const recomendaciones =
    datos?.recomendaciones ||
    [];

  const total =
    Number(
      datos?.resumen?.total ||
      recomendaciones.length ||
      0
    );

  const altas =
    Number(
      datos?.resumen?.altas ||
      0
    );

  const iaAplicada =
    Boolean(
      datos
        ?.contexto
        ?.iaGenerativa
        ?.aplicada
    );

  const generadoEn =
    formatearFechaHora(
      datos?.generadoEn
    );


  const recomendacionesOrdenadas =
    useMemo(
      () => {
        const orden = {
          Alta: 1,
          Media: 2,
          Baja: 3,
        };

        return [
          ...recomendaciones,
        ].sort(
          (a, b) =>
            (
              orden[a.prioridad] ||
              99
            ) -
            (
              orden[b.prioridad] ||
              99
            )
        );
      },
      [recomendaciones]
    );


  const cargarRecomendaciones =
    async () => {
      try {
        setCargando(true);
        setError("");

        const response =
          await api.get(
            "/recomendaciones"
          );

        setDatos(
          response.data
        );
      } catch (err) {
        setError(
          err.response
            ?.data
            ?.mensaje ||
          "FlowIA no pudo actualizar el análisis."
        );
      } finally {
        setCargando(false);
      }
    };


  const abrirFlowIA = () => {
    setAbierta(true);

    /*
     * Para no consumir cuota innecesariamente,
     * FlowIA consulta la IA solamente la primera
     * vez que se abre durante la sesión.
     *
     * Luego el usuario puede refrescar manualmente.
     */
    if (
      !datos &&
      !cargando
    ) {
      cargarRecomendaciones();
    }
  };


  const cerrarFlowIA = () => {
    setAbierta(false);
  };


  const navegarARecomendacion =
    (recomendacion) => {
      const destino =
        recomendacion
          ?.destino || {};

      if (
        destino.seccion ===
          "reservas" &&
        destino.idReserva &&
        onVerReserva
      ) {
        cerrarFlowIA();

        onVerReserva(
          destino.idReserva
        );

        return;
      }

      if (
        destino.seccion ===
          "limpiezas" &&
        destino.idTareaLimpieza &&
        onVerLimpieza
      ) {
        cerrarFlowIA();

        onVerLimpieza(
          destino.idTareaLimpieza
        );

        return;
      }

      if (
        destino.seccion &&
        onCambiarSeccion
      ) {
        cerrarFlowIA();

        onCambiarSeccion(
          destino.seccion
        );
      }
    };


  useEffect(
    () => {
      if (!abierta) {
        return undefined;
      }

      const overflowAnterior =
        document.body.style
          .overflow;

      document.body.style
        .overflow =
        "hidden";

      const manejarEscape =
        (event) => {
          if (
            event.key ===
            "Escape"
          ) {
            cerrarFlowIA();
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
    },
    [abierta]
  );


  return (
    <>
      <button
        type="button"
        className={`flowia-fab ${
          altas > 0
            ? "flowia-fab--attention"
            : ""
        }`}
        onClick={abrirFlowIA}
        aria-label="Abrir FlowIA"
        title="Abrir FlowIA"
      >
        <span className="flowia-fab-icon">
          ✦
        </span>

        <span className="flowia-fab-copy">
          <strong>
            FlowIA
          </strong>

          <small>
            Asistente inteligente
          </small>
        </span>

        {total > 0 && (
          <span className="flowia-fab-count">
            {total}
          </span>
        )}
      </button>


      {abierta && (
        <>
          <button
            type="button"
            className="flowia-backdrop"
            onClick={cerrarFlowIA}
            aria-label="Cerrar FlowIA"
          />

          <aside
            className="flowia-panel"
            role="dialog"
            aria-modal="true"
            aria-label="FlowIA"
          >
            <div className="flowia-panel-header">
              <div className="flowia-brand">
                <span className="flowia-brand-icon">
                  ✦
                </span>

                <div>
                  <strong>
                    FlowIA
                  </strong>

                  <span>
                    Asistente inteligente de HostFlow
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="flowia-close"
                onClick={cerrarFlowIA}
                aria-label="Cerrar FlowIA"
              >
                ×
              </button>
            </div>


            <div className="flowia-panel-statusbar">
              <span
                className={`flowia-mode ${
                  iaAplicada
                    ? "flowia-mode--ai"
                    : "flowia-mode--rules"
                }`}
              >
                <span />

                {iaAplicada
                  ? "IA activa"
                  : "Análisis HostFlow"}
              </span>

              <button
                type="button"
                className="flowia-refresh"
                onClick={
                  cargarRecomendaciones
                }
                disabled={cargando}
              >
                {cargando
                  ? "Actualizando..."
                  : "Actualizar análisis"}
              </button>
            </div>


            <div className="flowia-panel-body">
              {cargando &&
              !datos ? (
                <div className="flowia-loading">
                  <span className="flowia-loading-icon">
                    ✦
                  </span>

                  <strong>
                    FlowIA está analizando tu operación
                  </strong>

                  <p>
                    Estoy revisando ocupación, conflictos,
                    limpiezas y métricas de HostFlow.
                  </p>
                </div>
              ) : error &&
                !datos ? (
                <div className="flowia-state flowia-state--error">
                  <strong>
                    No pude actualizar el análisis
                  </strong>

                  <span>
                    {error}
                  </span>

                  <button
                    type="button"
                    onClick={
                      cargarRecomendaciones
                    }
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flowia-summary">
                    <span className="flowia-summary-eyebrow">
                      ANÁLISIS OPERATIVO
                    </span>

                    <h2>
                      {total === 0
                        ? "No encontré situaciones prioritarias"
                        : `Encontré ${total} recomendación${
                            total === 1
                              ? ""
                              : "es"
                          } para tu operación`}
                    </h2>

                    {generadoEn && (
                      <p>
                        Último análisis: {generadoEn} hs
                      </p>
                    )}
                  </div>


                  {error && (
                    <div className="flowia-inline-warning">
                      {error} Se conserva el último análisis disponible.
                    </div>
                  )}


                  {recomendacionesOrdenadas.length ===
                  0 ? (
                    <div className="flowia-state flowia-state--empty">
                      <span className="flowia-state-icon">
                        ✓
                      </span>

                      <strong>
                        Operación sin recomendaciones pendientes
                      </strong>

                      <span>
                        FlowIA no detectó situaciones que requieran
                        atención con las reglas actuales.
                      </span>
                    </div>
                  ) : (
                    <div className="flowia-list">
                      {recomendacionesOrdenadas.map(
                        (recomendacion) => {
                          const detalle =
                            obtenerDetalleEvidencia(
                              recomendacion
                            );

                          return (
                            <article
                              className="flowia-card"
                              key={
                                recomendacion.id
                              }
                            >
                              <div className="flowia-card-top">
                                <span
                                  className={`flowia-priority flowia-priority--${String(
                                    recomendacion.prioridad ||
                                      "Baja"
                                  ).toLowerCase()}`}
                                >
                                  {recomendacion.prioridad}
                                </span>

                                {detalle && (
                                  <span className="flowia-evidence-chip">
                                    {detalle}
                                  </span>
                                )}
                              </div>

                              <h3>
                                {recomendacion.titulo}
                              </h3>

                              <p className="flowia-description">
                                {recomendacion.descripcion}
                              </p>

                              <div className="flowia-action-copy">
                                <span>
                                  Sugerencia
                                </span>

                                <p>
                                  {recomendacion.accion}
                                </p>
                              </div>

                              {recomendacion.fundamentoIA && (
                                <div className="flowia-reason">
                                  <span className="flowia-reason-icon">
                                    ✦
                                  </span>

                                  <div>
                                    <strong>
                                      ¿Por qué?
                                    </strong>

                                    <p>
                                      {recomendacion.fundamentoIA}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {recomendacion.destino?.seccion && (
                                <button
                                  type="button"
                                  className="flowia-card-action"
                                  onClick={() =>
                                    navegarARecomendacion(
                                      recomendacion
                                    )
                                  }
                                >
                                  {obtenerEtiquetaAccion(
                                    recomendacion
                                  )}

                                  <span>
                                    →
                                  </span>
                                </button>
                              )}
                            </article>
                          );
                        }
                      )}
                    </div>
                  )}
                </>
              )}
            </div>


            <div className="flowia-panel-footer">
              <span>
                FlowIA combina reglas de HostFlow con IA para explicar
                señales operativas. Revisá la información antes de actuar.
              </span>
            </div>
          </aside>
        </>
      )}
    </>
  );
}


export default FlowIA;
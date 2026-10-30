import CargaPagina from '../components/CargaPagina';
import '../styles/flowia-premium.css';
import {
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "../services/api";
import { validarAnalisisFlowIA } from "../services/contratosOperativos";
import { useOverlayPresence } from "../hooks/useOverlayPresence";
import PanelFlowIA from "../components/flowia/PanelFlowIA";
import AvisosTarifa from "../components/monedas/AvisosTarifa";
import {useMonedas} from "../context/MonedasContext";
import {usePermisos} from "../context/PermisosContext";
const RECOMENDACIONES_VACIAS = Object.freeze([]);


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
  abierta, onCerrar, openerRef, panelId, menuAbierto,
  onCambiarSeccion,
  onVerReserva,
  onVerLimpieza,
  onVerMonedas,
}) {
  const {estado:estadoMonedas}=useMonedas(),permite=usePermisos();
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


  const [consentimiento, setConsentimiento] = useState(false);
  const [externaSolicitada, setExternaSolicitada] = useState(false);
  const cancelarConsentimiento = useRef(null), potenciar = useRef(null), consentimientoAnterior = useRef(false);
  useEffect(() => { if (!abierta) setConsentimiento(false); }, [abierta]);
  useLayoutEffect(() => {
    if (abierta && consentimiento) cancelarConsentimiento.current?.focus();
    else if (abierta && consentimientoAnterior.current) {
      if (potenciar.current && !potenciar.current.disabled) potenciar.current.focus();
      else document.querySelector('.flowia-panel .flowia-close')?.focus();
    }
    consentimientoAnterior.current = consentimiento;
  }, [consentimiento, abierta]);
  const overlay = useOverlayPresence({ incluirMenu: false });
  const aperturaConsultada = useRef(false);
  useEffect(() => { if (abierta && (overlay || menuAbierto)) onCerrar(); }, [abierta, overlay, menuAbierto, onCerrar]);

  const recomendaciones =
    datos?.recomendaciones ||
    RECOMENDACIONES_VACIAS;

  const total =
    Number(
      datos?.resumen?.total ||
      recomendaciones.length ||
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


  const solicitudEnCurso = useRef(false);
  const cargarRecomendaciones =
    useCallback(async (usarIA = false) => {
      if (solicitudEnCurso.current) return;
      solicitudEnCurso.current = true;
      try {
        setCargando(true);
        setError("");

        const response =
          await api.get(
            "/recomendaciones", { params: { ia: usarIA === true ? "true" : "false" } }
          );

        setDatos(
          validarAnalisisFlowIA(response.data)
        );
        setExternaSolicitada(usarIA === true);
      } catch (err) {
        setError(
          err.response
            ?.data
            ?.mensaje ||
          "FlowIA no pudo actualizar el análisis."
        );
      } finally {
        solicitudEnCurso.current = false;
        setCargando(false);
      }
    }, []);


  // Solo el cambio de cerrado a abierto inicia la consulta, igual que el acceso
  // anterior. Un error no reintenta en bucle; el último análisis queda en memoria.
  useEffect(() => {
    if (!abierta) { aperturaConsultada.current = false; return; }
    if (!aperturaConsultada.current) {
      aperturaConsultada.current = true;
      if (!datos && !cargando) cargarRecomendaciones();
    }
  }, [abierta, datos, cargando, cargarRecomendaciones]);

  const aperturaAnterior = useRef(abierta);
  useLayoutEffect(() => {
    const acabaDeCerrar = aperturaAnterior.current && !abierta;
    aperturaAnterior.current = abierta;
    if (!acabaDeCerrar) return;
    // Esperar al commit que retira el diálogo. Un frame solicitado desde el
    // evento de cierre podía adelantarse a React y perder la restauración.
    const frame = requestAnimationFrame(() => {
      if (document.querySelector('[data-flowia-panel], dialog[open], [aria-modal="true"]')) return;
      const origen = openerRef.current;
      const target = [origen, document.querySelector('.sidebar-flowia'), document.querySelector('.mobile-menu-toggle')]
        .find(el => el?.isConnected && el.getClientRects().length);
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [abierta, openerRef]);

  const cerrarFlowIA = useCallback(() => onCerrar(), [onCerrar]);

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


  return abierta && !overlay && !menuAbierto ? (
    <PanelFlowIA id={panelId} onClose={cerrarFlowIA}>
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
                  : "Análisis FlowIA"}
              </span>

              <button
                type="button"
                className="flowia-refresh"
                onClick={() => cargarRecomendaciones(false)}
                disabled={cargando}
              >
                {cargando
                  ? "Actualizando..."
                  : "Actualizar análisis"}
              </button>
            </div>


            <div className="flowia-panel-body">
              <div className="flowia-enhance">
                <button ref={potenciar} type="button" className="flowia-enhance-button" disabled={cargando || consentimiento || !datos || recomendaciones.length === 0}
                  onClick={() => setConsentimiento(true)} aria-expanded={consentimiento} aria-controls="flowia-consentimiento">
                  <span aria-hidden="true">✦</span> Potenciar FlowIA
                </button>
                <span>Opcional · vos controlás qué compartís</span>
              </div>
              {consentimiento && <section id="flowia-consentimiento" className="flowia-consent" aria-labelledby="flowia-consent-title"
                onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setConsentimiento(false); } }}>
                <span className="flowia-summary-eyebrow">VOS DECIDÍS</span>
                <h2 id="flowia-consent-title">Potenciar FlowIA</h2>
                <p>FlowIA utilizará procesamiento externo para potenciar tu análisis. Se compartirán los datos operativos indicados en los detalles de privacidad.</p>
                <details className="flowia-privacy">
                  <summary>Datos compartidos y privacidad</summary>
                  <p>Proveedor: <strong>Google Gemini</strong>. Recibirá la fecha de negocio y las recomendaciones operativas permitidas a tu cuenta.</p>
                  <p>Incluye identificadores, tipos, prioridades, títulos, descripciones, acciones y evidencias. Pueden identificar propiedades, reservas o huéspedes; no se consideran datos anonimizados.</p>
                  <p>La autorización vale solo para esta consulta. Cancelar no envía datos. Las próximas consultas requieren una nueva confirmación.</p>
                </details>
                <div className="flowia-consent-actions">
                  <button ref={cancelarConsentimiento} type="button" onClick={() => setConsentimiento(false)}>Cancelar</button>
                  <button type="button" className="flowia-consent-confirm" disabled={cargando} onClick={() => { setConsentimiento(false); cargarRecomendaciones(true); }}>Confirmar y potenciar</button>
                </div>
              </section>}
              {cargando &&
              !datos ? (
                <CargaPagina variante="flowia" />
              ) : error &&
                !datos ? (
                <div className="flowia-state flowia-state--error" role="alert">
                  <strong>
                    No pude actualizar el análisis
                  </strong>

                  <span>
                    {error}
                  </span>

                  <button
                    type="button"
                    onClick={() => cargarRecomendaciones(false)}
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flowia-summary" aria-live="polite">
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


                  {externaSolicitada && !iaAplicada && <p className="flowia-fallback" role="status">El proveedor no enriqueció este análisis. Se conservan las recomendaciones de HostFlow.</p>}
                  {error && (
                    <div className="flowia-inline-warning" role="alert">
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
              {estadoMonedas?.activado&&permite('alertas.ver')&&<AvisosTarifa
                onVerMonedas={()=>{cerrarFlowIA();onVerMonedas?.();}}
                onVerPropiedades={()=>{cerrarFlowIA();onCambiarSeccion?.('propiedades');}}
              />}
            </div>


            <div className="flowia-panel-footer">
              <span>
                Análisis informativo de FlowIA. Revisá las recomendaciones antes de actuar.
              </span>
            </div>
    </PanelFlowIA>
  ) : null;
}

export default FlowIA;

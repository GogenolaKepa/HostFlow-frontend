import { useEffect, useState } from "react";
import api from "../services/api";

function Reservas() {
  const [
    idReservaObjetivo,
    setIdReservaObjetivo,
  ] = useState(() =>
    window.sessionStorage.getItem(
      "hostflowReservaObjetivo"
    )
  );

  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // =========================================================
  // RESERVA MANUAL
  // =========================================================

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [reservaEditando, setReservaEditando] =
    useState(null);

  const [formulario, setFormulario] = useState({
    idPropiedad: "1",
    idHuesped: "1",
    fechaIngreso: "2026-07-01",
    fechaEgreso: "2026-07-05",
    cantidadHuespedes: "2",
    montoEstimado: "120000",
  });

  const [formularioEdicion, setFormularioEdicion] =
    useState({
      fechaIngreso: "",
      fechaEgreso: "",
      estado: "",
      montoEstimado: "",
    });

  // =========================================================
  // AIRBNB
  // =========================================================

  const [reservaAirbnb, setReservaAirbnb] =
    useState(null);

  const [
    propuestaAirbnbVisualizando,
    setPropuestaAirbnbVisualizando,
  ] = useState(null);

  const [formularioAirbnb, setFormularioAirbnb] =
    useState({
      fechaIngreso: "",
      fechaEgreso: "",
      cantidadHuespedes: "",
      montoEstimado: "",
    });

  // =========================================================
  // BOOKING
  // =========================================================

  const [reservaBooking, setReservaBooking] =
    useState(null);

  const [accionBooking, setAccionBooking] =
    useState(null);

  const [
    operacionBookingVisualizando,
    setOperacionBookingVisualizando,
  ] = useState(null);

  const [
    formularioBookingEstadia,
    setFormularioBookingEstadia,
  ] = useState({
    fechaEgreso: "",
    montoEstimado: "",
  });

  const [
    condonarCargosBooking,
    setCondonarCargosBooking,
  ] = useState(false);

  // =========================================================
  // CARGA INICIAL
  // =========================================================

  useEffect(() => {
    obtenerReservas();
  }, []);

  useEffect(() => {
    if (
      !idReservaObjetivo ||
      reservas.length === 0
    ) {
      return;
    }

    const existeReserva =
      reservas.some(
        (reserva) =>
          Number(
            reserva.idReserva
          ) ===
          Number(
            idReservaObjetivo
          )
      );

    // La petición "Ver reserva" se consume una sola vez.
    window.sessionStorage.removeItem(
      "hostflowReservaObjetivo"
    );

    if (!existeReserva) {
      setIdReservaObjetivo(null);
      return;
    }

    const timer =
      setTimeout(() => {
        const fila =
          document.getElementById(
            `reserva-${idReservaObjetivo}`
          );

        if (fila) {
          fila.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);

    return () =>
      clearTimeout(timer);
  }, [
    reservas,
    idReservaObjetivo,
  ]);

  const limpiarReservaDestacada =
    () => {
      window.sessionStorage.removeItem(
        "hostflowReservaObjetivo"
      );

      setIdReservaObjetivo(null);
    };

  const obtenerReservas = async () => {
    try {
      const response =
        await api.get("/reservas");

      setReservas(
        response.data.reservas
      );
    } catch (error) {
      setError(
        "No se pudieron obtener las reservas."
      );
    } finally {
      setCargando(false);
    }
  };

  // =========================================================
  // CERRAR PANELES
  // =========================================================

  const cerrarPanelesExternos = () => {
    setReservaAirbnb(null);
    setPropuestaAirbnbVisualizando(null);

    setReservaBooking(null);
    setAccionBooking(null);
    setOperacionBookingVisualizando(null);
  };

  // =========================================================
  // NUEVA RESERVA MANUAL
  // =========================================================

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setFormulario({
      ...formulario,
      [name]: value,
    });
  };

  const crearReserva = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    try {
      await api.post("/reservas", {
        idPropiedad:
          Number(formulario.idPropiedad),

        idHuesped:
          Number(formulario.idHuesped),

        canal: "Manual",

        fechaIngreso:
          formulario.fechaIngreso,

        fechaEgreso:
          formulario.fechaEgreso,

        cantidadHuespedes:
          Number(
            formulario.cantidadHuespedes
          ),

        montoEstimado:
          Number(
            formulario.montoEstimado
          ),
      });

      setMensaje(
        "Reserva registrada correctamente."
      );

      setMostrarFormulario(false);

      setFormulario({
        idPropiedad: "1",
        idHuesped: "1",
        fechaIngreso: "2026-07-01",
        fechaEgreso: "2026-07-05",
        cantidadHuespedes: "2",
        montoEstimado: "120000",
      });

      await obtenerReservas();
    } catch (error) {
      setError(
        error.response?.data?.mensaje ||
          "No se pudo registrar la reserva."
      );
    }
  };

  // =========================================================
  // EDICIÓN MANUAL
  // =========================================================

  const manejarCambioEdicion = (e) => {
    const { name, value } = e.target;

    setFormularioEdicion({
      ...formularioEdicion,
      [name]: value,
    });
  };

  const abrirEdicion = (reserva) => {
    setError("");
    setMensaje("");

    setMostrarFormulario(false);

    cerrarPanelesExternos();

    setReservaEditando(reserva);

    setFormularioEdicion({
      fechaIngreso:
        reserva.fechaIngreso,

      fechaEgreso:
        reserva.fechaEgreso,

      estado:
        reserva.estado,

      montoEstimado:
        reserva.montoEstimado,
    });
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    try {
      await api.put(
        `/reservas/${reservaEditando.idReserva}`,
        {
          fechaIngreso:
            formularioEdicion.fechaIngreso,

          fechaEgreso:
            formularioEdicion.fechaEgreso,

          estado:
            formularioEdicion.estado,

          montoEstimado:
            Number(
              formularioEdicion.montoEstimado
            ),
        }
      );

      setMensaje(
        "Reserva modificada correctamente."
      );

      setReservaEditando(null);

      await obtenerReservas();
    } catch (error) {
      setError(
        error.response?.data?.mensaje ||
          "No se pudo modificar la reserva."
      );
    }
  };

  const cancelarEdicion = () => {
    setReservaEditando(null);
    setError("");
  };

  // =========================================================
  // CANCELACIÓN MANUAL
  // =========================================================

const cancelarReserva = async (
  idReserva
) => {
  const confirmar = confirm(
    "¿Seguro que querés cancelar esta reserva?"
  );

  if (!confirmar) {
    return;
  }

  try {
    setError("");
    setMensaje("");

    const response =
      await api.patch(
        `/reservas/${idReserva}/cancelar`
      );

    const reservaActualizada =
      response.data.reserva;

    setReservas((reservasAnteriores) =>
      reservasAnteriores.map(
        (reserva) =>
          Number(reserva.idReserva) ===
          Number(
            reservaActualizada.idReserva
          )
            ? reservaActualizada
            : reserva
      )
    );

    setMensaje(
      "Reserva cancelada correctamente."
    );
  } catch (error) {
    setError(
      error.response?.data?.mensaje ||
        "No se pudo cancelar la reserva."
    );
  }
};

  // =========================================================
  // AIRBNB - PROPONER CAMBIO
  // =========================================================

  const abrirPropuestaAirbnb = (
    reserva
  ) => {
    setMostrarFormulario(false);
    setReservaEditando(null);

    setReservaBooking(null);
    setAccionBooking(null);
    setOperacionBookingVisualizando(null);

    setPropuestaAirbnbVisualizando(null);

    setReservaAirbnb(reserva);

    setFormularioAirbnb({
      fechaIngreso:
        reserva.fechaIngreso,

      fechaEgreso:
        reserva.fechaEgreso,

      cantidadHuespedes:
        reserva.cantidadHuespedes,

      montoEstimado:
        reserva.montoEstimado,
    });

    setError("");
    setMensaje("");
  };

  const cerrarPropuestaAirbnb = () => {
    setReservaAirbnb(null);

    setFormularioAirbnb({
      fechaIngreso: "",
      fechaEgreso: "",
      cantidadHuespedes: "",
      montoEstimado: "",
    });
  };

  const cambiarFormularioAirbnb = (
    e
  ) => {
    const { name, value } = e.target;

    setFormularioAirbnb(
      (anterior) => ({
        ...anterior,
        [name]: value,
      })
    );
  };

  const enviarPropuestaAirbnb = async (
    e
  ) => {
    e.preventDefault();

    try {
      setError("");
      setMensaje("");

      const response = await api.post(
        `/reservas/${reservaAirbnb.idReserva}/airbnb/propuesta`,
        {
          fechaIngreso:
            formularioAirbnb.fechaIngreso,

          fechaEgreso:
            formularioAirbnb.fechaEgreso,

          cantidadHuespedes:
            Number(
              formularioAirbnb
                .cantidadHuespedes
            ),

          montoEstimado:
            Number(
              formularioAirbnb
                .montoEstimado
            ),
        }
      );

      setMensaje(
        `Propuesta enviada correctamente. Solicitud #${response.data.solicitud.idSolicitud} pendiente de respuesta de Airbnb.`
      );

      cerrarPropuestaAirbnb();

      await obtenerReservas();
    } catch (error) {
      setError(
        error.response?.data?.mensaje ||
          "No se pudo generar la propuesta de cambio."
      );
    }
  };

  // =========================================================
  // AIRBNB - PROPUESTA PENDIENTE
  // =========================================================

  const verPropuestaAirbnb = (
    reserva
  ) => {
    setMostrarFormulario(false);
    setReservaEditando(null);
    setReservaAirbnb(null);

    setReservaBooking(null);
    setAccionBooking(null);
    setOperacionBookingVisualizando(null);

    setPropuestaAirbnbVisualizando(
      reserva
    );

    setError("");
    setMensaje("");
  };

  const cerrarDetallePropuestaAirbnb =
    () => {
      setPropuestaAirbnbVisualizando(
        null
      );
    };

  const simularRespuestaAirbnb = async (
    respuesta
  ) => {
    if (
      !propuestaAirbnbVisualizando
        ?.solicitudAirbnbPendiente
    ) {
      return;
    }

    const idSolicitud =
      propuestaAirbnbVisualizando
        .solicitudAirbnbPendiente
        .idSolicitud;

    try {
      setError("");
      setMensaje("");

      const endpoint =
        respuesta === "aceptar"
          ? `/reservas/airbnb/solicitudes/${idSolicitud}/aceptar`
          : `/reservas/airbnb/solicitudes/${idSolicitud}/rechazar`;

      const response =
        await api.post(endpoint);

      if (
        respuesta === "aceptar"
      ) {
        setMensaje(
          "Simulación Airbnb: la propuesta fue aceptada y la reserva fue sincronizada."
        );
      } else {
        setMensaje(
          "Simulación Airbnb: la propuesta fue rechazada. La reserva original no fue modificada."
        );
      }

      setPropuestaAirbnbVisualizando(
        null
      );

      await obtenerReservas();

      if (
        response.data.advertencia
      ) {
        setError(
          response.data.advertencia
        );
      }
    } catch (error) {
      setError(
        error.response?.data?.mensaje ||
          "No se pudo procesar la respuesta simulada de Airbnb."
      );
    }
  };

  // =========================================================
  // BOOKING - ABRIR GESTIÓN
  // =========================================================

  const abrirGestionBooking = (
    reserva
  ) => {
    setMostrarFormulario(false);
    setReservaEditando(null);

    setReservaAirbnb(null);
    setPropuestaAirbnbVisualizando(null);

    setOperacionBookingVisualizando(null);

    setReservaBooking(reserva);
    setAccionBooking(null);

    setFormularioBookingEstadia({
      fechaEgreso:
        reserva.fechaEgreso,

      montoEstimado:
        reserva.montoEstimado,
    });

    setCondonarCargosBooking(false);

    setError("");
    setMensaje("");
  };

  const cerrarGestionBooking = () => {
    setReservaBooking(null);
    setAccionBooking(null);

    setFormularioBookingEstadia({
      fechaEgreso: "",
      montoEstimado: "",
    });

    setCondonarCargosBooking(false);
  };

  // =========================================================
  // BOOKING - CAMBIO DE ESTADÍA
  // =========================================================

  const seleccionarCambioEstadiaBooking =
    () => {
      if (!reservaBooking) {
        return;
      }

      setAccionBooking(
        "CAMBIO_ESTADIA"
      );

      setFormularioBookingEstadia({
        fechaEgreso:
          reservaBooking.fechaEgreso,

        montoEstimado:
          reservaBooking.montoEstimado,
      });
    };

  const cambiarFormularioBookingEstadia =
    (e) => {
      const { name, value } =
        e.target;

      setFormularioBookingEstadia(
        (anterior) => ({
          ...anterior,
          [name]: value,
        })
      );
    };

  const enviarCambioEstadiaBooking =
    async (e) => {
      e.preventDefault();

      if (!reservaBooking) {
        return;
      }

      try {
        setError("");
        setMensaje("");

        const response =
          await api.post(
            `/reservas/${reservaBooking.idReserva}/booking/estadia`,
            {
              fechaEgreso:
                formularioBookingEstadia
                  .fechaEgreso,

              montoEstimado:
                Number(
                  formularioBookingEstadia
                    .montoEstimado
                ),
            }
          );

        setMensaje(
          `Booking recibió la operación #${response.data.operacion.idOperacion}. El cambio quedó ${response.data.operacion.estado.toLowerCase()} y pendiente de sincronización.`
        );

        cerrarGestionBooking();

        await obtenerReservas();
      } catch (error) {
        setError(
          error.response?.data?.mensaje ||
            "No se pudo enviar el cambio a Booking."
        );
      }
    };

  // =========================================================
  // BOOKING - NO SHOW
  // =========================================================

  const seleccionarNoShowBooking = () => {
    setAccionBooking("NO_SHOW");
    setCondonarCargosBooking(false);
  };

  const enviarNoShowBooking = async (
    e
  ) => {
    e.preventDefault();

    if (!reservaBooking) {
      return;
    }

    const confirmar = confirm(
      "¿Seguro que querés reportar esta reserva como no-show en Booking?"
    );

    if (!confirmar) {
      return;
    }

    try {
      setError("");
      setMensaje("");

      const response =
        await api.post(
          `/reservas/${reservaBooking.idReserva}/booking/no-show`,
          {
            condonarCargos:
              condonarCargosBooking,
          }
        );

      setMensaje(
        `Reporte de no-show enviado a Booking. Operación #${response.data.operacion.idOperacion} pendiente de sincronización.`
      );

      cerrarGestionBooking();

      await obtenerReservas();
    } catch (error) {
      setError(
        error.response?.data?.mensaje ||
          "No se pudo reportar el no-show a Booking."
      );
    }
  };

  // =========================================================
  // BOOKING - OPERACIÓN PENDIENTE
  // =========================================================

  const verOperacionBooking = (
    reserva
  ) => {
    setMostrarFormulario(false);
    setReservaEditando(null);

    setReservaAirbnb(null);
    setPropuestaAirbnbVisualizando(null);

    setReservaBooking(null);
    setAccionBooking(null);

    setOperacionBookingVisualizando(
      reserva
    );

    setError("");
    setMensaje("");
  };

  const cerrarOperacionBooking = () => {
    setOperacionBookingVisualizando(
      null
    );
  };

  const simularSincronizacionBooking =
    async () => {
      const operacion =
        operacionBookingVisualizando
          ?.operacionBookingPendiente;

      if (!operacion) {
        return;
      }

      try {
        setError("");
        setMensaje("");

        const response =
          await api.post(
            `/reservas/booking/operaciones/${operacion.idOperacion}/sincronizar`
          );

        if (
          operacion.tipo ===
          "CAMBIO_ESTADIA"
        ) {
          setMensaje(
            "Simulación Booking: la operación fue procesada y la reserva quedó sincronizada con los nuevos datos."
          );
        } else if (
          operacion.tipo ===
          "NO_SHOW"
        ) {
          setMensaje(
            "Simulación Booking: el no-show fue procesado y la reserva quedó sincronizada."
          );
        } else {
          setMensaje(
            "Simulación Booking: operación sincronizada correctamente."
          );
        }

        setOperacionBookingVisualizando(
          null
        );

        await obtenerReservas();

        if (
          response.data.advertencia
        ) {
          setError(
            response.data.advertencia
          );
        }
      } catch (error) {
        setError(
          error.response?.data?.mensaje ||
            "No se pudo sincronizar la operación de Booking."
        );
      }
    };

  // =========================================================
  // ACCIONES SEGÚN BACKEND
  // =========================================================
  const formatearFecha = (fecha) => {
  if (!fecha) return "-";

  const [anio, mes, dia] = fecha.split("-");

  return `${dia}/${mes}/${anio}`;
  };

  const tieneAccion = (
    reserva,
    accion
  ) => {
    return reserva.accionesDisponibles?.includes(
      accion
    );
  };

  // =========================================================
  // ABRIR CANAL ORIGINAL
  // =========================================================

  const abrirEnCanal = (
    reserva
  ) => {
    let url = null;

    if (
      reserva.canal === "Airbnb"
    ) {
      url =
        "https://www.airbnb.com/hosting";
    }

    if (
      reserva.canal === "Booking"
    ) {
      url =
        "https://admin.booking.com/";
    }

    if (!url) {
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================================
  // CARGANDO
  // =========================================================

  if (cargando) {
    return (
      <h2>
        Cargando reservas...
      </h2>
    );
  }

  // =========================================================
  // VISTA
  // =========================================================

  return (
    <section
      className="reservas-page"
      onClickCapture={(e) => {
        if (
          e.target.closest("button")
        ) {
          limpiarReservaDestacada();
        }
      }}
    >
      {/* CABECERA */}

      <div className="section-header">
        <div>
          <h2>
            Gestión de reservas
          </h2>

          <p>
            Listado general de reservas
            registradas en HostFlow.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setMostrarFormulario(
              !mostrarFormulario
            );

            setReservaEditando(null);

            cerrarPanelesExternos();

            setError("");
            setMensaje("");
          }}
        >
          {mostrarFormulario
            ? "Cerrar formulario"
            : "Nueva reserva"}
        </button>
      </div>

      {/* MENSAJES */}

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

      {/* =====================================================
          NUEVA RESERVA MANUAL
      ====================================================== */}

      {mostrarFormulario && (
        <form
          className="form-card"
          onSubmit={crearReserva}
        >
          <h3>
            Registrar nueva reserva
            manual
          </h3>

          <div className="form-grid">
            <div>
              <label>
                Propiedad
              </label>

              <select
                name="idPropiedad"
                value={
                  formulario.idPropiedad
                }
                onChange={
                  manejarCambio
                }
              >
                <option value="1">
                  Depto Centro A
                </option>

                <option value="2">
                  Casa Funes
                </option>
              </select>
            </div>

            <div>
              <label>
                Huésped
              </label>

              <select
                name="idHuesped"
                value={
                  formulario.idHuesped
                }
                onChange={
                  manejarCambio
                }
              >
                <option value="1">
                  Juan Pérez
                </option>

                <option value="2">
                  María Gómez
                </option>

                <option value="3">
                  Carlos López
                </option>
              </select>
            </div>

            <div>
              <label>
                Canal
              </label>

              <input
                type="text"
                value="Manual"
                disabled
              />
            </div>

            <div>
              <label>
                Cantidad de huéspedes
              </label>

              <input
                type="number"
                name="cantidadHuespedes"
                min="1"
                value={
                  formulario
                    .cantidadHuespedes
                }
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label>
                Fecha de ingreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaIngreso"
                value={
                  formulario.fechaIngreso
                }
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label>
                Fecha de egreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaEgreso"
                value={
                  formulario.fechaEgreso
                }
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label>
                Monto estimado
              </label>

              <input
                type="number"
                name="montoEstimado"
                min="0"
                value={
                  formulario.montoEstimado
                }
                onChange={
                  manejarCambio
                }
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
            >
              Guardar reserva
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setMostrarFormulario(
                  false
                )
              }
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          EDICIÓN MANUAL
      ====================================================== */}

      {reservaEditando && (
        <form
          className="form-card"
          onSubmit={
            guardarEdicion
          }
        >
          <h3>
            Modificar reserva #
            {
              reservaEditando.idReserva
            }
          </h3>

          <p>
            <strong>
              Huésped:
            </strong>{" "}
            {
              reservaEditando.huesped
            }
          </p>

          <p>
            <strong>
              Propiedad:
            </strong>{" "}
            {
              reservaEditando.propiedad
            }
          </p>

          <div className="form-grid">
            <div>
              <label>
                Fecha de ingreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaIngreso"
                value={
                  formularioEdicion
                    .fechaIngreso
                }
                onChange={
                  manejarCambioEdicion
                }
              />
            </div>

            <div>
              <label>
                Fecha de egreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaEgreso"
                value={
                  formularioEdicion
                    .fechaEgreso
                }
                onChange={
                  manejarCambioEdicion
                }
              />
            </div>

            <div>
              <label>
                Estado
              </label>

              <select
                name="estado"
                value={
                  formularioEdicion
                    .estado
                }
                onChange={
                  manejarCambioEdicion
                }
              >
                <option value="Pendiente">
                  Pendiente
                </option>

                <option value="Confirmada">
                  Confirmada
                </option>

                <option value="Cancelada">
                  Cancelada
                </option>

                <option value="Finalizada">
                  Finalizada
                </option>
              </select>
            </div>

            <div>
              <label>
                Monto estimado
              </label>

              <input
                type="number"
                name="montoEstimado"
                min="0"
                value={
                  formularioEdicion
                    .montoEstimado
                }
                onChange={
                  manejarCambioEdicion
                }
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
            >
              Guardar cambios
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={
                cancelarEdicion
              }
            >
              Cancelar edición
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          AIRBNB - PROPONER CAMBIO
      ====================================================== */}

      {reservaAirbnb && (
        <form
          className="form-card"
          onSubmit={
            enviarPropuestaAirbnb
          }
        >
          <h3>
            Proponer cambio en
            Airbnb
          </h3>

          <p>
            <strong>
              Huésped:
            </strong>{" "}
            {
              reservaAirbnb.huesped
            }
          </p>

          <p>
            <strong>
              Propiedad:
            </strong>{" "}
            {
              reservaAirbnb.propiedad
            }
          </p>

          <p>
            La reserva original no se
            modificará hasta que Airbnb
            confirme la propuesta.
          </p>

          <div className="form-grid">
            <div>
              <label>
                Fecha de ingreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaIngreso"
                value={
                  formularioAirbnb
                    .fechaIngreso
                }
                onChange={
                  cambiarFormularioAirbnb
                }
                required
              />
            </div>

            <div>
              <label>
                Fecha de egreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaEgreso"
                value={
                  formularioAirbnb
                    .fechaEgreso
                }
                onChange={
                  cambiarFormularioAirbnb
                }
                required
              />
            </div>

            <div>
              <label>
                Cantidad de huéspedes
              </label>

              <input
                type="number"
                name="cantidadHuespedes"
                min="1"
                value={
                  formularioAirbnb
                    .cantidadHuespedes
                }
                onChange={
                  cambiarFormularioAirbnb
                }
                required
              />
            </div>

            <div>
              <label>
                Monto propuesto
              </label>

              <input
                type="number"
                name="montoEstimado"
                min="0"
                value={
                  formularioAirbnb
                    .montoEstimado
                }
                onChange={
                  cambiarFormularioAirbnb
                }
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
            >
              Enviar propuesta
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={
                cerrarPropuestaAirbnb
              }
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          AIRBNB - PROPUESTA PENDIENTE
      ====================================================== */}

      {propuestaAirbnbVisualizando &&
        propuestaAirbnbVisualizando
          .solicitudAirbnbPendiente && (
          <div className="form-card">
            <h3>
              Cambio pendiente en
              Airbnb
            </h3>

            <p>
              <strong>
                Huésped:
              </strong>{" "}
              {
                propuestaAirbnbVisualizando
                  .huesped
              }
            </p>

            <p>
              <strong>
                Propiedad:
              </strong>{" "}
              {
                propuestaAirbnbVisualizando
                  .propiedad
              }
            </p>

            <p>
              <strong>
                Solicitud:
              </strong>{" "}
              #
              {
                propuestaAirbnbVisualizando
                  .solicitudAirbnbPendiente
                  .idSolicitud
              }
            </p>

            <p>
              <strong>
                Estado:
              </strong>{" "}
              {
                propuestaAirbnbVisualizando
                  .solicitudAirbnbPendiente
                  .estado
              }
            </p>

            <div className="form-grid">
              <div>
                <label>
                  Ingreso actual
                </label>

                <input
                  type="date"
                  lang="es-AR"
                  value={
                    propuestaAirbnbVisualizando
                      .fechaIngreso
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Ingreso propuesto
                </label>

                <input
                  type="date"
                  lang="es-AR"
                  value={
                    propuestaAirbnbVisualizando
                      .solicitudAirbnbPendiente
                      .cambiosSolicitados
                      .fechaIngreso
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Egreso actual
                </label>

                <input
                  type="date"
                  lang="es-AR"
                  value={
                    propuestaAirbnbVisualizando
                      .fechaEgreso
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Egreso propuesto
                </label>

                <input
                  type="date"
                  lang="es-AR"
                  value={
                    propuestaAirbnbVisualizando
                      .solicitudAirbnbPendiente
                      .cambiosSolicitados
                      .fechaEgreso
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Huéspedes actuales
                </label>

                <input
                  type="number"
                  value={
                    propuestaAirbnbVisualizando
                      .cantidadHuespedes
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Huéspedes propuestos
                </label>

                <input
                  type="number"
                  value={
                    propuestaAirbnbVisualizando
                      .solicitudAirbnbPendiente
                      .cambiosSolicitados
                      .cantidadHuespedes
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Monto actual
                </label>

                <input
                  type="number"
                  value={
                    propuestaAirbnbVisualizando
                      .montoEstimado
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Monto propuesto
                </label>

                <input
                  type="number"
                  value={
                    propuestaAirbnbVisualizando
                      .solicitudAirbnbPendiente
                      .cambiosSolicitados
                      .montoEstimado
                  }
                  disabled
                />
              </div>
            </div>

            <p>
              Airbnb todavía no confirmó
              ni rechazó este cambio. La
              reserva actual permanece sin
              modificaciones.
            </p>

            <p>
              <strong>
                Simulación de integración:
              </strong>{" "}
              estos botones representan
              la respuesta que en
              producción llegaría desde
              Airbnb.
            </p>

            <div className="form-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  simularRespuestaAirbnb(
                    "aceptar"
                  )
                }
              >
                Simular aceptación
                Airbnb
              </button>

              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  simularRespuestaAirbnb(
                    "rechazar"
                  )
                }
              >
                Simular rechazo Airbnb
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={
                  cerrarDetallePropuestaAirbnb
                }
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      {/* =====================================================
          BOOKING - PANEL DE GESTIÓN
      ====================================================== */}

      {reservaBooking && (
        <div className="form-card">
          <h3>
            Gestionar reserva Booking
          </h3>

          <p>
            <strong>
              Huésped:
            </strong>{" "}
            {
              reservaBooking.huesped
            }
          </p>

          <p>
            <strong>
              Propiedad:
            </strong>{" "}
            {
              reservaBooking.propiedad
            }
          </p>

          <p>
            <strong>
              Identificador Booking:
            </strong>{" "}
            {reservaBooking.idExterno ||
              "Sin identificador externo"}
          </p>

          {!accionBooking && (
            <>
              <p>
                Seleccioná la operación
                que querés gestionar con
                Booking.
              </p>

              <div className="form-actions">
                <button
                  type="button"
                  className="channel-button"
                  onClick={
                    seleccionarCambioEstadiaBooking
                  }
                >
                  Cambiar estadía /
                  precio
                </button>

                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    seleccionarNoShowBooking
                  }
                >
                  Reportar no-show
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    cerrarGestionBooking
                  }
                >
                  Cerrar
                </button>
              </div>
            </>
          )}

          {/* BOOKING - CAMBIO ESTADÍA */}

          {accionBooking ===
            "CAMBIO_ESTADIA" && (
            <form
              onSubmit={
                enviarCambioEstadiaBooking
              }
            >
              <p>
                Booking conservará el
                check-in actual. HostFlow
                enviará el nuevo checkout
                y el nuevo precio.
              </p>

              <div className="form-grid">
                <div>
                  <label>
                    Ingreso actual
                  </label>

                  <input
                    type="date"
                    lang="es-AR"
                    value={
                      reservaBooking
                        .fechaIngreso
                    }
                    disabled
                  />
                </div>

                <div>
                  <label>
                    Egreso actual
                  </label>

                  <input
                    type="date"
                    lang="es-AR"
                    value={
                      reservaBooking
                        .fechaEgreso
                    }
                    disabled
                  />
                </div>

                <div>
                  <label>
                    Nuevo egreso
                  </label>

                  <input
                    type="date"
                    lang="es-AR"
                    name="fechaEgreso"
                    value={
                      formularioBookingEstadia
                        .fechaEgreso
                    }
                    onChange={
                      cambiarFormularioBookingEstadia
                    }
                    required
                  />
                </div>

                <div>
                  <label>
                    Nuevo monto
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="montoEstimado"
                    value={
                      formularioBookingEstadia
                        .montoEstimado
                    }
                    onChange={
                      cambiarFormularioBookingEstadia
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                >
                  Enviar a Booking
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setAccionBooking(
                      null
                    )
                  }
                >
                  Volver
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    cerrarGestionBooking
                  }
                >
                  Cerrar
                </button>
              </div>
            </form>
          )}

          {/* BOOKING - NO SHOW */}

          {accionBooking ===
            "NO_SHOW" && (
            <form
              onSubmit={
                enviarNoShowBooking
              }
            >
              <p>
                Utilizá esta opción
                únicamente cuando el
                huésped no se haya
                presentado.
              </p>

              <div
                style={{
                  marginTop: "18px",
                  marginBottom: "20px",
                }}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={
                      condonarCargosBooking
                    }
                    onChange={(e) =>
                      setCondonarCargosBooking(
                        e.target.checked
                      )
                    }
                    style={{
                      marginRight: "8px",
                    }}
                  />

                  Perdonar / condonar los
                  cargos al huésped
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="cancel-button"
                >
                  Enviar no-show a
                  Booking
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setAccionBooking(
                      null
                    )
                  }
                >
                  Volver
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    cerrarGestionBooking
                  }
                >
                  Cerrar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* =====================================================
          BOOKING - OPERACIÓN PENDIENTE
      ====================================================== */}

      {operacionBookingVisualizando &&
        operacionBookingVisualizando
          .operacionBookingPendiente && (
          <div className="form-card">
            <h3>
              Operación pendiente en
              Booking
            </h3>

            <p>
              <strong>
                Huésped:
              </strong>{" "}
              {
                operacionBookingVisualizando
                  .huesped
              }
            </p>

            <p>
              <strong>
                Propiedad:
              </strong>{" "}
              {
                operacionBookingVisualizando
                  .propiedad
              }
            </p>

            <p>
              <strong>
                Operación:
              </strong>{" "}
              #
              {
                operacionBookingVisualizando
                  .operacionBookingPendiente
                  .idOperacion
              }
            </p>

            <p>
              <strong>
                Tipo:
              </strong>{" "}
              {
                operacionBookingVisualizando
                  .operacionBookingPendiente
                  .tipo
              }
            </p>

            <p>
              <strong>
                Estado:
              </strong>{" "}
              {
                operacionBookingVisualizando
                  .operacionBookingPendiente
                  .estado
              }
            </p>

            {operacionBookingVisualizando
              .operacionBookingPendiente
              .tipo ===
              "CAMBIO_ESTADIA" &&
              operacionBookingVisualizando
                .operacionBookingPendiente
                .cambiosSolicitados && (
                <div className="form-grid">
                  <div>
                    <label>
                      Ingreso actual
                    </label>

                    <input
                      type="date"
                      lang="es-AR"
                      value={
                        operacionBookingVisualizando
                          .fechaIngreso
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Ingreso solicitado
                    </label>

                    <input
                      type="date"
                      lang="es-AR"
                      value={
                        operacionBookingVisualizando
                          .operacionBookingPendiente
                          .cambiosSolicitados
                          .fechaIngreso
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Egreso actual
                    </label>

                    <input
                      type="date"
                      lang="es-AR"
                      value={
                        operacionBookingVisualizando
                          .fechaEgreso
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Egreso solicitado
                    </label>

                    <input
                      type="date"
                      lang="es-AR"
                      value={
                        operacionBookingVisualizando
                          .operacionBookingPendiente
                          .cambiosSolicitados
                          .fechaEgreso
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Monto actual
                    </label>

                    <input
                      type="number"
                      value={
                        operacionBookingVisualizando
                          .montoEstimado
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Monto solicitado
                    </label>

                    <input
                      type="number"
                      value={
                        operacionBookingVisualizando
                          .operacionBookingPendiente
                          .cambiosSolicitados
                          .montoEstimado
                      }
                      disabled
                    />
                  </div>
                </div>
              )}

            {operacionBookingVisualizando
              .operacionBookingPendiente
              .tipo ===
              "NO_SHOW" && (
              <p>
                El reporte de no-show fue
                enviado a Booking. La
                reserva todavía permanece
                con su estado actual hasta
                que se complete la
                sincronización.
              </p>
            )}

            <p>
              Booking todavía no terminó
              de sincronizar esta
              operación. HostFlow mantiene
              los datos actuales hasta
              recibir la actualización del
              canal.
            </p>

            <p>
              <strong>
                Simulación de integración:
              </strong>{" "}
              el siguiente botón
              representa la posterior
              sincronización que en
              producción realizaríamos con
              Booking.
            </p>

            <div className="form-actions">
              <button
                type="button"
                className="primary-button"
                onClick={
                  simularSincronizacionBooking
                }
              >
                Simular sincronización
                Booking
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={
                  cerrarOperacionBooking
                }
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      {/* =====================================================
          TABLA
      ====================================================== */}

      <div className="table-card">
        <table>
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
                Monto
              </th>

              <th>
                Estado
              </th>

              <th>
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {reservas.map(
              (reserva) => (
                <tr
                key={
                  reserva.idReserva
                }
                id={`reserva-${reserva.idReserva}`}
                className={
                  Number(
                    reserva.idReserva
                  ) ===
                  Number(
                    idReservaObjetivo
                  )
                    ? "reserva-destacada"
                    : ""
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

                  <td>{formatearFecha(reserva.fechaIngreso)}</td>
                  <td>{formatearFecha(reserva.fechaEgreso)}</td>

                  <td>
                    $
                    {reserva.montoEstimado.toLocaleString(
                      "es-AR"
                    )}
                  </td>

                  <td>
                    <span
                      className={`estado ${String(
                        reserva.estado
                      )
                        .toLowerCase()
                        .replace(
                          /\s+/g,
                          "-"
                        )}`}
                    >
                      {
                        reserva.estado
                      }
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      {/* MANUAL */}

                      {tieneAccion(
                        reserva,
                        "EDITAR"
                      ) && (
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            abrirEdicion(
                              reserva
                            )
                          }
                        >
                          Editar
                        </button>
                      )}

                      {tieneAccion(
                        reserva,
                        "CANCELAR"
                      ) && (
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() =>
                            cancelarReserva(
                              reserva.idReserva
                            )
                          }
                        >
                          Cancelar
                        </button>
                      )}

                      {/* AIRBNB */}

                      {tieneAccion(
                        reserva,
                        "PROPONER_CAMBIO"
                      ) && (
                        <button
                          type="button"
                          className="channel-button"
                          onClick={() =>
                            abrirPropuestaAirbnb(
                              reserva
                            )
                          }
                        >
                          Proponer cambio
                        </button>
                      )}

                      {tieneAccion(
                        reserva,
                        "VER_PROPUESTA_AIRBNB"
                      ) && (
                        <>
                          <span className="disabled-text">
                            Cambio pendiente
                          </span>

                          <button
                            type="button"
                            className="channel-button"
                            onClick={() =>
                              verPropuestaAirbnb(
                                reserva
                              )
                            }
                          >
                            Ver propuesta
                          </button>
                        </>
                      )}

                      {/* BOOKING */}

                      {tieneAccion(
                        reserva,
                        "GESTIONAR_BOOKING"
                      ) && (
                        <button
                          type="button"
                          className="channel-button"
                          onClick={() =>
                            abrirGestionBooking(
                              reserva
                            )
                          }
                        >
                          Gestionar
                        </button>
                      )}

                      {tieneAccion(
                        reserva,
                        "VER_OPERACION_BOOKING"
                      ) && (
                        <>
                          <span className="disabled-text">
                            Operación pendiente
                          </span>

                          <button
                            type="button"
                            className="channel-button"
                            onClick={() =>
                              verOperacionBooking(
                                reserva
                              )
                            }
                          >
                            Ver operación
                          </button>
                        </>
                      )}

                      {/* ABRIR CANAL */}

                      {tieneAccion(
                        reserva,
                        "ABRIR_EN_CANAL"
                      ) && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            abrirEnCanal(
                              reserva
                            )
                          }
                        >
                          {
                            reserva.canal
                          }{" "}
                          ↗
                        </button>
                      )}

                      {/* SIN ACCIÓN */}

                      {reserva
                        .accionesDisponibles
                        ?.length ===
                        1 &&
                        reserva
                          .accionesDisponibles[0] ===
                          "VER" && (
                          <span className="disabled-text">
                            Sin acción
                          </span>
                        )}
                        
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Reservas;
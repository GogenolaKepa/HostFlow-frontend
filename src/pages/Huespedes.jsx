import { useEffect, useState } from "react";
import api from "../services/api";
import DetalleHuesped from "../components/huespedes/DetalleHuesped";

function Huespedes({ onVerReserva }) {

  const [huespedes, setHuespedes] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    idHuespedEditando,
    setIdHuespedEditando,
  ] = useState(null);

  const [idDetalle, setIdDetalle] = useState(null);

  const [formulario, setFormulario] =
    useState({
      nombre: "",
      apellido: "",
      email: "",
      telefono: "",
      dni: "",
      nacionalidad: "",
    });

  useEffect(() => {
    obtenerHuespedes();
  }, []);

  // =========================================================
  // OBTENER HUÉSPEDES
  // =========================================================

  const obtenerHuespedes = async () => {
    try {
      setError("");

      const response =
        await api.get(
          "/huespedes"
        );

      setHuespedes(
        response.data.huespedes
      );
    } catch {
      setError(
        "No se pudieron obtener los huéspedes."
      );
    } finally {
      setCargando(false);
    }
  };

  // =========================================================
  // DETALLE DEL HUÉSPED
  // =========================================================

  const verHuesped = id => setIdDetalle(id);
  const cerrarDetalle = () => setIdDetalle(null);

  // =========================================================
  // FORMULARIO
  // =========================================================

  const manejarCambio = (e) => {
    const { name, value } =
      e.target;

    setFormulario({
      ...formulario,
      [name]: value,
    });
  };

  const limpiarFormulario = () => {
    setFormulario({
      nombre: "",
      apellido: "",
      email: "",
      telefono: "",
      dni: "",
      nacionalidad: "",
    });

    setIdHuespedEditando(null);
    setMostrarFormulario(false);
  };

  const abrirFormularioNuevoHuesped =
    () => {
      setMensaje("");
      setError("");
      setIdHuespedEditando(null);

      setFormulario({
        nombre: "",
        apellido: "",
        email: "",
        telefono: "",
        dni: "",
        nacionalidad: "",
      });

      setMostrarFormulario(true);
    };

  const editarHuesped = (
    huesped
  ) => {
    setMensaje("");
    setError("");

    setIdHuespedEditando(
      huesped.idHuesped
    );

    setFormulario({
      nombre:
        huesped.nombre,

      apellido:
        huesped.apellido,

      email:
        huesped.email ===
        "No registrado"
          ? ""
          : huesped.email,

      telefono:
        huesped.telefono ===
        "No registrado"
          ? ""
          : huesped.telefono,

      dni:
        huesped.dni ===
        "No registrado"
          ? ""
          : huesped.dni,

      nacionalidad:
        huesped.nacionalidad ===
        "No registrada"
          ? ""
          : huesped.nacionalidad,
    });

    setMostrarFormulario(true);
  };

  const guardarHuesped = async (
    e
  ) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    const datosHuesped = {
      nombre:
        formulario.nombre,

      apellido:
        formulario.apellido,

      email:
        formulario.email,

      telefono:
        formulario.telefono,

      dni:
        formulario.dni,

      nacionalidad:
        formulario.nacionalidad,
    };

    try {
      if (idHuespedEditando) {
        await api.put(
          `/huespedes/${idHuespedEditando}`,
          datosHuesped
        );

        setMensaje(
          "Huésped modificado correctamente."
        );
      } else {
        await api.post(
          "/huespedes",
          datosHuesped
        );

        setMensaje(
          "Huésped manual registrado correctamente."
        );
      }

      limpiarFormulario();

      await obtenerHuespedes();

    } catch (error) {
      setError(
        error.response?.data
          ?.mensaje ||
          "No se pudo guardar el huésped."
      );
    }
  };

  // =========================================================
  // FORMATO
  // =========================================================

  const irAReserva = (
    idReserva
  ) => {
    // Guardamos la reserva seleccionada para que Reservas pueda
    // ubicarla y destacarla cuando conectemos la navegación desde App.
    window.sessionStorage.setItem(
      "hostflowReservaObjetivo",
      String(idReserva)
    );

    // Si App.jsx nos pasa el callback de navegación, lo usamos.
    // Si todavía no está conectado, la pantalla no se rompe.
    if (
      typeof onVerReserva ===
      "function"
    ) {
      onVerReserva(
        idReserva
      );
      return;
    }

    setMensaje(
      `Reserva #${idReserva} seleccionada.`
    );
  };

  // =========================================================
  // CARGA
  // =========================================================

  if (cargando) {
    return (
      <h2>
        Cargando huéspedes...
      </h2>
    );
  }

  return (
    <section className="huespedes-page">
      {/* =====================================================
          ENCABEZADO
      ====================================================== */}

      <div className="section-header">
        <div>
          <h2>
            Gestión de huéspedes
          </h2>

          <p>
            Huéspedes registrados
            manualmente o recibidos
            desde canales externos.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={
            abrirFormularioNuevoHuesped
          }
        >
          Agregar huésped manual
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

      {/* =====================================================
          FORMULARIO
      ====================================================== */}

      {mostrarFormulario && (
        <form
          className="form-card"
          onSubmit={
            guardarHuesped
          }
        >
          <h3>
            {idHuespedEditando
              ? "Editar huésped"
              : "Registrar huésped manual"}
          </h3>

          <div className="form-grid">
            <div>
              <label>
                Nombre
              </label>

              <input
                type="text"
                name="nombre"
                value={
                  formulario.nombre
                }
                placeholder="Ej: Juan"
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label>
                Apellido
              </label>

              <input
                type="text"
                name="apellido"
                value={
                  formulario.apellido
                }
                placeholder="Ej: Pérez"
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label>
                Email
              </label>

              <input
                type="email"
                name="email"
                value={
                  formulario.email
                }
                placeholder="Ej: hostflow@email.com"
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label>
                Teléfono
              </label>

              <input
                type="text"
                name="telefono"
                value={
                  formulario.telefono
                }
                placeholder="Ej: 3415555555"
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label>
                DNI
              </label>

              <input
                type="text"
                name="dni"
                value={
                  formulario.dni
                }
                placeholder="Ej: 40123456"
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label>
                Nacionalidad
              </label>

              <input
                type="text"
                name="nacionalidad"
                value={
                  formulario.nacionalidad
                }
                placeholder="Ej: Argentina"
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
              {idHuespedEditando
                ? "Guardar cambios"
                : "Guardar huésped"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={
                limpiarFormulario
              }
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          DETALLE DEL HUÉSPED
      ====================================================== */}

      {idDetalle !== null && <DetalleHuesped idHuesped={idDetalle} onClose={cerrarDetalle} onVerReserva={irAReserva} />}

      {/* =====================================================
          LISTADO
      ====================================================== */}

      <div className="table-card huespedes-desktop-list">
        <table>
          <thead>
            <tr>
              <th>
                Huésped
              </th>

              <th>
                Contacto
              </th>

              <th>
                Origen
              </th>

              <th>
                Reservas
              </th>

              <th>
                Situación
              </th>

              <th>
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {huespedes.map(
              (huesped) => (
                <tr
                  key={
                    huesped.idHuesped
                  }
                >
                  <td>
                    <strong>
                      {
                        huesped.nombre
                      }{" "}
                      {
                        huesped.apellido
                      }
                    </strong>
                  </td>

                  <td>
                    <div className="guest-contact">
                      <span>
                        {
                          huesped.email
                        }
                      </span>

                      <span>
                        {
                          huesped.telefono
                        }
                      </span>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`channel-badge channel-${huesped.origenRegistro.toLowerCase()}`}
                    >
                      {
                        huesped.origenRegistro
                      }
                    </span>
                  </td>

                  <td>
                    {
                      huesped.cantidadReservas
                    }
                  </td>

                  <td>
                    <span className="guest-status">
                      {
                        huesped.situacion
                      }
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        className="secondary-button"
                        onClick={() =>
                          verHuesped(
                            huesped.idHuesped
                          )
                        }
                      >
                        Ver huésped
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() =>
                          editarHuesped(
                            huesped
                          )
                        }
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <div className="huespedes-mobile-list">
        {huespedes.map(
          (
            huesped
          ) => (
            <article
              key={`mobile-${huesped.idHuesped}`}
              className="huesped-mobile-card"
            >
              <div className="huesped-mobile-card-top">
                <div className="huesped-mobile-identidad">
                  <span className="huesped-mobile-avatar">
                    {String(
                      huesped.nombre ||
                        "H"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <div>
                    <h3>
                      {
                        huesped.nombre
                      }{" "}
                      {
                        huesped.apellido
                      }
                    </h3>

                    <span
                      className={`channel-badge channel-${String(
                        huesped.origenRegistro
                      ).toLowerCase()}`}
                    >
                      {
                        huesped.origenRegistro
                      }
                    </span>
                  </div>
                </div>

                <span className="guest-status huesped-mobile-status">
                  {
                    huesped.situacion
                  }
                </span>
              </div>

              <div className="huesped-mobile-contacto">
                <div>
                  <span>
                    Email
                  </span>

                  <strong>
                    {
                      huesped.email
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Teléfono
                  </span>

                  <strong>
                    {
                      huesped.telefono
                    }
                  </strong>
                </div>
              </div>

              <div className="huesped-mobile-meta">
                <div>
                  <span>
                    Reservas
                  </span>

                  <strong>
                    {
                      huesped.cantidadReservas
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Situación
                  </span>

                  <strong>
                    {
                      huesped.situacion
                    }
                  </strong>
                </div>
              </div>

              <div className="huesped-mobile-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    verHuesped(
                      huesped.idHuesped
                    )
                  }
                >
                  Ver huésped
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    editarHuesped(
                      huesped
                    )
                  }
                >
                  Editar
                </button>
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );
}

export default Huespedes;

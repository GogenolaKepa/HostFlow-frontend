import { useEffect, useState } from "react";
import api from "../services/api";

function Huespedes() {
  const [huespedes, setHuespedes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [idHuespedEditando, setIdHuespedEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    dni: "",
  });

  useEffect(() => {
    obtenerHuespedes();
  }, []);

  const obtenerHuespedes = async () => {
    try {
      const response = await api.get("/huespedes");
      setHuespedes(response.data.huespedes);
    } catch (error) {
      setError("No se pudieron obtener los huéspedes.");
    } finally {
      setCargando(false);
    }
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;

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
    });

    setIdHuespedEditando(null);
    setMostrarFormulario(false);
  };

  const abrirFormularioNuevoHuesped = () => {
    setMensaje("");
    setError("");
    setIdHuespedEditando(null);

    setFormulario({
      nombre: "",
      apellido: "",
      email: "",
      telefono: "",
      dni: "",
    });

    setMostrarFormulario(true);
  };

  const editarHuesped = (huesped) => {
    setMensaje("");
    setError("");

    setIdHuespedEditando(huesped.idHuesped);

    setFormulario({
      nombre: huesped.nombre,
      apellido: huesped.apellido,
      email: huesped.email === "No registrado" ? "" : huesped.email,
      telefono: huesped.telefono === "No registrado" ? "" : huesped.telefono,
      dni: huesped.dni === "No registrado" ? "" : huesped.dni,
    });

    setMostrarFormulario(true);
  };

  const guardarHuesped = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    const datosHuesped = {
      nombre: formulario.nombre,
      apellido: formulario.apellido,
      email: formulario.email,
      telefono: formulario.telefono,
      dni: formulario.dni,
    };

    try {
      if (idHuespedEditando) {
        await api.put(`/huespedes/${idHuespedEditando}`, datosHuesped);
        setMensaje("Huésped modificado correctamente.");
      } else {
        await api.post("/huespedes", datosHuesped);
        setMensaje("Huésped registrado correctamente.");
      }

      limpiarFormulario();
      obtenerHuespedes();
    } catch (error) {
      setError(error.response?.data?.mensaje || "No se pudo guardar el huésped.");
    }
  };

  if (cargando) {
    return <h2>Cargando huéspedes...</h2>;
  }

  return (
    <section className="huespedes-page">
      <div className="section-header">
        <div>
          <h2>Gestión de huéspedes</h2>
          <p>Listado de huéspedes registrados en HostFlow.</p>
        </div>

        <button
          className="primary-button"
          onClick={abrirFormularioNuevoHuesped}
        >
          Nuevo huésped
        </button>
      </div>

      {mensaje && <p className="success-message">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      {mostrarFormulario && (
        <form className="form-card" onSubmit={guardarHuesped}>
          <h3>
            {idHuespedEditando ? "Editar huésped" : "Registrar nuevo huésped"}
          </h3>

          <div className="form-grid">
            <div>
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formulario.nombre}
                placeholder="Ej: Juan"
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>Apellido</label>
              <input
                type="text"
                name="apellido"
                value={formulario.apellido}
                placeholder="Ej: Pérez"
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formulario.email}
                placeholder="Ej: juan@email.com"
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={formulario.telefono}
                placeholder="Ej: 3415555555"
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>DNI</label>
              <input
                type="text"
                name="dni"
                value={formulario.dni}
                placeholder="Ej: 40123456"
                onChange={manejarCambio}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {idHuespedEditando ? "Guardar cambios" : "Guardar huésped"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={limpiarFormulario}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>DNI</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {huespedes.map((huesped) => (
              <tr key={huesped.idHuesped}>
                <td>{huesped.nombre}</td>
                <td>{huesped.apellido}</td>
                <td>{huesped.email}</td>
                <td>{huesped.telefono}</td>
                <td>{huesped.dni}</td>
                <td>
                  <button
                    className="secondary-button"
                    onClick={() => editarHuesped(huesped)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Huespedes;
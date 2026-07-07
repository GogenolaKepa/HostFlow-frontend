import { useEffect, useState } from "react";
import api from "../services/api";

function Reservas() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [formulario, setFormulario] = useState({
    idPropiedad: "1",
    idHuesped: "1",
    canal: "Manual",
    fechaIngreso: "2026-07-01",
    fechaEgreso: "2026-07-05",
    cantidadHuespedes: "2",
    montoEstimado: "120000",
  });

  useEffect(() => {
    obtenerReservas();
  }, []);

  const obtenerReservas = async () => {
    try {
      const response = await api.get("/reservas");
      setReservas(response.data.reservas);
    } catch (error) {
      setError("No se pudieron obtener las reservas.");
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

  const crearReserva = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    try {
      await api.post("/reservas", {
        idPropiedad: Number(formulario.idPropiedad),
        idHuesped: Number(formulario.idHuesped),
        canal: formulario.canal,
        fechaIngreso: formulario.fechaIngreso,
        fechaEgreso: formulario.fechaEgreso,
        cantidadHuespedes: Number(formulario.cantidadHuespedes),
        montoEstimado: Number(formulario.montoEstimado),
      });

      setMensaje("Reserva registrada correctamente.");
      setMostrarFormulario(false);
      obtenerReservas();
    } catch (error) {
      setError(error.response?.data?.mensaje || "No se pudo registrar la reserva.");
    }
  };

  const cancelarReserva = async (idReserva) => {
    const confirmar = confirm("¿Seguro que querés cancelar esta reserva?");

    if (!confirmar) return;

    try {
      await api.patch(`/reservas/${idReserva}/cancelar`);
      obtenerReservas();
    } catch (error) {
      alert("No se pudo cancelar la reserva.");
    }
  };

  if (cargando) {
    return <h2>Cargando reservas...</h2>;
  }

  return (
    <section className="reservas-page">
      <div className="section-header">
        <div>
          <h2>Gestión de reservas</h2>
          <p>Listado general de reservas registradas en HostFlow.</p>
        </div>

        <button
          className="primary-button"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? "Cerrar formulario" : "Nueva reserva"}
        </button>
      </div>

      {mensaje && <p className="success-message">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      {mostrarFormulario && (
        <form className="form-card" onSubmit={crearReserva}>
          <h3>Registrar nueva reserva</h3>

          <div className="form-grid">
            <div>
              <label>Propiedad</label>
              <select
                name="idPropiedad"
                value={formulario.idPropiedad}
                onChange={manejarCambio}
              >
                <option value="1">Depto Centro A</option>
                <option value="2">Casa Funes</option>
              </select>
            </div>

            <div>
              <label>Huésped</label>
              <select
                name="idHuesped"
                value={formulario.idHuesped}
                onChange={manejarCambio}
              >
                <option value="1">Juan Pérez</option>
                <option value="2">María Gómez</option>
                <option value="3">Carlos López</option>
              </select>
            </div>

            <div>
              <label>Canal</label>
              <select
                name="canal"
                value={formulario.canal}
                onChange={manejarCambio}
              >
                <option value="Manual">Manual</option>
                <option value="Airbnb">Airbnb</option>
                <option value="Booking">Booking</option>
              </select>
            </div>

            <div>
              <label>Cantidad de huéspedes</label>
              <input
                type="number"
                name="cantidadHuespedes"
                value={formulario.cantidadHuespedes}
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>Fecha de ingreso</label>
              <input
                type="date"
                name="fechaIngreso"
                value={formulario.fechaIngreso}
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>Fecha de egreso</label>
              <input
                type="date"
                name="fechaEgreso"
                value={formulario.fechaEgreso}
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>Monto estimado</label>
              <input
                type="number"
                name="montoEstimado"
                value={formulario.montoEstimado}
                onChange={manejarCambio}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              Guardar reserva
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setMostrarFormulario(false)}
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
              <th>Huésped</th>
              <th>Propiedad</th>
              <th>Canal</th>
              <th>Ingreso</th>
              <th>Egreso</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {reservas.map((reserva) => (
              <tr key={reserva.idReserva}>
                <td>{reserva.huesped}</td>
                <td>{reserva.propiedad}</td>
                <td>{reserva.canal}</td>
                <td>{reserva.fechaIngreso}</td>
                <td>{reserva.fechaEgreso}</td>
                <td>${reserva.montoEstimado.toLocaleString("es-AR")}</td>
                <td>
                  <span className={`estado ${reserva.estado.toLowerCase()}`}>
                    {reserva.estado}
                  </span>
                </td>
                <td>
                  {reserva.estado !== "Cancelada" ? (
                    <button
                      className="cancel-button"
                      onClick={() => cancelarReserva(reserva.idReserva)}
                    >
                      Cancelar
                    </button>
                  ) : (
                    <span className="disabled-text">Sin acción</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Reservas;
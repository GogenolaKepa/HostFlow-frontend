import { useEffect, useState } from "react";
import api from "../services/api";

function Propiedades() {
  const [propiedades, setPropiedades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [idPropiedadEditando, setIdPropiedadEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    nombre: "",
    tipo: "Departamento",
    direccion: "",
    capacidadMaxima: "2",
    precioBase: "50000",
    estado: "Activa",
  });

  useEffect(() => {
    obtenerPropiedades();
  }, []);

  const obtenerPropiedades = async () => {
    try {
      const response = await api.get("/propiedades");
      setPropiedades(response.data.propiedades);
    } catch (error) {
      setError("No se pudieron obtener las propiedades.");
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
      tipo: "Departamento",
      direccion: "",
      capacidadMaxima: "2",
      precioBase: "50000",
      estado: "Activa",
    });

    setIdPropiedadEditando(null);
    setMostrarFormulario(false);
  };

  const abrirFormularioNuevaPropiedad = () => {
    setMensaje("");
    setError("");
    setIdPropiedadEditando(null);

    setFormulario({
      nombre: "",
      tipo: "Departamento",
      direccion: "",
      capacidadMaxima: "2",
      precioBase: "50000",
      estado: "Activa",
    });

    setMostrarFormulario(true);
  };

  const editarPropiedad = (propiedad) => {
    setMensaje("");
    setError("");

    setIdPropiedadEditando(propiedad.idPropiedad);

    setFormulario({
      nombre: propiedad.nombre,
      tipo: propiedad.tipo || "Departamento",
      direccion: propiedad.direccion,
      capacidadMaxima: String(propiedad.capacidadMaxima),
      precioBase: String(propiedad.precioBase),
      estado:
        propiedad.estado === "En mantenimiento"
          ? "Mantenimiento"
          : propiedad.estado,
    });

    setMostrarFormulario(true);
  };

  const guardarPropiedad = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    const datosPropiedad = {
      nombre: formulario.nombre,
      tipo: formulario.tipo,
      direccion: formulario.direccion,
      capacidadMaxima: Number(formulario.capacidadMaxima),
      precioBase: Number(formulario.precioBase),
      estado: formulario.estado,
    };

    try {
      if (idPropiedadEditando) {
        await api.put(`/propiedades/${idPropiedadEditando}`, datosPropiedad);
        setMensaje("Propiedad modificada correctamente.");
      } else {
        await api.post("/propiedades", datosPropiedad);
        setMensaje("Propiedad registrada correctamente.");
      }

      limpiarFormulario();
      obtenerPropiedades();
    } catch (error) {
      setError(
        error.response?.data?.mensaje || "No se pudo guardar la propiedad."
      );
    }
  };

  const obtenerClaseEstado = (estado) => {
    if (estado === "Activa") return "activa";

    if (estado === "Mantenimiento" || estado === "En mantenimiento") {
      return "mantenimiento";
    }

    if (estado === "Inactiva") return "inactiva";

    return "";
  };

  if (cargando) {
    return <h2>Cargando propiedades...</h2>;
  }

  return (
    <section className="propiedades-page">
      <div className="section-header">
        <div>
          <h2>Gestión de propiedades</h2>
          <p>Listado de inmuebles registrados en HostFlow.</p>
        </div>

        <button
          className="primary-button"
          onClick={abrirFormularioNuevaPropiedad}
        >
          Nueva propiedad
        </button>
      </div>

      {mensaje && <p className="success-message">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      {mostrarFormulario && (
        <form className="form-card" onSubmit={guardarPropiedad}>
          <h3>
            {idPropiedadEditando
              ? "Editar propiedad"
              : "Registrar nueva propiedad"}
          </h3>

          <div className="form-grid">
            <div>
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formulario.nombre}
                placeholder="Ej: Depto Pellegrini"
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>Tipo</label>
              <select
                name="tipo"
                value={formulario.tipo}
                onChange={manejarCambio}
              >
                <option value="Departamento">Departamento</option>
                <option value="Casa">Casa</option>
                <option value="Loft">Loft</option>
                <option value="Monoambiente">Monoambiente</option>
              </select>
            </div>

            <div>
              <label>Dirección</label>
              <input
                type="text"
                name="direccion"
                value={formulario.direccion}
                placeholder="Ej: Av. Pellegrini 1500"
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>Capacidad máxima</label>
              <input
                type="number"
                name="capacidadMaxima"
                value={formulario.capacidadMaxima}
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>Precio base</label>
              <input
                type="number"
                name="precioBase"
                value={formulario.precioBase}
                onChange={manejarCambio}
              />
            </div>

            <div>
              <label>Estado</label>
              <select
                name="estado"
                value={formulario.estado}
                onChange={manejarCambio}
              >
                <option value="Activa">Activa</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Inactiva">Inactiva</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {idPropiedadEditando ? "Guardar cambios" : "Guardar propiedad"}
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

      <div className="properties-grid">
        {propiedades.map((propiedad) => (
          <div className="property-card" key={propiedad.idPropiedad}>
            <div className="property-image">
              <span>🏠</span>
            </div>

            <div className="property-info">
              <div className="property-title">
                <h3>{propiedad.nombre}</h3>

                <span
                  className={`estado ${obtenerClaseEstado(propiedad.estado)}`}
                >
                  {propiedad.estado}
                </span>
              </div>

              <p>{propiedad.direccion}</p>

              <div className="property-details">
                <span>Tipo: {propiedad.tipo || "No especificado"}</span>
                <span>Capacidad: {propiedad.capacidadMaxima} huéspedes</span>
                <span>
                  Precio base: ${propiedad.precioBase.toLocaleString("es-AR")}
                </span>
              </div>

              <div className="property-actions">
                <button
                  className="secondary-button"
                  onClick={() => editarPropiedad(propiedad)}
                >
                  Editar
                </button>

                <button className="primary-button">Ver detalle</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Propiedades;
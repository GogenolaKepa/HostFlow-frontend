import { useEffect, useState } from "react";
import api from "../services/api";
import Reservas from "./Reservas";
import Propiedades from "./Propiedades";
import Huespedes from "./Huespedes";

function Dashboard({ usuario, onLogout }) {
  const [datos, setDatos] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("inicio");

  useEffect(() => {
    obtenerDashboard();
  }, []);

  const obtenerDashboard = async () => {
    const response = await api.get("/dashboard/resumen");
    setDatos(response.data);
  };

  // =========================================================
  // NAVEGACIÓN
  // =========================================================

  const cambiarSeccion = (seccion) => {
    // Si el usuario navega normalmente desde el menú,
    // cualquier selección puntual de una reserva deja de tener efecto.
    window.sessionStorage.removeItem(
      "hostflowReservaObjetivo"
    );

    setSeccionActiva(seccion);
  };

  const verReservaDesdeHuesped = (
    idReserva
  ) => {
    // Guardamos qué reserva debe mostrar Reservas.
    window.sessionStorage.setItem(
      "hostflowReservaObjetivo",
      String(idReserva)
    );

    // Cambiamos automáticamente a la pantalla de Reservas.
    setSeccionActiva("reservas");
  };

  if (!datos) {
    return (
      <h2 className="loading">
        Cargando dashboard...
      </h2>
    );
  }

  const {
    resumen,
    proximasReservas,
    alertas,
  } = datos;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>HostFlow</h2>

        <nav>
          <p
            className={
              seccionActiva === "inicio"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion("inicio")
            }
          >
            Inicio
          </p>

          <p
            className={
              seccionActiva === "propiedades"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion(
                "propiedades"
              )
            }
          >
            Propiedades
          </p>

          <p
            className={
              seccionActiva === "reservas"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion("reservas")
            }
          >
            Reservas
          </p>

          <p
            className={
              seccionActiva === "huespedes"
                ? "active"
                : ""
            }
            onClick={() =>
              cambiarSeccion("huespedes")
            }
          >
            Huéspedes
          </p>

          <p>Calendario</p>
          <p>Reportes</p>
          <p>Alertas</p>
        </nav>

        <button onClick={onLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="main">
        {seccionActiva ===
        "propiedades" ? (
          <Propiedades />
        ) : seccionActiva ===
          "reservas" ? (
          <Reservas />
        ) : seccionActiva ===
          "huespedes" ? (
          <Huespedes
            onVerReserva={
              verReservaDesdeHuesped
            }
          />
        ) : (
          <>
            <header>
              <div>
                <h1>
                  ¡Hola,{" "}
                  {usuario.nombre}!
                </h1>

                <p>
                  Resumen general de la
                  operación
                </p>
              </div>

              <span>
                {usuario.rol}
              </span>
            </header>

            <section className="cards">
              <div className="card">
                <p>
                  Propiedades activas
                </p>

                <h2>
                  {
                    resumen.propiedadesActivas
                  }
                </h2>
              </div>

              <div className="card">
                <p>
                  Reservas activas
                </p>

                <h2>
                  {
                    resumen.reservasActivas
                  }
                </h2>
              </div>

              <div className="card">
                <p>
                  Huéspedes registrados
                </p>

                <h2>
                  {
                    resumen.huespedesRegistrados
                  }
                </h2>
              </div>

              <div className="card">
                <p>
                  Ingresos del mes
                </p>

                <h2>
                  $
                  {resumen.ingresosMes.toLocaleString(
                    "es-AR"
                  )}
                </h2>
              </div>
            </section>

            <section className="content">
              <div className="panel">
                <h3>
                  Ocupación mensual
                </h3>

                <div className="circle">
                  {
                    resumen.ocupacionMensual
                  }
                  %
                </div>
              </div>

              <div className="panel">
                <h3>Alertas</h3>

                {alertas.map(
                  (alerta) => (
                    <div
                      className="alert"
                      key={
                        alerta.idAlerta
                      }
                    >
                      <strong>
                        {
                          alerta.tipo
                        }
                      </strong>

                      <p>
                        {
                          alerta.mensaje
                        }
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>

            <section className="panel">
              <h3>
                Próximas reservas
              </h3>

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
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {proximasReservas.map(
                    (reserva) => (
                      <tr
                        key={
                          reserva.idReserva
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

                        <td>
                          {
                            reserva.fechaIngreso
                          }
                        </td>

                        <td>
                          {
                            reserva.fechaEgreso
                          }
                        </td>

                        <td>
                          {
                            reserva.estado
                          }
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;

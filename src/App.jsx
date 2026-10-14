import { useCallback, useEffect, useRef, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import api from "./services/api";
import {
  SESION_CERRADA,
  consultarSesion,
  guardarSesion,
  limpiarSesion,
  obtenerToken,
} from "./services/session";
import "./App.css";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [expiraEn, setExpiraEn] = useState(null);
  const [estadoSesion, setEstadoSesion] = useState("validando");
  const intentoValidacion = useRef(0);

  const reiniciarEstado = useCallback(() => {
    intentoValidacion.current += 1;
    setUsuario(null);
    setExpiraEn(null);
    setEstadoSesion("lista");
  }, []);

  const cerrarSesion = useCallback(() => {
    limpiarSesion();
    reiniciarEstado();
  }, [reiniciarEstado]);

  const validarSesion = useCallback(async () => {
    const intento = ++intentoValidacion.current;
    const token = obtenerToken();
    setUsuario(null);
    setExpiraEn(null);

    if (!token) {
      limpiarSesion();
      setEstadoSesion("lista");
      return;
    }

    setEstadoSesion("validando");
    try {
      const sesion = await consultarSesion(api);
      if (intento !== intentoValidacion.current || token !== obtenerToken()) return;

      guardarSesion(token, sesion.usuario);
      setUsuario(sesion.usuario);
      setExpiraEn(sesion.expiraEn);
      setEstadoSesion("lista");
    } catch (error) {
      if (intento !== intentoValidacion.current || token !== obtenerToken()) return;
      if (error.response?.status === 401) {
        cerrarSesion();
      } else {
        // Una caída temporal del backend no borra una sesión potencialmente válida.
        setEstadoSesion("error");
      }
    }
  }, [cerrarSesion]);

  useEffect(() => {
    const alCambiarAlmacenamiento = (event) => {
      if (event.storageArea === localStorage &&
          (event.key === "token" || event.key === null)) {
        validarSesion();
      }
    };

    window.addEventListener(SESION_CERRADA, reiniciarEstado);
    window.addEventListener("storage", alCambiarAlmacenamiento);
    validarSesion();

    return () => {
      intentoValidacion.current += 1;
      window.removeEventListener(SESION_CERRADA, reiniciarEstado);
      window.removeEventListener("storage", alCambiarAlmacenamiento);
    };
  }, [reiniciarEstado, validarSesion]);

  useEffect(() => {
    if (!expiraEn) return;
    const temporizador = window.setTimeout(
      cerrarSesion,
      Math.max(0, expiraEn * 1000 - Date.now())
    );
    return () => window.clearTimeout(temporizador);
  }, [expiraEn, cerrarSesion]);

  if (estadoSesion === "validando") {
    return <div className="login-container" role="status">Validando sesión…</div>;
  }

  if (estadoSesion === "error") {
    return (
      <div className="login-container">
        <div className="login-card" role="alert">
          <p>No se pudo verificar la sesión. Comprobá la conexión y reintentá.</p>
          <button onClick={validarSesion}>Reintentar</button>
          <button onClick={cerrarSesion}>Volver al login</button>
        </div>
      </div>
    );
  }

  return usuario ? (
    <Dashboard usuario={usuario} onLogout={cerrarSesion} />
  ) : (
    <Login onLogin={validarSesion} />
  );
}

export default App;

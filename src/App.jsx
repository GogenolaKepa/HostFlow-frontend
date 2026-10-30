import { useCallback, useEffect, useRef, useState } from "react";
import Login from "./pages/Login";
import ValidandoSesion from "./components/ValidandoSesion";
import Dashboard from "./pages/Dashboard";
import MiCuenta from "./pages/MiCuenta";
import api from "./services/api";
import { PermisosContext } from "./context/PermisosContext";
import {
  SESION_CERRADA,
  CAMBIO_PASSWORD_REQUERIDO,
  aplicarRespuestaSesion,
  cerrarSesionEnServidor,
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
  const [aviso, setAviso] = useState("");
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

  const cerrarSesionRemota = useCallback(async () => {
    const origenSQL = usuario?.gestionCuentasDisponible;
    if (origenSQL && !window.confirm("Se cerrarán todas tus sesiones de HostFlow. ¿Continuar?")) return;
    const revocada = await cerrarSesionEnServidor(api);
    if (origenSQL && !revocada) setAviso("Se cerró la sesión de este navegador, pero no se pudo confirmar la revocación en el servidor.");
  }, [usuario]);

  const actualizarSesion = useCallback((data, tokenEsperado) => {
    const sesion = aplicarRespuestaSesion(data, tokenEsperado, expiraEn);
    if (!sesion) return;
    setUsuario(sesion.usuario);
    setExpiraEn(sesion.expiraEn);
  }, [expiraEn]);

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
    window.addEventListener(CAMBIO_PASSWORD_REQUERIDO, validarSesion);
    window.addEventListener("storage", alCambiarAlmacenamiento);
    validarSesion();

    return () => {
      intentoValidacion.current += 1;
      window.removeEventListener(SESION_CERRADA, reiniciarEstado);
      window.removeEventListener(CAMBIO_PASSWORD_REQUERIDO, validarSesion);
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
    return <ValidandoSesion />;
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

  return (
    <PermisosContext.Provider value={usuario?.permisos || []}>
      {usuario ? (
        usuario.debeCambiarPassword ? (
          <MiCuenta obligatorio usuario={usuario} onSesionActualizada={actualizarSesion} onLogout={cerrarSesionRemota} />
        ) : <Dashboard usuario={usuario} onLogout={cerrarSesionRemota} onSesionActualizada={actualizarSesion} />
      ) : (
        <Login aviso={aviso} onLogin={() => { setAviso(""); validarSesion(); }} />
      )}
    </PermisosContext.Provider>
  );
}

export default App;

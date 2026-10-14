export const SESION_CERRADA = "hostflow:sesion-cerrada";
export const CAMBIO_PASSWORD_REQUERIDO = "hostflow:cambio-password-requerido";

export function obtenerToken() {
  return localStorage.getItem("token");
}

export function guardarSesion(token, usuario) {
  localStorage.setItem("token", token);
  localStorage.setItem("usuario", JSON.stringify(usuario));
}

export function limpiarSesion() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.dispatchEvent(new Event(SESION_CERRADA));
}

export function configurarAutenticacion(api) {
  api.interceptors.request.use((config) => {
    const esLogin = /^\/?auth\/login\/?$/i.test(config.url || "");
    const token = esLogin ? null : obtenerToken();
    config.tokenSesion = token;
    config.esLogin = esLogin;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const config = error.config;
      if (error.response?.status === 401 && config && !config.esLogin &&
          config.tokenSesion === obtenerToken()) {
        // Un 401 tardío de una sesión anterior no cierra un nuevo login.
        limpiarSesion();
      }
      if (error.response?.status === 403 && error.response?.data?.codigo === "PASSWORD_CHANGE_REQUIRED" &&
          config && !config.esLogin && config.tokenSesion === obtenerToken()) {
        window.dispatchEvent(new Event(CAMBIO_PASSWORD_REQUERIDO));
      }
      return Promise.reject(error);
    }
  );
}

export async function consultarSesion(api) {
  const response = await api.get("/auth/me", { timeout: 15000 });
  return validarSesionServidor(response.data);
}

export function validarSesionServidor({ usuario, expiraEn } = {}) {
  if (!usuario || !Number.isInteger(usuario.idUsuario) ||
      usuario.idUsuario <= 0 ||
      typeof usuario.nombre !== "string" || typeof usuario.email !== "string" ||
      !["Administrador", "Operador"].includes(usuario.rol) || !Array.isArray(usuario.permisos) ||
      typeof usuario.debeCambiarPassword !== "boolean" || typeof usuario.gestionCuentasDisponible !== "boolean" ||
      !["mock", "sql"].includes(usuario.origenAutenticacion) ||
      (usuario.origenAutenticacion === "mock" && (usuario.gestionCuentasDisponible || usuario.debeCambiarPassword)) ||
      (usuario.origenAutenticacion === "sql" && (!usuario.gestionCuentasDisponible ||
        typeof usuario.versionRegistro !== "string" || !/^[a-f0-9]{16}$/i.test(usuario.versionRegistro))) ||
      !usuario.permisos.every((permiso) => typeof permiso === "string") || !Number.isInteger(expiraEn) ||
      expiraEn * 1000 <= Date.now()) {
    throw new Error("No se pudo validar la sesión del servidor.");
  }
  return { usuario, expiraEn };
}

export function aplicarRespuestaSesion(data, tokenEsperado, expiraEnAnterior) {
  if (!tokenEsperado || tokenEsperado !== obtenerToken()) return null;
  const sesion = validarSesionServidor({ ...data, expiraEn: data.expiraEn ?? expiraEnAnterior });
  guardarSesion(data.token || tokenEsperado, sesion.usuario);
  return sesion;
}

export async function cerrarSesionEnServidor(api) {
  const token = obtenerToken();
  let revocada = false;
  try {
    const response = await api.post("/auth/logout");
    revocada = response.data.revocadaEnServidor === true;
  } catch { /* Cerrar el navegador incluso si el servidor no confirma revocacion. */ }
  if (token === obtenerToken()) limpiarSesion();
  return revocada;
}

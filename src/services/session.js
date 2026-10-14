export const SESION_CERRADA = "hostflow:sesion-cerrada";

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
      return Promise.reject(error);
    }
  );
}

export async function consultarSesion(api) {
  const response = await api.get("/auth/me", { timeout: 15000 });
  const { usuario, expiraEn } = response.data;
  if (!usuario || !Number.isInteger(usuario.idUsuario) ||
      typeof usuario.nombre !== "string" || typeof usuario.email !== "string" ||
      typeof usuario.rol !== "string" || !Number.isInteger(expiraEn) ||
      expiraEn * 1000 <= Date.now()) {
    throw new Error("No se pudo validar la sesión del servidor.");
  }
  return { usuario, expiraEn };
}

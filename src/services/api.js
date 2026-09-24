import axios from "axios";

const obtenerApiUrl = () => {
  /*
   * Si existe VITE_API_URL, usamos esa URL.
   *
   * Esto servirá más adelante para Render,
   * Vercel u otro entorno de producción.
   */
  const apiUrlConfigurada =
    import.meta.env.VITE_API_URL?.trim();

  if (apiUrlConfigurada) {
    return apiUrlConfigurada;
  }

  /*
   * En desarrollo usamos automáticamente
   * el mismo host desde el cual se abrió
   * el frontend.
   *
   * PC:
   * localhost:5173
   * -> localhost:4000/api
   *
   * Celular:
   * 192.168.1.24:5173
   * -> 192.168.1.24:4000/api
   */
  return `${window.location.protocol}//${window.location.hostname}:4000/api`;
};

const api = axios.create({
  baseURL: obtenerApiUrl(),
});

export default api;

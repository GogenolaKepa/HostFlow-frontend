import { validarBaseApi } from './configuracionApiPublica.js';

// Contrato de Registro V1: seguridadRegistro.datosRegistro del backend bef7746.
// La matriz es independiente del catálogo comercial y requiere revisión si cambia la API.
const PLANES_REGISTRO_V1 = ['inicial', 'profesional', 'gestion'];
const CICLOS_REGISTRO_V1 = ['mensual', 'anual'];

function errorRegistro(codigo, incierto = false) {
  return Object.assign(new Error(codigo), { codigo, incierto });
}

export function crearClienteRegistro({
  apiBase = '/api',
  desarrollo = false,
  transportar = globalThis.fetch,
  timeoutMs = 15000,
} = {}) {
  validarBaseApi(apiBase, { desarrollo });

  async function pedir(ruta, { body, csrf } = {}) {
    const method = body ? 'POST' : 'GET';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const respuesta = await transportar(`${apiBase}/clientes/${ruta}`, {
        method,
        credentials: 'include',
        redirect: 'error',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        ...(body && {
          headers: { 'Content-Type': 'application/json', 'X-HostFlow-CSRF': csrf },
          body: JSON.stringify(body),
        }),
      });
      return { estado: respuesta.status, datos: await respuesta.json() };
    } catch {
      throw errorRegistro('CONEXION_NO_CONFIRMADA', method === 'POST');
    } finally {
      clearTimeout(timer);
    }
  }

  async function enviarProtegido(ruta, body) {
    const proteccion = await pedir('csrf');
    const csrf = proteccion.datos?.csrf;
    if (proteccion.estado !== 200 || typeof csrf !== 'string' || !/^[A-Za-z0-9_.-]{40,160}$/.test(csrf)) {
      throw errorRegistro('CSRF_NO_DISPONIBLE');
    }
    return pedir(ruta, { body, csrf });
  }

  return Object.freeze({
    async registroHabilitado() {
      const { estado, datos } = await pedir('capacidades');
      if (estado !== 200 || datos?.version !== 1 || datos.operativa !== false ||
          typeof datos.registro !== 'boolean' || (datos.registro && datos.modalidadRegistro !== 'controlado')) {
        throw errorRegistro('CAPACIDADES_INVALIDAS');
      }
      return datos.registro;
    },

    async registrar({ email, nombre, password, plan, ciclo }) {
      if (!PLANES_REGISTRO_V1.includes(plan) || !CICLOS_REGISTRO_V1.includes(ciclo)) {
        throw errorRegistro('SELECCION_REGISTRO_INVALIDA');
      }
      const body = { email, nombre, password, plan, ciclo };
      const { estado, datos } = await enviarProtegido('registro', body);
      if (estado === 202 && typeof datos?.mensaje === 'string' && datos.mensaje.trim() && !datos.codigo) return;

      if (estado === 503 && datos?.codigo === 'REGISTRO_NO_HABILITADO') {
        throw errorRegistro('REGISTRO_NO_HABILITADO');
      }
      if (estado >= 400 && estado < 500 && typeof datos?.codigo === 'string') {
        throw errorRegistro(datos.codigo);
      }
      throw errorRegistro('RESPUESTA_NO_CONFIRMADA', true);
    },

    async estadoVerificacion(token) {
      const { estado, datos } = await enviarProtegido('enlaces/estado', { token });
      if (estado >= 400 && estado < 500 && datos?.codigo === 'ENLACE_NO_VALIDO') return false;
      if (estado !== 200 || typeof datos?.expiraEn !== 'string' || !Number.isFinite(Date.parse(datos.expiraEn))) {
        throw errorRegistro('RESPUESTA_NO_CONFIRMADA');
      }
      return datos.tipo === 'registro' && !datos.codigo;
    },

    async confirmarVerificacion({ token, password }) {
      const { estado, datos } = await enviarProtegido('verificar', { token, password });
      if (estado === 200 && datos?.completado === true && !datos.codigo) return;
      if (estado >= 400 && estado < 500 && typeof datos?.codigo === 'string') {
        throw errorRegistro(datos.codigo);
      }
      throw errorRegistro('RESPUESTA_NO_CONFIRMADA', true);
    },
  });
}

const MENSAJES = Object.freeze({
  SELECCION_REGISTRO_INVALIDA: 'Elegí un plan y un ciclo disponibles para el registro.',
  PASSWORD_INVALIDA: 'Usá al menos 12 caracteres y hasta 72 bytes, sin caracteres de control.',
  CSRF_INVALIDO: 'La protección de esta página venció. Recargá antes de volver a intentarlo.',
  CSRF_NO_DISPONIBLE: 'No pudimos preparar el envío seguro. Volvé a intentarlo.',
  LIMITE_SOLICITUDES: 'Llegaste al límite de solicitudes. Esperá antes de volver a intentarlo.',
});

export function mensajeErrorRegistro(error) {
  if (error.incierto) {
    return 'No pudimos confirmar el resultado. Revisá tu correo antes de volver a intentar la operación.';
  }
  return Object.hasOwn(MENSAJES, error.codigo)
    ? MENSAJES[error.codigo]
    : 'No pudimos enviar la solicitud. Revisá tus datos y volvé a intentarlo.';
}

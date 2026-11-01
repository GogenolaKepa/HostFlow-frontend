import { validarPasswordNueva } from './cuentas.js';

export const MENSAJE_NEUTRAL = 'Si la solicitud corresponde, recibirás instrucciones por correo.';
export function emailValido(email) { return typeof email === 'string' && email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()); }
export function tokenValido(token) { return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token); }
export { validarPasswordNueva };
// Invocar ANTES de montar React/telemetría. La credencial solo permanece en memoria.
export function retirarTokenDelEnlace(href, reemplazar) {
  const url = new URL(href);
  const partes = new URLSearchParams(url.hash.slice(1));
  const valores = partes.getAll('token');
  const token = valores.length === 1 && !url.search && tokenValido(valores[0]) ? valores[0] : null;
  reemplazar(url.pathname); // También retira parámetros no admitidos; nunca persiste el token.
  return token;
}
export class ErrorComercial extends Error {
  constructor(codigo, mensaje) { super(mensaje); this.codigo = codigo; }
}
// Sin cliente operativo ni endpoints habilitados por defecto. Inyectar solo tras integración aprobada.
export function crearClienteComercial(transportar) {
  if (typeof transportar !== 'function') throw new TypeError('Se requiere transporte explícito.');
  async function pedir(ruta, body, status, signal, metodo = 'POST') {
    let r;
    try { r = await transportar({ ruta: `/api/cuentas-comerciales${ruta}`, metodo, body, signal }); }
    catch { throw new ErrorComercial('INCIERTO', 'No pudimos confirmar el resultado. No vuelvas a enviar esta operación; comprobá tu correo o consultá al administrador.'); }
    if (!r || !Number.isInteger(r.status)) throw new ErrorComercial('RESPUESTA_INVALIDA', 'No pudimos verificar la respuesta. No reenvíes la operación.');
    if (r.status >= 500) throw new ErrorComercial('INCIERTO', 'No pudimos confirmar el resultado. No vuelvas a enviar esta operación; consultá al administrador.');
    if (r.status === 429) throw new ErrorComercial('LIMITE', 'Hubo demasiadas solicitudes. Esperá antes de intentarlo nuevamente.');
    if (r.status === 403 || r.status === 401) throw new ErrorComercial('SIN_PERMISO', 'Tu sesión no permite realizar esta operación.');
    if (r.status === 400 && r.data?.codigo === 'ENLACE_INVALIDO') throw new ErrorComercial('ENLACE_INVALIDO', 'Este enlace venció, fue revocado o ya se utilizó. Solicitá uno nuevo.');
    if (r.status === 400 && ['PASSWORD_REPETIDA','PASSWORD_INVALIDA','VALIDACION','CAMPO_NO_PERMITIDO'].includes(r.data?.codigo)) throw new ErrorComercial('VALIDACION', r.data.codigo === 'PASSWORD_REPETIDA' ? 'Elegí una contraseña distinta de la actual.' : 'Revisá los campos antes de continuar.');
    if (r.status !== status) throw new ErrorComercial('RESPUESTA_INVALIDA', 'No pudimos verificar la respuesta. No reenvíes la operación.');
    return r.data;
  }
  return Object.freeze({
    async solicitar(email, signal) { await pedir('/recuperacion/solicitar', { email: email.trim().toLowerCase() }, 202, signal); return MENSAJE_NEUTRAL; },
    validar: (tipo, token, signal) => pedir(`/${tipo}/validar`, { token }, 204, signal),
    confirmar: (tipo, token, passwordNueva, signal) => pedir(`/${tipo}/confirmar`, { token, passwordNueva }, 204, signal),
    async listar(signal, pagina = 1) {
      const r = await pedir(`/invitaciones?pagina=${pagina}`, undefined, 200, signal, 'GET');
      if (r?.pagina !== pagina || typeof r.hayMas !== 'boolean') throw new ErrorComercial('RESPUESTA_INVALIDA','No pudimos verificar la página de invitaciones.');
      if (!Array.isArray(r?.invitaciones) || r.invitaciones.some(i => !/^[a-f0-9-]{36}$/.test(i.id) || !emailValido(i.email) || typeof i.nombre !== 'string' || !i.nombre.trim() || !Number.isFinite(Date.parse(i.expiraEn)) || !['Pendiente','Vencida','Revocada','Aceptada'].includes(i.estado))) throw new ErrorComercial('RESPUESTA_INVALIDA', 'No pudimos verificar las invitaciones.');
      return r;
    },
    invitar: (nombre, email, signal) => pedir('/invitaciones', { nombre: nombre.trim(), email: email.trim().toLowerCase() }, 202, signal),
    revocar: (id, signal) => pedir(`/invitaciones/${encodeURIComponent(id)}/revocar`, {}, 204, signal),
    solicitarContacto:(passwordActual,signal)=>pedir('/contacto/solicitar',{passwordActual},204,signal),
    confirmarContacto:(token,signal)=>pedir('/contacto/confirmar',{token},204,signal),
  });
}

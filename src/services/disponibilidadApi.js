export const SERVICIO_DESCONECTADO='HostFlow no puede conectar con el servicio en este momento. Puede estar apagado o sin conexión. Volvé a intentarlo cuando esté disponible.';
export function mensajeErrorAcceso(error) {
  if(!error?.response||[502,503,504,520,521,522,523,524].includes(error.response.status))return SERVICIO_DESCONECTADO;
  return error.response.data?.mensaje || 'No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.';
}

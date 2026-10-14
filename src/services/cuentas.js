export function validarPasswordNueva(password, confirmacion) {
  if (typeof password !== "string" || [...password].length < 12 || new TextEncoder().encode(password).length > 72) {
    return "La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes UTF-8.";
  }
  return password === confirmacion ? "" : "Las contraseñas no coinciden.";
}

export function mensajeCuenta(error) {
  return error.response?.data?.mensaje || "No se pudo completar la operación. Comprobá la conexión y reintentá.";
}

export function puedeGestionarUsuarios(usuario) {
  return usuario?.gestionCuentasDisponible === true && usuario?.debeCambiarPassword === false &&
    usuario?.permisos?.includes("usuarios.ver");
}

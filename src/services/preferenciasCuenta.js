export function ambitoPreferencias(usuario) {
  if (!Number.isSafeInteger(usuario?.idUsuario) || usuario.idUsuario <= 0 ||
      !['sql', 'mock'].includes(usuario.origenAutenticacion)) return null;
  // Los perfiles de la instalación original todavía pueden omitir IdEmpresa.
  const empresa = usuario.idEmpresa ?? 1;
  return Number.isSafeInteger(empresa) && empresa > 0
    ? `${usuario.origenAutenticacion}:${empresa}:${usuario.idUsuario}`
    : null;
}

export function leerPreferenciaCuenta(clave, ambito, storage) {
  if (!ambito) return null;
  try { return (storage ?? window.localStorage).getItem(`${clave}:${ambito}`); }
  catch { return null; }
}

export function guardarPreferenciaCuenta(clave, ambito, valor, storage) {
  if (!ambito) return false;
  try { (storage ?? window.localStorage).setItem(`${clave}:${ambito}`, valor); return true; }
  catch { return false; }
}
